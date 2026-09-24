import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { loadProject, requireProjectAdmin } from "../middleware/projectAccess.js";
import { validate } from "../middleware/validate.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { httpError } from "../utils/httpError.js";

const router = express.Router();

const zodSubTaskSchema = z.object({
  sequenceNo: z.string().trim().optional().default(""),
  name: z.string().trim().min(1),
  description: z.string().trim().optional().default(""),
  quantity: z.number().min(0).optional().default(1),
  status: z.enum([
    "Order Placed",
    "Material in Transit",
    "Order Received",
    "Order Accepted",
    "Order Rejected",
    "Order Returned"
  ]).default("Order Placed"),
  action: z.enum(["Fabrication", "Purchase"]).default("Fabrication"),
  assignedTo: z.string().trim().optional().nullable(),
  dueDate: z.string().trim().optional().nullable()
});

const createTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(140),
    description: z.string().trim().max(1000).optional().default(""),
    assignedTo: z.union([z.string(), z.array(z.string())]).optional().default([]),
    status: z.enum(["Todo", "In Progress", "Done"]).default("Todo"),
    priority: z.enum(["Low", "Medium", "High"]).default("Medium"),
    dueDate: z.string().datetime(),
    estimatedCost: z.number().min(0).optional().default(0),
    actualCost: z.number().min(0).optional().default(0),
    subTasks: z.array(zodSubTaskSchema).optional().default([])
  }),
  params: z.object({ projectId: z.string() })
});

const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(140).optional(),
    description: z.string().trim().max(1000).optional(),
    assignedTo: z.union([z.string(), z.array(z.string())]).optional().nullable(),
    status: z.enum(["Todo", "In Progress", "Done"]).optional(),
    priority: z.enum(["Low", "Medium", "High"]).optional(),
    dueDate: z.string().datetime().optional(),
    estimatedCost: z.number().min(0).optional(),
    actualCost: z.number().min(0).optional(),
    subTasks: z.array(zodSubTaskSchema).optional()
  }),
  params: z.object({ id: z.string() })
});

router.use(requireAuth);

async function assertAssignable(project, assignees) {
  if (!assignees) return [];
  const list = Array.isArray(assignees) ? assignees : [assignees];
  const validList = list.filter(Boolean);
  for (const userId of validList) {
    const isMember = project.members.some((member) => member.user.toString() === userId);
    if (!isMember) throw httpError(400, "Task can only be assigned to project members");
  }
  return validList;
}

async function validateSubTasks(project, subTasks) {
  if (!subTasks || !Array.isArray(subTasks)) return [];
  const list = [];
  for (const st of subTasks) {
    if (st.assignedTo) {
      const isMember = project.members.some((member) => member.user.toString() === st.assignedTo.toString());
      if (!isMember) throw httpError(400, `Sub-task "${st.name}" assignee is not a project member`);
    }
    list.push({
      ...st,
      assignedTo: st.assignedTo || null,
      dueDate: st.dueDate ? new Date(st.dueDate) : null
    });
  }
  return list;
}

