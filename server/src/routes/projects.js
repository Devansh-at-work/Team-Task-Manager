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
    description: z.string().trim().max(600).optional().default("")
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

    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

router.post("/", validate(projectSchema), async (req, res, next) => {
  try {
    const project = await Project.create({
      ...req.validated.body,
      owner: req.user.id,
      members: [{ user: req.user.id, role: "Admin" }]
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
      .sort({ createdAt: -1 });

    res.json({ project: req.project, role: req.projectRole, tasks });
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

export default router;
