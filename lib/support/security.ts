const DEFAULT_BODY_LIMIT = 8 * 1024;

export async function readJsonBodyLimited<T = unknown>(
  request: Request,
  maxBytes = DEFAULT_BODY_LIMIT
): Promise<{ ok: true; value: T } | { ok: false; status: number; error: string }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const parsed = Number(contentLength);
    if (Number.isFinite(parsed) && parsed > maxBytes) {
      return { ok: false, status: 413, error: "Запрос слишком большой" };
    }
  }

  if (!request.body) {
    return { ok: false, status: 400, error: "Пустой запрос" };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, status: 413, error: "Запрос слишком большой" };
      }

      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: "Не удалось прочитать запрос" };
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const value = JSON.parse(new TextDecoder().decode(merged)) as T;
    return { ok: true, value };
  } catch {
    return { ok: false, status: 400, error: "Некорректный JSON" };
  }
}

export function validVisitorId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 8 &&
    value.length <= 120 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}
