from c import *

def home():
    head = ('<header style="padding: 54px 20px 0; height: 98px; box-sizing: border-box; flex-shrink: 0; display: flex; align-items: center;">'
            '<div style="display: flex; align-items: center; justify-content: space-between; height: 44px; width: 100%%;">'
            '<a href="G-04-Home.dc.html" aria-label="Gamerisen ana sayfa" style="display: flex; align-items: center; gap: 9px; height: 44px;">%s%s</a>'
            '<div style="display: flex; align-items: center; gap: 2px; margin-right: -6px;">%s%s'
            '<a href="G-21-Profile.dc.html" aria-label="Profilin" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;"><img src="%s" alt="" style="width: 30px; height: 30px; border-radius: 999px; object-fit: cover; display: block;"></a></div></div></header>') % (
        mark(32), wordmark(22), iconbtn('search', 'Ara', 22, href='G-05-Search.dc.html'), iconbtn('bell', 'Bildirimler, 4 yeni', 22, dot=True, href='G-20-Notifications.dc.html'), art('eldenring'))
    greet = pad(txt('Tekrar hoş geldin, Deniz.', 15, 20, 400, T2))
    heroes = rail(hero('cyberpunk', 'RPG sevdiğin için', 'Cyberpunk 2077', 'RPG · Açık dünya · %s 4,6' % star(12), '₺599', '₺1.199', '-%50', "Steam'de", 'h1', pos='52% center') +
                  hero('exp33', '3 arkadaşın bunu oynuyor', 'Clair Obscur: Expedition 33', 'RPG · Sıra tabanlı · %s 4,8' % star(12), '₺1.179', '₺1.469', '-%20', "Epic'te", 'h2', pos='66% center') +
                  hero('witcher', 'Listendeki oyun indirimde', 'The Witcher 3: Wild Hunt', 'RPG · Açık dünya · %s 4,9' % star(12), '₺249', '₺499', '-%50', "GOG'da", 'h3', pos='55% center'), 10, 20, 420)
    dots = '<div style="display: flex; justify-content: center; gap: 6px; height: 6px;"><span style="width: 18px; height: 6px; border-radius: 3px; background: %s;"></span>%s</div>' % (AC, ''.join('<span style="width: 6px; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.28);"></span>' for _ in range(4)))
    s_hero = heroes + '<div style="margin-top: 12px;">%s</div>' % dots

    hd, hh = sec_head('Senin İçin', 'Tümü', '#', sub='Çünkü RPG oyunlarını seviyorsun')
    cards = ''.join([game_m('bg3', "Baldur's Gate 3", 'RPG', '4,8', '₺799', '₺1.229', '-%35', 'Steam', 'g1', pos='28% center'),
                     game_m('alanwake', 'Alan Wake 2', 'Korku', '4,6', '₺599', '₺999', '-%40', 'Epic', 'g2', pos='48% center'),
                     game_m('hades2', 'Hades II', 'Roguelike', '4,9', '₺499', '₺714', '-%30', 'Steam', 'g3'),
                     game_m('kcd2', 'Kingdom Come: Deliverance II', 'RPG', '4,7', '₺1.049', '₺1.499', '-%30', 'GOG', 'g4', pos='62% center')])
    s1 = hd + '<div style="margin-top: 12px;">%s</div>' % rail(cards, 12, 20, GM_H())
    S1H = hh + 12 + GM_H()

    hd, hh = sec_head('Fiyatı Düşenler', 'Tümü', 'G-09-Wishlist.dc.html', sub='Son 24 saatte en çok düşen fiyatlar')
    drops = rail(drop_card('hogwarts', 'Hogwarts Legacy', '₺1.199', '₺599', '-%50', 'Steam', 'Son 24 saatte ₺200 düştü', pos='50% 40%') +
                 drop_card('witcher', 'The Witcher 3: Wild Hunt', '₺499', '₺249', '-%50', 'GOG', 'Son 24 saatte ₺120 düştü') +
                 drop_card('fc', 'EA Sports FC 26', '₺2.199', '₺1.319', '-%40', 'Epic', 'Dün ₺440 düştü'), 12, 20, DROP_H())
    s2 = hd + '<div style="margin-top: 12px;">%s</div>' % drops
    S2H = hh + 12 + DROP_H()

    hd, _ = sec_head('Arkadaşların Ne Oynuyor?', 'Tümü', 'G-18-Messages.dc.html')
    fr = rail(friend(avatar(None, 56, 'B', AVC[3], gk='cs2'), 'Burak', 'Counter-Strike 2', 'Şu anda oynuyor') +
              friend(avatar(None, 56, 'E', AVC[1], gk='bg3'), 'Eren', "Baldur's Gate 3", '2 saat önce', False) +
              friend(avatar(None, 56, 'Z', AVC[2], gk='hades2'), 'Zeynep', 'Hades II', 'Şu anda oynuyor') +
              friend(avatar('forza', 56, gk='forza'), 'Mert', 'Forza Horizon 5', 'Dün', False) +
              friend(avatar(None, 56, 'S', AVC[4], gk='eldenring'), 'Selin', 'Elden Ring', 'Şu anda oynuyor'), 8, 20, FR_H)
    s3 = hd + '<div style="margin-top: 12px;">%s</div>' % fr
    S3H = 28 + 12 + FR_H

    hd, _ = sec_head("Gamerisen'da Gündem", 'Tümü', 'G-10-Community.dc.html')
    tc, th = trend_card([('#GTA6', '12,4 B gönderi', 'Yeni fragman konuşuluyor', 'Yükselişte', True), ('#GamePass', '6,8 B gönderi', 'Ekim listesi açıklandı', '+%24', False), ('#EldenRing', '5,2 B gönderi', 'DLC teorileri', '+%12', False)])
    s4 = hd + '<div style="margin-top: 12px;">%s</div>' % pad(tc)
    S4H = 28 + 12 + th

    hd, _ = sec_head('Toplulukta Popüler', 'Topluluk', 'G-10-Community.dc.html')
    p, ph = post(post_head(avatar('forza', 40), 'MertGaming', '@mertgaming', '2 sa', badge('Lv 34')), 'Bu boss fight gerçekten inanılmazdı. 41 denemede geçtim ama her saniyesine değdi.', 3,
                 'p1', 1204, '186', media_img('eldenring', 298, 168, '40% center'), 168, ('eldenring', 'Elden Ring', 'done'))
    s5 = hd + '<div style="margin-top: 12px;">%s</div>' % pad(p)
    S5H = 28 + 12 + ph

    hd, _ = sec_head('Kaçırılmayacak Fırsatlar', 'Tümü', '#')
    s6 = hd + '<div style="margin-top: 12px;">%s</div>' % rail(deal_card('rdr2', 'Red Dead Redemption 2', '₺349', '₺1.199', '-%71', 'Epic Games', pos='70% center') +
                                                         deal_card('doom', 'DOOM: The Dark Ages', '₺649', '₺1.699', '-%62', 'Steam'), 12, 20, DEAL_H)
    S6H = 28 + 12 + DEAL_H

    hd, _ = sec_head('Oyun Dünyasından', 'Tümü', 'G-16-News.dc.html')
    nf, nh = news_feat('ghost', 'PlayStation yeni oyunlarını duyurdu: sonbahar takvimi netleşti', 'PlayStation', '8 dk önce', 'Gamerisen Haber')
    rows = ''.join([news_row('gta', "GTA VI için yeni oynanış detayları paylaşıldı", 'Gündem', '42 dk önce', True, pos='50% 60%'),
                    news_row('split', "Steam Sonbahar İndirimi'nin tarihleri belli oldu", 'PC', '2 sa önce'),
                    news_row('esports', "Espor Ligi TR'de yeni sezon bu hafta başlıyor", 'Espor', '4 sa önce')])
    s7 = hd + '<div style="margin-top: 12px;">%s</div>' % pad(nf + '<div style="margin-top: 18px; display: flex; flex-direction: column; gap: 14px;">%s</div>' % rows)
    S7H = 28 + 12 + nh + 18 + 72 * 3 + 28

    hd, _ = sec_head('İzlemeye Değer', 'Tümü', 'G-14-Videos.dc.html')
    v1, vh = video('cyberpunk', 'Cyberpunk 2077 — Phantom Liberty İncelemesi', 'GameReviewTR', '215 B görüntülenme', '12:42', 'İnceleme', 'cyberpunk', 'Cyberpunk 2077', pos='40% center')
    v2, _ = video('eldenring', 'Elden Ring: Kâbus zorlukta ilk 30 dakika', 'Level Up TR', '96 B görüntülenme', '31:05', 'Oynanış', 'eldenring', 'Elden Ring')
    s8 = hd + '<div style="margin-top: 12px;">%s</div>' % rail(v1 + v2, 14, 20, vh)
    S8H = 28 + 12 + vh

    hd, hh = sec_head('Belki Bunu Seversin', sub='Çünkü The Witcher 3 ve Elden Ring oynadın')
    s9 = hd + '<div style="margin-top: 12px; padding: 0 20px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px;">%s</div>' % ''.join([
        game_s('mhwilds', 'Monster Hunter Wilds', '₺1.119', '-%30'), game_s('nms', "No Man's Sky", '₺379', '-%60', pos='30% center'), game_s('silksong', 'Hollow Knight: Silksong', '₺389')])
    S9H = hh + 12 + GS_H()

    content, tot = stack([(None, head, 98), (2, greet, 20), (14, s_hero, 420 + 18), (32, s1, S1H), (32, s2, S2H), (32, s3, S3H), (32, s4, S4H), (32, s5, S5H), (32, s6, S6H), (32, s7, S7H), (32, s8, S8H), (32, s9, S9H)])
    H = tot + 28 + TABBAR_H
    vals = ("{ w: { h1: this.wish('w_h1', false), h2: this.wish('w_h2', false), h3: this.wish('w_h3', true), g1: this.wish('w_g1', false), g2: this.wish('w_g2', true), g3: this.wish('w_g3', true), g4: this.wish('w_g4', false) },"
            " l: { p1: this.like('l_p1', 1204, false) }, b: { p1: this.bm('b_p1', false, t.ac) } }")
    return page('Gamerisen — 04 Ana Sayfa', 390, H, root(content + tabbar('home'), H), script(vals)), H

