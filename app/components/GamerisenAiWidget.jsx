'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

function formatMarkdown(text) {
  if (!text) return '';
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #ffffff; font-weight: 750;">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em style="color: #ff9999; font-style: italic;">$1</em>');
  html = html.replace(/^\s*-\s*(.+)/gm, '• $1');
  html = html.replace(/\n/g, '<br />');
  return html;
}

function formatStreamingMarkdown(rawText) {
  if (!rawText) return '';
  let text = rawText;
  const boldMatches = text.match(/\*\*/g);
  if (boldMatches && boldMatches.length % 2 === 1) {
    text += '**';
  }
  const cleanedBold = text.replace(/\*\*/g, '');
  const italicMatches = cleanedBold.match(/\*/g);
  if (italicMatches && italicMatches.length % 2 === 1) {
    text += '*';
  }
  return formatMarkdown(text);
}

function getGameDetailUrl(g) {
  if (!g) return '/games';
  if (g.rawgSlug) return `/game/${g.rawgSlug}`;
  if (g.slug) return `/game/${g.slug}`;
  if (g.steamAppId) return `/game/rawg_${g.steamAppId}`;

  // Extract steam appid from store_url or image_url if available
  const storeMatch = (g.store_url || '').match(/\/app\/(\d+)/);
  if (storeMatch) return `/game/rawg_${storeMatch[1]}`;

  const imgMatch = (g.image_url || '').match(/\/apps\/(\d+)/);
  if (imgMatch) return `/game/rawg_${imgMatch[1]}`;

  // If numeric id
  if (typeof g.id === 'number' && g.id > 1000) return `/game/rawg_${g.id}`;
  if (typeof g.id === 'string' && /^\d+$/.test(g.id)) return `/game/rawg_${g.id}`;
  if (typeof g.id === 'string' && g.id.startsWith('rawg_')) return `/game/${g.id}`;

  // If title exists, use normalized title slug
  if (g.title) {
    const slug = g.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (slug) return `/game/${slug}`;
  }

  return '/games';
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
  const [userGpu, setUserGpu] = useState('');
  const [showHardwareModal, setShowHardwareModal] = useState(false);
  const [customGpuInput, setCustomGpuInput] = useState('');

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const promptsRef = useRef(null);

  const API_BASE = process.env.NEXT_PUBLIC_AI_API_URL || '';

  // Load saved user GPU from localStorage
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('gamerisen_user_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed?.hardware?.gpu) {
          setUserGpu(parsed.hardware.gpu);
          setCustomGpuInput(parsed.hardware.gpu);
        }
      }
    } catch (e) {}
  }, []);

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
    setShowHardwareModal(false);
  };

  const handleSelectGpu = (gpuToSet) => {
    const cleanGpu = (gpuToSet || customGpuInput || '').trim();
    if (!cleanGpu) return;
    setUserGpu(cleanGpu);
    setCustomGpuInput(cleanGpu);
    setShowHardwareModal(false);

    try {
      const savedProfile = localStorage.getItem('gamerisen_user_profile');
      let profileObj = savedProfile ? JSON.parse(savedProfile) : {};
      if (!profileObj.hardware) profileObj.hardware = {};
      profileObj.hardware.gpu = cleanGpu;
      localStorage.setItem('gamerisen_user_profile', JSON.stringify(profileObj));
    } catch (e) {}

    // Send immediate recommendation query tailored for this GPU
    sendMessage(`${cleanGpu} ekran kartıma göre akıcı oynayabileceğim en iyi oyunları öner`);
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

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
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

      if (userGpu) {
        if (!userProfile.hardware) userProfile.hardware = {};
        userProfile.hardware.gpu = userGpu;
      }

      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          profile: userProfile,
          history: newMessages.slice(-8)
        })
      });

      if (!res.ok) throw new Error('API bağlantı hatası');
      const data = await res.json();

      if (data.session_id) setSessionId(data.session_id);

      const responseFullText = data.response || 'Sonuçlar hazır! Aşağıdan inceleyebilirsin:';
      const returnedGames = data.games || [];

      // 1. Add AI message in streaming state (empty text, isTyping: true)
      const aiMsgIndex = newMessages.length;
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: '',
          isTyping: true,
          fullText: responseFullText,
          games: []
        }
      ]);
      setIsLoading(false);

      // 2. Stream character by character with natural cadence (tane tane yazma)
      const totalLen = responseFullText.length;
      let baseSpeed = 14;
      if (totalLen > 700) baseSpeed = 7;
      else if (totalLen > 350) baseSpeed = 10;
      else baseSpeed = 14;

      let currentIdx = 0;

      await new Promise((resolve) => {
        function tick() {
          if (currentIdx < totalLen) {
            const step = totalLen > 600 ? 2 : 1;
            currentIdx = Math.min(totalLen, currentIdx + step);
            const currentSlice = responseFullText.substring(0, currentIdx);

            setMessages((prev) => {
              const updated = [...prev];
              if (updated[aiMsgIndex]) {
                updated[aiMsgIndex] = {
                  ...updated[aiMsgIndex],
                  text: currentSlice,
                  isTyping: currentIdx < totalLen
                };
              }
              return updated;
            });

            const lastChar = responseFullText[currentIdx - 1];
            let delay = baseSpeed;
            if (lastChar === '.' || lastChar === '!' || lastChar === '?') {
              delay = baseSpeed + 70;
            } else if (lastChar === ',' || lastChar === ':' || lastChar === ';') {
              delay = baseSpeed + 35;
            } else if (lastChar === '\n') {
              delay = baseSpeed + 45;
            }

            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
            setTimeout(tick, delay);
          } else {
            setMessages((prev) => {
              const updated = [...prev];
              if (updated[aiMsgIndex]) {
                updated[aiMsgIndex] = {
                  ...updated[aiMsgIndex],
                  text: responseFullText,
                  isTyping: false,
                  games: returnedGames
                };
              }
              return updated;
            });
            setTimeout(() => {
              if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
              }
            }, 50);
            resolve();
          }
        }

        tick();
      });
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

  const popularGpus = [
    'RTX 4090', 'RTX 4080', 'RTX 4070', 'RTX 4060',
    'RTX 3060', 'RTX 2060', 'GTX 1650', 'GTX 1060',
    'RX 7800 XT', 'RX 6700', 'RX 580', 'Intel Iris Xe', 'Apple M-Series'
  ];

  const quickPrompts = [
    ...(userGpu ? [{ label: `🎮 ${userGpu} için oyun öner`, query: `${userGpu} için akıcı oynayabileceğim en iyi oyunları öner` }] : []),
    { label: '🎲 Canım sıkıldı, ne oynasam?', query: 'Canım sıkıldı, ne oynasam?' },
    { label: '🔥 100 TL altı efsaneler', query: '100 TL altı efsaneler' },
    { label: '🎁 Bedava oyunlar', query: 'Bedava oyunlar' },
    { label: '🌲 The Forest fiyatı', query: 'The Forest fiyatı nedir' },
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

          {/* Hardware Selector Bar */}
          {isAuthenticated && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 14px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                gap: '8px'
              }}
            >
              <button
                onClick={() => setShowHardwareModal(!showHardwareModal)}
                style={{
                  background: userGpu ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 255, 255, 0.06)',
                  border: userGpu ? '1px solid rgba(0, 255, 136, 0.35)' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '20px',
                  padding: '4px 10px',
                  color: userGpu ? '#00ff88' : '#d0d0dc',
                  fontSize: '11.5px',
                  fontWeight: 650,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                title="Sistem Donanımını & Ekran Kartını Seç / Değiştir"
              >
                <span>🖥️</span>
                <span>{userGpu ? `Sistem: ${userGpu}` : 'Donanım/GPU Belirle'}</span>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>⚙️</span>
              </button>

              {userGpu ? (
                <button
                  onClick={() => sendMessage(`${userGpu} ekran kartıma göre akıcı oynayabileceğim en iyi oyunları öner`)}
                  style={{
                    background: 'rgba(229, 9, 20, 0.15)',
                    border: '1px solid rgba(229, 9, 20, 0.35)',
                    color: '#ff7777',
                    borderRadius: '16px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🎯 Bana Özel Öner
                </button>
              ) : (
                <span style={{ fontSize: '11px', color: '#888899' }}>Özel FPS Analizi</span>
              )}
            </div>
          )}

          {/* Hardware Selector Popover Modal */}
          {isAuthenticated && showHardwareModal && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 90,
                background: 'rgba(12, 12, 18, 0.97)',
                backdropFilter: 'blur(20px)',
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRadius: '20px',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🖥️</span>
                    <div>
                      <h4 style={{ margin: 0, color: '#fff', fontSize: '14px', fontWeight: 800 }}>
                        Sistem & Donanımını Belirle
                      </h4>
                      <p style={{ margin: '2px 0 0 0', color: '#9090a2', fontSize: '11px' }}>
                        Yapay zeka sisteminin FPS gücüne göre oyun önerir.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHardwareModal(false)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '50%',
                      width: '26px',
                      height: '26px',
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Popular GPUs Selection Grid */}
                <div>
                  <div style={{ fontSize: '11.5px', color: '#d0d0dc', fontWeight: 700, marginBottom: '8px' }}>
                    ⚡ Popüler Ekran Kartları:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {popularGpus.map((gpu, gIdx) => (
                      <button
                        key={gIdx}
                        onClick={() => handleSelectGpu(gpu)}
                        style={{
                          background: userGpu === gpu ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                          border: userGpu === gpu ? '1px solid #00ff88' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: userGpu === gpu ? '#00ff88' : '#e0e0e0',
                          borderRadius: '8px',
                          padding: '5px 9px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {gpu}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom GPU / Hardware Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '11.5px', color: '#d0d0dc', fontWeight: 700 }}>
                    ✍️ Veya Kendi Sistemini Yaz:
                  </div>
                  <input
                    type="text"
                    placeholder="Örn: RTX 3070 Ti, Ryzen 5 5600..."
                    value={customGpuInput}
                    onChange={(e) => setCustomGpuInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSelectGpu();
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '12.5px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                <button
                  onClick={() => handleSelectGpu()}
                  disabled={!customGpuInput.trim()}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #e50914 0%, #b81d24 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '11px',
                    fontSize: '12.5px',
                    fontWeight: 750,
                    cursor: customGpuInput.trim() ? 'pointer' : 'not-allowed',
                    opacity: customGpuInput.trim() ? 1 : 0.5,
                    boxShadow: '0 4px 15px rgba(229, 9, 20, 0.4)'
                  }}
                >
                  ✅ Kaydet & Sistemime Göre Öneri Al
                </button>
                {userGpu && (
                  <button
                    onClick={() => {
                      setUserGpu('');
                      setCustomGpuInput('');
                      setShowHardwareModal(false);
                      try {
                        const savedProfile = localStorage.getItem('gamerisen_user_profile');
                        let profileObj = savedProfile ? JSON.parse(savedProfile) : {};
                        if (profileObj.hardware) delete profileObj.hardware.gpu;
                        localStorage.setItem('gamerisen_user_profile', JSON.stringify(profileObj));
                      } catch (e) {}
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#888899',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Donanım bilgisini kaldır
                  </button>
                )}
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
              <div ref={messagesContainerRef} className="ai-widget-messages">
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
                      onClick={() => {
                        if (m.isTyping && m.fullText) {
                          setMessages((prev) => {
                            const updated = [...prev];
                            if (updated[idx]) {
                              updated[idx] = {
                                ...updated[idx],
                                text: m.fullText,
                                isTyping: false,
                                games: m.games
                              };
                            }
                            return updated;
                          });
                        }
                      }}
                    >
                      <span
                        dangerouslySetInnerHTML={{
                          __html: m.isTyping ? formatStreamingMarkdown(m.text) : formatMarkdown(m.text)
                        }}
                      />
                      {m.isTyping && <span className="ai-typing-cursor" />}
                    </div>

                    {/* Render Rich Game Cards */}
                    {m.games && m.games.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '6px' }}>
                        {m.games.map((g, gIdx) => {
                          const gameUrl = getGameDetailUrl(g);
                          return (
                            <div
                              key={gIdx}
                              style={{
                                background: 'rgba(25, 25, 32, 0.92)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '14px',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                                transition: 'border-color 0.2s, box-shadow 0.2s'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                <Link
                                  href={gameUrl}
                                  onClick={() => {
                                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                                      setIsOpen(false);
                                    }
                                  }}
                                  style={{
                                    fontWeight: 750,
                                    fontSize: '14px',
                                    color: '#fff',
                                    textDecoration: 'none',
                                    transition: 'color 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4444')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = '#fff')}
                                  title={`${g.title} oyununu sitemizde aç`}
                                >
                                  {g.title}
                                </Link>
                                <div style={{ background: '#00ff8820', color: '#00ff88', border: '1px solid #00ff8840', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                  ⭐ {g.rating}/100
                                </div>
                              </div>

                              {/* Hardware & FPS Compatibility Badge */}
                              {g.hardware_compatibility && (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'rgba(0, 255, 136, 0.07)',
                                    border: '1px solid rgba(0, 255, 136, 0.22)',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    fontSize: '11.5px',
                                    gap: '6px'
                                  }}
                                >
                                  <span style={{ color: '#00ff88', fontWeight: 700 }}>
                                    {g.hardware_compatibility.status}
                                  </span>
                                  <span style={{ color: '#c0c0d0', fontSize: '11px', fontWeight: 600 }}>
                                    {g.hardware_compatibility.fps_estimate}
                                  </span>
                                </div>
                              )}

                              {g.best_deal && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: '8px' }}>
                                  <div style={{ fontSize: '12px', color: '#aaa', fontWeight: 600 }}>{g.best_deal.platform}</div>
                                  <div style={{ fontWeight: 800, color: '#00ff88', fontSize: '13px' }}>
                                    {typeof g.best_deal.current_price === 'string' && (g.best_deal.current_price.startsWith('$') || g.best_deal.current_price.includes('TL') || g.best_deal.current_price === 'Ücretsiz')
                                      ? g.best_deal.current_price
                                      : `${g.best_deal.current_price} ${g.currency || 'TL'}`}
                                    {g.best_deal.discount > 0 && (
                                      <span style={{ marginLeft: '6px', color: '#ff4444', fontSize: '11px' }}>
                                        (-%{g.best_deal.discount})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              <Link
                                href={gameUrl}
                                onClick={() => {
                                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                                    setIsOpen(false);
                                  }
                                }}
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
                                  marginTop: '2px',
                                  boxShadow: '0 3px 12px rgba(229, 9, 20, 0.35)',
                                  transition: 'all 0.18s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                  e.currentTarget.style.boxShadow = '0 5px 16px rgba(229, 9, 20, 0.55)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'none';
                                  e.currentTarget.style.boxShadow = '0 3px 12px rgba(229, 9, 20, 0.35)';
                                }}
                              >
                                Mağazaya Git 🚀
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', width: 'fit-content' }}>
                    <div className="ai-loading-dots">
                      <span></span><span></span><span></span>
                    </div>
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
