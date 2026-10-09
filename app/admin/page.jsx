'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LOGO_SRC } from '../lib/logo';

export default function AdminUsersPage() {
  const { user, ready } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [users, setUsers] = useState([]);
  const [backendStats, setBackendStats] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'hasUsername', 'connected', 'social', 'google', 'apple', 'dev'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'lastActive', 'collections', 'reviews', 'name'
  const [selectedUser, setSelectedUser] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showJson, setShowJson] = useState(false);

  // Geliştirici yetki doğrulaması: username, uid, email esnek kontrolleri
  const isDev = Boolean(
    user && (
      ['batuta', 'test'].includes(String(user.username || '').replace(/^@/, '').toLowerCase().trim()) ||
      ['M05J6kGPeqPAkPG55Blg7dJlVsY2', '5FimwbEHFQZ75FgL2PkgIY9OQV92'].includes(user.uid) ||
      ['xxxbatuhan@gmail.com', 'baymfa1453@gmail.com', '240404021@ogr.kent.edu.tr'].includes(String(user.email || '').toLowerCase().trim()) ||
      String(user.email || '').toLowerCase().includes('batuta') ||
      String(user.email || '').toLowerCase().includes('baymfa') ||
      user.isDeveloper
    )
  );

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3500);
  };

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
        if (data.stats) {
          setBackendStats(data.stats);
        }
      } else {
        setError(data.error || 'FETCH_ERROR');
      }
    } catch (err) {
      setError(err?.message || 'FETCH_ERROR');
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalRepair = async () => {
    if (repairing) return;
    setRepairing(true);
    try {
      const res = await fetch('/api/admin/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'global_sync' }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Tüm tersine kullanıcı adı dizinleri ve geliştirici profili senkronize edildi!', 'success');
        await fetchUsers();
      } else {
        showToast(data.error || 'Onarım sırasında hata oluştu.', 'error');
      }
    } catch (err) {
      showToast(err?.message || 'Bağlantı hatası.', 'error');
    } finally {
      setRepairing(false);
    }
  };

  const handleRepairSingleUser = async (targetUid) => {
    if (!targetUid) return;
    try {
      const res = await fetch('/api/admin/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'repair_user', targetUid }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Kullanıcı indeksi başarıyla onarıldı!', 'success');
        await fetchUsers();
      } else {
        showToast(data.error || 'Onarım başarısız.', 'error');
      }
    } catch (err) {
      showToast(err?.message || 'Hata oluştu.', 'error');
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

  const copyToClipboard = (text, id, label = 'Panoya kopyalandı!') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(label, 'success');
    setTimeout(() => {
      setCopiedId(prev => (prev === id ? null : prev));
    }, 2000);
  };

  // Filtreleme ve arama mantığı
  const filteredUsers = useMemo(() => {
    const list = users.filter(u => {
      // Filtre tipi
      if (filterType === 'hasUsername' && !u.username) return false;
      if (filterType === 'connected' && (!u.steamAccounts?.length && !u.xbox)) return false;
      if (filterType === 'social') {
        const hasSocialActivity =
          (u.stats?.reviews || 0) > 0 ||
          (u.stats?.posts || 0) > 0 ||
          (u.stats?.collectionGames || 0) > 0 ||
          (u.stats?.wishlist || 0) > 0 ||
          (u.stats?.friends || 0) > 0;
        if (!hasSocialActivity) return false;
      }
      if (filterType === 'google' && !u.providers?.includes('google.com')) return false;
      if (filterType === 'apple' && !u.providers?.includes('apple.com')) return false;
      if (filterType === 'dev' && !u.isDeveloper) return false;

      // Arama sorgusu
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const matchUsername = u.username && u.username.toLowerCase().includes(q);
      const matchEmail = u.email && u.email.toLowerCase().includes(q);
      const matchDisplayName = u.displayName && u.displayName.toLowerCase().includes(q);
      const matchUid = u.uid && u.uid.toLowerCase().includes(q);
      const matchSteam = u.steamAccounts?.some(
        s => (s.name || '').toLowerCase().includes(q) || (s.steamId || '').includes(q)
      );
      const matchXbox = u.xbox && (u.xbox.gamertag || '').toLowerCase().includes(q);

      return matchUsername || matchEmail || matchDisplayName || matchUid || matchSteam || matchXbox;
    });

    // Sıralama
    return list.sort((a, b) => {
      if (a.isDeveloper && !b.isDeveloper) return -1;
      if (!a.isDeveloper && b.isDeveloper) return 1;

      if (sortBy === 'newest') {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      }
      if (sortBy === 'lastActive') {
        const tA = a.lastSignInTime ? new Date(a.lastSignInTime).getTime() : 0;
        const tB = b.lastSignInTime ? new Date(b.lastSignInTime).getTime() : 0;
        return tB - tA;
      }
      if (sortBy === 'collections') {
        return (b.stats?.collectionGames || 0) - (a.stats?.collectionGames || 0);
      }
      if (sortBy === 'reviews') {
        const sumA = (a.stats?.reviews || 0) + (a.stats?.posts || 0);
        const sumB = (b.stats?.reviews || 0) + (b.stats?.posts || 0);
        return sumB - sumA;
      }
      if (sortBy === 'name') {
        return (a.displayName || a.username || '').localeCompare(b.displayName || b.username || '');
      }
      return 0;
    });
  }, [users, search, filterType, sortBy]);

  // Dashboard İstatistikleri
  const stats = useMemo(() => {
    if (backendStats) return backendStats;
    const total = users.length;
    const withUsername = users.filter(u => !!u.username).length;
    const verifiedEmails = users.filter(u => !!u.emailVerified).length;
    const withConnectedStores = users.filter(u => (u.steamAccounts && u.steamAccounts.length > 0) || !!u.xbox).length;
    const totalSteamAccounts = users.reduce((acc, u) => acc + (u.steamAccounts?.length || 0), 0);
    const totalXboxAccounts = users.filter(u => !!u.xbox).length;
    const totalReviews = users.reduce((acc, u) => acc + (u.stats?.reviews || 0), 0);
    const totalPosts = users.reduce((acc, u) => acc + (u.stats?.posts || 0), 0);
    const totalFriends = users.reduce((acc, u) => acc + (u.stats?.friends || 0), 0);
    const totalCollectionGames = users.reduce((acc, u) => acc + (u.stats?.collectionGames || 0), 0);
    const totalWishlistGames = users.reduce((acc, u) => acc + (u.stats?.wishlist || 0), 0);
    const googleCount = users.filter(u => u.providers?.includes('google.com')).length;
    const appleCount = users.filter(u => u.providers?.includes('apple.com')).length;

    return {
      total,
      withUsername,
      verifiedEmails,
      withConnectedStores,
      totalSteamAccounts,
      totalXboxAccounts,
      totalReviews,
      totalPosts,
      totalFriends,
      totalCollectionGames,
      totalWishlistGames,
      googleCount,
      appleCount,
    };
  }, [users, backendStats]);

  // CSV İndirme
  const exportCsv = () => {
    const headers = [
      'UID',
      'Kullanıcı Adı',
      'Görünen Ad',
      'E-Posta',
      'E-Posta Doğrulandı',
      'Sağlayıcılar',
      'Steam Hesapları',
      'Xbox Gamertag',
      'Koleksiyon Oyun Sayısı',
      'İstek Listesi Sayısı',
      'İnceleme Sayısı',
      'Gönderi Sayısı',
      'Arkadaş Sayısı',
      'Kayıt Tarihi',
      'Son Giriş Tarihi',
    ];

    const rows = filteredUsers.map(u => [
      `"${u.uid || ''}"`,
      `"${u.username ? '@' + u.username : ''}"`,
      `"${(u.displayName || '').replace(/"/g, '""')}"`,
      `"${u.email || ''}"`,
      u.emailVerified ? 'EVET' : 'HAYIR',
      `"${(u.providers || []).join(', ')}"`,
      `"${(u.steamAccounts || []).map(s => s.name || s.steamId).join('; ')}"`,
      `"${u.xbox ? u.xbox.gamertag : ''}"`,
      u.stats?.collectionGames || 0,
      u.stats?.wishlist || 0,
      u.stats?.reviews || 0,
      u.stats?.posts || 0,
      u.stats?.friends || 0,
      `"${u.createdAt || ''}"`,
      `"${u.lastSignInTime || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gamerisen-admin-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV dosyası başarıyla indirildi!', 'success');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Yükleme durumu
  if (!ready || (loading && !users.length && !error)) {
    return (
      <div style={{ minHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', gap: 20 }}>
        <div style={{ position: 'relative', width: 54, height: 54 }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', border: '3px solid rgba(201,133,10,0.2)', borderTopColor: 'var(--accent)', animation: 'spin 0.75s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚡</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            Gamerisen Dev Studio
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
            Kullanıcı profilleri ve istatistikleri yükleniyor...
          </p>
        </div>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Erişim reddedildi durumu
  if (error === 'FORBIDDEN' || (!isDev && ready)) {
    return (
      <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="premium-dashboard-card" style={{ maxWidth: 460, width: '100%', padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32 }}>
            🛡️
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 900, color: 'var(--text)', marginBottom: 10, letterSpacing: '-0.3px' }}>
            Erişim Yetkiniz Bulunmuyor
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 28 }}>
            Gamerisen Geliştirici & Sistem Paneli yalnızca yetkili sistem yöneticileri (@batuta) tarafından görüntülenebilir.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 26px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--accent), #d97706)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 18px var(--accent-glow)',
            }}
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)', padding: '36px 20px 120px' }}>
      <style>{`
        .dev-badge-pulse {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 999px;
          background: rgba(201,133,10,0.12);
          border: 1px solid rgba(201,133,10,0.35);
          color: var(--accent);
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.03em;
        }
        .dev-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 10px var(--accent);
          animation: devPulse 1.6s ease-in-out infinite;
        }
        @keyframes devPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        .admin-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }
        .admin-kpi-card {
          padding: 20px;
          border-radius: 18px;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .admin-kpi-card:hover {
          transform: translateY(-2px);
          border-color: rgba(201,133,10,0.4);
        }
        .admin-table-wrap {
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .admin-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13px;
        }
        .admin-table th {
          padding: 16px 18px;
          background: rgba(0,0,0,0.3);
          color: var(--text-2);
          font-weight: 700;
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          white-space: nowrap;
          text-align: left;
        }
        .admin-table td {
          padding: 16px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          color: var(--text);
          vertical-align: middle;
          transition: background 0.15s ease;
        }
        .admin-table tr:hover td {
          background: rgba(255,255,255,0.025);
        }
        .action-btn-hover {
          transition: all 0.18s ease;
        }
        .action-btn-hover:hover {
          transform: translateY(-1px);
        }
        .drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          justify-content: flex-end;
          animation: fadeIn 0.2s ease-out;
        }
        .drawer-content {
          width: 100%;
          max-width: 540px;
          height: 100%;
          background: #111317;
          border-left: 1px solid rgba(255,255,255,0.12);
          overflow-y: auto;
          box-shadow: -10px 0 40px rgba(0,0,0,0.7);
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .interactive-chip {
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .interactive-chip:hover {
          filter: brightness(1.2);
          transform: scale(1.02);
        }
      `}</style>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            right: 28,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 20px',
            borderRadius: 14,
            background: toast.type === 'error' ? 'rgba(239,68,68,0.92)' : 'rgba(20,22,26,0.95)',
            border: `1px solid ${toast.type === 'error' ? '#ef4444' : 'var(--accent)'}`,
            boxShadow: '0 12px 35px rgba(0,0,0,0.5)',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <span>{toast.type === 'error' ? '⚠️' : '✨'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div style={{ maxWidth: 1380, margin: '0 auto' }}>
        {/* Top Header & Dev Operator Card */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div className="dev-badge-pulse">
                <span className="dev-pulse-dot" />
                GAMERISEN DEV ENGINE
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
                Canlı Veri Senkronizasyonu
              </span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 28,
                fontWeight: 900,
                color: 'var(--text)',
                letterSpacing: '-0.7px',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Developer & Sistem Kontrol Paneli
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: '6px 0 0', maxWidth: 650 }}>
              Firebase Auth, Redis kullanıcı profilleri, Steam/Xbox bağlantıları ve gerçek zamanlı kütüphane & topluluk istatistikleri.
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Operator Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <img
                src={LOGO_SRC}
                alt="Dev"
                style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
              />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                @{user?.username || 'batuta'}
              </span>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'var(--accent)', color: '#fff', fontWeight: 900 }}>
                ROOT DEV
              </span>
            </div>

            {/* Global Repair & Sync Button */}
            <button
              onClick={handleGlobalRepair}
              disabled={repairing}
              className="action-btn-hover"
              title="Tüm kullanıcı adı indekslerini ve @batuta profilini onarır"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 12,
                border: '1px solid rgba(201,133,10,0.4)',
                background: 'rgba(201,133,10,0.12)',
                color: 'var(--accent)',
                fontSize: 13,
                fontWeight: 700,
                cursor: repairing ? 'wait' : 'pointer',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: repairing ? 'spin 0.8s linear infinite' : 'none' }}>
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
              {repairing ? 'Senkronize Ediliyor...' : 'Dizinleri Onar & Senk Et'}
            </button>

            {/* CSV Export Button */}
            <button
              onClick={exportCsv}
              disabled={filteredUsers.length === 0}
              className="action-btn-hover"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '10px 18px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text)',
                fontSize: 13,
                fontWeight: 700,
                cursor: filteredUsers.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              CSV İndir ({filteredUsers.length})
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="action-btn-hover"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '10px 20px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, var(--accent), #d97706)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: '0 4px 16px var(--accent-glow)',
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              {loading ? 'Yenileniyor...' : 'Verileri Yenile'}
            </button>
          </div>
        </div>

        {/* KPI Summary Cards Grid */}
        <div className="admin-kpi-grid">
          {/* Card 1: Total Users */}
          <div className="premium-dashboard-card admin-kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Toplam Kayıtlı
              </span>
              <span style={{ fontSize: 18 }}>👥</span>
            </div>
            <div className="glowing-accent-stat-number" style={{ fontSize: 32, marginBottom: 6 }}>
              {stats.total}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>● %100</span> Veri Bütünlüğü
            </div>
          </div>

          {/* Card 2: Users with Username */}
          <div className="premium-dashboard-card admin-kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                @Kullanıcı Adı Belirleyen
              </span>
              <span style={{ fontSize: 18 }}>🆔</span>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 800, color: '#f59e0b', marginBottom: 6 }}>
              {stats.withUsername}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Toplam üyelerin %{stats.total ? Math.round((stats.withUsername / stats.total) * 100) : 0}&apos;si sosyal profilli
            </div>
          </div>

          {/* Card 3: Connected Stores */}
          <div className="premium-dashboard-card admin-kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Bağlı Oyun Mağazaları
              </span>
              <span style={{ fontSize: 18 }}>🎮</span>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 800, color: '#38bdf8', marginBottom: 6 }}>
              {stats.withConnectedStores}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: 'var(--text-3)' }}>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>Steam: {stats.totalSteamAccounts}</span>
              <span>•</span>
              <span style={{ color: '#4ade80', fontWeight: 600 }}>Xbox: {stats.totalXboxAccounts}</span>
            </div>
          </div>

          {/* Card 4: Community & Library Activity */}
          <div className="premium-dashboard-card admin-kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Kütüphane & Etkileşim
              </span>
              <span style={{ fontSize: 18 }}>⭐</span>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 800, color: '#a855f7', marginBottom: 6 }}>
              {stats.totalCollectionGames + stats.totalWishlistGames}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--text-3)' }}>
              <span>🎮 {stats.totalCollectionGames} Oyun</span>
              <span>•</span>
              <span>✍️ {stats.totalReviews} İnceleme</span>
            </div>
          </div>

          {/* Card 5: Verified Emails & Auth */}
          <div className="premium-dashboard-card admin-kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Doğrulanmış E-Posta
              </span>
              <span style={{ fontSize: 18 }}>✉️</span>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 800, color: '#22c55e', marginBottom: 6 }}>
              {stats.verifiedEmails}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--text-3)' }}>
              <span>Google: {stats.googleCount}</span>
              <span>•</span>
              <span>Apple: {stats.appleCount}</span>
            </div>
          </div>
        </div>

        {/* Filter, Search & Sort Toolbar */}
        <div
          className="premium-dashboard-card"
          style={{
            padding: '16px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 320px' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none', display: 'flex' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Kullanıcı adı, e-posta, isim, UID veya Steam ID ara..."
              style={{
                width: '100%',
                padding: '10px 14px 10px 42px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text)',
                fontSize: 13.5,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 12,
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

          {/* Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: `Tümü (${users.length})` },
              { key: 'hasUsername', label: `@Kullanıcı Adı (${stats.withUsername})` },
              { key: 'connected', label: `Steam/Xbox (${stats.withConnectedStores})` },
              { key: 'social', label: 'Etkileşimi Olanlar' },
              { key: 'google', label: `Google (${stats.googleCount})` },
              { key: 'apple', label: `Apple (${stats.appleCount})` },
              { key: 'dev', label: 'Geliştiriciler' },
            ].map(f => {
              const active = filterType === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilterType(f.key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    fontSize: 12.5,
                    fontWeight: active ? 700 : 600,
                    border: '1px solid',
                    borderColor: active ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                    background: active ? 'rgba(201,133,10,0.18)' : 'rgba(255,255,255,0.03)',
                    color: active ? 'var(--accent)' : 'var(--text-2)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>Sırala:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'var(--text)',
                fontSize: 12.5,
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="newest" style={{ background: '#1c1f26' }}>En Yeni Kayıt</option>
              <option value="lastActive" style={{ background: '#1c1f26' }}>Son Görülme / Giriş</option>
              <option value="collections" style={{ background: '#1c1f26' }}>En Çok Oyun / Koleksiyon</option>
              <option value="reviews" style={{ background: '#1c1f26' }}>En Çok İnceleme & Gönderi</option>
              <option value="name" style={{ background: '#1c1f26' }}>Alfabetik (İsim)</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="premium-dashboard-card admin-table-wrap">
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Kullanıcı Profili</th>
                  <th>İletişim & Doğrulama</th>
                  <th>Giriş Yöntemi</th>
                  <th>Bağlı Platformlar</th>
                  <th>Aktivite & Kütüphane</th>
                  <th>Kayıt & Giriş</th>
                  <th style={{ textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                        Eşleşen Kullanıcı Bulunamadı
                      </p>
                      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
                        Farklı bir arama terimi deneyebilir veya filtreleri sıfırlayabilirsiniz.
                      </p>
                      {(search || filterType !== 'all') && (
                        <button
                          onClick={() => { setSearch(''); setFilterType('all'); }}
                          style={{
                            marginTop: 14,
                            padding: '8px 16px',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: 'var(--text)',
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Filtreleri Temizle
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => {
                    const isBatutaOrDev = u.isDeveloper;
                    const avatarSrc = isBatutaOrDev ? LOGO_SRC : (u.photoURL || u.avatar);
                    const hasStats =
                      (u.stats?.collectionGames || 0) > 0 ||
                      (u.stats?.wishlist || 0) > 0 ||
                      (u.stats?.reviews || 0) > 0 ||
                      (u.stats?.posts || 0) > 0 ||
                      (u.stats?.friends || 0) > 0;

                    return (
                      <tr key={u.uid || idx}>
                        {/* 1. Kullanıcı Profili */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0 }}>
                              {avatarSrc ? (
                                <img
                                  src={avatarSrc}
                                  alt=""
                                  style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: isBatutaOrDev ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.15)',
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: '50%',
                                    background: isBatutaOrDev ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                                    color: isBatutaOrDev ? '#fff' : 'var(--text)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: 15,
                                    border: '1px solid rgba(255,255,255,0.12)',
                                  }}
                                >
                                  {(u.username || u.displayName || u.email || '?').slice(0, 1).toUpperCase()}
                                </div>
                              )}
                              {isBatutaOrDev && (
                                <span
                                  style={{
                                    position: 'absolute',
                                    bottom: -2,
                                    right: -2,
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    background: 'var(--accent)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 9,
                                    fontWeight: 900,
                                  }}
                                >
                                  ⚡
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: 14 }}>
                                  {u.displayName || 'İsimsiz Oyuncu'}
                                </span>
                                {isBatutaOrDev && (
                                  <span style={{ padding: '2px 7px', borderRadius: 6, background: 'rgba(201,133,10,0.2)', border: '1px solid rgba(201,133,10,0.4)', color: 'var(--accent)', fontSize: 10, fontWeight: 900 }}>
                                    DEV
                                  </span>
                                )}
                              </div>

                              {u.username ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Link
                                    href={`/u/${u.username}`}
                                    target="_blank"
                                    style={{
                                      fontSize: 12.5,
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
                                  <button
                                    onClick={() => copyToClipboard(`@${u.username}`, `un-${u.uid}`, 'Kullanıcı adı kopyalandı!')}
                                    title="Kullanıcı adını kopyala"
                                    style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0, fontSize: 11 }}
                                  >
                                    📋
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontStyle: 'italic' }}>
                                  (Henüz @kullanıcı adı yok)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. İletişim & Doğrulama */}
                        <td>
                          {u.email ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>
                                  {u.email}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(u.email, `email-${u.uid}`, 'E-posta kopyalandı!')}
                                  title="E-postayı kopyala"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: copiedId === `email-${u.uid}` ? '#22c55e' : 'var(--text-3)',
                                    cursor: 'pointer',
                                    padding: 2,
                                    fontSize: 12,
                                  }}
                                >
                                  {copiedId === `email-${u.uid}` ? '✓' : '📋'}
                                </button>
                                <a
                                  href={`mailto:${u.email}`}
                                  title="E-posta gönder"
                                  style={{ color: 'var(--text-3)', textDecoration: 'none', fontSize: 12 }}
                                >
                                  ✉️
                                </a>
                              </div>

                              <div>
                                {u.emailVerified ? (
                                  <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} /> Doğrulandı
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} /> Onay Bekliyor
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>
                          )}
                        </td>

                        {/* 3. Giriş Sağlayıcıları */}
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {u.providers && u.providers.length > 0 ? (
                              u.providers.map(p => {
                                if (p === 'google.com') {
                                  return (
                                    <span
                                      key={p}
                                      style={{
                                        padding: '4px 9px',
                                        borderRadius: 8,
                                        background: 'rgba(66,133,244,0.14)',
                                        border: '1px solid rgba(66,133,244,0.3)',
                                        color: '#60a5fa',
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                      }}
                                    >
                                      <span>🌐</span> Google
                                    </span>
                                  );
                                }
                                if (p === 'apple.com') {
                                  return (
                                    <span
                                      key={p}
                                      style={{
                                        padding: '4px 9px',
                                        borderRadius: 8,
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.22)',
                                        color: 'var(--text)',
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                      }}
                                    >
                                      <span>🍎</span> Apple
                                    </span>
                                  );
                                }
                                if (p === 'password') {
                                  return (
                                    <span
                                      key={p}
                                      style={{
                                        padding: '4px 9px',
                                        borderRadius: 8,
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        color: 'var(--text-2)',
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                      }}
                                    >
                                      🔑 Şifre
                                    </span>
                                  );
                                }
                                return (
                                  <span
                                    key={p}
                                    style={{
                                      padding: '4px 9px',
                                      borderRadius: 8,
                                      background: 'rgba(255,255,255,0.05)',
                                      border: '1px solid rgba(255,255,255,0.12)',
                                      color: 'var(--text-3)',
                                      fontSize: 11,
                                    }}
                                  >
                                    {p}
                                  </span>
                                );
                              })
                            ) : (
                              <span style={{ color: 'var(--text-3)', fontSize: 11.5, background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: 6 }}>
                                Oturum / Redis
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Bağlı Platformlar */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {u.steamAccounts && u.steamAccounts.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                {u.steamAccounts.map(s => (
                                  <span
                                    key={s.steamId}
                                    className="interactive-chip"
                                    onClick={() => copyToClipboard(s.steamId, `steam-${s.steamId}`, 'Steam ID kopyalandı!')}
                                    title={`SteamID64: ${s.steamId}`}
                                    style={{
                                      padding: '3px 9px',
                                      borderRadius: 8,
                                      background: 'rgba(26,159,255,0.12)',
                                      border: '1px solid rgba(26,159,255,0.3)',
                                      color: '#38bdf8',
                                      fontSize: 11.5,
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                    }}
                                  >
                                    <span>🎮</span> {s.name || s.steamId?.slice(0, 8) + '...'}
                                  </span>
                                ))}
                              </div>
                            )}

                            {u.xbox && (
                              <div>
                                <span
                                  className="interactive-chip"
                                  onClick={() => copyToClipboard(u.xbox.gamertag, `xbox-${u.uid}`, 'Xbox Gamertag kopyalandı!')}
                                  style={{
                                    padding: '3px 9px',
                                    borderRadius: 8,
                                    background: 'rgba(16,124,16,0.15)',
                                    border: '1px solid rgba(16,124,16,0.35)',
                                    color: '#4ade80',
                                    fontSize: 11.5,
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                  }}
                                >
                                  <span>💚</span> {u.xbox.gamertag}
                                </span>
                              </div>
                            )}

                            {(!u.steamAccounts || u.steamAccounts.length === 0) && !u.xbox && (
                              <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>
                            )}
                          </div>
                        </td>

                        {/* 5. Aktivite & Kütüphane İstatistikleri */}
                        <td>
                          {hasStats ? (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              {(u.stats?.collectionGames || 0) > 0 && (
                                <span
                                  title={`${u.stats.collections} koleksiyon, ${u.stats.collectionGames} oyun`}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: 7,
                                    background: 'rgba(201,133,10,0.12)',
                                    border: '1px solid rgba(201,133,10,0.25)',
                                    color: 'var(--accent)',
                                    fontSize: 11,
                                    fontWeight: 700,
                                  }}
                                >
                                  🎮 {u.stats.collectionGames} Oyun
                                </span>
                              )}

                              {(u.stats?.wishlist || 0) > 0 && (
                                <span
                                  title="İstek Listesi"
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: 7,
                                    background: 'rgba(168,85,247,0.12)',
                                    border: '1px solid rgba(168,85,247,0.25)',
                                    color: '#c084fc',
                                    fontSize: 11,
                                    fontWeight: 700,
                                  }}
                                >
                                  ⭐ {u.stats.wishlist} İstek
                                </span>
                              )}

                              {(u.stats?.reviews || 0) > 0 && (
                                <span
                                  title="Yazılan İncelemeler"
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: 7,
                                    background: 'rgba(34,197,94,0.12)',
                                    border: '1px solid rgba(34,197,94,0.25)',
                                    color: '#4ade80',
                                    fontSize: 11,
                                    fontWeight: 700,
                                  }}
                                >
                                  ✍️ {u.stats.reviews} İnceleme
                                </span>
                              )}

                              {(u.stats?.posts || 0) > 0 && (
                                <span
                                  title="Topluluk Gönderileri"
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: 7,
                                    background: 'rgba(56,189,248,0.12)',
                                    border: '1px solid rgba(56,189,248,0.25)',
                                    color: '#38bdf8',
                                    fontSize: 11,
                                    fontWeight: 700,
                                  }}
                                >
                                  💬 {u.stats.posts}
                                </span>
                              )}

                              {(u.stats?.friends || 0) > 0 && (
                                <span
                                  title="Arkadaş Sayısı"
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: 7,
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    color: 'var(--text-2)',
                                    fontSize: 11,
                                    fontWeight: 600,
                                  }}
                                >
                                  👥 {u.stats.friends}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-3)', fontSize: 11.5, fontStyle: 'italic' }}>
                              Aktivite kaydı yok
                            </span>
                          )}
                        </td>

                        {/* 6. Kayıt & Giriş Tarihi */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }} title="Kayıt Tarihi">
                              📅 {formatDate(u.createdAt)}
                            </span>
                            {u.lastSignInTime && (
                              <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }} title="Son Giriş">
                                🕒 {formatDate(u.lastSignInTime)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 7. Hızlı İşlemler */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              onClick={() => { setSelectedUser(u); setShowJson(false); }}
                              className="action-btn-hover"
                              style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                color: 'var(--text)',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              İncele
                            </button>

                            <button
                              onClick={() => copyToClipboard(u.uid, `uid-${u.uid}`, 'UID kopyalandı!')}
                              title={`UID: ${u.uid}`}
                              style={{
                                padding: '6px 9px',
                                borderRadius: 8,
                                background: copiedId === `uid-${u.uid}` ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${copiedId === `uid-${u.uid}` ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                                color: copiedId === `uid-${u.uid}` ? '#22c55e' : 'var(--text-3)',
                                fontSize: 11,
                                fontFamily: 'monospace',
                                cursor: 'pointer',
                              }}
                            >
                              {copiedId === `uid-${u.uid}` ? '✓' : 'UID'}
                            </button>
                          </div>
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

      {/* User Detail Slide-over Drawer Modal */}
      {selectedUser && (
        <div className="drawer-overlay" onClick={() => setSelectedUser(null)}>
          <div className="drawer-content" onClick={e => e.stopPropagation()}>
            {/* Drawer Header */}
            <div
              style={{
                padding: '24px 28px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0,0,0,0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <img
                  src={selectedUser.isDeveloper ? LOGO_SRC : (selectedUser.photoURL || selectedUser.avatar || LOGO_SRC)}
                  alt=""
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: selectedUser.isDeveloper ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.15)',
                  }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: 'var(--text)' }}>
                      {selectedUser.displayName || 'İsimsiz Kullanıcı'}
                    </h3>
                    {selectedUser.isDeveloper && (
                      <span style={{ padding: '2px 7px', borderRadius: 6, background: 'rgba(201,133,10,0.2)', color: 'var(--accent)', fontSize: 10, fontWeight: 900 }}>
                        ROOT DEV
                      </span>
                    )}
                  </div>
                  {selectedUser.username ? (
                    <Link
                      href={`/u/${selectedUser.username}`}
                      target="_blank"
                      style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}
                    >
                      @{selectedUser.username} ↗
                    </Link>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
                      Kullanıcı adı oluşturulmamış
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  borderRadius: 10,
                  width: 34,
                  height: 34,
                  color: 'var(--text-2)',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: '28px' }}>
              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 26, flexWrap: 'wrap' }}>
                {selectedUser.username && (
                  <Link
                    href={`/u/${selectedUser.username}`}
                    target="_blank"
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'rgba(201,133,10,0.14)',
                      border: '1px solid rgba(201,133,10,0.3)',
                      color: 'var(--accent)',
                      fontSize: 13,
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    Profili Ziyaret Et ↗
                  </Link>
                )}
                <button
                  onClick={() => handleRepairSingleUser(selectedUser.uid)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'var(--text)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🛠️ İndeksi Onar
                </button>
              </div>

              {/* Section 1: Kimlik & Sistem */}
              <div style={{ marginBottom: 28 }}>
                <h4 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
                  Kimlik & Hesap Bilgileri
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>UID:</span>
                    <button
                      onClick={() => copyToClipboard(selectedUser.uid, 'drawer-uid', 'UID kopyalandı!')}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        padding: '3px 8px',
                        color: 'var(--text)',
                        fontSize: 11.5,
                        fontFamily: 'monospace',
                        cursor: 'pointer',
                      }}
                    >
                      {selectedUser.uid} 📋
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>E-Posta:</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      {selectedUser.email || '—'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Doğrulama:</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: selectedUser.emailVerified ? '#22c55e' : '#f59e0b' }}>
                      {selectedUser.emailVerified ? '● Doğrulandı' : '○ Doğrulanmadı'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Kayıt Tarihi:</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                      {formatDate(selectedUser.createdAt)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Son Giriş:</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                      {formatDate(selectedUser.lastSignInTime)}
                    </span>
                  </div>

                  {selectedUser.bio && (
                    <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Biyografi:</span>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.5 }}>
                        &ldquo;{selectedUser.bio}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Oyun Platformları */}
              <div style={{ marginBottom: 28 }}>
                <h4 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
                  Bağlı Oyun Mağazaları
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                  {/* Steam */}
                  {selectedUser.steamAccounts && selectedUser.steamAccounts.length > 0 ? (
                    <div>
                      <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, display: 'block', marginBottom: 8 }}>
                        Steam Hesapları ({selectedUser.steamAccounts.length})
                      </span>
                      {selectedUser.steamAccounts.map((s, i) => (
                        <div
                          key={s.steamId || i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: 'rgba(26,159,255,0.08)',
                            borderRadius: 10,
                            marginBottom: 6,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {s.avatar && <img src={s.avatar} alt="" style={{ width: 26, height: 26, borderRadius: '50%' }} />}
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                              {s.name || 'Steam Kullanıcısı'}
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(s.steamId, `drawer-steam-${s.steamId}`, 'SteamID kopyalandı!')}
                            style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer' }}
                          >
                            {s.steamId} 📋
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                      Steam hesabı bağlanmamış.
                    </div>
                  )}

                  {/* Xbox */}
                  {selectedUser.xbox ? (
                    <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 700, display: 'block', marginBottom: 8 }}>
                        Xbox Hesabı
                      </span>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'rgba(16,124,16,0.1)',
                          borderRadius: 10,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                          {selectedUser.xbox.gamertag}
                        </span>
                        <button
                          onClick={() => copyToClipboard(selectedUser.xbox.gamertag, 'drawer-xbox', 'Gamertag kopyalandı!')}
                          style={{ background: 'none', border: 'none', color: '#4ade80', fontSize: 11, cursor: 'pointer' }}
                        >
                          Kopyala 📋
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                      Xbox hesabı bağlanmamış.
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: İstatistikler */}
              <div style={{ marginBottom: 28 }}>
                <h4 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
                  Kütüphane & Sosyal İstatistikler
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 4 }}>Koleksiyon Oyunları</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-heading)' }}>
                      {selectedUser.stats?.collectionGames || 0}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{selectedUser.stats?.collections || 0} liste</div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 4 }}>İstek Listesi</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#c084fc', fontFamily: 'var(--font-heading)' }}>
                      {selectedUser.stats?.wishlist || 0}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>bekleyen oyun</div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 4 }}>İncelemeler</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80', fontFamily: 'var(--font-heading)' }}>
                      {selectedUser.stats?.reviews || 0}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>yazılan inceleme</div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 4 }}>Arkadaşlar & Gönderi</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-heading)' }}>
                      {selectedUser.stats?.friends || 0}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{selectedUser.stats?.posts || 0} gönderi</div>
                  </div>
                </div>
              </div>

              {/* Section 4: Raw JSON Inspector */}
              <div>
                <button
                  onClick={() => setShowJson(!showJson)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--text-2)',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Ham JSON Verisini Görüntüle</span>
                  <span>{showJson ? '▲' : '▼'}</span>
                </button>

                {showJson && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(selectedUser, null, 2), 'raw-json', 'JSON panoya kopyalandı!')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent)',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        JSON&apos;ı Kopyala 📋
                      </button>
                    </div>
                    <pre
                      style={{
                        background: '#090a0d',
                        padding: 16,
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: 11.5,
                        color: '#94a3b8',
                        overflowX: 'auto',
                        maxHeight: 280,
                        lineHeight: 1.5,
                      }}
                    >
                      {JSON.stringify(selectedUser, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
