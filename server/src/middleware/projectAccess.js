import { Project } from "../models/Project.js";
import { httpError } from "../utils/httpError.js";

export async function loadProject(req, _res, next) {
  try {
    const project = await Project.findById(req.params.projectId || req.params.id);
    if (!project) throw httpError(404, "Project not found");

    const membership = project.members.find(
      (member) => member.user.toString() === req.user.id
    );

    if (!membership) throw httpError(403, "You do not have access to this project");

    req.project = project;
    req.projectRole = membership.role;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireProjectAdmin(req, _res, next) {
  if (req.projectRole !== "Admin") {
    return next(httpError(403, "Admin access required"));
  }
  next();
}
