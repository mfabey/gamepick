'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function AdminUsersPage() {
  const { user, ready } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'hasUsername', 'google', 'apple', 'connected'
  const [copiedId, setCopiedId] = useState(null);

  const isDev = user?.username && ['batuta', 'test'].includes(user.username.toLowerCase());

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      if (res.status === 401 || res.status === 403) {
        setError('FORBIDDEN');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.ok && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setError(data.error || 'FETCH_ERROR');
      }
    } catch (err) {
      setError(err?.message || 'FETCH_ERROR');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready) {
      if (!user) {
        setError('FORBIDDEN');
        setLoading(false);
      } else if (!isDev) {
        setError('FORBIDDEN');
        setLoading(false);
      } else {
        fetchUsers();
      }
    }
  }, [ready, user, isDev]);

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(prev => (prev === id ? null : prev));
    }, 2000);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Filter Type
      if (filterType === 'hasUsername' && !u.username) return false;
      if (filterType === 'google' && !u.providers?.includes('google.com')) return false;
      if (filterType === 'apple' && !u.providers?.includes('apple.com')) return false;
      if (filterType === 'connected' && (!u.steamAccounts?.length && !u.xbox)) return false;

      // Search Query
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const matchUsername = u.username && u.username.toLowerCase().includes(q);
      const matchEmail = u.email && u.email.toLowerCase().includes(q);
      const matchDisplayName = u.displayName && u.displayName.toLowerCase().includes(q);
      const matchUid = u.uid && u.uid.toLowerCase().includes(q);
      const matchSteam = u.steamAccounts?.some(s => (s.name || '').toLowerCase().includes(q) || (s.steamId || '').includes(q));
      const matchXbox = u.xbox && (u.xbox.gamertag || '').toLowerCase().includes(q);

      return matchUsername || matchEmail || matchDisplayName || matchUid || matchSteam || matchXbox;
    });
  }, [users, search, filterType]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const withUsername = users.filter(u => !!u.username).length;
    const verifiedEmails = users.filter(u => !!u.emailVerified).length;
    const withConnectedStores = users.filter(u => (u.steamAccounts && u.steamAccounts.length > 0) || !!u.xbox).length;
    const googleCount = users.filter(u => u.providers?.includes('google.com')).length;
    const appleCount = users.filter(u => u.providers?.includes('apple.com')).length;

    return { total, withUsername, verifiedEmails, withConnectedStores, googleCount, appleCount };
  }, [users]);

  // Export to CSV
  const exportCsv = () => {
    const headers = ['UID', 'Username', 'DisplayName', 'Email', 'EmailVerified', 'Providers', 'SteamAccounts', 'Xbox', 'CreatedAt', 'LastSignIn'];
    const rows = filteredUsers.map(u => [
      `"${u.uid || ''}"`,
      `"${u.username ? '@' + u.username : ''}"`,
      `"${(u.displayName || '').replace(/"/g, '""')}"`,
      `"${u.email || ''}"`,
      u.emailVerified ? 'TRUE' : 'FALSE',
      `"${(u.providers || []).join(', ')}"`,
      `"${(u.steamAccounts || []).map(s => s.name || s.steamId).join(', ')}"`,
      `"${u.xbox ? u.xbox.gamertag : ''}"`,
      `"${u.createdAt || ''}"`,
      `"${u.lastSignInTime || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gamerisen-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (!ready || (loading && !users.length && !error)) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', gap: 16 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', border: '3px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 14, fontWeight: 600 }}>{lang === 'tr' ? 'Geliştirici paneli yükleniyor...' : 'Loading developer panel...'}</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error === 'FORBIDDEN' || (!isDev && ready)) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 440, width: '100%', background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: 32, textAlign: 'center', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>
            🛡️
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
            {lang === 'tr' ? 'Erişim Yetkiniz Yok' : 'Access Restricted'}
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 24 }}>
            {lang === 'tr'
              ? 'Bu sayfayı görüntülemek için yetkiniz bulunmamaktadır.'
              : 'You do not have permission to access this page.'}
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '10px 22px',
              borderRadius: 10,
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 14px var(--accent-glow)',
            }}
          >
            {lang === 'tr' ? 'Ana Sayfaya Dön' : 'Return to Home'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)', padding: '40px 20px 100px' }}>
      <style>{`
        .admin-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }
        .admin-table-container { width: 100%; overflow-x: auto; background: var(--bg-card); border: 1px solid var(--border); borderRadius: 16px; boxShadow: 0 4px 24px rgba(0,0,0,0.15); }
        .admin-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
        .admin-table th { padding: 14px 16px; background: var(--bg-input); color: var(--text-2); font-weight: 700; border-bottom: 1px solid var(--border); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
        .admin-table td { padding: 14px 16px; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
        .admin-table tr:hover td { background: var(--bg-hover); }
        .copy-pill { transition: all 0.15s ease; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border); }
        .copy-pill:hover { border-color: var(--accent); background: var(--accent-bg); color: var(--accent); }
      `}</style>

      <div style={{ maxWidth: 1300, margin: '0 auto' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 24 }}>⚡</span>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.5px', margin: 0 }}>
                Gamerisen Developer Panel
              </h1>
              <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(201,133,10,0.15)', border: '1px solid rgba(201,133,10,0.4)', fontSize: 11.5, color: 'var(--accent)', fontWeight: 800 }}>
                @{user?.username}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
              Kayıtlı tüm kullanıcıların e-posta adresleri, kullanıcı adları, sağlayıcıları ve hesap bağlantıları.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={exportCsv}
              disabled={filteredUsers.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 16px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text)',
                fontSize: 13,
                fontWeight: 600,
                cursor: filteredUsers.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.18s',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV İndir ({filteredUsers.length})
            </button>

            <button
              onClick={fetchUsers}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 16px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px var(--accent-glow)',
                transition: 'all 0.18s',
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              {loading ? 'Yenileniyor...' : 'Yenile'}
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="admin-stat-grid">
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
              Toplam Kayıtlı
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>
              Kayıtlı toplam hesap sayısı
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
              @Kullanıcı Adı Belirleyen
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent)', fontFamily: 'var(--font-heading)' }}>
              {stats.withUsername}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>
              %{stats.total ? Math.round((stats.withUsername / stats.total) * 100) : 0} oranında profil
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
              Doğrulanmış E-posta
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#22c55e', fontFamily: 'var(--font-heading)' }}>
              {stats.verifiedEmails}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>
              Doğrulama linkine tıklayanlar
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
              Bağlı Oyun Mağazaları
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#38bdf8', fontFamily: 'var(--font-heading)' }}>
              {stats.withConnectedStores}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>
              Steam veya Xbox entegre edenler
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none', display: 'flex' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Kullanıcı adı, e-posta, isim veya UID ara..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                borderRadius: 9,
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 13,
                outline: 'none',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-3)',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 700,
                  padding: 4,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: `Tümü (${users.length})` },
              { key: 'hasUsername', label: `@Kullanıcı Adı (${stats.withUsername})` },
              { key: 'google', label: `Google (${stats.googleCount})` },
              { key: 'apple', label: `Apple (${stats.appleCount})` },
              { key: 'connected', label: `Steam/Xbox (${stats.withConnectedStores})` },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilterType(f.key)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: filterType === f.key ? 'var(--accent)' : 'var(--border)',
                  background: filterType === f.key ? 'var(--accent-bg)' : 'var(--bg-input)',
                  color: filterType === f.key ? 'var(--accent)' : 'var(--text-2)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>E-Posta Adresi</th>
                <th>Sağlayıcı / Giriş</th>
                <th>Bağlı Mağazalar</th>
                <th>Kayıt Tarihi</th>
                <th>Son Giriş</th>
                <th>UID</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
                    {search ? 'Aramanızla eşleşen kullanıcı bulunamadı.' : 'Henüz kullanıcı kaydı yok.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const isBatutaOrDev = u.isDeveloper;
                  return (
                    <tr key={u.uid || idx}>
                      {/* Avatar & User Info */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
                            {u.photoURL ? (
                              <img
                                src={u.photoURL}
                                alt=""
                                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: '50%',
                                  background: isBatutaOrDev ? 'var(--accent)' : 'var(--bg-input)',
                                  color: isBatutaOrDev ? '#fff' : 'var(--text-2)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: 13,
                                  border: '1px solid var(--border)',
                                }}
                              >
                                {(u.username || u.displayName || u.email || '?').slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13.5 }}>
                                {u.displayName || 'İsimsiz Kullanıcı'}
                              </span>
                              {isBatutaOrDev && (
                                <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(201,133,10,0.2)', color: 'var(--accent)', fontSize: 10, fontWeight: 800 }}>
                                  DEV
                                </span>
                              )}
                            </div>

                            {u.username ? (
                              <Link
                                href={`/u/${u.username}`}
                                target="_blank"
                                style={{
                                  fontSize: 12,
                                  color: 'var(--accent)',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                }}
                              >
                                @{u.username}
                                <span style={{ fontSize: 10, opacity: 0.7 }}>↗</span>
                              </Link>
                            ) : (
                              <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontStyle: 'italic' }}>
                                (Kullanıcı adı yok)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email with copy & verification */}
                      <td>
                        {u.email ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span
                                className="copy-pill"
                                onClick={() => copyToClipboard(u.email, `email-${u.uid}`)}
                                title="E-postayı kopyala"
                              >
                                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{u.email}</span>
                                <span style={{ fontSize: 11, color: copiedId === `email-${u.uid}` ? '#22c55e' : 'var(--text-3)' }}>
                                  {copiedId === `email-${u.uid}` ? '✓ Kopyalandı' : '📋'}
                                </span>
                              </span>
                              <a
                                href={`mailto:${u.email}`}
                                title="Mail gönder"
                                style={{ color: 'var(--text-3)', textDecoration: 'none', fontSize: 13 }}
                              >
                                ✉️
                              </a>
                            </div>

                            <div>
                              {u.emailVerified ? (
                                <span style={{ fontSize: 10.5, color: '#22c55e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  ● Doğrulandı
                                </span>
                              ) : (
                                <span style={{ fontSize: 10.5, color: '#f59e0b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  ○ Bekliyor
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>
                        )}
                      </td>

                      {/* Providers */}
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {u.providers && u.providers.length > 0 ? (
                            u.providers.map(p => {
                              if (p === 'google.com') {
                                return (
                                  <span key={p} style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.25)', color: '#4285F4', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    Google
                                  </span>
                                );
                              }
                              if (p === 'apple.com') {
                                return (
                                  <span key={p} style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text)', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    Apple
                                  </span>
                                );
                              }
                              if (p === 'password') {
                                return (
                                  <span key={p} style={{ padding: '3px 8px', borderRadius: 6, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 11, fontWeight: 600 }}>
                                    🔑 Şifre
                                  </span>
                                );
                              }
                              return (
                                <span key={p} style={{ padding: '3px 8px', borderRadius: 6, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 11 }}>
                                  {p}
                                </span>
                              );
                            })
                          ) : (
                            <span style={{ color: 'var(--text-3)', fontSize: 11 }}>E-posta / Redis</span>
                          )}
                        </div>
                      </td>

                      {/* Connected Store Accounts */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {u.steamAccounts && u.steamAccounts.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                              {u.steamAccounts.map(s => (
                                <span key={s.steamId} style={{ padding: '2px 7px', borderRadius: 6, background: 'rgba(26,159,255,0.1)', border: '1px solid rgba(26,159,255,0.25)', color: '#38bdf8', fontSize: 11, fontWeight: 600 }}>
                                  Steam: {s.name || s.steamId}
                                </span>
                              ))}
                            </div>
                          )}
                          {u.xbox && (
                            <div>
                              <span style={{ padding: '2px 7px', borderRadius: 6, background: 'rgba(16,124,16,0.12)', border: '1px solid rgba(16,124,16,0.25)', color: '#4ade80', fontSize: 11, fontWeight: 600 }}>
                                Xbox: {u.xbox.gamertag}
                              </span>
                            </div>
                          )}
                          {(!u.steamAccounts || u.steamAccounts.length === 0) && !u.xbox && (
                            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Created At */}
                      <td style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Last Sign In */}
                      <td style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                        {formatDate(u.lastSignInTime)}
                      </td>

                      {/* UID */}
                      <td>
                        <span
                          className="copy-pill"
                          onClick={() => copyToClipboard(u.uid, `uid-${u.uid}`)}
                          title="UID kopyala"
                          style={{ fontFamily: 'monospace', fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {copiedId === `uid-${u.uid}` ? '✓ Kopyalandı' : u.uid?.slice(0, 10) + '…'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
