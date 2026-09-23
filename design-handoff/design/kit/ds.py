from c import *
from s1 import poll
W = 1400; CW = 1272

def lum(h):
    h = h.lstrip('#'); c_ = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    c_ = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c_]
    return 0.2126 * c_[0] + 0.7152 * c_[1] + 0.0722 * c_[2]
def cr(a, b):
    la, lb = lum(a), lum(b); hi, lo = max(la, lb), min(la, lb)
    return ('%.1f' % ((hi + 0.05) / (lo + 0.05))).replace('.', ',') + ':1'

def ds_head(title, sub):
    return ('<header style="height: 120px; display: flex; flex-direction: column;"><div style="display: flex; align-items: center; gap: 10px; height: 36px;">%s%s'
            '<span style="margin-left: 8px; padding-left: 12px; border-left: 1px solid rgba(255,255,255,0.14); font-size: 14px; font-weight: 600; color: %s;">Tasarım Sistemi 2.0</span></div>'
            '<h1 style="margin: 14px 0 0; font-family: %s; font-size: 36px; line-height: 40px; font-weight: 700; letter-spacing: -0.03em;">%s</h1>%s</header>') % (mark(32), wordmark(24), T2, FD, title, txt(sub, 16, 22, 400, T2, 'c1', ' margin-top: 8px;'))
def sec(t): return '<h2 style="margin: 0; height: 32px; font-family: %s; font-size: 22px; line-height: 32px; font-weight: 700; letter-spacing: -0.02em;">%s</h2>' % (FD, t)
def spec(title, note, inner, w, h=None):
    hh = ' height: %dpx;' % h if h else ''
    return ('<div style="width: %dpx; display: flex; flex-direction: column; flex-shrink: 0;%s"><div style="height: 40px; display: flex; flex-direction: column;">%s%s</div>'
            '<div style="margin-top: 12px; display: flex; flex-direction: column; position: relative;">%s</div></div>') % (w, hh, txt(title, 14, 20, 600), txt(note, 12, 16, 400, T3, 'c1'), inner)
def board(title, fname, sub, rows, js='{}', css='', extra_js=''):
    body = '<div style="padding: 64px; display: flex; flex-direction: column;">%s' % ds_head(title, sub)
    H = 64 + 120
    for mt, html, h in rows:
        body += '<div style="margin-top: %dpx; height: %dpx; flex-shrink: 0;">%s</div>' % (mt, h, html); H += mt + h
    body += '</div>'; H += 64
    return page('Gamerisen — Tasarım Sistemi: %s' % title, W, H, root(body, H, w=W), script(js, extra_js), css), H

