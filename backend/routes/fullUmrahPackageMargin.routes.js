import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getFullUmrahPackageMargin,
  setFullUmrahPackageMargin,
} from "../controllers/fullUmrahPackageMargin.controller.js";

const router = express.Router();

// Public GET — frontend needs this without admin auth
router.get("/", getFullUmrahPackageMargin);

// Admin only — set/update margin
router.post("/", protect, setFullUmrahPackageMargin);

export default router;
