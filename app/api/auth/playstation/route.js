import { NextResponse } from 'next/server';

export async function GET(request) {
  const { origin } = request.nextUrl;
  // Simulate OAuth redirect to PlayStation Network
  return NextResponse.redirect(`${origin}/api/auth/playstation/callback?code=mock_psn_code`);
}