def foundations():
    def sw(col, name, val, use):
        return ('<div style="width: 150px; display: flex; flex-direction: column;"><div style="height: 80px; border-radius: 14px; background: %s; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);"></div>'
                '%s<div class="num c1" style="font-size: 12px; line-height: 16px; color: %s;">%s</div>%s</div>') % (col, txt(name, 13, 18, 600, TX, '', ' margin-top: 10px;'), T3, val, txt(use, 12, 16, 400, T2, 'c2', ' margin-top: 4px; height: 32px;'))
    grp = lambda t, sws: '<div style="display: flex; flex-direction: column;">%s<div style="display: flex; gap: 12px; margin-top: 10px;">%s</div></div>' % (txt(t, 13, 20, 600, T2), ''.join(sws))
    colors = '<div style="display: flex; flex-direction: column; gap: 24px;">%s%s%s%s</div>' % (
        grp('Yüzeyler — saf siyah yok, dört katman', [sw(BG, 'Zemin', BG, 'Uygulama arka planı'), sw(BG2, 'İkincil zemin', BG2, 'Alt çubuk, alt sayfa, sabit çubuklar'), sw(S1, 'Kart', S1, 'Kartlar, gruplu listeler, girdiler'), sw(S2, 'Yükseltilmiş', S2, 'Çip, ikincil buton, kontroller')]),
        grp('Metin', [sw(TX, 'Birincil', TX, 'Başlık, fiyat · zeminde %s' % cr(TX, BG)), sw(T2, 'İkincil', T2, 'Açıklama, meta · %s' % cr(T2, BG)), sw(T3, 'Soluk', T3, 'Zaman, ipucu · %s' % cr(T3, BG))]),
        grp('Marka kırmızısı — az ve yerinde · Tweaks ile değişir', [sw(BRAND, 'Marka kırmızısı', BRAND, 'Logo, “risen”, rozet dolgusu'), sw(AC, 'Kırmızı · metin', AC, 'Seçili sekme, bağlantı · kartta 4,7:1'), sw(ACS, 'Birincil buton', ACS, 'Nötr kalır · siyah metin %s' % cr('#0A0A0B', '#F5F5F7')), sw(ACT, 'Kırmızı ton', '%24 opaklık', 'Renkli ikincil buton zemini')]),
        grp('İşlevsel — yalnızca anlam taşıyınca', [sw(GREEN, 'Fiyat düşüşü', GREEN, 'İndirim, tasarruf, çevrimiçi · %s' % cr(GREEN, BG)), sw(ORANGE, 'Uyarı', ORANGE, 'Fiyat artışı, yükselişte · %s' % cr(ORANGE, BG)), sw(RED, 'Canlı / hata', RED, 'Son dakika, beğeni, hata · %s' % cr(RED, BG)), sw(GOLD, 'Puan', GOLD, 'Yıldız, başarım, tavsiye · %s' % cr(GOLD, BG))]))
    COLH = 4 * (20 + 10 + 160) + 3 * 24
    def big(t, fs, lh, w=700): return '<span style="font-family: %s; font-size: %dpx; line-height: %dpx; font-weight: %d; letter-spacing: -0.025em;">%s</span>' % (FD, fs, lh, w, t)
    rows = [('Display', '30/36 · Bold', big('Oyunlarını keşfet', 30, 36), 56), ('Sayfa başlığı', '28/34 · Bold', big('Topluluk', 28, 34), 52), ('Başlık', '24/30 · Bold', big('Elden Ring Topluluğu', 24, 30), 48),
            ('Bölüm başlığı', '20/26 · Bold', big('Fiyatı Düşenler', 20, 26), 44), ('Oyun adı', '16/21 · Semibold', txt("Baldur's Gate 3", 16, 21, 600), 40), ('Gövde', '15/22 · Regular', txt('Bu boss fight gerçekten inanılmazdı.', 15, 22), 40),
            ('Okuma', '17/27 · Regular', txt('Rockstar Games yeni bir fragman yayınladı.', 17, 27, 400, '#E5E5EA'), 44), ('İkincil', '13/18 · Regular', txt('12,4 B gönderi · Yeni fragman', 13, 18, 400, T2), 36),
            ('Meta', '12/16 · Medium', txt('8 dk önce · PlayStation', 12, 16, 500, T3), 34), ('Etiket', '11/14 · Bold', '<span style="display: flex; gap: 8px;">%s%s</span>' % (badge('Lv 42'), badge('Anket', 'poll')), 34),
            ('Fiyat', '42 · 28 · 18 · Bold, tabular', '<span style="display: flex; align-items: baseline; gap: 14px;">%s%s%s</span>' % (price('₺599', 42), price('₺349', 28), price('₺799', 18)), 60)]
    typo = ''.join(('<div style="display: flex; align-items: center; gap: 20px; height: %dpx; %s"><div style="width: 150px; flex-shrink: 0; display: flex; flex-direction: column;">%s%s</div><div style="flex: 1 1 auto; display: flex; min-width: 0;">%s</div></div>') % (
        h, 'border-top: 0.5px solid %s;' % LINE if i else '', txt(n, 13, 18, 600), txt(sp, 12, 16, 400, T3), smp, ) for i, (n, sp, smp, h) in enumerate(rows))
    TYH = sum(r[3] for r in rows)
    fnote = txt('Apple cihazlarda SF Pro (sistem yazı tipi), Android ve web’de Inter. Ağırlıklar yalnızca Regular, Medium, Semibold, Bold. Dinamik yazı boyutuyla ölçeklenir.', 13, 20, 400, T2, 'c2', ' margin-top: 14px; height: 40px;')
    r1 = '<div style="display: flex; gap: 48px;"><div style="width: 636px;">%s<div style="margin-top: 16px;">%s</div></div><div style="flex: 1 1 auto;">%s<div style="margin-top: 16px;">%s</div>%s</div></div>' % (sec('Renkler'), colors, sec('Tipografi'), typo, fnote)
    R1 = max(48 + COLH, 48 + TYH + 54)
    spc = ''.join('<div style="display: flex; align-items: center; gap: 14px; height: 32px;"><span class="num" style="width: 30px; font-size: 13px; font-weight: 600;">%d</span><span style="width: %dpx; height: 12px; border-radius: 3px; background: rgba(255,255,255,0.28);"></span><span style="font-size: 12px; color: %s;">%s</span></div>' % (v, v * 5, T2, u)
                  for v, u in [(4, 'İkon ile metin'), (8, 'Çipler arası, sıkı gruplar'), (12, 'İlgili öğeler, kart içi'), (16, 'Kart iç boşluğu'), (20, 'Ekran kenar boşluğu'), (24, 'Küçük bölümler'), (32, 'Ana bölümler arası'), (40, 'Sayfa sonu, büyük ayrım')])
    radii = ''.join('<div style="display: flex; flex-direction: column; align-items: center; gap: 6px;"><span style="width: 64px; height: 64px; border-radius: %dpx; background: %s; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);"></span><span style="font-size: 12px; font-weight: 600;">%s</span><span style="font-size: 11px; color: %s;">%s</span></div>' % (r, S2, l, T3, u)
                    for r, l, u in [(8, '8', 'Rozet, küçük'), (12, '12', 'Buton, girdi'), (16, '16', 'Kart'), (20, '20', 'Fiyat kartı'), (22, '22', 'Kahraman kart'), (999, 'Hap', 'Çip, avatar')])
    gridv = ('<div style="position: relative; width: 390px; height: 150px; border-radius: 16px; background: %s; overflow: hidden;"><div style="position: absolute; inset: 0 20px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); column-gap: 12px;">%s</div>'
             '<span style="position: absolute; left: 0; top: 60px; width: 20px; text-align: center; font-size: 10px; color: %s;">20</span><span style="position: absolute; right: 0; top: 60px; width: 20px; text-align: center; font-size: 10px; color: %s;">20</span></div>') % (
        S1, ''.join('<span style="background: rgba(188,12,12,0.16); box-shadow: inset 0 0 0 1px rgba(243,69,69,0.35);"></span>' for _ in range(4)), T3, T3)
    elev = ''.join('<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;"><span style="width: 110px; height: 64px; border-radius: 14px; background: %s; %s"></span><span style="font-size: 12px; font-weight: 600;">%s</span><span style="font-size: 11px; color: %s;">%s</span></div>' % (b, sh, l, T3, u)
                   for b, sh, l, u in [(S1, '', 'Düz', 'Kartların çoğu'), (S1, 'box-shadow: inset 0 0 0 0.5px rgba(255,255,255,0.12);', 'Ayraç', 'Sohbet kartları'), (BG2, 'box-shadow: 0 -10px 40px rgba(0,0,0,0.5);', 'Katman', 'Alt sayfa, modal')])
    r2 = ('<div style="display: flex; gap: 48px;"><div style="width: 636px;">%s<div style="margin-top: 16px;">%s</div></div><div style="flex: 1 1 auto;">%s<div style="margin-top: 16px; display: flex; gap: 18px;">%s</div>'
          '<div style="margin-top: 36px;">%s</div><div style="margin-top: 16px; display: flex; gap: 28px; align-items: flex-start;">%s<div style="display: flex; flex-direction: column; gap: 14px;">%s</div></div></div></div>') % (
        sec('Boşluk ölçeği'), spc, sec('Köşe yarıçapı'), radii, sec('Izgara ve derinlik'), gridv, elev.replace('display: flex; flex-direction: column; align-items: center; gap: 8px;', 'display: flex; align-items: center; gap: 12px;', 3))
    R2 = max(48 + 8 * 32, 48 + 100 + 36 + 48 + 3 * 64 + 28)
    icons = ''.join('<div style="display: flex; flex-direction: column; align-items: center; gap: 6px;"><span style="width: 52px; height: 52px; border-radius: 14px; background: %s; display: flex; align-items: center; justify-content: center;">%s</span><span style="font-size: 10px; color: %s;">%s</span></div>' % (S1, icon(n, 22, TX), T3, n)
                    for n in ['search', 'bell', 'heart', 'comment', 'share', 'bookmark', 'home', 'users', 'play', 'msg', 'star', 'tag', 'down', 'up', 'flame', 'clock', 'pad', 'poll', 'image', 'video', 'send', 'sliders', 'sort', 'news', 'trophy', 'shield', 'globe', 'camera', 'gear', 'lock', 'alert', 'wifioff'])
    tabs_demo = '<div style="display: flex; gap: 20px;">%s</div>' % ''.join('<div style="display: flex; flex-direction: column; align-items: center; gap: 6px;"><span style="display: flex; gap: 10px;">%s%s</span><span style="font-size: 11px; color: %s;">%s</span></div>' % (tab_icon(k, False, T3), tab_icon(k, True, TX), T3, k) for k in ['home', 'users', 'play', 'msg'])
    a11y = ''.join('<div style="display: flex; gap: 10px; align-items: flex-start; min-height: 26px;">%s%s</div>' % (icon('check', 16, GREEN, 2.6, style=' margin-top: 2px;'), txt(t, 13, 20, 400, T2)) for t in [
        'Metin kontrastı en az 4,5:1 — birincil metin zeminde %s, soluk metin %s.' % (cr(TX, BG), cr(T3, BG)), 'Durum asla yalnızca renkle anlatılmaz: “-%50”, “Şu anda oynuyor”, “Okundu” hep yazıyla da var.',
        'Dokunma alanı en az 44×44 px; her ikon butonunun erişilebilir adı vardır.', 'Görsel üstündeki metin koyu geçiş katmanı ya da bulanık zemin üzerinde durur.', 'Yükleme sırasında düzen kaymaz: iskeletler gerçek kartla aynı ölçüdedir.',
        'Hareketi azalt açıkken döngüler durur, geçişler anlık olur; metinler Dinamik Yazı ile büyür.'])
    r3 = ('<div style="display: flex; gap: 48px;"><div style="width: 636px;">%s<div style="margin-top: 16px; display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); row-gap: 14px;">%s</div>'
          '<div style="margin-top: 22px;">%s</div>%s</div><div style="flex: 1 1 auto;">%s<div style="margin-top: 16px; display: flex; flex-direction: column; gap: 10px;">%s</div></div></div>') % (
        sec('İkonlar · 24 px, 2 px çizgi, yuvarlak uç'), icons, tabs_demo, txt('Çizgi ikonlar her yerde; dolgulu hâl yalnızca seçili sekmede. Oyun kolu, RGB, HUD klişeleri yok.', 13, 20, 400, T2, '', ' margin-top: 12px;'), sec('Erişilebilirlik'), a11y)
    R3 = 48 + 4 * 72 + 3 * 14 + 22 + 56 + 32
    cap = lambda t: txt(t, 12, 16, 400, T3, '', ' margin-top: 8px;')
    card = lambda inner, w: '<div style="width: %dpx; height: 200px; border-radius: 20px; background: %s; display: flex; align-items: center; justify-content: center;">%s</div>' % (w, S1, inner)
    lockup = '<div style="display: flex; align-items: center; gap: 14px;">%s%s</div>' % (mark(56, label='Gamerisen'), wordmark(34))
    from icon import app_icon
    appicon = '<div style="display: flex; gap: 14px;">%s</div>' % ''.join('<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">%s<span style="font-size: 11px; color: %s;">%s</span></div>' % (app_icon(m, 58, 'ds1' + m[0], label='Gamerisen uygulama simgesi, %s' % l.lower()), T3, l) for m, l in (('light', 'Açık'), ('dark', 'Koyu')))
    sizes = '<div style="display: flex; align-items: flex-end; gap: 12px;">%s</div>' % ''.join('<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">%s<span style="font-size: 11px; color: %s;">%d</span></div>' % (mark(z), T3, z) for z in (40, 32, 24))
    left = '<div style="display: flex; gap: 20px;">%s%s%s</div>' % ('<div>%s%s</div>' % (card(lockup, 300), cap('Yatay logo · “risen” logodaki kırmızıyla')), '<div>%s%s</div>' % (card(appicon, 160), cap('Uygulama simgesi')), '<div>%s%s</div>' % (card(sizes, 136), cap('En küçük 24 px')))
    bar = ('<div style="display: flex; height: 14px; border-radius: 7px; overflow: hidden;"><span style="width: 86%%; background: %s;"></span><span style="width: 12%%; background: linear-gradient(90deg, #3b3f78, #c9a86a, #1f6b34);"></span><span style="width: 2%%; background: %s;"></span></div>'
           '<div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; line-height: 18px; color: %s;"><span>Nötr yüzeyler ≈ %%86</span><span>Oyun görselleri ≈ %%12</span><span style="color: %s;">Kırmızı ≈ %%2</span></div>') % (S2, BRAND, T2, RED)
    yes = ''.join('<div style="display: flex; align-items: center; gap: 8px; height: 26px; font-size: 13px;">%s%s</div>' % (icon('check', 15, RED, 2.6), t) for t in ['Logo ve “risen”', 'Seçili sekme', 'Okunmamış rozeti ve noktası', 'Canlı / son dakika', 'Beğeni ve istek listesi kalbi', 'Metin bağlantısı ve odak halkası'])
    no = ''.join('<div style="display: flex; align-items: center; gap: 8px; height: 26px; font-size: 13px; color: %s;">%s%s</div>' % (T2, icon('x', 15, T3, 2.4), t) for t in ['Birincil butonlar (nötr beyaz)', 'Fiyat ve indirim (yeşil)', 'Kart ve sayfa zeminleri', 'Geniş alanlar ve degradeler'])
    right = bar + '<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-top: 16px;"><div>%s%s</div><div>%s%s</div></div>' % (txt('Kırmızı burada', 13, 18, 600, TX, '', ' margin-bottom: 6px;'), yes, txt('Kırmızı burada değil', 13, 18, 600, TX, '', ' margin-bottom: 6px;'), no)
    r0 = '<div style="display: flex; gap: 48px;"><div style="width: 636px;">%s<div style="margin-top: 16px;">%s</div></div><div style="flex: 1 1 auto;">%s<div style="margin-top: 16px;">%s</div></div></div>' % (sec('Logo'), left, sec('Marka kırmızısı: baskın değil, işaretleyici'), right)
    R0 = 48 + 200 + 24
    return board('Temeller', 'G-DS-1', 'Nötr ve karanlık öncelikli: renk oyun görsellerinden gelir; logodaki kırmızı küçük dozlarda işaret eder.', [(48, r0, R0), (56, r1, R1), (56, r2, R2), (56, r3, R3)])

