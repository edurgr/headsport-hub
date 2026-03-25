import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ error: 'This endpoint has been removed. Use /api/invitations/* instead.' }, { status: 410 });
}
export async function POST() {
  return NextResponse.json({ error: 'This endpoint has been removed. Use /api/invitations/* instead.' }, { status: 410 });
}
