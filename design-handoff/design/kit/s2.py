from c import *

def splash():
    css = '@keyframes gr-load{0%{transform:translateX(-110%)}100%{transform:translateX(260%)}}.load{animation:gr-load 1.4s cubic-bezier(.4,0,.2,1) infinite}'
    body = ('<a href="G-02-Onboarding.dc.html" aria-label="Gamerisen, devam et" style="position: absolute; left: 0; right: 0; top: 300px; display: flex; flex-direction: column; align-items: center;">%s'
            '<div style="margin-top: 22px;">%s</div>%s</a>'
            '<div style="position: absolute; left: 0; right: 0; bottom: 64px; display: flex; flex-direction: column; align-items: center; gap: 12px;">'
            '<div style="width: 120px; height: 3px; border-radius: 2px; background: rgba(255,255,255,0.12); overflow: hidden;"><div class="load" style="width: 40%%; height: 3px; border-radius: 2px; background: %s;"></div></div>'
            '<span style="font-size: 12px; color: %s;">Senin için hazırlanıyor…</span></div>') % (mark(104, label='Gamerisen'), wordmark(36), txt('Oyun dünyasında olan her şey, tek yerde.', 15, 22, 400, T2, '', ' margin-top: 14px;'), BRAND, T3)
    return page('Gamerisen — 01 Açılış', 390, 844, root(body, 844), script(), css), 844

def onboarding():
    cols = [(20, 30, ['cyberpunk', 'bg3', 'witcher']), (140, -40, ['eldenring', 'hades2', 'gta']), (260, 50, ['exp33', 'rdr2', 'silksong'])]
    col_html = ''
    for x, y, ks in cols:
        col_html += '<div style="position: absolute; left: %dpx; top: %dpx; display: flex; flex-direction: column; gap: 10px;">%s</div>' % (x, y, ''.join(img(k, 110, 150, 16, 'center') for k in ks))
    tagd = '<div style="position: absolute; left: 30px; top: 146px; display: flex;">%s</div><div style="position: absolute; left: 270px; top: 204px; display: flex;">%s</div>' % (disc('-%50'), disc('-%35'))
    toast = ('<div style="position: absolute; left: 40px; right: 40px; top: 300px; height: 64px; box-sizing: border-box; padding: 0 14px 0 10px; border-radius: 18px; background: rgba(28,28,30,0.86); -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px); box-shadow: 0 12px 30px rgba(0,0,0,0.4), inset 0 0 0 0.5px rgba(255,255,255,0.12); display: flex; align-items: center; gap: 10px;">'
             '%s<div style="display: flex; flex-direction: column; flex: 1 1 auto;"><span style="font-size: 14px; line-height: 18px; font-weight: 600;">Hades II fiyatı düştü</span><span style="font-size: 13px; line-height: 18px; color: %s;">Steam&#39;de ₺499 · %%30 indirim</span></div><span style="font-size: 12px; color: %s;">şimdi</span></div>') % (img('hades2', 44, 44, 11), GREEN, T3)
    collage = ('<div style="position: relative; height: 420px; overflow: hidden;">%s%s<div style="position: absolute; left: 0; right: 0; bottom: 0; height: 190px; background: linear-gradient(180deg, rgba(10,10,11,0) 0%%, #0A0A0B 88%%);"></div>%s</div>') % (col_html, tagd, toast)
    top = '<div style="position: absolute; top: 54px; right: 12px; z-index: 3;"><a href="G-03-Login.dc.html" style="height: 44px; padding: 0 12px; display: flex; align-items: center; font-size: 16px; font-weight: 500; color: %s;">Atla</a></div>' % T2
    dots = '<div style="display: flex; gap: 6px; height: 6px;"><span style="width: 18px; height: 6px; border-radius: 3px; background: %s;"></span><span style="width: 6px; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.28);"></span><span style="width: 6px; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.28);"></span></div>' % AC
    text = ('<div style="padding: 0 24px; display: flex; flex-direction: column;">%s%s<div style="margin-top: 22px;">%s</div></div>') % (
        '<h1 style="margin: 0; font-family: %s; font-size: 30px; line-height: 36px; font-weight: 700; letter-spacing: -0.03em;">Oyunlarını keşfet,<br>en ucuz fiyatı yakala.</h1>' % FD,
        txt('Beğendiğin oyunları kaydet. Fiyat düştüğünde, arkadaşların oynamaya başladığında ve topluluk bir şey konuştuğunda ilk sen haberdar ol.', 16, 23, 400, T2, 'c3', ' margin-top: 12px;'), dots)
    bottom = '<div style="position: absolute; left: 20px; right: 20px; bottom: 30px; display: flex; flex-direction: column; gap: 6px;">%s%s</div>' % (
        btn('Devam et', 'primary', 52, href='G-02b-Interests.dc.html', extra=' width: 100%;'), btn('Zaten hesabım var', 'tertiary', 44, href='G-03-Login.dc.html', extra=' width: 100%;'))
    body = top + '<div style="padding-top: 54px;">%s</div>' % collage + '<div style="margin-top: 8px;">%s</div>' % text + bottom
    return page('Gamerisen — 02 Tanıtım', 390, 844, root(body, 844), script()), 844