def controls():
    def spin(col): return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style="display: block;"><circle cx="12" cy="12" r="9" fill="none" stroke="%s" stroke-opacity="0.25" stroke-width="3"></circle><path class="spin" d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="%s" stroke-width="3" stroke-linecap="round"></path></svg>' % (col, col)
    kinds = [('Birincil', 'primary', 'İncele'), ('İkincil', 'secondary', 'İstek Listesine Ekle'), ('Renkli', 'tinted', 'Oyunu Gör'), ('Metin', 'tertiary', 'Tümünü gör'), ('Yıkıcı', 'destructive', 'Çıkış yap')]
    head = '<div style="display: grid; grid-template-columns: 110px repeat(4, 220px); gap: 16px; height: 20px; font-size: 12px; font-weight: 600; color: %s;"><span></span><span>Varsayılan</span><span>Basılı · %%97 ölçek</span><span>Devre dışı · %%38</span><span>Yükleniyor</span></div>' % T3
    rows = ''
    for n, k, l in kinds:
        col = {'primary': ONAC, 'secondary': TX, 'tinted': AC, 'tertiary': AC, 'destructive': RED}[k]
        rows += ('<div style="display: grid; grid-template-columns: 110px repeat(4, 220px); gap: 16px; align-items: center; height: 52px;"><span style="font-size: 13px; font-weight: 600;">%s</span>%s%s%s%s</div>') % (
            n, btn(l, k, 48), btn(l, k, 48, extra=' transform: scale(0.97); opacity: 0.9;'), btn(l, k, 48, extra=' opacity: 0.38;'),
            btn('', k, 48, extra=' width: 120px;').replace('</button>', spin(col) + '</button>'))
    sizes = '<div style="display: flex; gap: 12px; align-items: center;">%s%s%s%s</div>' % (btn('Büyük · 52', 'primary', 52), btn('Orta · 44', 'primary', 44), btn('Küçük · 36', 'primary', 36), btn('Mini · 30', 'secondary', 30, extra=' font-size: 13px;'))
    ib = '<div style="display: flex; gap: 14px; align-items: center;">%s%s%s%s%s</div>' % (iconbtn('bell', 'Bildirimler', 22, dot=True), iconbtn('search', 'Ara', 22, TX, S2), iconbtn('msg', 'Mesajlar', 22, badge_='3'),
        '<span style="position: relative; width: 60px; height: 60px; border-radius: 16px; overflow: hidden; display: flex; align-items: center; justify-content: center;">%s<span style="position: relative;">%s</span></span>' % (img('cyberpunk', 60, 60, 16, '60% center', '', ' position: absolute; left: 0; top: 0;'), iconbtn('share', 'Paylaş', 19, '#FFFFFF', onart=True)),
        heart('dc', pos=False, size=44, s=20).replace(DARKGLASS, 'background: %s;' % S2))
    b_col = spec('Butonlar', 'Tek güçlü birincil buton kuralı · yarıçap 12 · yükseklik 52 / 44 / 36', head + '<div style="margin-top: 10px; display: flex; flex-direction: column; gap: 10px;">%s</div><div style="margin-top: 20px;">%s</div><div style="margin-top: 20px;">%s</div>' % (rows, sizes, ib), 1000)
    BH = 52 + 20 + 10 + 5 * 52 + 4 * 10 + 20 + 52 + 20 + 60
    chips1 = '<div style="display: flex; flex-wrap: wrap; gap: 8px; width: 380px;">%s%s%s%s%s</div>' % (chip('Gündem', True), chip('PC'), chip('En düşük fiyat', True, icon_='sort'), chip('Platform', chev=True),
        '<button style="height: 34px; padding: 0 10px 0 14px; border-radius: 999px; background: %s; color: %s; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px;">RPG%s</button>' % (ACS, ONAC, icon('x', 14, ONAC, 2.6)))
    segs = '<div style="display: flex; flex-direction: column; gap: 12px;">%s%s%s</div>' % (segmented(['Minimum', 'Önerilen'], 0, 260), segmented(['PC', 'PlayStation', 'Xbox'], 1, 320), segmented(['3A', '6A', '1Y', 'Tümü'], 2, 196, 30, 12))
    tg = '<div style="display: flex; gap: 24px; align-items: center;">%s%s<div style="display: flex; align-items: center; gap: 4px; padding: 3px; border-radius: 12px; background: %s;"><button aria-label="Azalt" style="width: 36px; height: 32px; display: flex; align-items: center; justify-content: center;"><span style="width: 14px; height: 2px; border-radius: 1px; background: #F5F5F7; display: block;"></span></button><span class="num" style="width: 64px; text-align: center; font-size: 17px; font-weight: 700;">₺500</span><button aria-label="Artır" style="width: 36px; height: 32px; display: flex; align-items: center; justify-content: center;">%s</button></div></div>' % (toggle('t1', 'Örnek anahtar açık'), toggle('t2', 'Örnek anahtar kapalı'), S2, icon('plus', 16, TX, 2.4))
    c_col = spec('Çipler, bölümlü kontrol, anahtar', 'Seçili çip vurgu dolgusu · segment kaydırmalı', chips1 + '<div style="margin-top: 18px;">%s</div><div style="margin-top: 18px;">%s</div>' % (segs, tg), 380)
    r1 = '<div style="display: flex; gap: 60px;">%s%s</div>' % (b_col, c_col)
    R1 = max(BH, 52 + 76 + 18 + 36 + 12 + 36 + 12 + 30 + 18 + 38)
    f1, a = field('ds-1', 'E-posta', '', 'ornek@eposta.com', 'mail', w=300)
    f2, b = field('ds-2', 'Kullanıcı adı', 'denizplays', icon_='hash', state='focus', w=300)
    f3, c_ = field('ds-3', 'Şifre', 'kısa', icon_='lock', helper='En az 8 karakter olmalı', state='error', typ='password', w=300)
    f4, d = field('ds-4', 'Kullanıcı adı', 'denizplays', icon_='hash', helper='Kullanılabilir', state='success', w=300)
    inputs = spec('Girdi alanları', 'Etiket her zaman görünür · odak 2 px vurgu · hata ikon + metin', '<div style="display: grid; grid-template-columns: repeat(2, 300px); gap: 20px 24px;">%s%s%s%s</div>' % (f1, f2, f3, f4), 624)
    srch = spec('Arama alanı', 'Boş · değerli · bağlantı olarak (Ana Sayfa)', '<div style="display: flex; flex-direction: column; gap: 14px;">%s%s%s</div>' % (search_field(w=350), search_field(value='elden', w=350), '<div style="display: flex; align-items: center; gap: 10px; width: 350px;">%s<span style="font-size: 16px; color: %s;">Vazgeç</span></div>' % (search_field(h=40), AC)), 350)
    r2 = '<div style="display: flex; gap: 60px;">%s%s</div>' % (inputs, srch)
    R2 = 52 + max(a, b) + 20 + max(c_, d) + 10
    avs = '<div style="display: flex; gap: 16px; align-items: flex-end;">%s</div>' % ''.join([avatar(None, 24, 'D', AVC[3]), avatar('eldenring', 32), avatar(None, 40, 'E', AVC[1], online=True), avatar(None, 56, 'B', AVC[3], gk='cs2'), avatar('stardew', 56, ring=True), avatar('eldenring', 88)])
    av_col = spec('Avatarlar', '24 · 32 · 40 · 56 · 88 · çevrimiçi · oyun rozeti · yeni içerik halkası', avs, 440)
    bdgs = '<div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; width: 760px;">%s</div>' % ''.join('<span style="display: flex;">%s</span>' % x for x in [
        disc('-%50'), disc('En ucuz', 11, 20), drop('Son 24 saatte ₺200 düştü'), drop('₺50 arttı', 12, ORANGE, 'up'), status('playing'), status('done'), status('rec'), badge('Lv 42'), badge('Platin Avcısı', 'trophy'), badge('Soru', 'q'), badge('Anket', 'poll'), badge('Moderatör', 'mod'),
        count(5), '<span style="font-size: 12px;">%s</span>' % fresh('8 dk önce'), '<span style="height: 26px; padding: 0 9px; border-radius: 8px; display: inline-flex; align-items: center; gap: 5px; background: %s; color: #FFFFFF; font-size: 12px; font-weight: 700;">%sSon dakika</span>' % (BRAND, icon('zap', 13, '#FFFFFF', 2, fill='#FFFFFF')),
        '<span style="height: 20px; padding: 0 6px; border-radius: 5px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.25); font-size: 11px; font-weight: 700; display: inline-flex; align-items: center;">PEGI 18</span>', store('Steam'), store('Epic Games')])
    b2 = spec('Rozetler ve durumlar', 'Renk + metin birlikte · oyun durumu: Oynuyor / Tamamladı / Tavsiye ediyor', bdgs, 760)
    r3 = '<div style="display: flex; gap: 72px;">%s%s</div>' % (av_col, b2)
    R3 = 52 + 100
    tb1 = '<div style="position: relative; width: 390px; height: 83px; border-radius: 14px; overflow: hidden; background: %s;">%s</div>' % (BG, tabbar('home'))
    tb2 = '<div style="position: relative; width: 390px; height: 83px; border-radius: 14px; overflow: hidden; background: %s;">%s</div>' % (BG, tabbar('msg'))
    navs = '<div style="width: 390px; border-radius: 14px; overflow: hidden; background: %s;">%s</div>' % (BG, nav_bar('Fiyat Karşılaştırma', '#', iconbtn('bell', 'Fiyat alarmı', 22)).replace('padding: 54px 16px 0; height: 98px', 'padding: 0 16px; height: 52px'))
    lt = '<div style="width: 390px; border-radius: 14px; overflow: hidden; background: %s;">%s</div>' % (BG, page_head('Topluluk', iconbtn('search', 'Ara', 22) + iconbtn('pen', 'Gönderi oluştur', 22)).replace('padding: 54px 20px 0; height: 106px', 'padding: 0 20px; height: 60px'))
    from s1 import sticky_bar
    sb = '<div style="position: relative; width: 390px; height: 92px; border-radius: 14px; overflow: hidden;">%s</div>' % sticky_bar('₺599', "Steam'de en ucuz · -%50", 'Mağazaya Git', '#')
    nav_sp = spec('Gezinme', 'Sekme çubuğu yalnızca ikon: iOS cam kapsül, Android M3 çubuk (Tweaks → platform). Ayrıntı DS 7', '<div style="display: flex; gap: 48px;"><div style="display: flex; flex-direction: column; gap: 14px;">%s%s</div><div style="display: flex; flex-direction: column; gap: 14px;">%s%s%s</div></div>' % (tb1, tb2, lt, navs, sb), 830)
    r4 = nav_sp
    R4 = 52 + 60 + 14 + 52 + 14 + 92
    js = "{ s: { t1: this.sw('s_t1', true), t2: this.sw('s_t2', false) }, w: { dc: this.wish('w_dc', true) } }"
    css = '@keyframes gr-spin{to{transform:rotate(360deg)}}.spin{transform-origin:12px 12px;animation:gr-spin .8s linear infinite}'
    return board('Kontroller', 'G-DS-2', 'Butonlar, çipler, girdiler, avatarlar, rozetler ve gezinme — hepsi aynı ölçü, yarıçap ve renk mantığında.', [(48, r1, R1), (56, r2, R2), (56, r3, R3), (56, r4, R4)], js, css)

