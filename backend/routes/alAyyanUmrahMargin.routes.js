import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getAlAyyanUmrahMargin,
  setAlAyyanUmrahMargin,
} from "../controllers/alAyyanUmrahMargin.controller.js";

const router = express.Router();

// Public GET — frontend needs this without admin auth
router.get("/", getAlAyyanUmrahMargin);

// Admin only — set/update margin
router.post("/", protect, setAlAyyanUmrahMargin);

export default router;
