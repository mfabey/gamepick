'use client';

import React, { useMemo, useState } from 'react';

// Sabit rastgele sayı üreteci (kullanıcıya göre hep aynı veriyi üretmek için)
function seededRandom(seed) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export default function ActivityHeatmap({ lang, userEmail = "default" }) {
  const [hoveredCell, setHoveredCell] = useState(null);

  // Son 14 günlük veriyi oluştur
  const activityData = useMemo(() => {
    const data = [];
    let seed = 0;
    for (let i = 0; i < userEmail.length; i++) {
      seed += userEmail.charCodeAt(i);
    }

    const today = new Date();
    // 13 gün öncesinden başla
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 13);

    for (let i = 0; i < 14; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      let baseChance = isWeekend ? 0.8 : 0.4; 
      
      let hours = 0;
      if (seededRandom(seed + i) < baseChance) {
         hours = Math.floor(seededRandom(seed + i * 2) * 5) + 1; // 1 to 5
         if (isWeekend && seededRandom(seed + i * 3) < 0.4) hours += Math.floor(seededRandom(seed) * 4) + 2; // ekstra saatler
      }
      
      data.push({
        date: d,
        hours,
        dayName: d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'short' }),
        fullDate: d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' }),
        isToday: i === 13
      });
    }
    return data;
  }, [userEmail, lang]);

  const maxHours = Math.max(...activityData.map(d => d.hours), 8);
  const totalHours = activityData.reduce((acc, curr) => acc + curr.hours, 0);

  return (
    <div className="premium-dashboard-card" style={{ padding: '24px 32px' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h2 className="section-title" style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent)' }}>✦</span>
            {lang === 'tr' ? 'Son 14 Günlük Aktivite' : 'Last 14 Days Activity'}
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 6, fontWeight: 500 }}>
            {lang === 'tr' ? 'Oyun oynama sürelerinizin özeti' : 'A summary of your playtime'}
          </p>
        </div>
        
        <div style={{ textAlign: 'right' }}>
           <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: 0, lineHeight: 1 }}>
             {totalHours} <span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 600 }}>{lang === 'tr' ? 'saat' : 'hrs'}</span>
           </p>
           <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
             {lang === 'tr' ? 'Toplam Süre' : 'Total Time'}
           </p>
        </div>
      </div>

      {/* Bar Chart Section */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 180, position: 'relative', marginTop: 20 }}>
         
         {/* Arka plan çizgileri (Grid Lines) */}
         <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 25, zIndex: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
            {[0, 1, 2, 3].map(i => (
               <div key={i} style={{ borderTop: '1px dashed rgba(255,255,255,0.06)', width: '100%', height: 0 }}></div>
            ))}
         </div>

         {/* Barlar */}
         {activityData.map((day, i) => {
            const heightPct = (day.hours / maxHours) * 100;
            const isHovered = hoveredCell === day;
            const isActive = isHovered || (day.isToday && !hoveredCell);
            
            return (
              <div 
                 key={i} 
                 onMouseEnter={() => setHoveredCell(day)}
                 onMouseLeave={() => setHoveredCell(null)}
                 style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, zIndex: 1, position: 'relative', cursor: 'pointer' }}
              >
                {/* Tooltip on hover */}
                {isHovered && (
                  <div style={{ 
                     position: 'absolute', top: -45, 
                     background: 'var(--bg-card)', border: '1px solid var(--accent)',
                     padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                     color: 'var(--text)', whiteSpace: 'nowrap',
                     boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
                     zIndex: 10,
                     animation: 'fadeIn 0.2s',
                     display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
                  }}>
                    <span>{day.hours} {lang === 'tr' ? 'saat' : 'hrs'}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>{day.fullDate}</span>
                  </div>
                )}
                
                {/* Bar Container */}
                <div style={{ width: '100%', height: 140, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                   <div style={{ 
                      width: '100%', 
                      maxWidth: 36,
                      minWidth: 16,
                      // Ensure a minimum height so 0 hour days are visible as tiny bumps
                      height: `${Math.max(heightPct, 3)}%`, 
                      borderRadius: 6,
                      background: isActive
                        ? 'linear-gradient(to top, var(--accent), #ff8066)' 
                        : 'linear-gradient(to top, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.35))',
                      boxShadow: isActive ? '0 0 16px rgba(139, 92, 246, 0.5)' : 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: day.hours === 0 && !isActive ? 0.3 : 1
                   }} />
                </div>

                {/* Day Label */}
                <span style={{ 
                   fontSize: 12, 
                   fontWeight: isActive ? 700 : 500,
                   color: isActive ? 'var(--text)' : 'var(--text-3)',
                   transition: 'color 0.2s'
                }}>
                   {day.dayName}
                </span>
              </div>
            )
         })}
      </div>
    </div>
  );
}