def game_detail():
    hero_ = ('<div style="position: relative; width: 390px; height: 380px;">%s<div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,10,11,0.5) 0%%, rgba(10,10,11,0) 26%%, rgba(10,10,11,0) 52%%, #0A0A0B 100%%);"></div>'
             '<div style="position: absolute; top: 54px; left: 16px; right: 16px; height: 44px; display: flex; justify-content: space-between;">'
             '<a href="G-04-Home.dc.html" aria-label="Geri" style="width: 44px; height: 44px; border-radius: 999px; %s display: flex; align-items: center; justify-content: center;">%s</a>'
             '<div style="display: flex; gap: 10px;">%s%s</div></div></div>') % (img('cyberpunk', 390, 380, 0, '50% 55%', 'Cyberpunk 2077 görseli'), DARKGLASS, icon('back', 22, '#FFFFFF', 2.4), iconbtn('share', 'Paylaş', 20, '#FFFFFF', onart=True), heart('gd', pos=False, size=44, s=20))
    chips_ = ''.join('<span style="height: 30px; padding: 0 12px; border-radius: 999px; background: %s; display: flex; align-items: center; font-size: 13px; font-weight: 600; flex-shrink: 0;">%s</span>' % (S2, t) for t in ['RPG', 'Açık dünya', 'Aksiyon', 'Bilim kurgu'])
    tb = ('<div style="padding: 0 20px; display: flex; flex-direction: column;"><h1 style="margin: 0; font-family: %s; font-size: 30px; line-height: 36px; font-weight: 700; letter-spacing: -0.03em;">Cyberpunk 2077</h1>'
          '<div style="font-size: 14px; line-height: 20px; color: %s; margin-top: 4px;">2020 · CD PROJEKT RED</div>'
          '<div style="display: flex; align-items: center; gap: 6px; height: 24px; margin-top: 12px; font-size: 14px; color: %s;">%s<span class="num" style="font-size: 15px; font-weight: 700; color: %s;">4,6</span><span class="num">38,2 B oy</span><span>·</span><span style="height: 20px; padding: 0 6px; border-radius: 5px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.25); font-size: 11px; font-weight: 700; color: %s; display: inline-flex; align-items: center;">PEGI 18</span></div>'
          '<div class="rail" style="display: flex; gap: 8px; margin-top: 14px; overflow-x: auto;">%s</div>'
          '<div style="display: flex; align-items: center; gap: 6px; height: 20px; margin-top: 12px; font-size: 13px; color: %s;">%sPC · PlayStation 5 · Xbox Series X|S</div></div>') % (
        FD, T2, T2, star(16), TX, TX, chips_, T2, icon('monitor', 15, T2))
    TBH = 36 + 4 + 20 + 12 + 24 + 14 + 30 + 12 + 20
    cta = '<div style="padding: 0 20px; display: flex; flex-direction: column; gap: 10px;">%s%s</div>' % (
        btn('En Ucuz Fiyatı Gör', 'primary', 52, href='#fiyat', extra=' width: 100%;', icon_right='arrdown'), btn('İstek Listesine Ekle', 'secondary', 48, icon_='heart', extra=' width: 100%;'))
    others = [('Epic Games', 'Epic Games', 'PC', '₺649', '+₺50'), ('Microsoft Store', 'Microsoft Store', 'PC · Xbox Play Anywhere', '₺679', '+₺80'), ('PlayStation Store', 'PlayStation Store', 'PS5', '₺729', '+₺130')]
    orows = ''.join(('<a href="G-08-Prices.dc.html" style="display: flex; align-items: center; gap: 12px; height: 52px;">%s<div style="display: flex; flex-direction: column; flex: 1 1 auto;"><span style="font-size: 15px; line-height: 20px; font-weight: 600;">%s</span><span style="font-size: 12px; line-height: 16px; color: %s;">%s</span></div>'
                     '<div style="display: flex; flex-direction: column; align-items: flex-end;">%s<span class="num" style="font-size: 12px; line-height: 16px; color: %s;">%s</span></div></a>') % (mono(m, 32, 13, 9), n, T2, sub, price(p, 15), T3, d) for m, n, sub, p, d in others)
    pc = ('<div id="fiyat" style="margin: 0 20px; box-sizing: border-box; padding: 18px; border-radius: 20px; background: %s; display: flex; flex-direction: column;">'
          '<div style="display: flex; align-items: center; justify-content: space-between; height: 18px;"><span style="font-size: 13px; font-weight: 600; color: %s;">En İyi Fiyat</span><span style="display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: %s;">%s5 dk önce güncellendi</span></div>'
          '<div style="display: flex; align-items: center; gap: 12px; height: 44px; margin-top: 14px;">%s<div style="display: flex; flex-direction: column;"><span style="font-size: 17px; line-height: 22px; font-weight: 600;">Steam</span><span style="font-size: 12px; line-height: 16px; color: %s;">Resmî mağaza · Anında teslim</span></div></div>'
          '<div style="display: flex; align-items: center; gap: 10px; height: 40px; margin-top: 14px;">%s%s%s</div>'
          '<div style="display: flex; align-items: center; gap: 6px; height: 20px; margin-top: 8px; font-size: 13px; color: %s;">%s<span>Tüm zamanların en düşük fiyatı: <b class="num" style="color: %s; font-weight: 600;">₺499</b></span></div>'
          '<div style="margin-top: 16px;">%s</div>'
          '<div style="height: 0.5px; background: %s; margin-top: 18px;"></div>'
          '<div style="font-size: 13px; line-height: 18px; font-weight: 600; color: %s; margin-top: 14px;">Diğer mağazalar</div>'
          '<div style="margin-top: 4px; display: flex; flex-direction: column;">%s</div>'
          '<a href="G-08-Prices.dc.html" style="margin-top: 4px; height: 44px; display: flex; align-items: center; justify-content: space-between; font-size: 15px; font-weight: 600; color: %s;">6 mağazanın tümünü karşılaştır%s</a></div>') % (
        S1, T2, T3, icon('refresh', 12, T3, 2.2), mono('Steam', 44, 18, 12), T2, price('₺599', 36), old('₺1.199', 16), disc('-%50', 15, 26), T2, icon('trophy', 15, GOLD, 2), TX,
        btn('Mağazaya Git', 'primary', 48, extra=' width: 100%;', icon_right='ext'), LINE, T2, orows, AC, icon('chev', 18, AC, 2.4))
    PCH = 18 + 18 + 14 + 44 + 14 + 40 + 8 + 20 + 16 + 48 + 18 + 1 + 14 + 18 + 4 + 156 + 4 + 44 + 18

    hd, _ = sec_head('Fragman ve Görseller')
    def zoom(k, w, h, iw, ih, dx, dy): return '<div style="width: %dpx; height: %dpx; border-radius: 12px; overflow: hidden; flex-shrink: 0;"><img src="%s" alt="Oyun içi ekran görüntüsü" style="width: %dpx; height: %dpx; object-fit: cover; margin-left: -%dpx; margin-top: -%dpx; display: block;"></div>' % (w, h, art(k), iw, ih, dx, dy)
    trailer = ('<a href="G-15-VideoPlayer.dc.html" aria-label="Resmî fragmanı oynat" style="position: relative; display: block; margin: 12px 20px 0; width: 350px; height: 197px;">%s%s'
               '<span style="position: absolute; left: 12px; bottom: 12px; height: 26px; padding: 0 9px; border-radius: 8px; display: flex; align-items: center; gap: 6px; %s font-size: 12px; font-weight: 600; color: #FFFFFF;">Resmî Fragman · 2:34</span></a>') % (img('cyberpunk', 350, 197, 18, '70% 40%'), playc(60), DARKGLASS)
    shots = zoom('cyberpunk', 200, 112, 420, 280, 40, 120) + zoom('cyberpunk', 200, 112, 520, 347, 300, 60) + zoom('cyberpunk', 200, 112, 460, 307, 150, 180) + zoom('cyberpunk', 200, 112, 400, 267, 180, 20)
    s_media = hd + trailer + '<div style="margin-top: 12px;">%s</div>' % rail(shots, 10, 20, 112)
    def cell(l, v): return '<div style="display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 12px; line-height: 16px; color: %s;">%s</span><span style="font-size: 15px; line-height: 20px; font-weight: 600;">%s</span></div>' % (T2, l, v)
    hd, _ = sec_head('Oyun Hakkında')
    s_about = hd + ('<div style="padding: 0 20px; margin-top: 10px; display: flex; flex-direction: column;">%s<div style="display: flex; margin-top: 2px;">%s</div>'
                    '<div style="margin-top: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">%s%s%s%s</div></div>') % (
        txt("Night City'de geçen açık dünya bir aksiyon-macera RPG'si. Güce ve vücut modifikasyonlarına takıntılı bir megapoliste, ölümsüzlüğün anahtarı olan bir implantın peşine düşen paralı asker V'yi oynarsın.", 15, 22, 400, T2, 'c4', ' height: 88px;'),
        btn('Devamını oku', 'tertiary', 32, extra=' padding: 0; justify-content: flex-start;'), cell('Geliştirici', 'CD PROJEKT RED'), cell('Yayıncı', 'CD PROJEKT'), cell('Çıkış tarihi', '10 Aralık 2020'), cell('Oyun modu', 'Tek oyunculu'))
    hd, _ = sec_head('Sistem Gereksinimleri')
    reqs = [('monitor', 'İşletim sistemi', 'Windows 10 64-bit'), ('cpu', 'İşlemci', 'Core i7-6700 / Ryzen 5 1600'), ('layers', 'Bellek', '12 GB RAM'), ('play', 'Ekran kartı', 'GTX 1060 6 GB / RX 580 8 GB'), ('hdd', 'Depolama', '70 GB SSD')]
    rq = ''.join(('<div style="position: relative; display: flex; align-items: center; gap: 12px; height: 52px; padding: 0 16px;">%s%s<span style="width: 104px; font-size: 13px; color: %s; flex-shrink: 0;">%s</span><span class="c1" style="font-size: 14px; font-weight: 600;">%s</span></div>') % (
        '<span style="position: absolute; top: 0; left: 48px; right: 0; height: 0.5px; background: %s;"></span>' % LINE if i else '', icon(ic, 18, T2), T2, l, v) for i, (ic, l, v) in enumerate(reqs))
    s_req = hd + '<div style="padding: 0 20px; margin-top: 12px;">%s<div style="margin-top: 12px; border-radius: 16px; background: %s; overflow: hidden;">%s</div></div>' % (segmented(['Minimum', 'Önerilen'], 0, 350), S1, rq)
    hd, _ = sec_head('Oyuncu İncelemeleri', 'Tümü', '#')
    bars = ''.join('<div style="display: flex; align-items: center; gap: 8px; height: 16px;"><span class="num" style="width: 8px; font-size: 11px; color: %s;">%d</span><span style="flex: 1 1 auto; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.1);"><span style="display: block; width: %d%%; height: 6px; border-radius: 3px; background: %s;"></span></span><span class="num" style="width: 30px; font-size: 11px; color: %s; text-align: right;">%%%d</span></div>' % (T2, n, p_, TX, T3, p_)
                   for n, p_ in [(5, 72), (4, 18), (3, 5), (2, 3), (1, 2)])
    summ = ('<div style="display: flex; gap: 20px; align-items: center; height: 128px; box-sizing: border-box; padding: 16px; border-radius: 18px; background: %s;"><div style="display: flex; flex-direction: column; align-items: center; width: 96px;">'
            '<span class="num" style="font-family: %s; font-size: 44px; line-height: 48px; font-weight: 700;">4,6</span>%s<span style="font-size: 12px; color: %s; margin-top: 6px;">38,2 B oy</span></div>'
            '<div style="flex: 1 1 auto; display: flex; flex-direction: column; gap: 4px;">%s</div></div>') % (S1, FD, stars(5, 13), T2, bars)
    rev = ('<div style="height: 170px; box-sizing: border-box; padding: 14px; border-radius: 18px; background: %s; display: flex; flex-direction: column;">'
           '<div style="display: flex; align-items: center; gap: 10px; height: 36px;">%s<div style="display: flex; flex-direction: column; flex: 1 1 auto;"><span style="font-size: 14px; font-weight: 600;">kaan_rpg</span><span style="display: flex; align-items: center; gap: 6px;">%s<span style="font-size: 12px; color: %s;">· 86 saat oynadı</span></span></div>%s</div>'
           '%s<div style="display: flex; align-items: center; gap: 6px; height: 20px; margin-top: 10px; font-size: 12px; color: %s;">%s412 kişi faydalı buldu · 2 hafta önce</div></div>') % (
        S1, avatar('hades2', 36), stars(5, 11), T3, status('rec'), txt('2.0 güncellemesiyle bambaşka bir oyuna dönüştü. Phantom Liberty hikâyesi serinin en iyisi; yan görevler bile ana hikâye kadar özenli.', 15, 22, 400, TX, 'c3', ' margin-top: 10px; height: 66px;'), T2, icon('heart', 13, T2))
    s_rev = hd + '<div style="padding: 0 20px; margin-top: 12px; display: flex; flex-direction: column; gap: 12px;">%s%s</div>' % (summ, rev)
    hd, _ = sec_head('Topluluk Tartışmaları', 'Tümü', 'G-11-GameCommunity.dc.html')
    def thread(t, meta, tags, sep):
        tg = ''.join('<span style="height: 20px; padding: 0 6px; border-radius: 5px; background: rgba(255,255,255,0.1); font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; color: %s;">%s</span>' % (T2, x) for x in tags)
        return ('<a href="G-13-PostDetail.dc.html" style="position: relative; display: flex; flex-direction: column; justify-content: center; gap: 4px; height: 76px; padding: 0 16px;">%s%s<div style="display: flex; align-items: center; gap: 8px; font-size: 12px; line-height: 16px; color: %s;">%s<span>%s</span></div></a>') % (
            '<span style="position: absolute; top: 0; left: 16px; right: 0; height: 0.5px; background: %s;"></span>' % LINE if sep else '', txt(t, 15, 20, 600, TX, 'c1'), T2, tg, meta)
    s_comm = hd + ('<div style="margin: 12px 20px 0; padding: 4px 0; border-radius: 18px; background: %s;">%s%s</div><div style="padding: 0 20px; margin-top: 12px;">%s</div>') % (
        S1, thread('En iyi Netrunner build’i hangisi? (2.0 sonrası)', '142 yanıt · 12 dk önce', ['Rehber'], False), thread('Phantom Liberty sonu hakkında (spoiler etiketli)', '386 yanıt · 1 sa önce', ['Spoiler'], True),
        btn('Tartışmaya Katıl', 'secondary', 44, href='G-11-GameCommunity.dc.html', icon_='comment', extra=' width: 100%;'))
    hd, _ = sec_head('İlgili Haberler', 'Tümü', 'G-16-News.dc.html')
    s_news = hd + '<div style="padding: 0 20px; margin-top: 12px; display: flex; flex-direction: column; gap: 14px;">%s%s</div>' % (
        news_row('cyberpunk', 'Cyberpunk 2 geliştirme sürecine dair ilk detaylar', 'PC', '3 sa önce', pos='30% center'), news_row('split', "Night City'nin yapımına dair sanat kitabı Türkçe çıkıyor", 'Gündem', 'Dün'))
    hd, _ = sec_head('İlgili Videolar', 'Tümü', 'G-14-Videos.dc.html')
    va, vh = video('cyberpunk', 'Phantom Liberty: Yeni başlayanlar için 10 ipucu', 'Level Up TR', '96 B görüntülenme', '18:20', 'İpucu', w=240, th=135, pos='20% 40%')
    vb, _ = video('cyberpunk', 'Night City’de 4K fotoğraf modu turu', 'PixelNur', '51 B görüntülenme', '9:10', 'Topluluk', w=240, th=135, pos='90% 70%')
    s_vid = hd + '<div style="margin-top: 12px;">%s</div>' % rail(va + vb, 14, 20, vh)
    hd, _ = sec_head('Benzer Oyunlar')
    sim = ''.join([game_s('witcher', 'The Witcher 3: Wild Hunt', '₺249', '-%50', 120, 160), game_s('nms', 'Starfield', '₺1.399', None, 120, 160, '30% center'),
                   game_s('split', 'Deus Ex: Mankind Divided', '₺89', '-%85', 120, 160, '70% center'), game_s('hades2', 'Ghostrunner 2', '₺349', '-%50', 120, 160)])
    s_sim = hd + '<div style="margin-top: 12px;">%s</div>' % rail(sim, 12, 20, GS_H(160))
    content, tot = stack([(None, hero_, 380), (0, tb, TBH), (20, cta, 110), (24, pc, PCH), (32, s_media, 28 + 12 + 197 + 12 + 112), (32, s_about, 28 + 10 + 88 + 2 + 32 + 14 + 88),
                          (32, s_req, 28 + 12 + 36 + 12 + 260), (32, s_rev, 28 + 12 + 128 + 12 + 170), (32, s_comm, 28 + 12 + 160 + 12 + 44), (32, s_news, 28 + 12 + 158),
                          (32, s_vid, 28 + 12 + vh), (32, s_sim, 28 + 12 + GS_H(160))])
    H = tot + 28 + 92
    bar = sticky_bar('₺599', "Steam'de en ucuz · -%50", 'Mağazaya Git', '#')
    return page('Gamerisen — 07 Oyun Detayı', 390, H, root(content + bar, H), script("{ w: { gd: this.wish('w_gd', false) } }")), H

