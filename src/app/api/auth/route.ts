import { NextResponse } from "next/server";
import { currentUser, destroySession } from "@/lib/auth";
import { api, errorResponse } from "@/lib/http";
import { publicUser } from "@/lib/access";

export async function GET() {
  try {
    const user = await currentUser();
    return NextResponse.json(
      { user: user ? publicUser(user) : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
// Password sign-in and public password registration are deliberately unavailable.
export const DELETE = api(async () => {
  await destroySession();
  return NextResponse.json({ ok: true });
}, true);
