import { NextResponse } from 'next/server';
import { getUsdToTry } from '../../lib/exchange';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rate = await getUsdToTry();
    return NextResponse.json({ rate });
  } catch (err) {
    return NextResponse.json({ rate: 38 });
  }
}
