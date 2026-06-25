import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  const { origin } = request.nextUrl;
  
  // Create a mock PlayStation Network user
  const mockUser = {
    psnId: 'gamer_psn_123',
    name: 'PSN Gamer',
    // Realistic PSN avatar
    avatar: 'https://i.imgur.com/3Z0o2Xp.png',
    isMock: true
  };
  
  cookies().set('psn_session', JSON.stringify(mockUser), { path: '/', maxAge: 60 * 60 * 24 * 7 });
  
  // Redirect back to profile page
  return NextResponse.redirect(`${origin}/profile`);
}
