import express from "express";
import {
  getAlAyyanGroupById,
  getAlAyyanPackageById,
} from "../controllers/alAyyan.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/group/:id", getAlAyyanGroupById);
router.get("/package/:id", getAlAyyanPackageById);

export default router;
