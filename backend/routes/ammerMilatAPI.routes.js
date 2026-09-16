import express from "express";
import {
  getSectors,
  getAirlines,
  getAvailableSeats,
  getGroupDetail,
  getBookingStatus,
  getAdminAmmerMilatGroups,
  upsertAmmerMilatGroupOverride,
} from "../controllers/ammerMilat.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication (matches the rest of the API surface —
// these calls run server-side against Ameer-e-Millat, never straight from
// a public client, so there's no need for an unauthenticated pass-through).
router.use(protect);

// Live pass-throughs to the FSD Ameer-e-Millat API (see their Postman docs)
router.get("/sectors", getSectors);
router.get("/airlines", getAirlines);
router.get("/seats/:groupId", getAvailableSeats);
router.get("/group/:groupId", getGroupDetail);
router.get("/booking/:bookingId", getBookingStatus);

// Admin-only — includes hidden groups + per-group override data
router.get("/admin-groups", getAdminAmmerMilatGroups);
router.post("/override/:groupId", upsertAmmerMilatGroupOverride);

export default router;
