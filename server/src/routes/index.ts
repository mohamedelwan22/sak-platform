import { Router } from "express";
import healthRoutes from "./health.js";
import versionRoutes from "./version.js";
import v1Routes from "./v1/index.js";
import { notFoundHandler } from "../middlewares/index.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/version", versionRoutes);

router.use("/api/v1", v1Routes);

router.use("/api", notFoundHandler);

export default router;