def interests():
    def cs(key, t, on, ic=None, mono_=None):
        m = mono(mono_, 18, 10, 5) if mono_ else (icon(ic, 16, '[[c.%s.col]]' % key, 2.2) if ic else '')
        return ('<button aria-pressed="[[c.%s.on]]" onClick="[[c.%s.t]]" style="height: 40px; padding: 0 15px; border-radius: 999px; background: [[c.%s.bg]]; color: [[c.%s.col]]; font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 7px; white-space: nowrap; transition: background .15s, color .15s;">%s%s</button>') % (key, key, key, key, m, t)
    plats = [('pc', 'PC', True, 'monitor'), ('ps', 'PlayStation', True, None), ('xb', 'Xbox', False, None), ('ns', 'Nintendo Switch', False, None), ('mb', 'Mobil', False, None)]
    genres = [('rpg', 'RPG', True), ('act', 'Aksiyon', True), ('open', 'Açık dünya', True), ('str', 'Strateji', False), ('fps', 'FPS', False), ('rog', 'Roguelike', False), ('hor', 'Korku', False), ('spo', 'Spor', False), ('rac', 'Yarış', False), ('ind', 'Indie', True), ('sim', 'Simülasyon', False), ('coop', 'Co-op', True)]
    stores = [('st', 'Steam', True, 'Steam'), ('ep', 'Epic Games', False, 'Epic Games'), ('gog', 'GOG', False, 'GOG'), ('pss', 'PlayStation Store', True, 'PlayStation Store'), ('xbs', 'Xbox Store', False, 'Xbox Store')]
    wrap = lambda inner: '<div style="display: flex; flex-wrap: wrap; gap: 8px;">%s</div>' % inner
    sect = lambda t, inner: '<div style="display: flex; flex-direction: column; gap: 12px;">%s%s</div>' % (txt(t, 15, 20, 600, T2), wrap(inner))
    prog = '<div style="display: flex; gap: 6px; width: 120px;">%s</div>' % ''.join('<span style="flex: 1 1 0; height: 4px; border-radius: 2px; background: %s;"></span>' % (AC if i < 2 else 'rgba(255,255,255,0.16)') for i in range(3))
    top = ('<header style="padding: 54px 12px 0; height: 98px; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between;">'
           '<a href="G-02-Onboarding.dc.html" aria-label="Geri" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">%s</a>%s<a href="G-03-Login.dc.html" style="height: 44px; padding: 0 12px; display: flex; align-items: center; font-size: 16px; color: %s;">Atla</a></header>') % (icon('back', 24, TX, 2.3), prog, T2)
    body = top + ('<div style="padding: 8px 20px 0; display: flex; flex-direction: column;"><h1 style="margin: 0; font-family: %s; font-size: 28px; line-height: 34px; font-weight: 700; letter-spacing: -0.03em;">Neler oynuyorsun?</h1>%s'
                  '<div style="margin-top: 26px; display: flex; flex-direction: column; gap: 26px;">%s%s%s</div></div>') % (
        FD, txt("Seçimlerine göre Ana Sayfa'nı ve fiyat karşılaştırmalarını kişiselleştireceğiz. İstediğin zaman değiştirebilirsin.", 15, 22, 400, T2, '', ' margin-top: 8px;'),
        sect('Platformların', ''.join(cs(k, t, o, ic) for k, t, o, ic in plats)), sect('Sevdiğin türler', ''.join(cs(k, t, o) for k, t, o in genres)), sect('Takip ettiğin mağazalar', ''.join(cs(k, t, o, mono_=m) for k, t, o, m in stores)))
    body += '<div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 16px 20px 34px; background: linear-gradient(180deg, rgba(10,10,11,0) 0%%, #0A0A0B 30%%);">%s</div>' % btn('Devam et', 'primary', 52, href='G-03-Login.dc.html', extra=' width: 100%;')
    allc = plats + [(k, t, o, None) for k, t, o in genres] + [(k, t, o, None) for k, t, o, _ in stores]
    vals = '{ c: { ' + ', '.join("%s: this.csel('c_%s', %s, t)" % (k, k, 'true' if o else 'false') for k, t, o, _ in allc) + ' } }'
    return page('Gamerisen — 02b İlgi Alanları', 390, 844, root(body, 844), script(vals)), 844

