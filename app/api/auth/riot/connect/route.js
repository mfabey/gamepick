import { NextResponse } from 'next/server';
import { readValue, signValue, LINK_TTL_SEC } from '../../../../lib/session-cookie';
import { cookies } from 'next/headers';
import { redisCmd, redisGetJSON, redisSetJSON } from '../../../../lib/redis';

// Bölge / Cluster eşleştirmeleri
const REGION_MAP = {
  tr1:  { cluster: 'europe',   name: 'Türkiye (TR)' },
  euw1: { cluster: 'europe',   name: 'Batı Avrupa (EUW)' },
  eun1: { cluster: 'europe',   name: 'Kuzey & Doğu Avrupa (EUNE)' },
  na1:  { cluster: 'americas', name: 'Kuzey Amerika (NA)' },
  kr:   { cluster: 'asia',     name: 'Kore (KR)' },
  br1:  { cluster: 'americas', name: 'Brezilya (BR)' },
  la1:  { cluster: 'americas', name: 'Latin Amerika Kuzey (LAN)' },
  la2:  { cluster: 'americas', name: 'Latin Amerika Güney (LAS)' },
  oc1:  { cluster: 'sea',      name: 'Okyanusya (OCE)' },
  jp1:  { cluster: 'asia',     name: 'Japonya (JP)' },
};

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { riotId, region = 'tr1', isDemo } = body;

    // Demo / Önizleme Modu (API Key beklenirken veya test için)
    if (isDemo) {
      const demoData = {
        puuid: 'demo-riot-puuid-12345',
        gameName: (riotId || 'Gamerisen').split('#')[0] || 'Gamerisen',
        tagLine: (riotId || 'TR1').split('#')[1] || 'TR1',
        riotId: riotId || 'Gamerisen#TR1',
        region: region,
        platform: region,
        profileIconId: 588,
        summonerLevel: 142,
        isDemo: true,
        ranks: [
          {
            queueType: 'RANKED_SOLO_5x5',
            tier: 'EMERALD',
            rank: 'II',
            leaguePoints: 64,
            wins: 58,
            losses: 42,
            winRate: 58,
          },
          {
            queueType: 'RANKED_FLEX_SR',
            tier: 'PLATINUM',
            rank: 'I',
            leaguePoints: 85,
            wins: 24,
            losses: 16,
            winRate: 60,
          }
        ],
        connectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const cookieStore = await cookies();
      const userSession = cookieStore.get('gp_user_session');
      if (userSession?.value) {
        try {
          const user = await readValue(userSession.value);
          if (user?.uid) {
            const conn = (await redisGetJSON(`user_connections:${user.uid}`).catch(() => null)) || {};
            conn.riot = demoData;
            await redisSetJSON(`user_connections:${user.uid}`, conn);
          }
        } catch {}
      }

      const res = NextResponse.json({ ok: true, riot: demoData });
      res.cookies.set('gp_riot_session', await signValue(demoData, LINK_TTL_SEC), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: LINK_TTL_SEC,
      });
      return res;
    }

    if (!riotId || typeof riotId !== 'string' || !riotId.includes('#')) {
      return NextResponse.json(
        { error: 'Lütfen geçerli bir Riot ID girin. (Örn: Nickname#TR1)' },
        { status: 400 }
      );
    }

    const parts = riotId.trim().split('#');
    const gameName = parts[0]?.trim();
    const tagLine = parts.slice(1).join('#')?.trim();

    if (!gameName || !tagLine) {
      return NextResponse.json(
        { error: 'Riot ID formatı hatalı. İsim ve etiket (#) gereklidir.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RIOT_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Riot API anahtarı sunucuda yapılandırılmamış.' },
        { status: 500 }
      );
    }

    const regConfig = REGION_MAP[region] || REGION_MAP.tr1;
    const cluster = regConfig.cluster;
    const platform = region;

    // 1. Riot Account-V1: PUUID Sorgusu
    const accountUrl = `https://${cluster}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    const accRes = await fetch(accountUrl, {
      headers: { 'X-Riot-Token': apiKey },
      cache: 'no-store',
    });

    if (!accRes.ok) {
      if (accRes.status === 401) {
        return NextResponse.json(
          { error: 'Riot API anahtarının süresi dolmuş veya geçersiz. Lütfen Riot Developer Portal üzerinden anahtarınızı yenileyin (Regenerate API Key).' },
          { status: 401 }
        );
      }
      if (accRes.status === 404) {
        return NextResponse.json(
          { error: `"${riotId}" adlı Riot ID bulunamadı. Lütfen büyük/küçük harf ve etiketi (#) kontrol edin.` },
          { status: 404 }
        );
      }
      if (accRes.status === 403) {
        return NextResponse.json(
          { error: 'Riot API erişim yetkisi reddedildi (Forbidden).' },
          { status: 403 }
        );
      }
      if (accRes.status === 429) {
        return NextResponse.json(
          { error: 'Riot API istek kotası aşıldı. Lütfen birkaç saniye sonra tekrar deneyin.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `Riot sunucu hatası (HTTP ${accRes.status}).` },
        { status: accRes.status }
      );
    }

    const accountData = await accRes.json();
    const puuid = accountData.puuid;

    // 2. Summoner-V4: Seviye ve Profil İkonu
    let summonerData = null;
    try {
      const sumRes = await fetch(`https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`, {
        headers: { 'X-Riot-Token': apiKey },
        cache: 'no-store',
      });
      if (sumRes.ok) {
        summonerData = await sumRes.json();
      }
    } catch {}

    // 3. League-V4: Dereceli Lig Bilgileri
    let ranks = [];
    try {
      let leagueRes = await fetch(`https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`, {
        headers: { 'X-Riot-Token': apiKey },
        cache: 'no-store',
      });

      if (!leagueRes.ok && summonerData?.id) {
        // Eski fallback
        leagueRes = await fetch(`https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerData.id}`, {
          headers: { 'X-Riot-Token': apiKey },
          cache: 'no-store',
        });
      }

      if (leagueRes.ok) {
        const leagueList = await leagueRes.json();
        if (Array.isArray(leagueList)) {
          ranks = leagueList.map(l => ({
            queueType: l.queueType,
            tier: l.tier,
            rank: l.rank,
            leaguePoints: l.leaguePoints || 0,
            wins: l.wins || 0,
            losses: l.losses || 0,
            winRate: (l.wins + l.losses > 0) ? Math.round((l.wins / (l.wins + l.losses)) * 100) : 0,
          }));
        }
      }
    } catch {}

    const riotData = {
      puuid,
      gameName: accountData.gameName || gameName,
      tagLine: accountData.tagLine || tagLine,
      riotId: `${accountData.gameName || gameName}#${accountData.tagLine || tagLine}`,
      region,
      platform,
      profileIconId: summonerData?.profileIconId || 1,
      summonerLevel: summonerData?.summonerLevel || 1,
      ranks,
      connectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Redis ve Oturuma Kaydet
    const cookieStore = await cookies();
    const userSession = cookieStore.get('gp_user_session');
    if (userSession?.value) {
      try {
        const user = await readValue(userSession.value);
        if (user?.uid) {
          const conn = (await redisGetJSON(`user_connections:${user.uid}`).catch(() => null)) || {};
          conn.riot = riotData;
          await redisSetJSON(`user_connections:${user.uid}`, conn);
          await redisCmd(['SET', `riot_to_uid:${puuid}`, user.uid]);
        }
      } catch {}
    }

    const res = NextResponse.json({ ok: true, riot: riotData });
    res.cookies.set('gp_riot_session', await signValue(riotData, LINK_TTL_SEC), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: LINK_TTL_SEC,
    });

    return res;
  } catch (err) {
    console.error('Riot connect error:', err);
    return NextResponse.json({ error: err.message || 'Bağlantı sırasında bir hata oluştu.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const userSession = cookieStore.get('gp_user_session');

    if (userSession?.value) {
      try {
        const user = await readValue(userSession.value);
        if (user?.uid) {
          const conn = (await redisGetJSON(`user_connections:${user.uid}`).catch(() => null)) || {};
          if (conn.riot?.puuid) {
            await redisCmd(['DEL', `riot_to_uid:${conn.riot.puuid}`]);
          }
          delete conn.riot;
          await redisSetJSON(`user_connections:${user.uid}`, conn);
        }
      } catch {}
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set('gp_riot_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
