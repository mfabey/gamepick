const fs = require('fs');

const path = 'app/profile/page.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove getDailyRecommendation completely
content = content.replace(/  \/\/ Dynamic daily recommendation selector[\s\S]*?const recommended = getDailyRecommendation\(\);\n/m, '');

// 2. Add AI states and useEffect
const statesToAdd = `
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [aiRecLoading, setAiRecLoading] = useState(false);

  useEffect(() => {
    if (!ready || !user || libsLoading) return;
    
    const allGames = [];
    if (steamLib?.games) allGames.push(...steamLib.games.map(g => g.name));
    if (xboxLib?.games) allGames.push(...xboxLib.games.map(g => g.name));
    
    if (allGames.length === 0) return;

    const cacheKey = \`gamerisen_ai_recs_\${user.email}\`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setAiRecommendations(JSON.parse(cached));
        return;
      }
    } catch {}

    setAiRecLoading(true);
    fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'library', games: allGames, lang })
    })
      .then(r => r.json())
      .then(d => {
        if (d.recommendations && d.recommendations.length > 0) {
          setAiRecommendations(d.recommendations);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(d.recommendations)); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setAiRecLoading(false));
  }, [ready, user, libsLoading, steamLib, xboxLib, lang]);
`;

content = content.replace(/  \/\/ Redirect to login if not authenticated/, statesToAdd + '\n  // Redirect to login if not authenticated');

// 3. Improve the header aesthetics
const oldHeader = `<div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--accent-bg)',
          border: '1px solid var(--accent-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: 'var(--accent)',
        }}>
          {initials}
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{user.name}</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>
            {lang === 'tr' ? 'Gamerisen Üyesi' : 'Gamerisen Member'}
          </p>
        </div>
      </div>`;

const newHeader = `<div style={{ 
        position: 'relative', overflow: 'hidden',
        padding: '32px', borderRadius: 24, marginBottom: 36,
        background: 'var(--hero-bg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex', alignItems: 'center', gap: 20 
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), #ff8a65)',
          boxShadow: '0 8px 24px rgba(232, 68, 46, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 800, color: '#fff',
          border: '3px solid rgba(255,255,255,0.2)'
        }}>
          {initials}
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.5px' }}>{user.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ 
              background: 'var(--accent-bg)', color: 'var(--accent)', 
              padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' 
            }}>
              {lang === 'tr' ? 'PRO OYUNCU' : 'PRO GAMER'}
            </span>
            <span style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 500 }}>
              {lang === 'tr' ? 'Gamerisen Üyesi' : 'Gamerisen Member'}
            </span>
          </div>
        </div>
        {/* Dekoratif arka plan elementleri */}
        <div style={{ position: 'absolute', top: -50, right: -20, width: 200, height: 200, background: 'var(--accent)', filter: 'blur(100px)', opacity: 0.15, borderRadius: '50%', pointerEvents: 'none' }}></div>
      </div>`;

content = content.replace(oldHeader, newHeader);

// 4. Improve AI Player Analysis box aesthetics
content = content.replace(/<div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>/g, '<div className="card" style={{ padding: \'16px 20px\', marginBottom: 12, border: \'1px solid var(--accent-border)\', boxShadow: \'0 8px 24px var(--accent-glow)\', transform: \'translateY(-2px)\', transition: \'transform 0.2s\' }}>');

// 5. Replace "Günlük Öneri" section with "AI Önerileri"
const oldRecommendationSectionRegex = /      \{\/\* Günlük öneri \*\/\}[\s\S]*?      <\/div>\n    <\/div>\n  \);\n\}/m;

const newRecommendationSection = `      {/* Yapay Zeka Önerileri */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="section-title" style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent)' }}>✦</span> 
            {lang === 'tr' ? 'Yapay Zeka Önerileri' : 'AI Game Recommendations'}
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500, background: 'var(--bg-card)', padding: '4px 10px', borderRadius: 12, border: '1px solid var(--border)' }}>
            {lang === 'tr' ? 'Kütüphanenize Göre' : 'Based on your library'}
          </span>
        </div>

        {totalConnectedGames === 0 ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center', borderStyle: 'dashed' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
            <p style={{ color: 'var(--text-2)', fontSize: 14, fontWeight: 500 }}>
              {lang === 'tr' ? 'Özel öneriler almak için lütfen Steam veya Xbox hesabınızı bağlayın.' : 'Please connect your Steam or Xbox account to get personalized recommendations.'}
            </p>
          </div>
        ) : aiRecLoading || libsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="card" style={{ padding: '24px', animation: 'pulse 1.5s infinite ease-in-out', background: 'var(--bg-input)', border: 'none' }}>
                <div style={{ width: '60%', height: 18, background: 'var(--border)', borderRadius: 4, marginBottom: 16 }}></div>
                <div style={{ width: '100%', height: 12, background: 'var(--border)', borderRadius: 4, marginBottom: 8 }}></div>
                <div style={{ width: '90%', height: 12, background: 'var(--border)', borderRadius: 4, marginBottom: 8 }}></div>
                <div style={{ width: '40%', height: 12, background: 'var(--border)', borderRadius: 4 }}></div>
              </div>
            ))}
            <style>{\`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }\`}</style>
          </div>
        ) : aiRecommendations && aiRecommendations.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {aiRecommendations.map((rec, idx) => (
              <div key={idx} className="card" style={{ 
                padding: '24px', 
                background: 'linear-gradient(145deg, var(--bg-card), var(--bg-input))',
                border: '1px solid var(--accent-border)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                display: 'flex', flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px var(--accent-glow)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>{rec.name}</h3>
                  <div style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 8, letterSpacing: '0.05em' }}>
                    {lang === 'tr' ? 'EŞLEŞME' : 'MATCH'}
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, flex: 1, marginBottom: 16 }}>
                  {rec.reason}
                </p>
                <Link href={\`/game/rawg/\${rec.slug || rec.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}\`} style={{
                  display: 'inline-block', padding: '10px 0', borderRadius: 10,
                  background: 'var(--bg-body)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 13, fontWeight: 700, textAlign: 'center', width: '100%',
                  transition: 'background 0.15s, color 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-body)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  {lang === 'tr' ? 'Oyunu İncele' : 'View Game'}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-3)', fontSize: 14 }}>
              {lang === 'tr' ? 'Şu an öneri oluşturulamadı. Daha sonra tekrar deneyin.' : 'Could not generate recommendations right now. Try again later.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}`;

content = content.replace(oldRecommendationSectionRegex, newRecommendationSection);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated profile page!');
