import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "EMAIL_LOGIN_REQUIRED" }, { status: 410 });
}
