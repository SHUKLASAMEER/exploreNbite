import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "./AppError";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.originalUrl}`, code: "ROUTE_NOT_FOUND" },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { message: err.message, code: err.code } });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: { message: "A record with this value already exists.", code: "UNIQUE_CONSTRAINT" } });
      return;
    }
    if (err.code === "P2003") {
      res.status(400).json({ error: { message: "Referenced record does not exist.", code: "FOREIGN_KEY_CONSTRAINT" } });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: { message: "Record not found.", code: "NOT_FOUND" } });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ error: { message: "Internal server error.", code: "INTERNAL_ERROR" } });
}
