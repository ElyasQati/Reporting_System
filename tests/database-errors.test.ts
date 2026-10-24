import { describe, expect, it } from "vitest";
import {
  MongoClient,
  MongoNetworkError,
  MongoParseError,
  MongoServerError,
} from "mongodb";
import { databaseFailure, safeErrorDetails } from "../src/lib/database-errors";

describe("safe database diagnostics", () => {
  it("distinguishes missing settings, invalid connection strings and network failures", () => {
    for (const uri of [
      "invalid-connection-for-diagnostics",
      "MONGODB_URI=mongodb://localhost:27017",
    ]) {
      try {
        new MongoClient(uri);
        throw new Error("Expected a genuine driver parsing error.");
      } catch (error) {
        expect(databaseFailure(error)).toBe("DATABASE_CONFIGURATION_ERROR");
      }
    }
    expect(databaseFailure(new Error("DATABASE_NOT_CONFIGURED"))).toBe(
      "DATABASE_NOT_CONFIGURED",
    );
    expect(databaseFailure(new MongoParseError("invalid URI"))).toBe(
      "DATABASE_CONFIGURATION_ERROR",
    );
    expect(databaseFailure(new MongoNetworkError("connection refused"))).toBe(
      "DATABASE_UNREACHABLE",
    );
  });
  it("distinguishes database credentials from application user credentials and permissions", () => {
    expect(
      databaseFailure(
        new MongoServerError({ message: "Authentication failed", code: 18 }),
      ),
    ).toBe("DATABASE_AUTH_FAILED");
    expect(
      databaseFailure(
        new MongoServerError({
          message: "bad auth : authentication failed",
          code: 8000,
        }),
      ),
    ).toBe("DATABASE_AUTH_FAILED");
    expect(
      databaseFailure(
        new MongoServerError({ message: "not authorized", code: 13 }),
      ),
    ).toBe("DATABASE_PERMISSION_DENIED");
    expect(databaseFailure(new Error("INVALID_CREDENTIALS"))).toBeNull();
  });
  it("does not put the URI, password, raw message or stack into log/response metadata", () => {
    const raw =
      "mongodb://test-user:private-test-password@private.example/database";
    const details = safeErrorDetails(
      new MongoServerError({ message: raw, code: 18 }),
    );
    expect(details).toEqual({
      name: "MongoServerError",
      diagnosis: "DATABASE_AUTH_FAILED",
      mongoCode: 18,
    });
    expect(JSON.stringify(details)).not.toContain(raw);
    expect(safeErrorDetails(new Error(raw))).toEqual({
      name: "Error",
      diagnosis: "SERVER_UNAVAILABLE",
    });
  });
});
