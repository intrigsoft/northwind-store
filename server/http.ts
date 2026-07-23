/** Tiny JSON response helpers for route handlers. */
import { NextResponse } from 'next/server';

export function json<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
