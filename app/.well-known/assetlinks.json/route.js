import { NextResponse } from 'next/server';

const ASSET_LINKS = [
  {
    relation: [
      'delegate_permission/common.handle_all_urls',
      'delegate_permission/common.get_login_creds'
    ],
    target: {
      namespace: 'android_app',
      package_name: 'com.gamerisen.app',
      sha256_cert_fingerprints: [
        'B9:84:C7:A0:BE:03:29:EA:1E:90:A2:5D:D2:07:6E:43:1E:FD:FD:CC:4B:90:FC:F6:23:AD:78:D8:B4:BD:23:D9',
        '10:24:98:3E:25:23:E0:0C:5A:94:78:01:D9:B3:0B:33:BF:72:9C:7A:50:93:3F:3E:C6:62:7F:BF:B3:9B:F8:ED',
        '2B:5F:3F:2D:6B:00:BA:CB:DB:9B:C5:7C:AC:06:77:E3:CF:DE:CF:1A:B7:D3:86:72:5E:2B:EB:0B:55:7E:F6:24'
      ]
    }
  }
];

export async function GET() {
  return new NextResponse(JSON.stringify(ASSET_LINKS, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
