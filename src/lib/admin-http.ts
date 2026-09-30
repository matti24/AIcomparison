import "server-only";
import { NextResponse } from "next/server";

export class HttpInputError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "HttpInputError";
  }
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new HttpInputError("Content-Type must be application/json.", 415);
  }
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) throw new HttpInputError("Request is too large.", 413);
  if (!request.body) throw new HttpInputError("A JSON request body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpInputError("Request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) throw new HttpInputError("The request body is not valid JSON.");
    throw error;
  }
}

export function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