router.get("/", async (req, res, next) => {
  try {
    const projects = await Project.find({ "members.user": req.user.id }).select("_id");
    const tasks = await Task.find({ project: { $in: projects.map((project) => project.id) } })
      .populate("project", "name")
      .populate("assignedTo", "name email")
      .sort({ dueDate: 1 });

    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

router.post("/project/:projectId", validate(createTaskSchema), loadProject, async (req, res, next) => {
  try {
    const input = req.validated.body;
    const assignees = await assertAssignable(req.project, input.assignedTo);
    const subTasks = await validateSubTasks(req.project, input.subTasks);

    const task = await Task.create({
      ...input,
      assignedTo: assignees,
      subTasks,
      dueDate: new Date(input.dueDate),
      project: req.project.id,
      createdBy: req.user.id
    });

    await task.populate("assignedTo", "name email");
    await task.populate("subTasks.assignedTo", "name email");
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", validate(updateTaskSchema), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw httpError(404, "Task not found");

    const project = await Project.findById(task.project);
    if (!project) throw httpError(404, "Project not found");

    const membership = project.members.find((member) => member.user.toString() === req.user.id);
    if (!membership) throw httpError(403, "You do not have access to this task");

    const isAssignee = Array.isArray(task.assignedTo)
      ? task.assignedTo.some((id) => id?.toString() === req.user.id || id?._id?.toString() === req.user.id)
      : task.assignedTo?.toString() === req.user.id;

    const allowedAssigneeFields = ["status", "actualCost", "estimatedCost"];

    if (membership.role !== "Admin") {
      // Members can only update:
      // - "assignedTo" (on any task in the project)
      // - "subTasks" (on any task in the project)
      // - "status", "actualCost", "estimatedCost" (ONLY if they are assigned to the task)
      const requestedKeys = Object.keys(req.validated.body).filter((key) => req.validated.body[key] !== undefined);
      
      const hasInvalidFields = requestedKeys.some((key) => {
        if (key === "assignedTo" || key === "subTasks") return false; // Always allowed for project members
        if (allowedAssigneeFields.includes(key)) {
          return !isAssignee; // Only allowed if they are assigned to this task
        }
        return true; // Any other field (title, description, priority, dueDate) is forbidden
      });

      if (hasInvalidFields) {
        throw httpError(403, "Members can only update task assignees, sub-tasks, or status/costs on their assigned tasks");
      }
    }

    let updatedAssignees = task.assignedTo;
    if (req.validated.body.assignedTo !== undefined) {
      updatedAssignees = await assertAssignable(project, req.validated.body.assignedTo);
    }

    let updatedSubTasks = task.subTasks;
    if (req.validated.body.subTasks !== undefined) {
      updatedSubTasks = await validateSubTasks(project, req.validated.body.subTasks);
    }

    Object.assign(task, {
      ...req.validated.body,
      assignedTo: updatedAssignees,
      subTasks: updatedSubTasks,
      dueDate: req.validated.body.dueDate
        ? new Date(req.validated.body.dueDate)
        : task.dueDate
    });

    await task.save();
    await task.populate("assignedTo", "name email");
    await task.populate("subTasks.assignedTo", "name email");
    await task.populate("expenses.addedBy", "name email");

    res.json({ task });
  } catch (error) {
    next(error);
  }
});

const addExpenseSchema = z.object({
  body: z.object({
    amount: z.number().min(0.01, "Amount must be greater than 0"),
    note: z.string().trim().max(300).optional().default("")
  }),
  params: z.object({ id: z.string() })
});

router.post("/:id/expenses", validate(addExpenseSchema), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw httpError(404, "Task not found");

    const project = await Project.findById(task.project);
    if (!project) throw httpError(404, "Project not found");

    const membership = project.members.find((member) => member.user.toString() === req.user.id);
    if (!membership) throw httpError(403, "You do not have access to this task");

    const isAssignee = Array.isArray(task.assignedTo)
      ? task.assignedTo.some((id) => id?.toString() === req.user.id || id?._id?.toString() === req.user.id)
      : task.assignedTo?.toString() === req.user.id;

    if (membership.role !== "Admin" && !isAssignee) {
      throw httpError(403, "Only assigned members or project admins can log expenses on this task");
    }

    const { amount, note } = req.validated.body;
    task.expenses.push({ amount, note, addedBy: req.user.id, date: new Date() });

    // Auto-recalculate task actual cost
    task.actualCost = task.expenses.reduce((sum, e) => sum + e.amount, 0);

    await task.save();
    await task.populate("assignedTo", "name email");
    await task.populate("expenses.addedBy", "name email");

    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/expenses/:expenseId", async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw httpError(404, "Task not found");

    const project = await Project.findById(task.project);
    if (!project) throw httpError(404, "Project not found");

    const membership = project.members.find((member) => member.user.toString() === req.user.id);
    if (!membership) throw httpError(403, "You do not have access to this task");

    const expenseItem = task.expenses.id(req.params.expenseId);
    if (!expenseItem) throw httpError(404, "Expense entry not found");

    if (membership.role !== "Admin" && expenseItem.addedBy.toString() !== req.user.id) {
      throw httpError(403, "You can only delete your own logged expenses");
    }

    task.expenses.pull({ _id: req.params.expenseId });
    task.actualCost = task.expenses.reduce((sum, e) => sum + e.amount, 0);

    await task.save();
    await task.populate("assignedTo", "name email");
    await task.populate("expenses.addedBy", "name email");

    res.json({ task });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw httpError(404, "Task not found");

    req.params.id = task.project.toString();
    await loadProject(req, res, async (error) => {
      if (error) return next(error);
      if (req.projectRole !== "Admin") return next(httpError(403, "Admin access required"));
      await task.deleteOne();
      res.status(204).end();
    });
  } catch (error) {
    next(error);
  }
});

export default router;