def login():
    email, eh = field('gr-email', 'E-posta', 'deniz@ornek.com', icon_='mail')
    pw, ph_ = field('gr-pass', 'Şifre', 'gamerisen2026', icon_='lock', state='focus', typ='password', trailing='<button aria-label="Şifreyi göster" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; margin-right: -8px;">%s</button>' % icon('eye', 19, T2))
    social = ''.join(btn(t, k, 50, extra=' width: 100%;', href='G-04-Home.dc.html') for t, k in [('Apple ile devam et', 'primary'), ('Google ile devam et', 'secondary'), ('Steam hesabınla devam et', 'secondary')])
    orl = '<div style="display: flex; align-items: center; gap: 12px; height: 18px;"><span style="flex: 1 1 auto; height: 0.5px; background: rgba(255,255,255,0.14);"></span><span style="font-size: 13px; color: %s;">veya e-postayla</span><span style="flex: 1 1 auto; height: 0.5px; background: rgba(255,255,255,0.14);"></span></div>' % T3
    body = ('<div style="padding: 62px 20px 0; display: flex; flex-direction: column;">%s'
            '<h1 style="margin: 22px 0 0; font-family: %s; font-size: 30px; line-height: 36px; font-weight: 700; letter-spacing: -0.03em;">Tekrar hoş geldin</h1>%s'
            '<div style="margin-top: 26px; display: flex; flex-direction: column; gap: 10px;">%s</div><div style="margin-top: 22px;">%s</div>'
            '<div style="margin-top: 20px; display: flex; flex-direction: column; gap: 14px;">%s%s</div>'
            '<div style="display: flex; justify-content: flex-end; margin-top: 4px;">%s</div><div style="margin-top: 8px;">%s</div></div>'
            '<div style="position: absolute; left: 20px; right: 20px; bottom: 30px; display: flex; flex-direction: column; align-items: center; gap: 8px;">'
            '<a href="G-02-Onboarding.dc.html" style="height: 44px; display: flex; align-items: center; font-size: 15px; color: %s;">Hesabın yok mu?&nbsp;<b style="color: %s; font-weight: 600;">Kayıt ol</b></a>%s</div>') % (
        mark(52), FD, txt('Fiyat alarmların, listen ve arkadaşların seni bekliyor.', 15, 22, 400, T2, '', ' margin-top: 8px;'), social, orl, email, pw,
        btn('Şifreni mi unuttun?', 'tertiary', 36, extra=' padding: 0; font-size: 14px;'), btn('Giriş yap', 'primary', 52, href='G-04-Home.dc.html', extra=' width: 100%;'), T2, TX,
        txt('Devam ederek Kullanım Koşulları ve Gizlilik Politikası&#39;nı kabul etmiş olursun.', 11, 15, 400, T3, '', ' text-align: center; max-width: 300px;'))
    return page('Gamerisen — 03 Giriş', 390, 844, root(body, 844), script()), 844

