'use client';

import React, { useMemo, useState } from 'react';

// Sabit rastgele sayı üreteci (kullanıcıya göre hep aynı veriyi üretmek için)
function seededRandom(seed) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export default function ActivityHeatmap({ lang, userEmail = "default" }) {
  const [hoveredCell, setHoveredCell] = useState(null);

  // 365 günlük veri oluştur (son 1 yıl)
  const activityData = useMemo(() => {
    const data = [];
    let seed = 0;
    for (let i = 0; i < userEmail.length; i++) {
      seed += userEmail.charCodeAt(i);
    }

    const today = new Date();
    // Start from exactly 364 days ago to have 52 full weeks (52 * 7 = 364)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);

    // Her gün için aktivite düzeyi belirle
    for (let i = 0; i <= 364; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      
      // Seeded random ile 0-4 arası değer üret (0: oynamadı, 4: çok oynadı)
      // Biraz daha gerçekçi olması için hafta sonları oynama ihtimalini artıralım
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      let baseChance = isWeekend ? 0.6 : 0.3; // Hafta sonu %60 ihtimalle oynar, hafta içi %30
      
      let level = 0;
      let hours = 0;
      
      if (seededRandom(seed + i) < baseChance) {
        const intensity = seededRandom(seed + i + 1000);
        if (intensity < 0.3) { level = 1; hours = Math.floor(seededRandom(seed) * 2) + 1; }
        else if (intensity < 0.7) { level = 2; hours = Math.floor(seededRandom(seed) * 3) + 2; }
        else if (intensity < 0.9) { level = 3; hours = Math.floor(seededRandom(seed) * 4) + 4; }
        else { level = 4; hours = Math.floor(seededRandom(seed) * 5) + 6; }
      }
      
      data.push({
        date: d,
        level,
        hours
      });
    }
    return data;
  }, [userEmail]);

  // Renk teması (Mor/Accent tonları)
  const getColor = (level) => {
    switch(level) {
      case 1: return 'rgba(139, 92, 246, 0.3)'; // Açık mor
      case 2: return 'rgba(139, 92, 246, 0.6)'; // Orta mor
      case 3: return 'rgba(139, 92, 246, 0.9)'; // Koyu mor
      case 4: return '#a78bfa'; // Parlak neon mor
      default: return 'var(--bg-input)'; // Boş (oynamadı)
    }
  };

  const getGlow = (level) => {
    if (level === 4) return '0 0 10px rgba(167, 139, 250, 0.8)';
    if (level === 3) return '0 0 5px rgba(139, 92, 246, 0.5)';
    return 'none';
  };

  // Aylar için başlık hesapla
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    activityData.forEach((day, index) => {
      // Sadece o sütunun (haftanın) ilk günü için kontrol et
      if (index % 7 === 0) {
        const currentMonth = day.date.getMonth();
        if (currentMonth !== lastMonth) {
          labels.push({
            monthName: day.date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { month: 'short' }),
            colIndex: index / 7
          });
          lastMonth = currentMonth;
        }
      }
    });
    return labels;
  }, [activityData, lang]);

  return (
    <div className="premium-dashboard-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="section-title" style={{ fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--accent)' }}>✦</span>
          {lang === 'tr' ? 'Oyun Aktivitesi' : 'Gaming Activity'}
        </h2>
        <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{lang === 'tr' ? 'Az' : 'Less'}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2, 3, 4].map(l => (
              <div key={l} style={{ width: 10, height: 10, borderRadius: 2, background: getColor(l), boxShadow: getGlow(l) }} />
            ))}
          </div>
          <span>{lang === 'tr' ? 'Çok' : 'More'}</span>
        </div>
      </div>

      <div style={{ position: 'relative', overflowX: 'auto', paddingBottom: 10 }}>
        <div style={{ minWidth: 750 }}>
          {/* Aylar */}
          <div style={{ display: 'flex', position: 'relative', height: 20, marginBottom: 4 }}>
            {monthLabels.map((m, i) => (
              <span key={i} style={{ 
                position: 'absolute', 
                left: `${(m.colIndex / 52) * 100}%`,
                fontSize: 11,
                color: 'var(--text-3)',
                fontWeight: 600
              }}>
                {m.monthName}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: 'flex', gap: 4 }}>
            {/* Gün İsimleri (Pzt, Çar, Cum) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'space-between', paddingRight: 8, paddingTop: 10, fontSize: 10, color: 'var(--text-3)' }}>
              <span style={{ height: 12 }}></span>
              <span style={{ height: 12, lineHeight: '12px' }}>{lang === 'tr' ? 'Pzt' : 'Mon'}</span>
              <span style={{ height: 12 }}></span>
              <span style={{ height: 12, lineHeight: '12px' }}>{lang === 'tr' ? 'Çar' : 'Wed'}</span>
              <span style={{ height: 12 }}></span>
              <span style={{ height: 12, lineHeight: '12px' }}>{lang === 'tr' ? 'Cum' : 'Fri'}</span>
              <span style={{ height: 12 }}></span>
            </div>

            {/* Hücreler */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(52, 1fr)', 
              gridTemplateRows: 'repeat(7, 1fr)',
              gridAutoFlow: 'column',
              gap: 4,
              flex: 1
            }}>
              {activityData.map((day, i) => (
                <div 
                  key={i}
                  onMouseEnter={() => setHoveredCell(day)}
                  onMouseLeave={() => setHoveredCell(null)}
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: getColor(day.level),
                    borderRadius: 3,
                    boxShadow: getGlow(day.level),
                    cursor: 'pointer',
                    transition: 'transform 0.1s, box-shadow 0.2s',
                    transform: hoveredCell === day ? 'scale(1.2)' : 'scale(1)',
                    position: 'relative',
                    zIndex: hoveredCell === day ? 10 : 1
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      <div style={{ 
        height: 20, 
        marginTop: 12, 
        fontSize: 13, 
        color: 'var(--text-2)', 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 500
      }}>
        {hoveredCell ? (
          <span style={{ animation: 'fadeIn 0.2s' }}>
            <strong style={{ color: 'var(--text)' }}>
              {hoveredCell.hours} {lang === 'tr' ? 'saat' : 'hours'}
            </strong> {lang === 'tr' ? 'oynadınız' : 'played on'} — {hoveredCell.date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        ) : (
          <span style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Aktiviteyi görmek için üzerine gelin' : 'Hover over to see activity'}</span>
        )}
      </div>
    </div>
  );
}
