import { NextRequest, NextResponse } from "next/server";
import { api, ApiError, body } from "@/lib/http";
import { entities, saveEntity, type Entity } from "@/lib/services";
import { workspaceCollections } from "@/lib/workspace";
import { workspaceOwner } from "@/lib/access";
type Context = { params: Promise<{ entity: string }> };
export async function GET(request: NextRequest, context: Context) {
  return api(async (req, user) => {
    const { entity } = await context.params;
    if (!entities.includes(entity as Entity))
      throw new ApiError("NOT_FOUND", 404);
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 25),
    );
    if (!Number.isInteger(page) || !Number.isInteger(limit))
      throw new ApiError("INVALID_PAGINATION");
    const c = await workspaceCollections(workspaceOwner(user));
    const collection = c.collection(entity as Entity);
    const archived = req.nextUrl.searchParams.get("archived") === "true";
    const query: Record<string, unknown> = {
      archivedAt: archived ? { $ne: null } : null,
    };
    const classId = req.nextUrl.searchParams.get("classId");
    if (entity === "reports" && classId) query.classId = classId;
    if (entity === "reports" && !archived) {
      const active = await c.classes
        .find({ archivedAt: null }, { projection: { _id: 1 } })
        .toArray();
      query.classId = classId
        ? { $eq: classId, $in: active.map((r) => r._id) }
        : { $in: active.map((r) => r._id) };
    }
    if (entity === "reports" && archived) {
      const parents = await c.classes
        .find({ archivedAt: { $ne: null } }, { projection: { _id: 1 } })
        .toArray();
      delete query.archivedAt;
      query.$or = [
        { archivedAt: { $ne: null } },
        { classId: { $in: parents.map((c) => c._id) } },
      ];
    }
    const [items, total] = await Promise.all([
      collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);
    return NextResponse.json(
      { items, total, page, limit },
      { headers: { "Cache-Control": "no-store" } },
    );
  })(request);
}
export async function POST(request: NextRequest, context: Context) {
  return api(async (req, user) => {
    const { entity } = await context.params;
    if (!entities.includes(entity as Entity))
      throw new ApiError("NOT_FOUND", 404);
    return NextResponse.json(
      await saveEntity(user._id, entity as Entity, await body(req)),
      { status: 201 },
    );
  }, true)(request);
}
