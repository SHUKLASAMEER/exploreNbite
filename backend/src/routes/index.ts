import { Router } from "express";
import { healthRouter } from "../modules/health/health.routes";

// Feature routers (posts, categories, comments, etc.) are mounted here in
// later phases. Only the health check exists in Phase 2A.
export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