def cards():
    best = ('<div style="width: 350px; box-sizing: border-box; padding: 18px; border-radius: 22px; background: %s; display: flex; flex-direction: column;">'
            '<div style="display: flex; align-items: center; justify-content: space-between; height: 22px;"><span style="height: 22px; padding: 0 8px; border-radius: 6px; background: %s; color: %s; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">%sEn İyi Fiyat</span><span style="font-size: 12px; color: %s;">5 dk önce</span></div>'
            '<div style="display: flex; align-items: center; gap: 12px; height: 48px; margin-top: 14px;">%s<div style="display: flex; flex-direction: column;"><span style="font-size: 17px; font-weight: 600;">Steam</span><span style="font-size: 12px; color: %s;">Resmî mağaza · Anında teslim</span></div></div>'
            '<div style="display: flex; align-items: center; gap: 10px; height: 44px; margin-top: 14px;">%s%s%s</div><div style="margin-top: 6px; display: flex;">%s</div><div style="margin-top: 14px;">%s</div></div>') % (
        S1, GREENT, GREEN, icon('trophy', 12, GREEN, 2.2), T3, mono('Steam', 48, 20, 12), T2, price('₺599', 40), old('₺1.199', 17), disc('-%50', 15, 28), drop('Tüm zamanların en düşüğü: ₺499', 13, T2, 'trophy'), btn('Mağazaya Git', 'primary', 48, extra=' width: 100%;', icon_right='ext'))
    BEST = 18 + 22 + 14 + 48 + 14 + 44 + 6 + 18 + 14 + 48 + 18
    st = ''.join(store_row(m, n, s_, p, r_ if r_.startswith('<') else '<span class="num" style="font-size: 12px; color: %s;">%s</span>' % (T3, r_), i > 0) for i, (m, n, s_, p, r_) in enumerate([
        ('Steam', 'Steam', 'PC · Resmî mağaza', '₺599', disc('-%50', 11, 20)), ('Epic Games', 'Epic Games Store', 'PC · Resmî mağaza', '₺649', '+₺50'), ('PlayStation Store', 'PlayStation Store', 'PS5', '₺729', '+₺130')]))
    strow = '<div style="width: 350px; padding: 4px 0; border-radius: 18px; background: %s;">%s</div>' % (S1, st)
    tc, th = trend_card([('#GTA6', '12,4 B gönderi', 'Yeni fragman', 'Yükselişte', True), ('#GamePass', '6,8 B gönderi', 'Ekim listesi', '+%24', False)])
    rowA = '<div style="display: flex; gap: 30px;">%s%s%s%s%s</div>' % (
        spec('Game Hero Card', 'Kişisel neden + fiyat + tek birincil eylem', hero('cyberpunk', 'RPG sevdiğin için', 'Cyberpunk 2077', 'RPG · Açık dünya · %s 4,6' % star(12), '₺599', '₺1.199', '-%50', "Steam'de", 'h1', pos='52% center'), 334),
        spec('Game Card Medium', 'Senin İçin rayı', game_m('bg3', "Baldur's Gate 3", 'RPG', '4,8', '₺799', '₺1.229', '-%35', 'Steam', 'g1', pos='28% center'), 148),
        spec('Game Card Small', 'Öneriler, profil', game_s('hades2', 'Hades II', '₺499', '-%30'), 106),
        spec('Deal Card', 'Bilet biçimi: fiyat bloğu ayrılır', deal_card('rdr2', 'Red Dead Redemption 2', '₺349', '₺1.199', '-%71', 'Epic Games', pos='70% center'), 300),
        spec('Price Drop Card', 'Eski → yeni fiyat, düşüş notu', drop_card('hogwarts', 'Hogwarts Legacy', '₺1.199', '₺599', '-%50', 'Steam', 'Son 24 saatte ₺200 düştü', pos='50% 40%'), 264))
    nf, nh = news_feat('ghost', 'PlayStation yeni oyunlarını duyurdu: sonbahar takvimi netleşti', 'PlayStation', '8 dk önce', 'Gamerisen Haber')
    rowB = '<div style="display: flex; gap: 61px;">%s%s%s</div>' % (
        spec('Price Comparison Card', 'Oyun detayının en güçlü öğesi', best, 350),
        spec('Mağaza satırı · Gündem listesi', 'Gruplu liste, iç ayraç', strow + '<div style="margin-top: 20px;">%s</div>' % tc, 350),
        spec('Featured News · News Card', 'Tazelik: kırmızı nokta ilk 1 saat', nf + '<div style="margin-top: 18px;">%s</div>' % news_row('split', "Steam Sonbahar İndirimi'nin tarihleri belli oldu", 'PC', '38 dk önce', True), 350))
    RB = 52 + max(BEST, 3 * 64 + 8 + 20 + th, nh + 18 + 72)
    p, ph = post(post_head(avatar('forza', 40), 'MertGaming', '@mertgaming', '2 sa', badge('Lv 34')), 'Bu boss fight gerçekten inanılmazdı. 41 denemede geçtim ama her saniyesine değdi.', 2, 'p1', 1204, '186', media_img('eldenring', 298, 168, '40% center'), 168, ('eldenring', 'Elden Ring', 'done'))
    v, vh = video('cyberpunk', 'Cyberpunk 2077 — Phantom Liberty İncelemesi', 'GameReviewTR', '215 B görüntülenme', '12:42', 'İnceleme', 'cyberpunk', 'Cyberpunk 2077', pos='40% center')
    c1, ch1 = comment(avatar(None, 40, 'S', AVC[4]), 'selin.exe', '1 sa', '41 deneme mi? Ben 63’te geçtim, rahatla.', 1, '214')
    c2, ch2 = comment(avatar('forza', 32), 'MertGaming', '48 dk', 'Geriye kaçmayı öğrenince her şey oturdu.', 1, '88', reply=True, op=True)
    rowC = '<div style="display: flex; gap: 40px;">%s%s%s%s</div>' % (
        spec('Social Post', 'Çerçevesiz · ayrım boşlukla · oyun etiketi + durum', p, 350), spec('Video Card', '16:9 · süre · oyun etiketi', v, 280), spec('Short Video Card', '9:16 · kısa klip', short('silksong', "Silksong'da 1 dakikada 3 gizli oda", '84 B', pos='45% center'), 132),
        spec('Comment', 'Yanıtlar girintili · yazar rozeti', '<div style="display: flex; flex-direction: column; gap: 16px;">%s%s</div>' % (c1, c2), 390))
    RC = 52 + max(ph, vh, 234, ch1 + 16 + ch2)
    urow = user_row(avatar('stardew', 44), 'PixelNur', '@pixelnur', 'İçerik üreticisi', 'u1') + comm_row('eldenring', 'Elden Ring Topluluğu', '84,2 B üye · 1,2 B çevrimiçi', btn('Katıl', 'tinted', 34, extra=' padding: 0 14px;'))
    msgs = ('<div style="width: 390px; border-radius: 16px; overflow: hidden; background: %s;">%s%s</div>') % (BG, msg_row(avatar(None, 52, 'E', AVC[1], online=True), 'Eren', "Bu akşam 22.00'de BG3 co-op, var mısın?", '21:48', 2), msg_row(avatar(None, 52, 'S', AVC[4]), 'Selin', "Sen: Malenia'yı da yendin mi artık?", 'Dün', read=2))
    nts = ('<div style="width: 390px; border-radius: 16px; overflow: hidden; background: %s;">%s%s</div>') % (BG, notif(nlead('price', 'cyberpunk'), '<b>Cyberpunk 2077</b> fiyatı düştü. Steam’de artık <b>₺599</b>.', '12 dk önce', True), notif(nlead('news', 'gta'), 'Yeni <b>GTA VI</b> haberi yayınlandı.', '2 sa önce'))
    stats_ = '<div style="display: grid; grid-template-columns: repeat(2, 120px); gap: 8px;">%s%s</div>' % (stat('38', 'Tamamlanan', 'checkc'), stat('1.240', 'Oynama saati', 'clock'))
    fr = '<div style="display: flex; gap: 8px;">%s%s</div>' % (friend(avatar(None, 56, 'B', AVC[3], gk='cs2'), 'Burak', 'Counter-Strike 2', 'Şu anda oynuyor'), friend(avatar(None, 56, 'E', AVC[1], gk='bg3'), 'Eren', "Baldur's Gate 3", '2 saat önce', False))
    rowD = '<div style="display: flex; gap: 40px;">%s%s%s%s</div>' % (
        spec('User Card · Community Card', 'Takip ve katılma ayrı butonda', '<div style="width: 350px;">%s</div>' % urow, 350), spec('Message Row', 'Okunmamış sayı + kalın ad', msgs, 390),
        spec('Notification Row', 'Okunmamış: nokta + hafif zemin', nts, 390), spec('Profile Stat · Friend activity', '', stats_ + '<div style="margin-top: 16px;">%s</div>' % fr, 250))
    RD = 52 + max(120, 144, 152, 84 + 16 + FR_H)
    js = ("{ w: { h1: this.wish('w_h1', false), g1: this.wish('w_g1', true) }, l: { p1: this.like('l_p1', 1204, false) }, b: { p1: this.bm('b_p1', false, t.ac) }, f: { u1: this.follow('f_u1', false, t) } }")
    return board('İçerik Kartları', 'G-DS-3', 'Oyun kartı ≠ haber kartı ≠ gönderi ≠ video kartı; hepsi aynı yüzey, yarıçap ve tipografiyi paylaşır.', [(48, rowA, 52 + 420), (56, rowB, RB), (56, rowC, RC), (56, rowD, RD)], js)

