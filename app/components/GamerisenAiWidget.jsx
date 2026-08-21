'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

function formatMarkdown(text) {
  if (!text) return '';
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #ffffff; font-weight: 750;">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em style="color: #b0b0b8; font-style: italic;">$1</em>');
  html = html.replace(/\n/g, '<br />');
  return html;
}

export default function GamerisenAiWidget() {
  const pathname = usePathname();
  const { user, steamUser, xboxUser, ready } = useAuth();
  const isAuthenticated = Boolean(user || steamUser || xboxUser);
  const userName = user?.username || user?.name || steamUser?.personaname || xboxUser?.gamertag || 'gamer dostum';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [hasAcknowledgedBeta, setHasAcknowledgedBeta] = useState(true);
  const messagesEndRef = useRef(null);
  const promptsRef = useRef(null);

  const API_BASE = process.env.NEXT_PUBLIC_AI_API_URL || '';

  // Check beta acknowledgment from LocalStorage
  useEffect(() => {
    try {
      const ack = localStorage.getItem('gamerisen_ai_beta_ack');
      if (!ack) {
        setHasAcknowledgedBeta(false);
      }
    } catch (e) {}
  }, []);

  const acknowledgeBeta = () => {
    setHasAcknowledgedBeta(true);
    try {
      localStorage.setItem('gamerisen_ai_beta_ack', 'true');
    } catch (e) {}
  };

  // Initial welcome message with user's name
  useEffect(() => {
    setMessages([
      {
        role: 'ai',
        text: `Selam **${userName}**! 🎮 Ben **Gamerisen AI**. Aklındaki oyunu, bütçeni veya sistem donanımını söyle; en ucuz mağaza fiyatlarını ve FPS uyumluluğunu anında çıkarayım!`,
        games: []
      }
    ]);
  }, [userName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handlePromptsWheel = (e) => {
    if (promptsRef.current && e.deltaY !== 0) {
      e.preventDefault();
      promptsRef.current.scrollLeft += e.deltaY * 1.8;
    }
  };

  const sendMessage = async (textToSend) => {
    if (!isAuthenticated) return;
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
    '🖥️ 500 TL civarı oyunlar',
    '⚡ En ucuz oyunlar',
    '📖 Witcher 3 hikayesi'
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
          <span className="ai-widget-icon">{isAuthenticated ? '🤖' : '🔒'}</span>
          <span className="ai-widget-text">Gamerisen AI</span>
          <span
            className="ai-widget-dot"
            style={{
              backgroundColor: isAuthenticated ? '#00ff88' : '#e50914',
              boxShadow: isAuthenticated ? '0 0 8px #00ff88' : '0 0 8px #e50914'
            }}
          />
        </button>
      )}

      {/* Chat Window Modal */}
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
              <div className="ai-widget-avatar">
                {isAuthenticated ? '🎮' : '🔒'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: '#fff', letterSpacing: '-0.3px' }}>
                    Gamerisen AI
                  </span>
                  <span style={{ background: '#e5091430', border: '1px solid #e5091460', color: '#ff6666', fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px' }}>
                    BETA
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: isAuthenticated ? '#00ff88' : '#ff7777'
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: isAuthenticated ? '#00ff88' : '#ff4444',
                      boxShadow: isAuthenticated ? '0 0 6px #00ff88' : '0 0 6px #ff4444'
                    }}
                  />
                  <span>{isAuthenticated ? 'Çevrimiçi Asistan' : 'Üyelere Özel'}</span>
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

          {/* If NOT Authenticated: Show High-Converting Member Lock Screen */}
          {!isAuthenticated ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 24px',
                textAlign: 'center',
                gap: '16px'
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '22px',
                  background: 'linear-gradient(135deg, rgba(229,9,20,0.25) 0%, rgba(229,9,20,0.05) 100%)',
                  border: '1px solid rgba(229,9,20,0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '34px',
                  boxShadow: '0 8px 30px rgba(229,9,20,0.35)'
                }}
              >
                🔒
              </div>

              <div>
                <div style={{ fontSize: '18px', fontWeight: 850, color: '#fff', letterSpacing: '-0.3px', marginBottom: '8px' }}>
                  Gamerisen AI Üyelere Özeldir
                </div>
                <div style={{ fontSize: '13px', color: '#a0a0ab', lineHeight: '1.6', maxWidth: '320px' }}>
                  Sistemine özel FPS analizi, kişiselleştirilmiş oyun tavsiyeleri ve canlı mağaza indirimleri için lütfen giriş yapın veya ücretsiz hesap oluşturun.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px', marginTop: '12px' }}>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  style={{
                    display: 'block',
                    background: 'linear-gradient(135deg, #e50914 0%, #b81d24 100%)',
                    color: '#fff',
                    fontWeight: 750,
                    fontSize: '14px',
                    padding: '12px',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    boxShadow: '0 4px 20px rgba(229,9,20,0.4)',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                >
                  Giriş Yap 🚀
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setIsOpen(false)}
                  style={{
                    display: 'block',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '14px',
                    padding: '12px',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                >
                  Ücretsiz Hesap Oluştur ✨
                </Link>
              </div>
            </div>
          ) : (
            /* If Authenticated: Full Chat Experience */
            <>
              {/* Beta Test Warning Banner */}
              {!hasAcknowledgedBeta && (
                <div
                  style={{
                    margin: '10px 14px 4px 14px',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(229, 9, 20, 0.16) 0%, rgba(255, 140, 0, 0.1) 100%)',
                    border: '1px solid rgba(229, 9, 20, 0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
                    flexShrink: 0
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px' }}>🧪</span>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: '#ffb300', letterSpacing: '-0.2px' }}>
                      Test & Geliştirme Aşaması
                    </span>
                    <span style={{ background: '#ff444430', color: '#ff7777', padding: '1px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, marginLeft: 'auto' }}>
                      BETA
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#d0d0d8', lineHeight: '1.45' }}>
                    Gamerisen AI şu anda test aşamasındadır. Fiyat karşılaştırma ve FPS analiz modellerimiz sürekli geliştirilmektedir. Yanıtlarda geçici tutarsızlıklar yaşanabilir.
                  </div>

                  <button
                    onClick={acknowledgeBeta}
                    style={{
                      marginTop: '4px',
                      background: 'linear-gradient(135deg, #e50914 0%, #b81d24 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 750,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 10px rgba(229, 9, 20, 0.35)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <span>Okudum, Anladım</span>
                    <span>✓</span>
                  </button>
                </div>
              )}

              {/* Quick Prompts Bar */}
              <div
                ref={promptsRef}
                onWheel={handlePromptsWheel}
                className="ai-widget-prompts"
              >
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
            </>
          )}
        </div>
      )}
    </>
  );
}
