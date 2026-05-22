import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { User } from "../models/User.js";
import { httpError } from "../utils/httpError.js";

const router = express.Router();

const signupSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email(),
    password: z.string().min(6).max(120)
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    password: z.string().min(6).max(120)
  })
});

function createToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

router.post("/signup", validate(signupSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.validated.body;
    const existing = await User.findOne({ email });

    if (existing) throw httpError(409, "Email is already registered");

    const user = await User.create({ name, email, password });
    res.status(201).json({ user, token: createToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validated.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      throw httpError(401, "Invalid email or password");
    }

    res.json({ user, token: createToken(user) });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