def search_head(value=None):
    return ('<header style="padding: 54px 16px 0 20px; height: 106px; box-sizing: border-box; flex-shrink: 0; display: flex; align-items: center; gap: 10px;">%s'
            '<a href="G-04-Home.dc.html" style="height: 44px; display: flex; align-items: center; font-size: 16px; font-weight: 500; color: %s;">Vazgeç</a></header>') % (search_field(value=value, h=40), AC)

def search():
    chips = rail(''.join(chip(t, i == 0) for i, t in enumerate(['Tümü', 'Oyunlar', 'Kişiler', 'Topluluklar', 'Haberler', 'Videolar'])), 8, 20, 34)
    hd, _ = sec_head('Son aramalar', right=btn('Temizle', 'tertiary', 32, extra=' padding: 0; font-size: 15px;'))
    rec = ''.join('<div style="display: flex; align-items: center; gap: 12px; height: 44px;"><a href="G-06-Results.dc.html" style="display: flex; align-items: center; gap: 12px; flex: 1 1 auto;">%s<span style="font-size: 16px;">%s</span></a><button aria-label="%s aramasını kaldır" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; margin-right: -8px;">%s</button></div>' % (icon('clock', 18, T3), t, t, icon('x', 16, T3, 2.2))
                  for t in ['elden ring', 'hades 2 fiyat', 'burak_cs'])
    s_rec = hd + pad('<div style="margin-top: 6px;">%s</div>' % rec)
    trends = [('GTA 6 fragman', True), ('Silksong güncelleme', False), ('Steam indirim', False), ('EA FC 26', False), ('Nightreign', False), ('Game Pass ekim', False)]
    tr = ''.join('<a href="G-06-Results.dc.html" style="height: 36px; padding: 0 12px; border-radius: 10px; background: %s; display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 500;">%s%s</a>' % (S1, icon('flame', 14, ORANGE, 2.2) if hot else icon('up', 14, T2, 2.2), t) for t, hot in trends)
    hd2, _ = sec_head('Trend aramalar')
    s_tr = hd2 + pad('<div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px;">%s</div>' % tr)
    hd3, _ = sec_head('Önerilen oyunlar', sub='Oynadıklarına ve listene göre')
    sg = rail(''.join([game_s('witcher', 'The Witcher 3', '₺249', '-%50', 104, 138), game_s('kcd2', 'Kingdom Come II', '₺1.049', '-%30', 104, 138, '62% center'),
                       game_s('mhwilds', 'Monster Hunter Wilds', '₺1.119', None, 104, 138), game_s('nms', "No Man's Sky", '₺379', '-%60', 104, 138, '30% center')]), 12, 20, GS_H(138))
    s_g = hd3 + '<div style="margin-top: 12px;">%s</div>' % sg
    hd4, _ = sec_head('Önerilen kişiler')
    ppl = ''.join([user_row(avatar('forza', 44), 'MertGaming', '@mertgaming', 'Burak ve Eren takip ediyor', 'u1'), user_row(avatar('stardew', 44), 'PixelNur', '@pixelnur', 'İçerik üreticisi · 84 B takipçi', 'u2'),
                   user_row(avatar(None, 44, 'A', AVC[6]), 'ayse.plays', '@aysplays', 'Valorant oynuyor', 'u3')])
    s_p = hd4 + pad('<div style="margin-top: 8px;">%s</div>' % ppl)
    content, tot = stack([(None, search_head(), 106), (8, chips, 34), (24, s_rec, 28 + 6 + 132), (24, s_tr, 28 + 12 + 118), (28, s_g, 48 + 12 + GS_H(138)), (28, s_p, 28 + 8 + 180)])
    H = max(844, tot + 34)
    vals = "{ f: { u1: this.follow('f_u1', false, t), u2: this.follow('f_u2', true, t), u3: this.follow('f_u3', false, t) } }"
    return page('Gamerisen — 05 Arama', 390, H, root(content, H), script(vals)), H