def sticky_bar(p, sub, label, href):
    return ('<div style="position: absolute; left: 0; right: 0; bottom: 0; height: 92px; box-sizing: border-box; padding: 10px 20px 34px; background: rgba(19,19,21,0.96); -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px); border-top: 0.5px solid rgba(255,255,255,0.12); display: flex; align-items: center; gap: 12px; z-index: 5;">'
            '<div style="display: flex; flex-direction: column; flex: 1 1 auto;">%s<span style="font-size: 12px; line-height: 16px; color: %s;">%s</span></div>%s</div>') % (price(p, 20), T2, sub, btn(label, 'primary', 48, href=href, icon_right='ext'))

def prices():
    nb = nav_bar('Fiyat Karşılaştırma', 'G-07-GameDetail.dc.html', iconbtn('bell', 'Fiyat alarmı', 22))
    gh = ('<div style="padding: 0 20px; display: flex; align-items: center; gap: 12px; height: 64px;">%s<div style="display: flex; flex-direction: column; gap: 6px;"><span style="font-size: 17px; line-height: 22px; font-weight: 600;">Cyberpunk 2077</span>'
          '<button style="height: 28px; padding: 0 10px; border-radius: 8px; background: %s; display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; align-self: flex-start;">Standart Sürüm%s</button></div></div>') % (img('cyberpunk', 48, 64, 10, '52% center'), S2, icon('chevd', 14, TX, 2.4))
    seg = pad(segmented(['PC', 'PlayStation', 'Xbox'], 0, 350))
    best = ('<div style="margin: 0 20px; box-sizing: border-box; padding: 18px; border-radius: 22px; background: %s; display: flex; flex-direction: column;">'
            '<div style="display: flex; align-items: center; justify-content: space-between; height: 22px;"><span style="height: 22px; padding: 0 8px; border-radius: 6px; background: %s; color: %s; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">%sEn İyi Fiyat</span><span style="font-size: 12px; color: %s;">Güncellendi: 5 dk önce</span></div>'
            '<div style="display: flex; align-items: center; gap: 12px; height: 48px; margin-top: 14px;">%s<div style="display: flex; flex-direction: column; min-width: 0;"><span style="font-size: 17px; line-height: 22px; font-weight: 600;">Steam</span><span class="c1" style="font-size: 12px; line-height: 16px; color: %s;">Resmî mağaza · Oyun hesabına eklenir</span></div></div>'
            '<div style="display: flex; align-items: center; gap: 10px; height: 44px; margin-top: 16px;">%s%s%s</div>'
            '<div style="margin-top: 6px; display: flex; height: 18px;">%s</div>'
            '<div style="margin-top: 16px;">%s</div>'
            '<div style="margin-top: 10px; font-size: 12px; line-height: 16px; color: %s; text-align: center;">Fiyatlara KDV dahildir · Satın alma mağazada tamamlanır</div></div>') % (
        S1, GREENT, GREEN, icon('trophy', 12, GREEN, 2.2), T3, mono('Steam', 48, 20, 12), T2, price('₺599', 40), old('₺1.199', 17), disc('-%50', 15, 28), drop('Son 24 saatte ₺200 düştü', 13),
        btn('Mağazaya Git', 'primary', 50, extra=' width: 100%;', icon_right='ext'), T3)
    BEST_H = 18 + 22 + 14 + 48 + 16 + 44 + 6 + 18 + 16 + 50 + 10 + 16 + 18
    def tile(l, v, sub, col=TX):
        return '<div style="height: 84px; box-sizing: border-box; padding: 12px 14px; border-radius: 16px; background: %s; display: flex; flex-direction: column;"><span style="font-size: 12px; line-height: 16px; color: %s;">%s</span><span class="num" style="font-family: %s; font-size: 20px; line-height: 26px; font-weight: 700; color: %s; margin-top: 2px;">%s</span><span style="font-size: 12px; line-height: 16px; color: %s;">%s</span></div>' % (S1, T2, l, FD, col, v, T3, sub)
    ins = '<div style="padding: 0 20px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">%s%s</div>' % (tile('Rekor düşük fiyat', '₺499', 'Kasım 2025 · Steam', GREEN), tile('12 aylık ortalama', '₺912', 'Şu an %34 daha ucuz'))
    vals = [1199, 499, 839, 1199, 1199, 719, 1199, 1199, 599, 1199, 799, 599]
    ch, xs = chart(vals, 318, 120, 400, 1300, 1)
    labs = ''.join('<span style="position: absolute; left: %spx; top: 0; transform: translateX(-50%%); font-size: 11px; line-height: 16px; color: %s;">%s</span>' % (round((xs[i] + xs[i + 1]) / 2, 1), T3, n) for i, n in [(0, 'Eki'), (2, 'Ara'), (4, 'Şub'), (6, 'Nis'), (8, 'Haz'), (10, 'Ağu')])
    hd, _ = sec_head('Fiyat Geçmişi', right=segmented(['3A', '6A', '1Y', 'Tümü'], 2, 196, 30, 12))
    s_hist = hd + '<div style="margin: 12px 20px 0; height: 176px; box-sizing: border-box; padding: 16px; border-radius: 18px; background: %s;"><div style="position: relative; height: 120px;">%s</div><div style="position: relative; margin-top: 8px; height: 16px;">%s</div></div>' % (S1, ch, labs)
    alert = ('<div style="margin: 0 20px; height: 130px; box-sizing: border-box; padding: 16px; border-radius: 18px; background: %s; display: flex; flex-direction: column;">'
             '<div style="display: flex; align-items: center; gap: 12px; height: 44px;"><span style="width: 40px; height: 40px; border-radius: 999px; background: %s; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">%s</span>'
             '<div style="display: flex; flex-direction: column; flex: 1 1 auto;"><span style="font-size: 16px; line-height: 21px; font-weight: 600;">Fiyat alarmı</span><span style="font-size: 13px; line-height: 18px; color: %s;">Hedefin altına düşünce bildirim al</span></div>%s</div>'
             '<div style="display: flex; align-items: center; justify-content: space-between; height: 38px; margin-top: 16px;"><span style="font-size: 14px; color: %s;">Hedef fiyat</span>'
             '<div style="display: flex; align-items: center; gap: 4px; padding: 3px; border-radius: 12px; background: %s;"><button aria-label="Azalt" style="width: 36px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center;">%s</button>'
             '<span class="num" style="width: 72px; text-align: center; font-size: 17px; font-weight: 700;">₺500</span><button aria-label="Artır" style="width: 36px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center;">%s</button></div></div></div>') % (
        S1, S2, icon('bell', 19, TX), T2, toggle('alert', 'Fiyat alarmı'), T2, S2, icon('x', 1, S2, 0).replace('<svg', '<svg style="display:none"') if False else '<span style="width: 14px; height: 2px; border-radius: 1px; background: #F5F5F7; display: block;"></span>', icon('plus', 16, TX, 2.4))
    sorts = rail(chip('En düşük fiyat', True, icon_='sort') + chip('Popüler') + chip('Platform', chev=True) + chip('Dijital sürüm', chev=True), 8, 20, 34)
    st = [('Steam', 'Steam', 'PC · Resmî mağaza', '₺599', disc('-%50', 11, 20)), ('Epic Games', 'Epic Games Store', 'PC · Resmî mağaza', '₺649', '+₺50'),
          ('Microsoft Store', 'Microsoft Store', 'PC · Xbox Play Anywhere', '₺679', '+₺80'), ('GOG', 'GOG', "PC · DRM'siz", '₺699', '+₺100'),
          ('PlayStation Store', 'PlayStation Store', 'PS5 · Resmî mağaza', '₺729', '+₺130'), ('Xbox Store', 'Xbox Store', 'Xbox Series X|S', '₺749', '+₺150')]
    rows = ''.join(store_row(m, n, sub, p, r if r.startswith('<') else '<span class="num" style="font-size: 12px; line-height: 16px; color: %s;">%s</span>' % (T3, r), i > 0) for i, (m, n, sub, p, r) in enumerate(st))
    hd, _ = sec_head('Tüm Mağazalar', right='<span style="font-size: 13px; color: %s;">6 mağaza</span>' % T2)
    s_st = hd + '<div style="margin-top: 12px;">%s</div><div style="margin: 12px 20px 0; padding: 4px 0; border-radius: 18px; background: %s;">%s</div>' % (sorts, S1, rows)
    trust = ('<div style="padding: 0 20px; display: flex; gap: 10px; height: 52px;">%s<span style="font-size: 12px; line-height: 17px; color: %s;">Yalnızca resmî ve yetkili satıcılar listelenir. Gamerisen bazı bağlantılardan komisyon alabilir; bu, gösterilen fiyatı değiştirmez.</span></div>') % (icon('shield', 18, T2, 2, style=' margin-top: 1px;'), T3)
    content, tot = stack([(None, nb, NB), (16, gh, 64), (16, seg, 36), (16, best, BEST_H), (12, ins, 84), (28, s_hist, 28 + 12 + 176), (24, alert, 130), (28, s_st, 28 + 12 + 34 + 12 + 6 * 64 + 8), (16, trust, 52)])
    H = tot + 24 + 92
    return page('Gamerisen — 08 Fiyat Karşılaştırma', 390, H, root(content + sticky_bar('₺599', 'Steam · En iyi fiyat', 'Mağazaya Git', '#'), H), script("{ s: { alert: this.sw('s_alert', true) } }")), H

