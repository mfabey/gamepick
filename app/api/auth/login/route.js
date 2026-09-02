import { NextResponse } from 'next/server';
import { redisCmd, redisSetJSON } from '../../../lib/redis';
import { mergeProfile } from '../../../lib/social-store';
import { guard, penalize } from '../../../lib/rate-guard';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-posta ve şifre zorunludur.' }, { status: 400 });
    }

    // Hesap ekseni YALNIZ başarısız denemede artıyor (bkz. rate-guard.js):
    // her denemede artsaydı, saldırgan kurbanın adresiyle 5 kez yanlış parola
    // göndererek meşru kullanıcıyı 15 dakika kilitleyebilirdi.
    const kapi = await guard(request, 'login', { account: email });
    if (kapi) return kapi;

    // Local development fallback if Firebase Key is not set
    if (!FIREBASE_API_KEY) {
      console.warn('FIREBASE_API_KEY is not defined. Falling back to mock login.');
      const userObj = { uid: 'mock_user', name: email.split('@')[0], email };
      const response = NextResponse.json({ ok: true, user: userObj });
      response.cookies.set('gp_user_session', JSON.stringify(userObj), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      try {
        await mergeProfile('mock_user', userObj);
      } catch {}
      return response;
    }

    // 1. Sign In User with Firebase Auth
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const signInData = await signInRes.json();

    if (!signInRes.ok) {
      const errMsg = signInData?.error?.message;
      if (errMsg === 'INVALID_LOGIN_CREDENTIALS' || errMsg === 'INVALID_PASSWORD' || errMsg === 'EMAIL_NOT_FOUND') {
        // Başarısız deneme hesap sayacına yazılıyor — parola deneme burada durur.
        await penalize(request, 'login', { account: email });
        return NextResponse.json({ error: 'E-posta veya şifre hatalı.' }, { status: 400 });
      }
      return NextResponse.json({ error: signInData?.error?.message || 'Giriş başarısız.' }, { status: signInRes.status });
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

    const userObj = {
      uid: localId,
      name: displayName || email.split('@')[0],
      email
    };

    // 4. Set HttpOnly Cookie for successful verified login
    const response = NextResponse.json({ ok: true, user: userObj });
    response.cookies.set('gp_user_session', JSON.stringify(userObj), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Cache profile and map connections in Redis
    try {
      await mergeProfile(localId, userObj);

      const connRes = await redisCmd(['GET', `user_connections:${localId}`]);
      if (connRes) {
        const connections = JSON.parse(connRes);
        const steamAccounts = connections.steamAccounts || (connections.steam ? [connections.steam] : []);
        for (const acc of steamAccounts) {
          if (acc.steamId) {
            await redisCmd(['SET', `steam_to_uid:${acc.steamId}`, localId]);
          }
        }
        // SİMÜLASYON OTURUMU İNDEKSLENMEZ. Gamertag, mock-login'de kullanıcının
        // serbestçe yazdığı bir alan; simüle bir kimliği gerçek eşleme
        // tablosuna yazmak hem sınırsız anahtar üretiyor hem de ileride bu
        // tabloyu okuyan biri çıkarsa doğrudan taklit yoluna dönüşürdü.
        if (connections.xbox && connections.xbox.gamertag && !connections.xbox.isMock) {
          await redisCmd(['SET', `xbox_to_uid:${connections.xbox.gamertag}`, localId]);
        }
      }
    } catch (e) {
      console.warn('Failed to cache user profile or connections in login:', e.message);
    }

    return response;

  } catch (err) {
    console.error('Login API Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
