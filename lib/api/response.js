import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { AppError } from "./errors";

// Call from a route handler's catch block:
//   } catch (err) { return handleApiError(err); }
// Returns a consistent { error: { message, code } } JSON shape, adapted
// from the Phase 2A Express error handler (backend/src/middleware/errorHandler.ts).
export function handleApiError(err) {
  if (err instanceof AppError) {
    return NextResponse.json({ error: { message: err.message, code: err.code } }, { status: err.statusCode });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: { message: "A record with this value already exists.", code: "UNIQUE_CONSTRAINT" } },
        { status: 409 }
      );
    }
    if (err.code === "P2003") {
      return NextResponse.json(
        { error: { message: "Referenced record does not exist.", code: "FOREIGN_KEY_CONSTRAINT" } },
        { status: 400 }
      );
    }
    if (err.code === "P2025") {
      return NextResponse.json({ error: { message: "Record not found.", code: "NOT_FOUND" } }, { status: 404 });
    }
  }

  console.error(err);
  return NextResponse.json({ error: { message: "Internal server error.", code: "INTERNAL_ERROR" } }, { status: 500 });
}
