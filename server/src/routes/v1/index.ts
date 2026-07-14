import { Router } from "express";
import { registerFeatureRoutes } from "../router-loader.js";

const router = Router();

registerFeatureRoutes(router);

export default router;
