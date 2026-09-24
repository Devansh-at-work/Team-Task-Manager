import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { loadProject, requireProjectAdmin } from "../middleware/projectAccess.js";
import { validate } from "../middleware/validate.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { httpError } from "../utils/httpError.js";

const router = express.Router();

const projectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(600).optional().default(""),
    budget: z.number().min(0).optional().default(0),
    initialMembers: z.array(z.object({
      email: z.string().trim().email(),
      role: z.enum(["Admin", "Member"]).default("Member")
    })).optional().default([])
  })
});

const memberSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    role: z.enum(["Admin", "Member"]).default("Member")
  }),
  params: z.object({ id: z.string() })
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const projects = await Project.find({ "members.user": req.user.id })
      .populate("members.user", "name email")
      .sort({ updatedAt: -1 });

    const projectsWithRole = projects.map((project) => ({
      ...project.toObject(),
      role: project.members.find((member) => member.user._id?.toString?.() === req.user.id.toString())?.role || "Member"
    }));

    res.json({ projects: projectsWithRole });
  } catch (error) {
    next(error);
  }
});

router.post("/", validate(projectSchema), async (req, res, next) => {
  try {
    const { name, description, budget, initialMembers } = req.validated.body;

    const membersList = [{ user: req.user.id, role: "Admin" }];
    const addedUserIds = new Set([req.user.id.toString()]);

    if (Array.isArray(initialMembers) && initialMembers.length > 0) {
      for (const m of initialMembers) {
        const user = await User.findOne({ email: m.email });
        if (user && !addedUserIds.has(user.id.toString())) {
          addedUserIds.add(user.id.toString());
          membersList.push({ user: user.id, role: m.role || "Member" });
        }
      }
    }

    const project = await Project.create({
      name,
      description,
      budget,
      owner: req.user.id,
      members: membersList
    });

    await project.populate("members.user", "name email");
    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", loadProject, async (req, res, next) => {
  try {
    await req.project.populate("members.user", "name email");
    const tasks = await Task.find({ project: req.project.id })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("expenses.addedBy", "name email")
      .populate("subTasks.assignedTo", "name email")
      .sort({ createdAt: -1 });

    const totalEstimatedCost = tasks.reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
    const totalActualCost = tasks.reduce((sum, t) => sum + (t.actualCost || 0), 0);
    const budget = req.project.budget || 0;
    const expenses = {
      budget,
      totalEstimatedCost,
      totalActualCost,
      remainingBudget: budget - totalActualCost,
      isOverBudget: budget > 0 && totalActualCost > budget
    };

    const memberLedger = req.project.members.map((m) => {
      const u = m.user;
      const userIdStr = u._id?.toString() || u.toString();
      
      let memberTotalSpent = 0;
      let loggedCount = 0;

      tasks.forEach((task) => {
        if (task.expenses && Array.isArray(task.expenses)) {
          task.expenses.forEach((e) => {
            const addedById = e.addedBy?._id?.toString() || e.addedBy?.toString();
            if (addedById === userIdStr) {
              memberTotalSpent += e.amount || 0;
              loggedCount += 1;
            }
          });
        }
      });

      const spendShare = totalActualCost > 0 ? Math.round((memberTotalSpent / totalActualCost) * 100) : 0;

      return {
        user: {
          _id: userIdStr,
          name: u.name || "Member",
          email: u.email || ""
        },
        role: m.role || "Member",
        totalSpent: memberTotalSpent,
        loggedCount,
        spendShare
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);

    const now = new Date();
    const taskMetrics = {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "Todo").length,
      inProgress: tasks.filter((t) => t.status === "In Progress").length,
      done: tasks.filter((t) => t.status === "Done").length,
      overdue: tasks.filter((t) => t.status !== "Done" && t.dueDate && new Date(t.dueDate) < now).length,
      progressPercent: tasks.length ? Math.round((tasks.filter((t) => t.status === "Done").length / tasks.length) * 100) : 0
    };

    res.json({
      project: req.project,
      role: req.projectRole,
      tasks,
      expenses,
      memberLedger,
      taskMetrics
    });
  } catch (error) {
    next(error);
  }
});

const budgetSchema = z.object({
  body: z.object({
    budget: z.number().min(0)
  }),
  params: z.object({ id: z.string() })
});

router.patch("/:id/budget", validate(budgetSchema), loadProject, requireProjectAdmin, async (req, res, next) => {
  try {
    req.project.budget = req.validated.body.budget;
    await req.project.save();
    await req.project.populate("members.user", "name email");

    res.json({ project: req.project });
  } catch (error) {
    next(error);
  }
});

const statusSchema = z.object({
  body: z.object({
    status: z.enum(["Active", "Completed"])
  }),
  params: z.object({ id: z.string() })
});

router.patch("/:id/status", validate(statusSchema), loadProject, requireProjectAdmin, async (req, res, next) => {
  try {
    req.project.status = req.validated.body.status;
    await req.project.save();
    await req.project.populate("members.user", "name email");

    res.json({ project: req.project });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/members", validate(memberSchema), loadProject, requireProjectAdmin, async (req, res, next) => {
  try {
    const { email, role } = req.validated.body;
    const user = await User.findOne({ email });

    if (!user) throw httpError(404, "No user found with that email");

    const exists = req.project.members.some(
      (member) => member.user.toString() === user.id
    );

    if (exists) throw httpError(409, "User is already on this project");

    req.project.members.push({ user: user.id, role });
    await req.project.save();
    await req.project.populate("members.user", "name email");

    res.status(201).json({ project: req.project });
  } catch (error) {
    next(error);
  }
});

const updateRoleSchema = z.object({
  body: z.object({
    role: z.enum(["Admin", "Member"])
  }),
  params: z.object({ id: z.string(), userId: z.string() })
});

router.patch("/:id/members/:userId", validate(updateRoleSchema), loadProject, requireProjectAdmin, async (req, res, next) => {
  try {
    const member = req.project.members.find((m) => m.user.toString() === req.params.userId);
    if (!member) throw httpError(404, "Member not found in project");

    member.role = req.validated.body.role;
    await req.project.save();
    await req.project.populate("members.user", "name email");

    res.json({ project: req.project });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/members/:userId", loadProject, requireProjectAdmin, async (req, res, next) => {
  try {
    if (req.project.owner.toString() === req.params.userId) {
      throw httpError(400, "Cannot remove the project owner");
    }

    const initialCount = req.project.members.length;
    req.project.members = req.project.members.filter((m) => m.user.toString() !== req.params.userId);

    if (req.project.members.length === initialCount) {
      throw httpError(404, "Member not found in project");
    }

    await Task.updateMany(
      { project: req.project.id },
      { $pull: { assignedTo: req.params.userId } }
    );

    await req.project.save();
    await req.project.populate("members.user", "name email");

    res.json({ project: req.project });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", loadProject, requireProjectAdmin, async (req, res, next) => {
  try {
    if (req.project.status !== "Completed") {
      throw httpError(400, "Only completed projects can be deleted. Please mark the project as Completed first.");
    }

    // Delete all tasks in the project
    await Task.deleteMany({ project: req.project.id });

    // Delete the project itself
    await Project.deleteOne({ _id: req.project.id });

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
