import { NextRequest, NextResponse } from "next/server";

type ParseOk<T> = { ok: true; data: T };
type ParseErr = { ok: false; res: NextResponse };

export async function parseBody<T>(req: NextRequest): Promise<ParseOk<T> | ParseErr> {
  try {
    const data = (await req.json()) as T;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      res: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}
