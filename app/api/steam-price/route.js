import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ error: 'Bu API kaldırıldı.' }, { status: 410 });
}
