import { NextResponse } from 'next/server';
import { signValue, SESSION_TTL_SEC, LINK_TTL_SEC } from '../../../lib/session-cookie';
import { sunucuHatasi, yukariAkisHatasi } from '../../../lib/api-error';
import { canUseAuthMock, authNotConfigured } from '../../../lib/auth-config';
import { redisCmd, redisSetJSON } from '../../../lib/redis';
import { mergeProfile, getProfile, isBatutaAccount, isTestAccount, isDeveloperAccount } from '../../../lib/social-store';
import { LOGO_SRC } from '../../../lib/logo';
import { guard, penalize } from '../../../lib/rate-guard';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function POST(request) {
  try {
    let { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-posta ve şifre zorunludur.' }, { status: 400 });
    }

    email = String(email).trim();

    // Kullanıcı adı desteği (örn: 'test', '@test', 'batuta', '@batuta')
    let candidateEmails = [];
    if (!email.includes('@')) {
      const clean = email.replace(/^@/, '').toLowerCase();
      if (clean === 'batuta') {
        candidateEmails = ['xxxbatuhan@gmail.com'];
      } else if (clean === 'test' || clean === 'test8') {
        candidateEmails = ['gamerisen@hotmail.com', 'yasuoxsmurf05@gmail.com', 'baymfa2006@gmail.com'];
      } else {
        const uid = await redisCmd(['GET', `username:${clean}`]);
        if (uid) {
          const prof = await getProfile(uid);
          if (prof?.email) candidateEmails = [prof.email];
        }
      }
      if (candidateEmails.length > 0) {
        email = candidateEmails[0];
      }
    } else {
      candidateEmails = [email];
      if (email.toLowerCase() === 'gamerisen@hotmail.com') {
        candidateEmails.push('yasuoxsmurf05@gmail.com');
      } else if (email.toLowerCase() === 'yasuoxsmurf05@gmail.com') {
        candidateEmails.push('gamerisen@hotmail.com');
      }
    }

    // Hesap ekseni YALNIZ başarısız denemede artıyor (bkz. rate-guard.js):
    // her denemede artsaydı, saldırgan kurbanın adresiyle 5 kez yanlış parola
    // göndererek meşru kullanıcıyı 15 dakika kilitleyebilirdi.
    const kapi = await guard(request, 'login', { account: email });
    if (kapi) return kapi;

    // Local development fallback if Firebase Key is not set
    if (!FIREBASE_API_KEY && !canUseAuthMock()) return authNotConfigured();
    if (!FIREBASE_API_KEY) {
      console.warn('FIREBASE_API_KEY is not defined. Falling back to mock login.');
      const userObj = { uid: 'mock_user', name: email.split('@')[0], email };
      const response = NextResponse.json({ ok: true, user: userObj });
      response.cookies.set('gp_user_session', await signValue(userObj, SESSION_TTL_SEC), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_TTL_SEC,
      });
      try {
        await mergeProfile('mock_user', userObj);
      } catch {}
      return response;
    }

    // 1. Sign In User with Firebase Auth (tüm aday e-postaları dene)
    let signInRes = null;
    let signInData = null;
    let matchedEmail = email;

    for (const em of candidateEmails) {
      signInRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: em, password, returnSecureToken: true }),
        }
      );
      signInData = await signInRes.json();
      if (signInRes.ok) {
        matchedEmail = em;
        email = em;
        break;
      }
    }

    if (!signInRes || !signInRes.ok) {
      const errMsg = signInData?.error?.message;
      if (errMsg === 'INVALID_LOGIN_CREDENTIALS' || errMsg === 'INVALID_PASSWORD' || errMsg === 'EMAIL_NOT_FOUND') {
        // Başarısız deneme hesap sayacına yazılıyor — parola deneme burada durur.
        await penalize(request, 'login', { account: email });
        return NextResponse.json({ error: 'E-posta veya şifre hatalı.' }, { status: 400 });
      }
      return yukariAkisHatasi(signInData?.error?.message, 'auth/login',
        'Giriş yapılamadı. Lütfen tekrar deneyin.', 400);
    }

    const { localId, displayName, idToken } = signInData;

    // 2. Fetch User Account Info to check emailVerified status
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    const lookupData = await lookupRes.json();

    if (!lookupRes.ok || !lookupData.users || lookupData.users.length === 0) {
      return NextResponse.json({ error: 'Kullanıcı bilgileri doğrulanamadı.' }, { status: 500 });
    }

    const fbUser = lookupData.users[0];

    // 3. Block login if the email is not verified
    if (!fbUser.emailVerified) {
      return NextResponse.json(
        { error: 'EMAIL_NOT_VERIFIED', message: 'E-posta adresiniz henüz doğrulanmamış.' },
        { status: 403 }
      );
    }

    let profile = null;
    try {
      profile = await getProfile(localId);
    } catch {}

    const isDev = isDeveloperAccount(localId) || isDeveloperAccount(email) || isDeveloperAccount(profile);
    const isBatu = isBatutaAccount(localId) || isBatutaAccount(email) || isBatutaAccount(profile);
    let resolvedUsername = profile?.username || null;
    if (!resolvedUsername && isDev) {
      resolvedUsername = isBatu ? 'batuta' : 'test';
    }

    const userObj = {
      uid: localId,
      name: profile?.displayName || displayName || resolvedUsername || email.split('@')[0],
      username: resolvedUsername,
      isDeveloper: isDev,
      avatar: isDev ? LOGO_SRC : (profile?.avatar || null),
      bio: profile?.bio || null,
      email
    };

    // 4. Set HttpOnly Cookie for successful verified login
    const response = NextResponse.json({ ok: true, user: userObj });
    const userCookieVal = await signValue(userObj, SESSION_TTL_SEC);
    if (userCookieVal) {
      response.cookies.set('gp_user_session', userCookieVal, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_TTL_SEC,
        path: '/',
      });
    }

    // Cache profile and map connections in Redis
    try {
      await mergeProfile(localId, userObj);

      const connRes = await redisCmd(['GET', `user_connections:${localId}`]);
      if (connRes) {
        const connections = typeof connRes === 'string' ? JSON.parse(connRes) : connRes;
        const steamAccounts = (connections.steamAccounts || (connections.steam ? [connections.steam] : [])).filter(a => a && a.steamId);
        for (const acc of steamAccounts) {
          if (acc.steamId) {
            await redisCmd(['SET', `steam_to_uid:${acc.steamId}`, localId]);
          }
        }
        if (connections.xbox && connections.xbox.gamertag && !connections.xbox.isMock) {
          await redisCmd(['SET', `xbox_to_uid:${connections.xbox.gamertag}`, localId]);
        }

        // Çerezleri bağlı hesaplarla senkronize et
        const cookieOpts = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: LINK_TTL_SEC,
        };
        if (steamAccounts.length > 0) {
          const accsVal = await signValue(steamAccounts, LINK_TTL_SEC);
          const singleVal = await signValue(steamAccounts[0], LINK_TTL_SEC);
          if (accsVal) response.cookies.set('gp_steam_accounts', accsVal, cookieOpts);
          if (singleVal) response.cookies.set('gp_steam_session', singleVal, cookieOpts);
        }
        if (connections.xbox) {
          const xbVal = await signValue(connections.xbox, LINK_TTL_SEC);
          if (xbVal) response.cookies.set('gp_xbox_session', xbVal, cookieOpts);
        }
      }
    } catch (e) {
      console.warn('Failed to cache user profile or connections in login:', e.message);
    }

    return response;

  } catch (err) {
    console.error('Login API Error:', err.message);
    return sunucuHatasi(err, 'auth/login');
  }
}
