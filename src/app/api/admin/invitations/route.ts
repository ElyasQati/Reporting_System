import { NextResponse } from "next/server";
import { api, ApiError, body } from "@/lib/http";
import { collections } from "@/lib/db";
import { invitationSchema } from "@/lib/email-validation";
import { issueInvitation, limitAttempts } from "@/lib/email-auth";
import { z } from "zod";

export const GET = api(
  async () => {
    const c = await collections();
    const invitations = await c.invitations
      .find({}, { projection: { codeHash: 0 } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    return NextResponse.json(
      { invitations },
      { headers: { "Cache-Control": "no-store" } },
    );
  },
  false,
  true,
);
export const POST = api(
  async (request, user) => {
    const input = invitationSchema.parse(await body(request, 10000));
    await limitAttempts(`invitations:${user._id}`, 50);
    return NextResponse.json(
      await issueInvitation(input.email, input.days, user._id),
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  },
  true,
  true,
);
export const PATCH = api(
  async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(await body(request, 10000));
    const c = await collections();
    const result = await c.invitations.updateOne(
      { _id: id, usedAt: null, revokedAt: null },
      { $set: { revokedAt: new Date().toISOString() } },
    );
    if (!result.modifiedCount) throw new ApiError("INVITATION_NOT_ACTIVE", 409);
    return NextResponse.json({ ok: true });
  },
  true,
  true,
);
