export async function parseBody<T>(req: Request): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const data = (await req.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
}
