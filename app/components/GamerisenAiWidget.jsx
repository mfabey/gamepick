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
  const [hasAcknowledgedBeta, setHasAcknowledgedBeta] = useState(false);
  const messagesEndRef = useRef(null);
  const promptsRef = useRef(null);

  const API_BASE = process.env.NEXT_PUBLIC_AI_API_URL || '';

  const acknowledgeBeta = () => {
    setHasAcknowledgedBeta(true);
  };

  const handleResetChat = () => {
    setSessionId(null);
    setMessages([
      {
        role: 'ai',
        text: `Selam **${userName}**! 🎮 Ben **Gamerisen AI**. Aklındaki oyunu, bütçeni veya sistem donanımını söyle; en ucuz mağaza fiyatlarını ve FPS uyumluluğunu anında çıkarayım!`,
        games: []
      }
    ]);
    setInputValue('');
    setHasAcknowledgedBeta(false);
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
    { label: '🎲 Canım sıkıldı, ne oynasam?', query: 'Canım sıkıldı, ne oynasam?' },
    { label: '🔥 100 TL altı efsaneler', query: '100 TL altı efsaneler' },
    { label: '🎁 Bedava oyunlar', query: 'Bedava oyunlar' },
    { label: '🖥️ 500 TL civarı oyunlar', query: '500 TL civarı oyunlar' },
    { label: '⚡ En ucuz oyunlar', query: 'En ucuz oyunlar' },
    { label: '📖 Witcher 3 hikayesi', query: 'Witcher 3 hikayesi' }
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setHasAcknowledgedBeta(false); }}
          className="ai-widget-trigger"
          aria-label="Gamerisen AI Asistanı"
        >
          <span className="ai-widget-icon" style={{ background: '#ffffff', borderRadius: '8px', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}>
            <img src="/logo.png" alt="GR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </span>
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
        <div className="ai-widget-modal" style={{ position: 'relative', overflow: 'hidden' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="ai-widget-avatar" style={{ background: '#ffffff', padding: '3px', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(229, 9, 20, 0.45)' }}>
                <img src="/logo.png" alt="Gamerisen AI" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                    gap: '5px',
                    fontSize: '11.5px',
                    color: isAuthenticated ? '#00ff88' : '#ff7777',
                    fontWeight: 600
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isAuthenticated && (
                <button
                  onClick={handleResetChat}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#d0d0dc',
                    padding: '4px 10px',
                    borderRadius: '14px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s'
                  }}
                  title="Sohbeti Sıfırla ve Yeniden Başlat"
                >
                  <span>🔄 Yeni Sohbet</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="ai-widget-close"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Full-panel Disclaimer Overlay (Covers Entire Opened Widget) */}
          {isAuthenticated && !hasAcknowledgedBeta && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 100,
                borderRadius: '24px',
                background: 'rgba(11, 11, 16, 0.98)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '22px 18px',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(229, 9, 20, 0.18)',
                      border: '1px solid rgba(229, 9, 20, 0.45)',
                      color: '#ff6666',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      letterSpacing: '0.4px'
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#e50914',
                        borderRadius: '50%',
                        boxShadow: '0 0 8px #e50914'
                      }}
                    />
                    <span>AKTİF GELİŞTİRME AŞAMASINDA</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#888899', fontWeight: 600 }}>v2.5 BETA</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: '#ffffff',
                      padding: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 15px rgba(229, 9, 20, 0.45)',
                      flexShrink: 0
                    }}
                  >
                    <img src="/logo.png" alt="Gamerisen Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.3px' }}>
                      Gamerisen <span style={{ color: '#e50914' }}>AI</span> Bilgilendirmesi
                    </h3>
                    <p style={{ fontSize: '11.5px', color: '#a0a0b2', margin: '2px 0 0 0' }}>Akıllı Oyun & Fiyat Danışmanı</p>
                  </div>
                </div>

                <p style={{ fontSize: '12px', color: '#b0b0c2', lineHeight: '1.5', margin: 0 }}>
                  Gamerisen AI; en ucuz oyun fiyatlarını karşılaştıran, donanımınıza göre FPS analizi sunan ve zevkinize özel oyunlar öneren yapay zeka asistanıdır.
                </p>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11.5px', color: '#d0d0dc', lineHeight: '1.45' }}>
                    <span style={{ fontSize: '13px', flexShrink: 0 }}>⚠️</span>
                    <div>
                      <strong style={{ color: '#fff' }}>Canlı Test & Geliştirme:</strong> Asistanımız şu anda sitemizde <strong>aktif test ve geliştirme aşamasındadır</strong>.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11.5px', color: '#d0d0dc', lineHeight: '1.45' }}>
                    <span style={{ fontSize: '13px', flexShrink: 0 }}>🎯</span>
                    <div>
                      <strong style={{ color: '#fff' }}>Oyun & Fiyat Analizi:</strong> Fiyat karşılaştırma ve FPS tahmin modellerimiz sürekli eğitilmektedir.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11.5px', color: '#d0d0dc', lineHeight: '1.45' }}>
                    <span style={{ fontSize: '13px', flexShrink: 0 }}>🏷️</span>
                    <div>
                      <strong style={{ color: '#fff' }}>Fiyat Doğrulaması:</strong> Fiyatlar mağazalara göre değişebilir; alışveriş öncesi mağaza sayfasını teyit ediniz.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11.5px', color: '#d0d0dc', lineHeight: '1.45' }}>
                    <span style={{ fontSize: '13px', flexShrink: 0 }}>💬</span>
                    <div>
                      <strong style={{ color: '#fff' }}>Geri Bildirim:</strong> Yanıtlardaki butonlarla yapay zekanın gelişimine doğrudan destek olabilirsiniz.
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  onClick={acknowledgeBeta}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #e50914 0%, #b81d24 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 18px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 20px rgba(229, 9, 20, 0.45)',
                    transition: 'all 0.2s',
                    letterSpacing: '0.2px'
                  }}
                >
                  <span>✅ Okudum, Anladım • Sohbete Başla</span>
                </button>
                <div style={{ fontSize: '10.5px', color: '#77778a', textAlign: 'center' }}>
                  Sistemin geliştirme aşamasında olduğunu kabul ederek devam edersiniz.
                </div>
              </div>
            </div>
          )}

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
              {/* Quick Prompts Bar */}
              <div
                ref={promptsRef}
                onWheel={handlePromptsWheel}
                className="ai-widget-prompts"
              >
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(p.query)}
                    className="ai-prompt-chip"
                  >
                    {p.label}
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
