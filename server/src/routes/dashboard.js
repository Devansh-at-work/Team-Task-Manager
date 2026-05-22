import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const projects = await Project.find({ "members.user": req.user.id }).select("_id name");
    const projectIds = projects.map((project) => project.id);
    const tasks = await Task.find({ project: { $in: projectIds } })
      .populate("project", "name")
      .populate("assignedTo", "name email")
      .sort({ dueDate: 1 });

    const now = new Date();
    const counts = {
      projects: projects.length,
      total: tasks.length,
      todo: tasks.filter((task) => task.status === "Todo").length,
      inProgress: tasks.filter((task) => task.status === "In Progress").length,
      done: tasks.filter((task) => task.status === "Done").length,
      overdue: tasks.filter((task) => task.status !== "Done" && task.dueDate < now).length
    };

    res.json({
      counts,
      tasks: tasks.slice(0, 12)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
