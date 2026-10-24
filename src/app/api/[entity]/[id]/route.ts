import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, body } from "@/lib/http";
import {
  archiveEntity,
  entities,
  saveEntity,
  type Entity,
} from "@/lib/services";
type Context = { params: Promise<{ entity: string; id: string }> };
async function target(context: Context) {
  const { entity, id } = await context.params;
  if (!entities.includes(entity as Entity) || !z.uuid().safeParse(id).success)
    throw new ApiError("NOT_FOUND", 404);
  return { entity: entity as Entity, id };
}
export async function PUT(request: NextRequest, context: Context) {
  return api(async (req, user) => {
    const t = await target(context);
    return NextResponse.json(
      await saveEntity(user._id, t.entity, await body(req), t.id),
    );
  }, true)(request);
}
export async function PATCH(request: NextRequest, context: Context) {
  return api(async (req, user) => {
    const t = await target(context);
    const { action } = z
      .object({ action: z.enum(["archive", "restore", "delete"]) })
      .parse(await body(req));
    await archiveEntity(user._id, t.entity, t.id, action);
    return NextResponse.json({ ok: true });
  }, true)(request);
}
