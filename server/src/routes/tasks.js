import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { loadProject, requireProjectAdmin } from "../middleware/projectAccess.js";
import { validate } from "../middleware/validate.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { httpError } from "../utils/httpError.js";

const router = express.Router();

const createTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(140),
    description: z.string().trim().max(1000).optional().default(""),
    assignedTo: z.string().optional().nullable(),
    status: z.enum(["Todo", "In Progress", "Done"]).default("Todo"),
    priority: z.enum(["Low", "Medium", "High"]).default("Medium"),
    dueDate: z.string().datetime()
  }),
  params: z.object({ projectId: z.string() })
});

const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(140).optional(),
    description: z.string().trim().max(1000).optional(),
    assignedTo: z.string().optional().nullable(),
    status: z.enum(["Todo", "In Progress", "Done"]).optional(),
    priority: z.enum(["Low", "Medium", "High"]).optional(),
    dueDate: z.string().datetime().optional()
  }),
  params: z.object({ id: z.string() })
});

router.use(requireAuth);

async function assertAssignable(project, userId) {
  if (!userId) return;
  const isMember = project.members.some((member) => member.user.toString() === userId);
  if (!isMember) throw httpError(400, "Task can only be assigned to a project member");
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

router.post("/project/:projectId", validate(createTaskSchema), loadProject, requireProjectAdmin, async (req, res, next) => {
  try {
    const input = req.validated.body;
    await assertAssignable(req.project, input.assignedTo);

    const task = await Task.create({
      ...input,
      assignedTo: input.assignedTo || null,
      dueDate: new Date(input.dueDate),
      project: req.project.id,
      createdBy: req.user.id
    });

    await task.populate("assignedTo", "name email");
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

    const isAssignee = task.assignedTo?.toString() === req.user.id;
    const onlyStatus = Object.keys(req.validated.body).every((key) => key === "status");

    if (membership.role !== "Admin" && !(isAssignee && onlyStatus)) {
      throw httpError(403, "Members can only update status on their assigned tasks");
    }

    await assertAssignable(project, req.validated.body.assignedTo);

    Object.assign(task, {
      ...req.validated.body,
      assignedTo:
        req.validated.body.assignedTo === undefined
          ? task.assignedTo
          : req.validated.body.assignedTo || null,
      dueDate: req.validated.body.dueDate
        ? new Date(req.validated.body.dueDate)
        : task.dueDate
    });

    await task.save();
    await task.populate("assignedTo", "name email");

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