def game_result(k, title_html, meta, p, oldp, dsc, st, key, pos='center'):
    return ('<div style="position: relative; display: flex; align-items: center; gap: 12px; height: 88px;"><a href="G-07-GameDetail.dc.html" style="display: flex; align-items: center; gap: 12px; flex: 1 1 auto; min-width: 0;">%s'
            '<div style="display: flex; flex-direction: column; min-width: 0; gap: 3px;"><span class="c1" style="font-size: 16px; line-height: 21px; font-weight: 600;">%s</span><span style="font-size: 12px; line-height: 16px; color: %s;">%s</span>'
            '<span style="display: flex; align-items: center; gap: 6px; height: 22px; margin-top: 2px;">%s%s%s%s</span></div></a>%s</div>') % (
        img(k, 58, 78, 10, pos), title_html, T2, meta, price(p, 15), old(oldp, 12) if oldp else '', disc(dsc, 11, 20) if dsc else '', store(st, 11), heart(key, pos=False, size=40, s=18).replace(DARKGLASS, 'background: transparent;'))

def results():
    seg = pad(segmented(['Tümü', 'Oyunlar', 'Kişiler', 'Haberler', 'Videolar'], 0, 350))
    bar = pad('<div style="display: flex; align-items: center; justify-content: space-between; height: 36px;"><span style="font-size: 13px; color: %s;">“elden” için 24 sonuç</span>%s</div>' % (T2,
              '<a href="G-06b-Filters.dc.html" style="height: 34px; padding: 0 12px; border-radius: 999px; background: %s; display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600;">%sFiltrele<span class="num" style="min-width: 18px; height: 18px; border-radius: 999px; background: %s; color: %s; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;">2</span></a>' % (S2, icon('sliders', 15, TX, 2.2), ACS, ONAC)))
    hl = lambda rest: '<b style="font-weight: 700; color: %s;">Elden</b><span style="color: %s;">%s</span>' % (TX, T2, rest)
    g = ''.join([game_result('eldenring', hl(' Ring'), '2022 · RPG · Soulslike', '₺899', '₺1.799', '-%50', 'Steam', 'r1'), game_result('eldenring', hl(' Ring Nightreign'), '2025 · Aksiyon · Co-op', '₺649', None, None, 'Steam', 'r2', '20% center')])
    hdg, _ = sec_head('Oyunlar', 'Tümü (6)', '#')
    hdp, _ = sec_head('Kişiler', 'Tümü (12)', '#')
    ppl = user_row(avatar('eldenring', 44, pos='30% center'), 'EldenLord', '@eldenlord', 'Elden Ring rehberleri · 12,4 B takipçi', 'u1') + user_row(avatar(None, 44, 'S', AVC[4]), 'selin.exe', '@selinexe', 'Elden Ring oynuyor', 'u2')
    hdc, _ = sec_head('Topluluklar')
    cm = comm_row('eldenring', 'Elden Ring Topluluğu', '84,2 B üye · 1,2 B çevrimiçi', btn('Katıl', 'tinted', 34, extra=' padding: 0 14px;'))
    hdn, _ = sec_head('Haberler', 'Tümü (3)', 'G-16-News.dc.html')
    nw = news_row('eldenring', 'Elden Ring için yeni denge yaması yayında: silah değişiklikleri', 'PC', '1 sa önce', pos='60% center')
    hdv, _ = sec_head('Videolar', 'Tümü (8)', 'G-14-Videos.dc.html')
    vr = ('<a href="G-15-VideoPlayer.dc.html" style="display: flex; gap: 12px; height: 79px;"><div style="position: relative;">%s%s</div><div style="display: flex; flex-direction: column; min-width: 0; gap: 4px;">%s%s</div></a>') % (
        img('eldenring', 140, 79, 10), ovl('18:40', 'right: 6px; bottom: 6px;'), txt('Elden Ring: Malenia’yı ilk denemede yenmenin yolu', 14, 19, 600, TX, 'c2'), txt('Level Up TR · 184 B görüntülenme', 12, 16, 400, T2, 'c1'))
    grp = lambda hd, inner, ih, mt=12: (hd + pad('<div style="margin-top: %dpx;">%s</div>' % (mt, inner)), 28 + mt + ih)
    a = grp(hdg, g, 176, 4); b = grp(hdp, ppl, 120, 4); c_ = grp(hdc, cm, 60, 4); d = grp(hdn, nw, 72); e = grp(hdv, vr, 79)
    content, tot = stack([(None, search_head('elden'), 106), (8, seg, 36), (12, bar, 36), (16, a[0], a[1]), (24, b[0], b[1]), (24, c_[0], c_[1]), (24, d[0], d[1]), (24, e[0], e[1])])
    H = max(844, tot + 40)
    vals = "{ w: { r1: this.wish('w_r1', false), r2: this.wish('w_r2', true) }, f: { u1: this.follow('f_u1', false, t), u2: this.follow('f_u2', true, t) } }"
    return page('Gamerisen — 06 Arama Sonuçları', 390, H, root(content, H), script(vals)), H

