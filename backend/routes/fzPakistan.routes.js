import express from "express";
import {
  getAdminFzPakistanGroups,
  upsertFzPakistanGroupOverride,
} from "../controllers/fzPakistan.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/admin-groups", getAdminFzPakistanGroups);
router.post("/override/:groupId", upsertFzPakistanGroupOverride);

export default router;