def states():
    def phone(inner, h=520, bg=BG):
        return '<div style="position: relative; width: 390px; height: %dpx; border-radius: 28px; overflow: hidden; background: %s; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);">%s</div>' % (h, bg, inner)
    under = '<div style="padding: 28px 20px;">%s</div>' % news_feat('cyberpunk', 'Cyberpunk 2077 için yeni güncelleme yayında', 'PC', '8 dk önce', 'Gamerisen Haber', pos='40% center')[0]
    modal = ('<div style="position: absolute; inset: 0; background: rgba(0,0,0,0.6);"></div><div role="dialog" aria-label="Fiyat alarmı kuruldu" style="position: absolute; left: 45px; right: 45px; top: 120px; box-sizing: border-box; padding: 22px 20px 16px; border-radius: 22px; background: %s; display: flex; flex-direction: column; align-items: center; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.6);">'
             '<span style="width: 56px; height: 56px; border-radius: 999px; background: %s; display: flex; align-items: center; justify-content: center;">%s</span>%s%s'
             '<div style="margin-top: 20px; width: 100%%; display: flex; flex-direction: column; gap: 6px;">%s%s</div></div>') % (
        S2, GREENT, icon('bell', 26, GREEN, 2.2), txt('Fiyat alarmı kuruldu', 18, 24, 700, TX, '', ' margin-top: 14px;'), txt('Cyberpunk 2077 ₺500 altına düştüğünde sana hemen haber vereceğiz.', 14, 20, 400, T2, '', ' margin-top: 6px;'),
        btn('Tamam', 'primary', 46, extra=' width: 100%;'), btn('Alarmları yönet', 'tertiary', 40, extra=' width: 100%;'))
    targets = ''.join('<div style="width: 64px; display: flex; flex-direction: column; align-items: center; gap: 6px;">%s%s</div>' % (av, txt(n, 12, 16, 500, TX, 'c1')) for av, n in [(avatar(None, 52, 'B', AVC[3], online=True), 'Burak'), (avatar(None, 52, 'E', AVC[1]), 'Eren'), (avatar(None, 52, 'Z', AVC[2]), 'Zeynep'), (avatar('forza', 52), 'Mert')])
    acts = ''.join(row_item(l, ic=i, chev=False, sep=j > 0, h=50) for j, (i, l) in enumerate([('link', 'Bağlantıyı kopyala'), ('msg', 'Mesajla gönder'), ('users', 'Toplulukta paylaş')]))
    sheet = ('<div style="position: absolute; inset: 0; background: rgba(0,0,0,0.6);"></div><div role="dialog" aria-label="Paylaş" style="position: absolute; left: 0; right: 0; bottom: 0; height: 350px; border-radius: 24px 24px 0 0; background: %s; box-shadow: 0 -10px 40px rgba(0,0,0,0.5); display: flex; flex-direction: column;">'
             '<span style="align-self: center; width: 36px; height: 5px; border-radius: 3px; background: rgba(255,255,255,0.25); margin-top: 8px;"></span><div style="display: flex; align-items: center; gap: 12px; padding: 14px 20px 0;">%s<div style="display: flex; flex-direction: column;"><span style="font-size: 16px; font-weight: 600;">Cyberpunk 2077</span><span style="font-size: 13px; color: %s;">₺599 · Steam</span></div></div>'
             '<div style="display: flex; gap: 18px; padding: 18px 20px 0;">%s</div><div style="margin: 18px 20px 0; border-radius: 14px; background: %s; overflow: hidden;">%s</div></div>') % (BG2, img('cyberpunk', 40, 40, 10), T2, targets, S1, acts)
    def toast(ic, col, t, act):
        return '<div role="status" style="width: 350px; height: 52px; box-sizing: border-box; padding: 0 8px 0 14px; border-radius: 14px; background: %s; box-shadow: 0 10px 30px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 10px;">%s<span style="flex: 1 1 auto; font-size: 14px; font-weight: 500;">%s</span>%s</div>' % (S3, icon(ic, 18, col, 2.2), t, btn(act, 'tertiary', 36, extra=' padding: 0 8px; font-size: 14px;') if act else '')
    toasts = '<div style="display: flex; flex-direction: column; gap: 12px;">%s%s%s</div>' % (toast('heart', RED, 'İstek listesine eklendi', 'Geri al'), toast('checkc', GREEN, 'Fiyat alarmı kuruldu · ₺500', 'Düzenle'), toast('wifioff', ORANGE, 'Bağlantı yok, tekrar deniyoruz…', 'Tekrar dene'))
    r1 = '<div style="display: flex; gap: 51px;">%s%s%s</div>' % (spec('Modal', 'Onay ve bilgilendirme · tek birincil eylem', phone(under + modal), 390), spec('Bottom Sheet', 'Paylaş, sırala, filtre · tutamaç + 24 px yarıçap', phone(under + sheet), 390), spec('Toast', 'Altta, 3 sn · geri alınabilir eylem', toasts, 390))
    sk = lambda w, h, r=6, extra='': '<span class="sk" style="display: block; width: %dpx; height: %dpx; border-radius: %dpx;%s"></span>' % (w, h, r, extra)
    sk_game = '<div style="display: flex; flex-direction: column; gap: 8px; width: 148px;">%s%s%s%s</div>' % (sk(148, 198, 14), sk(120, 14), sk(80, 10), sk(60, 16))
    sk_post = '<div style="display: flex; flex-direction: column; gap: 10px; width: 350px;"><div style="display: flex; gap: 12px; align-items: center;">%s<div style="display: flex; flex-direction: column; gap: 6px;">%s%s</div></div><div style="padding-left: 52px; display: flex; flex-direction: column; gap: 8px;">%s%s%s</div></div>' % (
        sk(40, 40, 999), sk(120, 12), sk(80, 10), sk(298, 12), sk(240, 12), sk(298, 168, 14))
    sk_news = '<div style="display: flex; flex-direction: column; gap: 14px; width: 350px;">%s</div>' % ''.join('<div style="display: flex; gap: 14px;">%s<div style="display: flex; flex-direction: column; gap: 8px; padding-top: 4px;">%s%s%s</div></div>' % (sk(96, 72, 12), sk(90, 10), sk(220, 12), sk(160, 12)) for _ in range(2))
    sk_vid = '<div style="display: flex; flex-direction: column; gap: 10px; width: 280px;">%s%s%s</div>' % (sk(280, 158, 16), sk(240, 12), sk(160, 10))
    r2 = '<div style="display: flex; gap: 40px; align-items: flex-start;">%s%s%s%s</div>' % (spec('Oyun kartı iskeleti', 'Aynı ölçü, düzen kaymaz', sk_game, 148), spec('Gönderi iskeleti', '1,3 sn parıltı', sk_post, 350), spec('Haber iskeleti', '', sk_news, 350), spec('Video iskeleti', '', sk_vid, 280))
    R2 = 52 + 290
    def empty(ic, title, body, cta, alt=None, extra=''):
        return phone('<div style="position: absolute; left: 30px; right: 30px; top: 70px; display: flex; flex-direction: column; align-items: center; text-align: center;">'
                     '<span style="width: 84px; height: 84px; border-radius: 26px; background: %s; display: flex; align-items: center; justify-content: center;">%s</span>%s%s<div style="margin-top: 22px; display: flex; flex-direction: column; gap: 6px; width: 260px;">%s%s</div>%s</div>' % (
                         S1, icon(ic, 36, T2, 1.8), txt(title, 20, 26, 700, TX, '', ' margin-top: 20px;'), txt(body, 15, 22, 400, T2, '', ' margin-top: 8px;'), btn(cta, 'primary', 48, extra=' width: 100%;'), btn(alt, 'tertiary', 40, extra=' width: 100%;') if alt else '', extra), 460)
    sugg = '<div style="margin-top: 22px; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;">%s</div>' % ''.join(chip(t, False, 32, fs=13) for t in ['Elden Ring', 'GTA 6', 'Silksong'])
    r3 = '<div style="display: flex; gap: 51px;">%s%s%s</div>' % (
        spec('Boş durum · İstek listesi', 'Samimi dil + tek eylem', empty('heart', 'Listen şimdilik boş.', 'Beğendiğin oyunları kaydet, fiyatları düşünce sana haber verelim.', 'Oyunları Keşfet'), 390),
        spec('Boş durum · Mesajlar', '', empty('msg', 'Henüz mesajın yok.', 'Arkadaşlarını bul, oyun paylaş ve birlikte oynayacağınız akşamı planla.', 'Arkadaşlarını Bul', 'Steam arkadaşlarını içe aktar'), 390),
        spec('Boş durum · Arama', 'Öneri ve trend ile yönlendir', empty('search', '“eldn” için sonuç yok', 'Şunu mu demek istedin: elden ring', 'elden ring ara', extra=sugg), 390))
    R3 = 52 + 460
    offline = phone('<div style="position: absolute; left: 30px; right: 30px; top: 80px; display: flex; flex-direction: column; align-items: center; text-align: center;"><span style="width: 84px; height: 84px; border-radius: 26px; background: %s; display: flex; align-items: center; justify-content: center;">%s</span>%s%s<div style="margin-top: 22px; width: 220px;">%s</div></div>' % (
        ORANGET, icon('wifioff', 36, ORANGE, 2), txt('Bağlantı yok', 20, 26, 700, TX, '', ' margin-top: 20px;'), txt('İnternet bağlantını kontrol et. Kaydettiğin oyunlar ve listen çevrimdışı da görünür.', 15, 22, 400, T2, '', ' margin-top: 8px;'), btn('Tekrar dene', 'primary', 48, icon_='refresh', extra=' width: 100%;')), 420)
    perr = ('<div style="width: 350px; box-sizing: border-box; padding: 16px; border-radius: 18px; background: %s; display: flex; flex-direction: column; gap: 10px;"><div style="display: flex; align-items: center; gap: 10px;">%s<span style="font-size: 15px; font-weight: 600;">Fiyatlar şu an alınamadı</span></div>'
            '<span style="font-size: 13px; line-height: 18px; color: %s;">Son bilinen en iyi fiyat: <b style="color: %s;">₺599 · Steam</b> (2 sa önce). Mağazada fiyat farklı olabilir.</span><div style="display: flex; gap: 8px;">%s%s</div></div>') % (
        S1, icon('alert', 18, ORANGE, 2.2), T2, TX, btn('Tekrar dene', 'secondary', 36, icon_='refresh', extra=' font-size: 14px;'), btn('Mağazaya git', 'tertiary', 36, extra=' font-size: 14px;'))
    ierr = '<div style="width: 170px; height: 226px; border-radius: 14px; background: %s; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">%s<span style="font-size: 12px; color: %s;">Görsel yüklenemedi</span>%s</div>' % (S1, icon('image', 28, T3, 1.8), T3, btn('Yenile', 'tertiary', 30, extra=' font-size: 13px;'))
    f3, _ = field('ds-e', 'E-posta', 'deniz@ornek', icon_='mail', helper='Geçerli bir e-posta adresi gir', state='error', w=350)
    r4 = '<div style="display: flex; gap: 51px; align-items: flex-start;">%s%s%s</div>' % (spec('Hata · Çevrimdışı', 'Çözüm öner, suçlama yok', offline, 390), spec('Hata · Satır içi', 'Son bilinen veriyi göster', perr + '<div style="margin-top: 24px;">%s</div>' % f3, 390), spec('Hata · Görsel', 'Yer tutucu + yeniden dene', ierr, 390))
    R4 = 52 + 420
    return board('Durumlar ve Katmanlar', 'G-DS-4', 'Modal, alt sayfa, bildirim, iskelet yükleme, boş ve hata durumları.', [(48, r1, 52 + 520), (56, r2, R2), (56, r3, R3), (56, r4, R4)])

