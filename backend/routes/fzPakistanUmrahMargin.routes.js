import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getFzPakistanUmrahMargin,
  setFzPakistanUmrahMargin,
} from "../controllers/fzPakistanUmrahMargin.controller.js";

const router = express.Router();

// Public GET — frontend needs this without admin auth
router.get("/", getFzPakistanUmrahMargin);

// Admin only — set/update margin
router.post("/", protect, setFzPakistanUmrahMargin);

export default router;
