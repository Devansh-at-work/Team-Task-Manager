import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const search = (req.query.search || "").toString().trim();
    const filter = search
      ? {
          $or: [
            { name: new RegExp(search, "i") },
            { email: new RegExp(search, "i") }
          ]
        }
      : {};

    const users = await User.find(filter).sort({ name: 1 }).limit(50);
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

export default router;
