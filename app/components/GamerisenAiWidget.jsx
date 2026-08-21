'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function GamerisenAiWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: 'Selam gamer dostum! 🎮 Ben **Gamerisen AI**. Aklındaki oyunu, bütçeni veya sistem donanımını söyle; en ucuz mağaza fiyatlarını ve FPS uyumluluğunu anında çıkarayım!',
      games: []
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  const API_BASE = process.env.NEXT_PUBLIC_AI_API_URL || '';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendMessage = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    setInputValue('');
    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      let userProfile = {};
      try {
        const savedProfile = localStorage.getItem('gamerisen_user_profile');
        if (savedProfile) userProfile = JSON.parse(savedProfile);
      } catch (e) {}

      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          profile: userProfile
        })
      });

      if (!res.ok) throw new Error('API bağlantı hatası');
      const data = await res.json();

      if (data.session_id) setSessionId(data.session_id);

      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: data.response || 'Sonuçlar hazır!',
          games: data.games || []
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: '⚠️ Asistan sunucusuna şu an ulaşılamıyor. Lütfen tekrar deneyin.',
          games: []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    '🎲 Canım sıkıldı, ne oynasam?',
    '🔥 100 TL altı efsaneler',
    '🎁 Bedava oyunlar',
    '🖥️ 500 TL civarı oyunlar'
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: 'linear-gradient(135deg, #e50914 0%, #b81d24 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 30px rgba(229, 9, 20, 0.45)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '14px',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            backdropFilter: 'blur(10px)',
            animation: 'pulseGlow 2.5s infinite'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px) scale(1.04)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
        >
          <span style={{ fontSize: '18px' }}>🤖</span>
          <span>Gamerisen AI</span>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#00ff88',
              boxShadow: '0 0 8px #00ff88'
            }}
          />
        </button>
      )}

      {/* Chat Window Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '390px',
            maxWidth: 'calc(100vw - 32px)',
            height: '600px',
            maxHeight: 'calc(100vh - 48px)',
            backgroundColor: 'rgba(15, 15, 20, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(229, 9, 20, 0.15)',
            backdropFilter: 'blur(24px)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'var(--font-body, system-ui, sans-serif)',
            animation: 'slideUpModal 0.35s cubic-bezier(0.16, 1, 0.3, 1) both'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(180deg, rgba(229, 9, 20, 0.18) 0%, rgba(20, 20, 25, 0) 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #e50914 0%, #7b0005 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  boxShadow: '0 4px 15px rgba(229, 9, 20, 0.4)'
                }}
              >
                🎮
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#fff', letterSpacing: '-0.3px' }}>
                  Gamerisen AI
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#00ff88' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
                  <span>Çevrimiçi Asistan</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
            >
              ✕
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div
            style={{
              padding: '10px 14px',
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              scrollbarWidth: 'none'
            }}
          >
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(p.replace(/^[^\w\s]+/, '').trim())}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.09)',
                  borderRadius: '30px',
                  padding: '6px 12px',
                  color: '#e0e0e0',
                  fontSize: '12px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#e50914';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)';
                  e.currentTarget.style.color = '#e0e0e0';
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Message List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: '6px'
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '12px 16px',
                    borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    backgroundColor: m.role === 'user' ? '#e50914' : 'rgba(255, 255, 255, 0.06)',
                    border: m.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {m.text}
                </div>

                {/* Render Rich Game Cards */}
                {m.games && m.games.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '6px' }}>
                    {m.games.map((g, gIdx) => (
                      <div
                        key={gIdx}
                        style={{
                          background: 'rgba(25, 25, 32, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '14px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>{g.title}</div>
                          <div style={{ background: '#00ff8820', color: '#00ff88', border: '1px solid #00ff8840', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>
                            ⭐ {g.rating}/100
                          </div>
                        </div>

                        {g.best_deal && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#aaa' }}>{g.best_deal.platform}</div>
                            <div style={{ fontWeight: 800, color: '#00ff88', fontSize: '13px' }}>
                              {g.best_deal.current_price} {g.currency || 'TL'}
                              {g.best_deal.discount > 0 && (
                                <span style={{ marginLeft: '6px', color: '#ff4444', fontSize: '11px' }}>
                                  (-%{g.best_deal.discount})
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <a
                          href={g.store_url || `https://store.steampowered.com/search/?term=${encodeURIComponent(g.title)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'block',
                            textAlign: 'center',
                            background: 'linear-gradient(135deg, #e50914 0%, #b81d24 100%)',
                            color: '#fff',
                            textDecoration: 'none',
                            padding: '8px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '12px',
                            marginTop: '2px'
                          }}
                        >
                          Mağazaya Git 🚀
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', width: 'fit-content' }}>
                <span style={{ fontSize: '14px' }}>⚡</span>
                <span style={{ fontSize: '12.5px', color: '#aaa' }}>Gamerisen AI düşünüyor...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            style={{
              padding: '14px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(10, 10, 15, 0.95)',
              display: 'flex',
              gap: '10px'
            }}
          >
            <input
              type="text"
              placeholder="Oyun, bütçe veya donanımını sor..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '12px 14px',
                color: '#fff',
                fontSize: '13.5px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !inputValue.trim()}
              style={{
                background: '#e50914',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '0 16px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                opacity: isLoading || !inputValue.trim() ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Global Inline Keyframes */}
      <style jsx global>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 8px 30px rgba(229, 9, 20, 0.45); }
          50% { box-shadow: 0 8px 40px rgba(229, 9, 20, 0.8), 0 0 20px rgba(229, 9, 20, 0.6); }
        }
        @keyframes slideUpModal {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