MOTION_CSS = """
@keyframes gr-old{0%,30%{opacity:1;transform:translateY(0)}45%,100%{opacity:0;transform:translateY(-14px)}}
@keyframes gr-new{0%,38%{opacity:0;transform:translateY(14px)}52%,100%{opacity:1;transform:translateY(0)}}
@keyframes gr-flash{0%,48%{background:rgba(48,209,88,0)}58%{background:rgba(48,209,88,.25)}100%{background:rgba(48,209,88,0)}}
@keyframes gr-in{0%,52%{opacity:0;transform:translateX(-8px)}64%,100%{opacity:1;transform:none}}
.pd-old{animation:gr-old 4s cubic-bezier(.2,.8,.2,1) infinite}.pd-new{animation:gr-new 4s cubic-bezier(.2,.8,.2,1) infinite,gr-flash 4s ease-out infinite}.pd-in{animation:gr-in 4s cubic-bezier(.2,.8,.2,1) infinite}
@keyframes gr-pull{0%,12%,100%{transform:translateY(0)}32%,70%{transform:translateY(52px)}}
@keyframes gr-mark{0%,12%,100%{opacity:0;transform:translateY(-12px) scale(.8)}32%,70%{opacity:1;transform:none}}
@keyframes gr-ch{0%,100%{opacity:.3}50%{opacity:1}}
.pr-list{animation:gr-pull 2.8s cubic-bezier(.2,.8,.2,1) infinite}.pr-mark{animation:gr-mark 2.8s cubic-bezier(.2,.8,.2,1) infinite}
.rf1{animation:gr-ch .8s .4s infinite}.rf2{animation:gr-ch .8s infinite}
@keyframes gr-sheet{0%,15%{transform:translateY(100%)}30%,80%{transform:translateY(0)}95%,100%{transform:translateY(100%)}}
@keyframes gr-dim{0%,15%{opacity:0}30%,80%{opacity:1}95%,100%{opacity:0}}
.sh{animation:gr-sheet 3.2s cubic-bezier(.2,.8,.2,1) infinite}.dim{animation:gr-dim 3.2s ease-out infinite}
@keyframes gr-badge{0%,20%{transform:scale(0)}30%{transform:scale(1.25)}38%,90%{transform:scale(1)}100%{transform:scale(0)}}
.bdg{animation:gr-badge 2.6s cubic-bezier(.2,.9,.3,1.3) infinite}
@keyframes gr-prog{from{width:0}to{width:100%}}.prog{animation:gr-prog 6s linear infinite}
@keyframes gr-toast{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}.toast{animation:gr-toast .22s cubic-bezier(.2,.8,.2,1)}
@keyframes gr-press{0%,40%,100%{transform:scale(1)}50%,70%{transform:scale(.97);opacity:.9}}.pressdemo{animation:gr-press 2s ease-out infinite}
"""
MOTION_JS = r"""
  tabs2() { var s = this.state || {}; var i = s.tab || 0; var self = this; var texts = ['Kişiselleştirilmiş akış', 'Takip ettiklerinin gönderileri', 'Topluluğun en çok konuşulanları'];
    function pick(k) { return function () { self.setState({ tab: k }); }; }
    return { x: i * 78, text: texts[i], t0: pick(0), t1: pick(1), t2: pick(2), s0: i === 0, s1: i === 1, s2: i === 2 }; }
"""

