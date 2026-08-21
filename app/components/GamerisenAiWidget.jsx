'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

function formatMarkdown(text) {
  if (!text) return '';
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #ffffff; font-weight: 750;">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em style="color: #b0b0b8; font-style: italic;">$1</em>');
  html = html.replace(/\n/g, '<br />');
  return html;
}

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
          className="ai-widget-trigger"
          aria-label="Gamerisen AI Asistanı"
        >
          <span className="ai-widget-icon">🤖</span>
          <span className="ai-widget-text">Gamerisen AI</span>
          <span className="ai-widget-dot" />
        </button>
      )}

      {/* Chat Window Modal (Responsive Bottom Sheet on Mobile) */}
      {isOpen && (
        <div className="ai-widget-modal">
          {/* Mobile Pull Handle Indicator */}
          <div
            style={{
              width: '38px',
              height: '4px',
              borderRadius: '99px',
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              margin: '8px auto 2px auto',
              flexShrink: 0
            }}
          />

          {/* Header */}
          <div className="ai-widget-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="ai-widget-avatar">🎮</div>
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
              className="ai-widget-close"
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="ai-widget-prompts">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(p.replace(/^[^\w\s]+/, '').trim())}
                className="ai-prompt-chip"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Message List */}
          <div className="ai-widget-messages">
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
                    maxWidth: '88%',
                    padding: '12px 16px',
                    borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    backgroundColor: m.role === 'user' ? '#e50914' : 'rgba(255, 255, 255, 0.07)',
                    border: m.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    lineHeight: '1.55',
                    wordBreak: 'break-word'
                  }}
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(m.text) }}
                />

                {/* Render Rich Game Cards */}
                {m.games && m.games.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '6px' }}>
                    {m.games.map((g, gIdx) => (
                      <div
                        key={gIdx}
                        style={{
                          background: 'rgba(25, 25, 32, 0.88)',
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
          <div className="ai-widget-input-box">
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
    </>
  );
}