def filters():
    under = search_head('elden') + '<div style="padding: 8px 20px;">%s</div>' % segmented(['Tümü', 'Oyunlar', 'Kişiler', 'Haberler', 'Videolar'], 0, 350)
    def cs(key, t, on):
        return ('<button aria-pressed="[[c.%s.on]]" onClick="[[c.%s.t]]" style="height: 36px; padding: 0 14px; border-radius: 999px; background: [[c.%s.bg]]; color: [[c.%s.col]]; font-size: 14px; font-weight: 600; white-space: nowrap; transition: background .15s, color .15s;">%s</button>') % (key, key, key, key, t)
    plats = [('pc', 'PC', True), ('ps', 'PlayStation', False), ('xb', 'Xbox', False), ('ns', 'Switch', False), ('mb', 'Mobil', False)]
    gens = [('rpg', 'RPG', True), ('act', 'Aksiyon', False), ('open', 'Açık dünya', True), ('rog', 'Roguelike', False), ('str', 'Strateji', False)]
    modes = [('sp', 'Tek oyunculu', True), ('mp', 'Çok oyunculu', False), ('co', 'Co-op', False)]
    sect = lambda t, inner, right='': '<div style="display: flex; flex-direction: column; gap: 12px;"><div style="display: flex; justify-content: space-between; align-items: center; height: 20px;">%s%s</div>%s</div>' % (txt(t, 15, 20, 600), right, inner)
    wrap = lambda inner: '<div style="display: flex; flex-wrap: wrap; gap: 8px;">%s</div>' % inner
    slider = ('<div style="display: flex; flex-direction: column; gap: 10px;"><div style="position: relative; height: 28px;"><span style="position: absolute; left: 0; right: 0; top: 12px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.14);"></span>'
              '<span style="position: absolute; left: 0; width: 50%%; top: 12px; height: 4px; border-radius: 2px; background: %s;"></span>'
              '<span role="slider" aria-label="En düşük fiyat" aria-valuenow="0" style="position: absolute; left: -2px; top: 0; width: 28px; height: 28px; border-radius: 999px; background: #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.35);"></span>'
              '<span role="slider" aria-label="En yüksek fiyat" aria-valuenow="1000" style="position: absolute; left: calc(50%% - 14px); top: 0; width: 28px; height: 28px; border-radius: 999px; background: #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.35);"></span></div>'
              '<div style="display: flex; justify-content: space-between; font-size: 13px; color: %s;"><span class="num">₺0</span><span class="num" style="color: %s; font-weight: 600;">₺1.000</span><span class="num">₺2.500+</span></div>'
              '</div>') % (AC, T2, TX)
    more = ''.join(row_item(l, v, sep=i > 0, h=44) for i, (l, v) in enumerate([('Oyun modu', 'Tek oyunculu'), ('Çıkış tarihi', 'Tümü'), ('Puan', '4+ yıldız'), ('Mağaza ve dil', 'Tümü')]))
    sheet = ('<div role="dialog" aria-label="Filtreler" style="position: absolute; left: 0; right: 0; bottom: 0; height: 790px; border-radius: 24px 24px 0 0; background: %s; box-shadow: 0 -10px 40px rgba(0,0,0,0.5); display: flex; flex-direction: column; z-index: 10;">'
             '<span style="align-self: center; width: 36px; height: 5px; border-radius: 3px; background: rgba(255,255,255,0.25); margin-top: 8px;"></span>'
             '<div style="display: grid; grid-template-columns: 90px 1fr 90px; align-items: center; height: 44px; padding: 0 12px;">%s<span style="text-align: center; font-size: 17px; font-weight: 600;">Filtreler</span><div style="display: flex; justify-content: flex-end;">%s</div></div>'
             '<div style="padding: 10px 20px 0; display: flex; flex-direction: column; gap: 20px;">%s%s%s%s'
             '<div style="display: flex; flex-direction: column; gap: 8px;">%s<div style="border-radius: 14px; background: %s; overflow: hidden; margin: 0 -4px;">%s</div></div></div>'
             '<div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 20px 34px; background: %s; border-top: 0.5px solid %s;">%s</div></div>') % (
        BG2, btn('Sıfırla', 'tertiary', 36, extra=' padding: 0 8px;'), iconbtn('x', 'Kapat', 20, T2, S2, 32, href='G-06-Results.dc.html'),
        sect('Platform', wrap(''.join(cs(k, t, o) for k, t, o in plats))), sect('Tür', wrap(''.join(cs(k, t, o) for k, t, o in gens) + chip('Tümü (24)', False, 36, chev=True))),
        sect('Fiyat aralığı', slider), sect('İndirim', segmented(['Tümü', '%25+', '%50+', '%75+'], 2, 350)),
        txt('Diğer filtreler', 15, 20, 600), S1, more, BG2, LINE, btn('128 oyunu göster', 'primary', 52, href='G-06-Results.dc.html', extra=' width: 100%;'))
    body = under + '<div aria-hidden="true" style="position: absolute; inset: 0; background: rgba(0,0,0,0.6); z-index: 9;"></div>' + sheet
    vals = '{ c: { ' + ', '.join("%s: this.csel('c_%s', %s, t)" % (k, k, 'true' if o else 'false') for k, t, o in plats + gens) + ' } }'
    return page('Gamerisen — 06b Keşif Filtreleri', 390, 844, root(body, 844), script(vals)), 844