def motion():
    def tile(title, sp, demo, desc, span=1, align='center'):
        w = 300 * span + 24 * (span - 1)
        return ('<div style="width: %dpx; height: 300px; box-sizing: border-box; padding: 20px; border-radius: 22px; background: %s; display: flex; flex-direction: column; flex-shrink: 0;">%s%s'
                '<div style="position: relative; margin-top: 14px; height: 160px; border-radius: 16px; background: %s; overflow: hidden; display: flex; align-items: %s; justify-content: center;">%s</div>%s</div>') % (
            w, S1, txt(title, 16, 22, 700), txt(sp, 12, 16, 400, T3, 'c1', ' margin-top: 4px;'), BG, align, demo, txt(desc, 12, 16, 400, T2, 'c2', ' margin-top: 12px; height: 32px;'))
    heart_ = '<div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">%s<span style="font-size: 12px; color: %s;">[[w.m.label]]</span></div>' % (heart('m', pos=False, size=60, s=26).replace(DARKGLASS, 'background: %s;' % S2), T2)
    like = ('<button aria-label="Beğen" aria-pressed="[[l.m.on]]" class="[[l.m.cls]]" onClick="[[l.m.t]]" style="height: 46px; padding: 0 18px; border-radius: 999px; background: %s; display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: [[l.m.col]];">'
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="[[l.m.fill]]" stroke="[[l.m.stroke]]" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: block;">%s</svg><span class="num">[[l.m.n]]</span></button>') % (S2, IC['heart'])
    fol = '<div style="display: flex; flex-direction: column; align-items: center; gap: 14px;"><div style="display: flex; align-items: center; gap: 10px;">%s%s</div>%s</div>' % (avatar('stardew', 40), txt('PixelNur', 15, 20, 600), follow_btn('m', 38))
    pdrop = ('<div style="display: flex; align-items: center; gap: 14px;">%s<div style="display: flex; flex-direction: column;">%s<div style="position: relative; width: 150px; height: 32px; margin-top: 4px;">'
             '<span class="pd-old num" style="position: absolute; left: 0; top: 0; font-size: 22px; line-height: 32px; font-weight: 700; color: %s;">₺599</span>'
             '<span class="pd-new num" style="position: absolute; left: -6px; top: 0; padding: 0 6px; border-radius: 8px; font-size: 22px; line-height: 32px; font-weight: 700;">₺499</span><span class="pd-in" style="position: absolute; left: 76px; top: 5px; display: flex;">%s</span></div>'
             '<span class="pd-in" style="margin-top: 6px; display: flex;">%s</span></div></div>') % (img('hades2', 52, 68, 10), txt('Hades II', 14, 18, 600), T2, disc('-%30'), drop('₺100 düştü'))
    press = '<div style="display: flex; gap: 14px; align-items: center;"><div class="pressdemo" style="display: flex;">%s</div>%s</div>' % (game_s('bg3', "Baldur's Gate 3", '₺799', '-%35', 96, 118, '28% center'), txt('Dokununca 150 ms içinde %97’ye küçülür, bırakınca geri döner.', 12, 17, 400, T2, '', ' width: 120px;'))
    segb = lambda k, t: '<button role="tab" aria-selected="[[tb.s%d]]" onClick="[[tb.t%d]]" style="position: relative; width: 78px; height: 32px; font-size: 13px; font-weight: 600; text-align: center;">%s</button>' % (k, k, t)
    tabs = ('<div style="display: flex; flex-direction: column; align-items: center; gap: 22px;"><div role="tablist" style="position: relative; display: flex; width: 238px; height: 36px; box-sizing: border-box; padding: 2px; border-radius: 10px; background: %s;">'
            '<span style="position: absolute; left: 2px; top: 2px; width: 78px; height: 32px; border-radius: 8px; background: #636366; box-shadow: 0 3px 8px rgba(0,0,0,0.18); transform: translateX([[tb.x]]px); transition: transform .25s cubic-bezier(.3,1.2,.5,1);"></span>%s%s%s</div>'
            '<span style="font-size: 13px; color: %s;">[[tb.text]]</span></div>') % (FILL, segb(0, 'Senin İçin'), segb(1, 'Takip'), segb(2, 'Trend'), T2)
    sk = '<div style="width: 236px; display: flex; gap: 12px; padding: 12px; box-sizing: border-box; border-radius: 16px; background: %s;"><span class="sk" style="width: 56px; height: 72px; border-radius: 10px; flex-shrink: 0;"></span><div style="display: flex; flex-direction: column; gap: 8px; flex: 1 1 auto; padding-top: 2px;"><span class="sk" style="height: 12px; width: 120px; border-radius: 6px;"></span><span class="sk" style="height: 10px; width: 90px; border-radius: 5px;"></span><span class="sk" style="height: 18px; width: 70px; border-radius: 6px; margin-top: 6px;"></span></div></div>' % S1
    rmark = mark(34, anim=True)
    pull = ('<div class="pr-mark" style="position: absolute; top: 12px; left: 50%%; margin-left: -17px;">%s</div><div class="pr-list" style="position: absolute; left: 16px; right: 16px; top: 12px; display: flex; flex-direction: column; gap: 10px;">%s</div>') % (
        rmark, ''.join('<div style="display: flex; gap: 10px; align-items: center; height: 36px; padding: 0 8px; border-radius: 10px; background: %s;"><span style="width: 24px; height: 24px; border-radius: 6px; background: %s;"></span><span style="height: 8px; width: %dpx; border-radius: 4px; background: %s;"></span></div>' % (S1, S3, w_, S3) for w_ in (120, 90, 140, 100)))
    sheet = ('<div style="position: absolute; inset: 0; display: flex; flex-direction: column; gap: 8px; padding: 14px;">%s</div><div class="dim" style="position: absolute; inset: 0; background: rgba(0,0,0,0.55);"></div>'
             '<div class="sh" style="position: absolute; left: 0; right: 0; bottom: 0; height: 104px; border-radius: 18px 18px 0 0; background: %s; display: flex; flex-direction: column; align-items: center; padding-top: 8px;"><span style="width: 30px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.25);"></span>'
             '<div style="display: flex; gap: 8px; margin-top: 16px;">%s%s%s</div></div>') % (
        ''.join('<span style="height: 26px; border-radius: 8px; background: %s;"></span>' % S1 for _ in range(4)), BG2, chip('En düşük', True, 30, fs=12), chip('Popüler', False, 30, fs=12), chip('Yeni', False, 30, fs=12))
    bdg = '<div style="display: flex; gap: 28px; align-items: center;"><span style="position: relative; display: flex;">%s<span class="bdg num" style="position: absolute; top: -6px; left: 14px; min-width: 18px; height: 18px; padding: 0 5px; box-sizing: border-box; border-radius: 999px; background: %s; color: #FFFFFF; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;">3</span></span><span style="position: relative; display: flex;">%s<span class="bdg" style="position: absolute; top: 1px; right: 1px; width: 9px; height: 9px; border-radius: 999px; background: %s; box-shadow: 0 0 0 2px %s;"></span></span></div>' % (
        icon('msg', 28, TX, 1.9), RED, icon('bell', 28, TX, 1.9), RED, BG)
    vprev = ('<div style="position: relative; width: 236px; height: 133px;">%s%s%s<span style="position: absolute; left: 10px; right: 10px; bottom: 8px; height: 3px; border-radius: 3px; background: rgba(255,255,255,0.25);"><span class="prog" style="display: block; height: 3px; border-radius: 3px; background: #FFFFFF;"></span></span></div>') % (
        img('doom', 236, 133, 14), ovl('Önizleme · sessiz', 'top: 8px; left: 8px;', 'eye'), ovl('31:05', 'right: 8px; bottom: 18px;'))
    prin = ''.join(('<div style="display: flex; align-items: center; gap: 12px; height: 30px; border-top: %s;"><span style="width: 76px; font-size: 13px; font-weight: 600;">%s</span><span class="num" style="width: 160px; font-size: 12px; color: %s;">%s</span><span style="font-size: 12px; color: %s;">%s</span></div>') % (
        'none' if i == 0 else '0.5px solid %s' % LINE, a, TX, b, T2, c_) for i, (a, b, c_) in enumerate([('Anında', '150 ms · ease-out', 'Basma durumu, dokunma geri bildirimi'), ('Standart', '200 ms · (.2, .8, .2, 1)', 'Kalp, beğeni, takip, anahtar'),
                                                                                                 ('Geçiş', '250 ms · (.2, .8, .2, 1)', 'Sekme, alt sayfa, sayfa geçişi'), ('Döngü', '1,3 sn · doğrusal', 'İskelet parıltısı, canlı nokta')]))
    prin2 = '<div style="width: 236px; display: flex; flex-direction: column;">%s</div>' % ''.join(('<div style="display: flex; align-items: center; justify-content: space-between; height: 34px; border-top: %s;"><span style="font-size: 13px; font-weight: 600;">%s</span><span class="num" style="font-size: 12px; color: %s;">%s</span></div>') % (
        'none' if i == 0 else '0.5px solid %s' % LINE, a, T2, b) for i, (a, b) in enumerate([('Basma', '150 ms · ease-out'), ('Kalp, beğeni, takip', '200 ms'), ('Sekme, alt sayfa', '250 ms'), ('İskelet, canlı nokta', '1,3 sn döngü')]))
    tiles = [tile('İstek listesi kalbi', '200 ms · yaylı büyüme · kırmızı dolgu', heart_, 'Dokununca büyüyüp oturur; ekran okuyucuya “İstek listesinden çıkar” olarak duyurulur.'),
             tile('Beğeni', '200 ms · sayı iyimser güncellenir', like, 'Sayaç anında artar; hata olursa geri alınır ve bildirim gösterilir.'),
             tile('Takip', '200 ms · renk + ikon değişimi', fol, 'Dolgulu vurgu butonu sakin yüzeye döner; metin ve ikon birlikte değişir.'),
             tile('Fiyat düşüşü göstergesi', 'Gerçek kullanımda tek sefer · burada döngü', pdrop, 'Eski fiyat yukarı kayar, yenisi yeşil parıltıyla gelir; indirim etiketi en son belirir.'),
             tile('Kart basma durumu', '150 ms · %97 ölçek + %90 opaklık', press, 'Her dokunulabilir kart anında tepki verir; gezinme gecikmeden başlar.'),
             tile('Sekme geçişi', '250 ms · yaylı kaydırma', tabs, 'Seçili kapsül kayar; içerik yatay kaydırmayla eşlenir. Dokunarak dene.'),
             tile('İskelet yükleme', '1,3 sn parıltı', sk, 'İskelet gerçek kartla aynı ölçüde; içerik geldiğinde düzen kaymaz.'),
             tile('Yenilemek için çek', '250 ms çekme · logo şevronları sırayla yanar', pull, 'Marka işareti yükleme göstergesine dönüşür; “yükseliş” hissi verir.', align='flex-start'),
             tile('Alt sayfa hareketi', '250 ms yukarı · zemin karartması', sheet, 'Alt sayfa aşağıdan kayar, zemin birlikte kararır; aşağı çekince kapanır.'),
             tile('Bildirim rozeti', '200 ms · yaylı belirme', bdg, 'Yeni mesaj ya da bildirim geldiğinde rozet küçük bir yayla belirir.'),
             tile('Video önizleme', 'Uzun basınca sessiz önizleme', vprev, 'Küçük resim sessiz oynar; ilerleme çubuğu önizlemenin yerini gösterir.'),
             tile('Hareket ilkeleri', 'Çoğu etkileşim 150–250 ms', prin2, 'Yalnızca transform ve opaklık; düzen kaymaz. Hareketi azalt açıkken döngüler durur.')]
    grid = '<div style="display: flex; flex-wrap: wrap; gap: 24px; width: 1272px;">%s</div>' % ''.join(tiles)
    js = "{ w: { m: this.wish('w_m', false) }, l: { m: this.like('l_m', 326, false) }, f: { m: this.follow('f_m', false, t) }, tb: this.tabs2() }"
    return board('Mikro Etkileşimler', 'G-DS-5', 'Hızlı ve sakin: çoğu etkileşim 150–250 ms. Kalbe, beğeniye, takibe ve sekmelere dokunarak dene.', [(48, grid, 300 * 3 + 24 * 2)], js, MOTION_CSS, MOTION_JS)

if __name__ == '__main__':
    import json
    out = {}
    for n, f in [('G-DS-1-Foundations', foundations), ('G-DS-2-Controls', controls), ('G-DS-3-Cards', cards), ('G-DS-4-States', states), ('G-DS-5-Motion', motion)]:
        h, H = f(); open('root/project/%s.dc.html' % n, 'w').write(h); out[n] = H; print(n, H, len(h))