def poll(opts, meta):
    s = '<div style="display: flex; flex-direction: column; gap: 8px;">'
    for n, pct, top in opts:
        s += ('<button style="position: relative; height: 40px; border-radius: 10px; background: %s; overflow: hidden; display: flex; align-items: center; padding: 0 12px; font-size: 14px; font-weight: 600;">'
              '<span style="position: absolute; left: 0; top: 0; bottom: 0; width: %d%%; background: %s;"></span><span style="position: relative; flex: 1 1 auto; display: flex; align-items: center; gap: 6px;">%s%s</span>'
              '<span class="num" style="position: relative; color: %s;">%%%d</span></button>') % (S1, pct, 'rgba(255,255,255,0.16)' if top else 'rgba(255,255,255,0.06)', n, icon('checkc', 15, TX, 2.2) if top else '', TX if top else T2, pct)
    return s + '</div><div style="margin-top: 8px; font-size: 12px; line-height: 18px; color: %s;">%s</div>' % (T3, meta), 4 * 40 + 3 * 8 + 26

def community():
    head = page_head('Topluluk', iconbtn('search', 'Toplulukta ara', 22, href='G-05-Search.dc.html') + iconbtn('pen', 'Gönderi oluştur', 22, href='G-12-CreatePost.dc.html'))
    seg = pad(segmented(['Senin İçin', 'Takip', 'Trend', 'Topluluklar'], 0, 350))
    types = ''.join('<a href="G-12-CreatePost.dc.html" style="height: 32px; padding: 0 10px; border-radius: 10px; background: %s; display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: %s; flex-shrink: 0;">%s%s</a>' % (S2, T2, icon(i, 15, T2, 2), t)
                    for i, t in [('image', 'Görsel'), ('pad', 'Oyun'), ('video', 'Video'), ('poll', 'Anket')])
    comp = ('<div style="margin: 0 20px; height: 108px; box-sizing: border-box; padding: 14px; border-radius: 18px; background: %s;"><div style="display: flex; align-items: center; gap: 10px; height: 36px;">%s'
            '<a href="G-12-CreatePost.dc.html" style="flex: 1 1 auto; height: 36px; display: flex; align-items: center; font-size: 16px; color: %s;">Ne düşünüyorsun?</a></div><div style="display: flex; gap: 8px; margin-top: 12px;">%s</div></div>') % (S1, avatar('eldenring', 36), T3, types)
    def ctile(k, n, sub, dot=False, pos='center'):
        d = '<span style="position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; border-radius: 999px; background: %s; box-shadow: 0 0 0 2.5px %s;"></span>' % (AC, BG) if dot else ''
        return '<a href="G-11-GameCommunity.dc.html" style="width: 72px; display: flex; flex-direction: column; align-items: center; flex-shrink: 0;"><span style="position: relative; display: flex;">%s%s</span>%s%s</a>' % (img(k, 60, 60, 18, pos), d, txt(n, 12, 16, 600, TX, 'c1', ' margin-top: 8px; width: 72px; text-align: center;'), txt(sub, 11, 14, 500, AC if dot else T3, '', ' margin-top: 2px;'))
    add = '<a href="#" style="width: 72px; display: flex; flex-direction: column; align-items: center; flex-shrink: 0;"><span style="width: 60px; height: 60px; border-radius: 18px; box-shadow: inset 0 0 0 1.5px rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center;">%s</span>%s</a>' % (icon('plus', 22, T2, 2.2), txt('Keşfet', 12, 16, 600, T2, '', ' margin-top: 8px;'))
    hd, _ = sec_head('Toplulukların', 'Tümü', '#')
    s_c = hd + '<div style="margin-top: 12px;">%s</div>' % rail(ctile('eldenring', 'Elden Ring', '12 yeni', True) + ctile('gta', 'GTA VI', '48 yeni', True, '55% 70%') + ctile('cs2', 'CS2 Türkiye', 'Güncel') + ctile('pixel', 'Indie Köşesi', '3 yeni', True) + ctile('hades2', 'Roguelike', 'Güncel') + add, 8, 20, 100)
    p1, h1 = post(post_head(avatar(None, 40, 'S', AVC[4]), 'selin.exe', '@selinexe', '1 sa', badge('Platin Avcısı', 'trophy')), "Sonunda Alan Wake 2'yi bitirdim. Son iki saat boyunca ağzım açık kaldı. Spoiler vermeden söyleyeyim: müzikli bölüm efsane.", 3,
                  'c1', 1204, '186', media_img('alanwake', 298, 168, '48% center'), 168, ('alanwake', 'Alan Wake 2', 'done'))
    pl, plh = poll([('The Witcher 3', 41, True), ("Baldur's Gate 3", 33, False), ('Elden Ring', 17, False), ('Cyberpunk 2077', 9, False)], '2.418 oy · 14 saat kaldı · Oy verdin')
    p2, h2 = post(post_head(avatar('bg3', 40, pos='70% center'), 'kaan_rpg', '@kaan_rpg', '3 sa', badge('Anket', 'poll')), 'Tartışma başlasın: Bugüne kadar oynadığınız en iyi RPG hangisi?', 2, 'c2', 312, '48',
                  extra_after_text='<div style="margin-top: 12px;">%s</div>' % pl, eh=12 + plh)
    p3, h3 = post(post_head(avatar(None, 40, 'E', AVC[1]), 'emrebgs', '@emrebgs', '5 sa', badge('Lv 28')), "Hafta sonu dört kişilik co-op'a başladık. İlk bölümde altı saat geçirdik, kimse zar atmaktan sıkılmadı. Kesinlikle tavsiye.", 3,
                  'c3', 402, '61', game=('bg3', "Baldur's Gate 3", 'rec'))
    vid = '<a href="G-15-VideoPlayer.dc.html" style="position: relative; display: block; width: 298px; height: 168px;">%s%s%s</a>' % (img('silksong', 298, 168, 14), playc(48), ovl('0:58', 'right: 10px; bottom: 10px;'))
    p4, h4 = post(post_head(avatar('stardew', 40), 'pixelnur', '@pixelnur', '8 sa', badge('İçerik Üreticisi', 'lv')), "Silksong'da bulduğum üç gizli oda. İkincisini kimse bilmiyor olabilir.", 2,
                  'c4', 2310, '204', vid, 168, ('silksong', 'Hollow Knight: Silksong', 'playing'))
    feed = pad('<div style="display: flex; flex-direction: column; gap: 28px;">%s%s%s%s</div>' % (p1, p2, p3, p4))
    FH = h1 + h2 + h3 + h4 + 28 * 3
    content, tot = stack([(None, head, PH), (4, seg, 36), (16, comp, 108), (24, s_c, 28 + 12 + 100), (28, feed, FH)])
    H = tot + 28 + TABBAR_H
    vals = ("{ l: { c1: this.like('l_c1', 1204, false), c2: this.like('l_c2', 312, false), c3: this.like('l_c3', 402, true), c4: this.like('l_c4', 2310, false) },"
            " b: { c1: this.bm('b_c1', false, t.ac), c2: this.bm('b_c2', false, t.ac), c3: this.bm('b_c3', true, t.ac), c4: this.bm('b_c4', false, t.ac) } }")
    return page('Gamerisen — 10 Topluluk', 390, H, root(content + tabbar('users'), H), script(vals)), H

if __name__ == '__main__':
    for n, f in [('G-04-Home', home), ('G-07-GameDetail', game_detail), ('G-08-Prices', prices), ('G-10-Community', community)]:
        h, H = f(); open('root/project/%s.dc.html' % n, 'w').write(h); print(n, H, len(h))