def wishlist():
    nb = nav_bar('İstek Listesi', 'G-21-Profile.dc.html', iconbtn('sliders', 'Filtrele', 21), sub='27 oyun')
    summ = ('<div style="margin: 0 20px; height: 76px; box-sizing: border-box; padding: 0 16px; border-radius: 18px; background: %s; display: flex; align-items: center; gap: 12px;">'
            '<span style="width: 40px; height: 40px; border-radius: 999px; background: %s; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">%s</span>'
            '<div style="display: flex; flex-direction: column;"><span style="font-size: 15px; line-height: 20px; font-weight: 600;">Bu hafta 4 oyunun fiyatı düştü</span><span style="font-size: 13px; line-height: 18px; color: %s;">Listende toplam ₺1.250 tasarruf fırsatı var</span></div></div>') % (GREENT, GREEN, icon('down', 20, '#00210B', 2.4), T2)
    sorts = rail(chip('Son eklenen', True, icon_='sort') + chip('Fiyat') + chip('İndirim') + chip('Çıkış tarihi'), 8, 20, 34)
    items = [('hades2', 'Hades II', 'Steam', '₺499', '₺714', '-%30', drop('₺100 fiyat düşüşü'), 'center'),
             ('doom', 'DOOM: The Dark Ages', 'Steam', '₺1.299', '₺1.699', '-%24', drop('₺400 düştü'), 'center'),
             ('split', 'Split Fiction', 'Epic Games', '₺1.149', '₺1.449', '-%21', drop('₺300 düştü'), '70% center'),
             ('silksong', 'Hollow Knight: Silksong', 'Steam', '₺389', None, None, '<span style="font-size: 12px; line-height: 16px; color: %s;">Fiyat değişmedi</span>' % T3, 'center'),
             ('mhwilds', 'Monster Hunter Wilds', 'Steam', '₺1.599', None, None, drop('₺50 arttı', 12, ORANGE, 'up'), 'center'),
             ('gta', 'Grand Theft Auto VI', 'PlayStation Store', None, None, None, '<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; line-height: 16px; font-weight: 600; color: %s;">%sÇıkış: 19 Kasım 2026</span>' % (T2, icon('calendar', 13, T2, 2.2)), '55% 70%')]
    rows = ''
    for i, (k, t, st, p, o, d, chg, pos) in enumerate(items):
        sep = '<span style="position: absolute; top: 0; left: 96px; right: 20px; height: 0.5px; background: %s;"></span>' % LINE if i else ''
        pr = '%s%s%s' % (price(p, 17), old(o, 12) if o else '', disc(d, 11, 20) if d else '') if p else '<span style="font-size: 14px; font-weight: 600;">Ön sipariş yakında</span>'
        rows += ('<div style="position: relative; display: flex; align-items: center; gap: 14px; height: 112px; padding: 0 20px;">%s<a href="G-08-Prices.dc.html" style="display: flex; align-items: center; gap: 14px; flex: 1 1 auto; min-width: 0;">%s'
                 '<div style="display: flex; flex-direction: column; min-width: 0; gap: 4px;"><span class="c1" style="font-size: 16px; line-height: 21px; font-weight: 600;">%s</span>%s<span style="display: flex; align-items: center; gap: 6px; height: 24px;">%s</span>%s</div></a>'
                 '<button aria-label="Fiyat alarmı açık" style="width: 40px; height: 40px; border-radius: 999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">%s</button></div>') % (
            sep, img(k, 62, 84, 10, pos, '%s kapak görseli' % t), t, store(st, 12), pr, chg, icon('bell', 19, AC if i in (0, 5) else T3, 2, fill=AC if i in (0, 5) else 'none'))
    content, tot = stack([(None, nb, NB), (16, summ, 76), (16, sorts, 34), (8, rows, 112 * len(items))])
    H = max(844, tot + 30)
    return page('Gamerisen — 09 İstek Listesi', 390, H, root(content, H), script()), H

if __name__ == '__main__':
    for n, f in [('G-01-Splash', splash), ('G-02-Onboarding', onboarding), ('G-02b-Interests', interests), ('G-03-Login', login), ('G-05-Search', search), ('G-06-Results', results), ('G-06b-Filters', filters), ('G-09-Wishlist', wishlist)]:
        h, H = f(); open('root/project/%s.dc.html' % n, 'w').write(h); print(n, H, len(h))
