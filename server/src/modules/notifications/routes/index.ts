import { Router } from "express";
import { NotificationController } from "../controllers/notifications.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { createNotificationSchema, markAllAsReadSchema } from "../validators/index.js";

const router = Router();
const controller = new NotificationController();

router.get("/", authenticate, requirePermission(Permissions.NOTIFICATIONS_READ), (req, res) =>
  controller.findAll(req, res),
);

router.get("/unread/count", authenticate, (req, res) => controller.getUnreadCount(req, res));

router.get("/:id", authenticate, requirePermission(Permissions.NOTIFICATIONS_READ), (req, res) =>
  controller.findById(req, res),
);

router.post(
  "/",
  authenticate,
  requirePermission(Permissions.NOTIFICATIONS_CREATE),
  validate(createNotificationSchema),
  (req, res) => controller.create(req, res),
);

router.post(
  "/read-all",
  authenticate,
  requirePermission(Permissions.NOTIFICATIONS_UPDATE),
  validate(markAllAsReadSchema),
  (req, res) => controller.markAllAsRead(req, res),
);

router.post(
  "/:id/read",
  authenticate,
  requirePermission(Permissions.NOTIFICATIONS_UPDATE),
  (req, res) => controller.markAsRead(req, res),
);

router.delete(
  "/:id",
  authenticate,
  requirePermission(Permissions.NOTIFICATIONS_DELETE),
  (req, res) => controller.delete(req, res),
);

export default router;
