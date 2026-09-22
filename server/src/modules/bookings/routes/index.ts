import { Router } from "express";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { bookingsController } from "../controllers/bookings.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", (req, res) => bookingsController.createBooking(req, res));
router.get(
  "/",
  requirePermission(Permissions.BOOKINGS_READ),
  (req, res) => bookingsController.getBookings(req, res),
);
router.patch(
  "/:id/status",
  requirePermission(Permissions.BOOKINGS_UPDATE),
  (req, res) => bookingsController.updateBookingStatus(req, res),
);

export default router;