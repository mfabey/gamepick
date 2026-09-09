import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  return new NextResponse(
    JSON.stringify({
      associatedApplications: [
        {
          applicationId: "e6c5e9f9-991f-4273-af8f-8f26b625c5ff"
        }
      ]
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}
