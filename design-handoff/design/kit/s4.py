from c import *

def messages():
    head = page_head('Mesajlar', iconbtn('pen', 'Yeni mesaj', 22, href='G-19-Chat.dc.html'))
    srch = pad(search_field('Sohbetlerde ara', h=40, w=350))
    def on(av, n, g):
        return '<a href="G-19-Chat.dc.html" style="width: 64px; display: flex; flex-direction: column; align-items: center; flex-shrink: 0;">%s%s%s</a>' % (av, txt(n, 12, 16, 600, TX, 'c1', ' margin-top: 6px;'), txt(g, 11, 14, 500, T3, 'c1', ' width: 64px; text-align: center;'))
    onl = rail(on(avatar(None, 56, 'B', AVC[3], online=True), 'Burak', 'CS2') + on(avatar(None, 56, 'E', AVC[1], online=True), 'Eren', "Baldur's Gate 3") + on(avatar(None, 56, 'Z', AVC[2], online=True), 'Zeynep', 'Hades II') +
               on(avatar('forza', 56, online=True), 'Mert', 'Çevrimiçi') + on(avatar(None, 56, 'A', AVC[6], online=True), 'Ayşe', 'Valorant'), 14, 20, 92)
    s_on = pad(txt('Çevrimiçi', 13, 18, 600, T2)) + '<div style="margin-top: 10px;">%s</div>' % onl
    chips = rail(chip('Tümü', True, 32, fs=13) + chip('Okunmamış (3)', False, 32, fs=13) + chip('Gruplar', False, 32, fs=13) + chip('İstekler (2)', False, 32, fs=13), 8, 20, 32)
    grp_av = '<div style="position: relative; width: 52px; height: 52px; flex-shrink: 0;"><span style="position: absolute; left: 0; top: 0;">%s</span><span style="position: absolute; right: 0; bottom: 0; border-radius: 999px; box-shadow: 0 0 0 3px %s;">%s</span></div>' % (avatar(None, 34, 'B', AVC[3]), BG, avatar('forza', 34))
    typing = '<span style="color: %s; font-weight: 500;">yazıyor</span><span style="display: inline-flex; gap: 3px; margin-left: 2px;">%s</span>' % (TX, ''.join('<span class="dot%d" style="width: 4px; height: 4px; border-radius: 999px; background: %s; display: block;"></span>' % (i, TX) for i in (1, 2, 3)))
    rows = ''.join([msg_row(avatar(None, 52, 'E', AVC[1], online=True), 'Eren', "Bu akşam 22.00'de BG3 co-op, var mısın?", '21:48', 2),
                    msg_row(grp_av, 'Cuma Gecesi Ekibi', '<span style="color: %s;">Mert:</span> Harita sırası bende, Mirage açıyorum' % T2, '21:30', 5),
                    msg_row(avatar(None, 52, 'B', AVC[3], online=True), 'Burak', typing, '21:44'),
                    msg_row(avatar(None, 52, 'Z', AVC[2]), 'Zeynep', '%sFotoğraf' % icon('image', 15, T2), '19:05', read=1),
                    msg_row(avatar(None, 52, 'S', AVC[4]), 'Selin', "Sen: Malenia'yı da yendin mi artık?", 'Dün', read=2),
                    msg_row(avatar('hades2', 52), 'Kaan', '%sHaber: GTA VI’nın yeni fragmanı yayınlandı' % icon('news', 15, T2), 'Dün'),
                    msg_row(avatar('stardew', 52), 'PixelNur', 'Teşekkürler, ayarları deneyeceğim!', 'Pzt', read=2)])
    content, tot = stack([(None, head, PH), (4, srch, 40), (18, s_on, 18 + 10 + 92), (16, chips, 32), (6, '<div>%s</div>' % rows, 72 * 7)])
    H = tot + 20 + TABBAR_H
    return page('Gamerisen — 18 Mesajlar', 390, H, root(content + tabbar('msg'), H), script()), H

def chat():
    hdr = ('<header style="height: 106px; box-sizing: border-box; padding: 54px 8px 0; border-bottom: 0.5px solid %s; flex-shrink: 0; display: flex; align-items: center; gap: 4px;">'
           '<a href="G-18-Messages.dc.html" aria-label="Mesajlara dön" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">%s</a>%s'
           '<a href="G-21-Profile.dc.html" style="display: flex; flex-direction: column; flex: 1 1 auto; margin-left: 8px; min-width: 0;"><span style="font-size: 16px; line-height: 20px; font-weight: 600;">Burak</span>'
           '<span class="c1" style="font-size: 12px; line-height: 16px; color: %s;"><span style="color: %s;">Çevrimiçi</span> · Counter-Strike 2 oynuyor</span></a>%s</header>') % (
        LINE, icon('back', 24, TX, 2.3), avatar(None, 38, 'B', AVC[3], online=True), T2, GREEN, iconbtn('more', 'Sohbet seçenekleri', 22))
    def recv(t, tm, lines, w=270):
        return ('<div style="align-self: flex-start; max-width: %dpx; box-sizing: border-box; padding: 9px 14px 8px; border-radius: 18px 18px 18px 6px; background: %s;">%s<div class="num" style="font-size: 11px; line-height: 14px; color: %s; text-align: right; margin-top: 2px;">%s</div></div>') % (w, S2, txt(t, 15, 21), T3, tm), 17 + lines * 21 + 16
    def sent(t, tm, lines):
        return ('<div style="align-self: flex-end; max-width: 270px; box-sizing: border-box; padding: 9px 14px 8px; border-radius: 18px 18px 6px 18px; background: %s;">%s<div class="num" style="font-size: 11px; line-height: 14px; color: %s; text-align: right; margin-top: 2px;">%s</div></div>') % (ACS, txt(t, 15, 21, 400, ONAC), ONAC2, tm), 17 + lines * 21 + 16
    div = '<div style="align-self: center; height: 24px; padding: 0 10px; border-radius: 999px; background: %s; font-size: 12px; color: %s; display: flex; align-items: center;">Bugün</div>' % (S1, T3)
    m1, h1 = recv("Kanka akşam boş musun? CS'den sonra yeni bir şeye başlayalım.", '21:38', 2)
    m2, h2 = sent('Bu oyuna bak', '21:40', 1)
    tstamp = lambda t, read=True: '<div style="display: flex; align-items: center; gap: 4px; height: 14px; margin-top: 4px; font-size: 11px; color: %s;"><span class="num">%s</span>%s</div>' % (T3, t, '· Okundu' if read else '')
    gcard = ('<div style="align-self: flex-end; display: flex; flex-direction: column; align-items: flex-end;"><div style="width: 264px; border-radius: 18px 18px 6px 18px; background: %s; overflow: hidden; box-shadow: inset 0 0 0 0.5px rgba(255,255,255,0.12);">'
             '<div style="position: relative;">%s<div style="position: absolute; left: 10px; bottom: 10px; display: flex;">%s</div></div>'
             '<div style="padding: 12px; display: flex; flex-direction: column;"><span style="font-size: 16px; line-height: 20px; font-weight: 700;">Baldur&#39;s Gate 3</span>'
             '<div style="display: flex; align-items: center; gap: 6px; height: 24px; margin-top: 6px;"><span style="font-size: 12px; color: %s;">En iyi fiyat</span>%s%s<span style="flex: 1 1 auto;"></span>%s</div>'
             '<div style="margin-top: 12px;">%s</div></div></div>%s</div>') % (
        S1, img('bg3', 264, 124, 0, '30% center', "Baldur's Gate 3"), disc('-%35', 12), T2, price('₺799', 17), old('₺1.229', 12), store('Steam'), btn('İncele', 'primary', 40, href='G-07-GameDetail.dc.html', extra=' width: 100%;'), tstamp('21:40'))
    GC = 124 + 12 + 20 + 6 + 24 + 12 + 40 + 12 + 18
    reply = ('<div style="align-self: flex-start; position: relative; max-width: 270px; margin-bottom: 14px;"><div style="box-sizing: border-box; padding: 8px 8px 9px; border-radius: 18px 18px 18px 6px; background: %s;">'
             '<div style="padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,0.07); display: flex; flex-direction: column;"><span style="font-size: 12px; line-height: 16px; font-weight: 600; color: %s;">Sen</span>'
             '<span style="display: flex; align-items: center; gap: 5px; font-size: 13px; line-height: 18px; color: %s;">%sBaldur&#39;s Gate 3 · ₺799</span></div>'
             '<div style="padding: 0 6px; margin-top: 8px;">%s<div class="num" style="font-size: 11px; line-height: 14px; color: %s; text-align: right; margin-top: 2px;">21:41</div></div></div>'
             '<button aria-label="Tepki: kalp, 1" style="position: absolute; left: 10px; bottom: -14px; height: 26px; padding: 0 8px; border-radius: 999px; background: %s; box-shadow: 0 0 0 2px %s; display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600;">%s1</button></div>') % (
        S2, TX, T2, icon('pad', 14, T2), txt('İndirimdeymiş! Dört kişi co-op oynarız, Eren de gelir.', 15, 21), T3, S1, BG, icon('heart', 13, RED, 1.5, fill=RED))
    RP = 8 + 50 + 8 + 42 + 16 + 9 + 14
    im = '<div style="align-self: flex-start; position: relative;">%s<span class="num" style="position: absolute; right: 10px; bottom: 10px; height: 20px; padding: 0 7px; border-radius: 6px; background: rgba(0,0,0,0.6); font-size: 11px; font-weight: 600; display: flex; align-items: center; color: #FFFFFF;">21:43</span></div>' % img('cs2', 220, 150, 18, '55% center', 'Paylaşılan ekran görüntüsü', ' border-bottom-left-radius: 6px;')
    newsc = ('<div style="align-self: flex-end; display: flex; flex-direction: column; align-items: flex-end;"><a href="G-17-NewsDetail.dc.html" style="width: 264px; box-sizing: border-box; padding: 10px; border-radius: 18px 18px 6px 18px; background: %s; display: flex; gap: 10px; box-shadow: inset 0 0 0 0.5px rgba(255,255,255,0.12);">%s'
             '<div style="display: flex; flex-direction: column; min-width: 0; gap: 3px;"><span style="font-size: 11px; font-weight: 600; color: %s;">HABER · Gamerisen</span>%s</div></a>%s</div>') % (S1, img('gta', 64, 64, 10, '50% 60%'), T2, txt('GTA VI’nın yeni fragmanı yayınlandı: Leonida’ya ilk yakın bakış', 13, 18, 600, TX, 'c3'), tstamp('21:45'))
    NC = 84 + 18
    postc = ('<div style="align-self: flex-start;"><a href="G-13-PostDetail.dc.html" style="width: 264px; box-sizing: border-box; padding: 12px; border-radius: 18px 18px 18px 6px; background: %s; display: flex; flex-direction: column; gap: 8px;">'
             '<div style="display: flex; align-items: center; gap: 8px;">%s<span style="font-size: 13px; font-weight: 600;">MertGaming</span><span style="font-size: 12px; color: %s;">· Gönderi</span></div>%s%s</a></div>') % (
        S2, avatar('forza', 22), T2, txt('Bu boss fight gerçekten inanılmazdı. 41 denemede geçtim ama her saniyesine değdi.', 14, 20, 400, TX, 'c2'), img('eldenring', 240, 110, 10, '40% center'))
    PC_ = 12 + 22 + 8 + 40 + 8 + 110 + 12
    typing = '<div aria-label="Burak yazıyor" style="align-self: flex-start; width: 64px; height: 36px; border-radius: 18px 18px 18px 6px; background: %s; display: flex; align-items: center; justify-content: center; gap: 4px;">%s</div>' % (S2, ''.join('<span class="dot%d" style="width: 7px; height: 7px; border-radius: 999px; background: %s; display: block;"></span>' % (i, T2) for i in (1, 2, 3)))
    parts = [(16, div, 24), (16, m1, h1), (16, m2, h2), (6, gcard, GC), (16, reply, RP), (8, im, 150), (16, newsc, NC), (16, postc, PC_), (16, typing, 36)]
    inner = ''.join('<div style="margin-top: %dpx; display: flex; flex-direction: column;">%s</div>' % (mt, h) for mt, h, _ in parts)
    AREA = sum(mt + h for mt, _, h in parts) + 20
    comp = ('<div style="flex-shrink: 0; height: 92px; box-sizing: border-box; padding: 10px 12px 34px; background: %s; border-top: 0.5px solid %s; display: flex; align-items: center; gap: 8px;">%s'
            '<div style="flex: 1 1 auto; height: 44px; border-radius: 22px; background: %s; display: flex; align-items: center; padding: 0 2px 0 16px; min-width: 0;">'
            '<label for="gr-msg" style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%%);">Mesaj</label>'
            '<input id="gr-msg" type="text" placeholder="Mesaj yaz…" style="flex: 1 1 auto; min-width: 0; height: 42px; border: 0; background: transparent; color: %s; font-size: 16px; padding: 0;">%s%s</div>'
            '<button aria-label="Gönder" style="width: 44px; height: 44px; border-radius: 999px; background: %s; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">%s</button></div>') % (
        BG2, LINE, iconbtn('plus', 'Ekle', 22, TX, S2), S2, TX, iconbtn('pad', 'Oyun paylaş', 21, T2, size=40), iconbtn('image', 'Görsel gönder', 20, T2, size=40), ACS, icon('send', 19, ONAC, 2))
    H = 106 + AREA + 92
    body = hdr + '<div style="display: flex; flex-direction: column; padding: 0 16px; height: %dpx; flex-shrink: 0;">%s</div>' % (AREA, inner) + comp
    return page('Gamerisen — 19 Sohbet', 390, H, root(body, H), script()), H

def notifications():
    nb = nav_bar('Bildirimler', 'G-04-Home.dc.html', iconbtn('checkc', 'Tümünü okundu işaretle', 22))
    chips = rail(chip('Tümü', True, 32, fs=13) + chip('Fiyatlar (2)', False, 32, fs=13) + chip('Sosyal', False, 32, fs=13) + chip('Haberler', False, 32, fs=13) + chip('Topluluklar', False, 32, fs=13), 8, 20, 32)
    g = lambda t: pad(txt(t, 13, 18, 600, T2))
    act = lambda b: '<div style="display: flex; margin-top: 8px;">%s</div>' % b
    stackav = '<div style="position: relative; width: 44px; height: 44px; flex-shrink: 0;"><span style="position: absolute; left: 0; top: 0;">%s</span><span style="position: absolute; right: 0; bottom: 0; border-radius: 999px; box-shadow: 0 0 0 2.5px %s;">%s</span><span style="position: absolute; right: -4px; top: -2px; width: 20px; height: 20px; border-radius: 999px; background: %s; box-shadow: 0 0 0 2.5px %s; display: flex; align-items: center; justify-content: center;">%s</span></div>' % (
        avatar(None, 30, 'B', AVC[3]), BG, avatar('forza', 30), RED, BG, icon('heart', 11, '#FFFFFF', 2, fill='#FFFFFF'))
    today = [
        (notif(nlead('price', 'cyberpunk'), '<b>Cyberpunk 2077</b> fiyatı düştü. Steam’de artık <b>₺599</b> (%50 indirim).', '12 dk önce', True, act(btn('Mağazaları gör', 'tinted', 30, href='G-08-Prices.dc.html', extra=' padding: 0 12px; font-size: 13px;')), href='G-08-Prices.dc.html'), 110),
        (notif(stackav, '<b>Burak</b> ve <b>12 kişi</b> gönderini beğendi.', '25 dk önce', True, thumb='eldenring', href='G-13-PostDetail.dc.html'), 76),
        (notif(nlead('price', 'hades2'), 'Listendeki <b>Hades II</b> indirimde: ₺499 (−%30). Alarmın tetiklendi.', '1 sa önce', True, href='G-09-Wishlist.dc.html'), 76),
        (notif(nlead('news', 'gta'), 'Yeni <b>GTA VI</b> haberi yayınlandı: Leonida’ya ilk yakın bakış.', '2 sa önce', href='G-17-NewsDetail.dc.html'), 76),
        (notif(nlead('comm', 'eldenring'), '<b>Elden Ring Topluluğu</b>’nda gönderine yeni yanıt var: “Hangi silahı kullandın?”', '3 sa önce', href='G-13-PostDetail.dc.html'), 76),
        (notif(avatar(None, 44, 'E', AVC[1], gk='bg3'), '<b>Eren</b>, Baldur’s Gate 3 oynamaya başladı. 3 arkadaşın bu oyunu oynuyor.', '4 sa önce', act(btn('Mesaj gönder', 'secondary', 30, href='G-19-Chat.dc.html', extra=' padding: 0 12px; font-size: 13px;'))), 110)]
    earlier = [
        (notif(avatar(None, 44, 'S', AVC[4]), '<b>selin.exe</b> seni takip etmeye başladı.', 'Dün', False, act(follow_btn('s1', 30))), 110),
        (notif(nlead('cal'), '<b>GTA VI</b> çıkışına 59 gün kaldı. Ön sipariş açıldığında haber vereceğiz.', '2 gün önce'), 76),
        (notif(avatar(None, 44, 'GR', AVC[3]), '<b>GameReviewTR</b> yeni video yükledi: Alan Wake 2 — Spoilersız İnceleme', '2 gün önce', thumb='alanwake', href='G-15-VideoPlayer.dc.html'), 76)]
    rows = lambda items: '<div style="display: flex; flex-direction: column;">%s</div>' % ''.join('<div style="min-height: %dpx; display: flex; flex-direction: column; justify-content: center;">%s</div>' % (h, r) for r, h in items)
    content, tot = stack([(None, nb, NB), (12, chips, 32), (18, g('Bugün'), 18), (6, rows(today), sum(h for _, h in today)), (20, g('Daha önce'), 18), (6, rows(earlier), sum(h for _, h in earlier))])
    H = max(844, tot + 34)
    return page('Gamerisen — 20 Bildirimler', 390, H, root(content, H), script("{ f: { s1: this.follow('f_s1', false, t) } }")), H

def profile():
    cover = ('<div style="position: relative; width: 390px; height: 190px;">%s<div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,10,11,0.45) 0%%, rgba(10,10,11,0) 40%%, rgba(10,10,11,0.3) 70%%, #0A0A0B 100%%);"></div>'
             '<div style="position: absolute; top: 54px; right: 16px; display: flex; gap: 10px;">%s%s</div></div>') % (img('bg3', 390, 190, 0, '50% 30%', ''), iconbtn('share', 'Profili paylaş', 20, '#FFFFFF', onart=True), iconbtn('gear', 'Ayarlar', 20, '#FFFFFF', onart=True, href='G-23-Settings.dc.html'))
    avrow = ('<div style="display: flex; align-items: flex-end; justify-content: space-between; padding: 0 20px; height: 96px;"><div style="position: relative; width: 96px; height: 96px;">'
             '<img src="%s" alt="Deniz Arslan profil fotoğrafı" style="width: 96px; height: 96px; border-radius: 999px; object-fit: cover; display: block; box-sizing: border-box; border: 4px solid %s;">'
             '<span style="position: absolute; right: -4px; bottom: 4px; height: 24px; padding: 0 8px; border-radius: 999px; background: %s; box-shadow: 0 0 0 3px %s; color: %s; font-size: 11px; font-weight: 700; display: flex; align-items: center;">Lv 37</span></div>'
             '<div style="display: flex; gap: 8px; margin-bottom: 4px;">%s</div></div>') % (art('eldenring'), BG, ACF, BG, ONACF, btn('Profili Düzenle', 'secondary', 40, href='G-22-EditProfile.dc.html', extra=' font-size: 14px;'))
    name = ('<div style="padding: 0 20px;"><div style="font-family: %s; font-size: 24px; line-height: 30px; font-weight: 700; letter-spacing: -0.025em;">Deniz Arslan</div>'
            '<div style="display: flex; align-items: center; gap: 8px; height: 22px; font-size: 14px; color: %s;"><span>@denizplays</span><span>·</span>%s</div></div>') % (FD, T2, store('Steam', 12, T2, 'denizplays'))
    bio = pad(txt('Soulslike bağımlısı, co-op sever. Hafta içi CS2, hafta sonu uzun RPG seansları.', 15, 22, 400, TX, 'c2', ' height: 44px;'))
    def st(n, l, href): return '<a href="%s" style="display: flex; align-items: baseline; gap: 5px;"><span class="num" style="font-size: 16px; font-weight: 700;">%s</span><span style="font-size: 14px; color: %s;">%s</span></a>' % (href, n, T2, l)
    stats = pad('<div style="display: flex; gap: 18px; height: 24px; align-items: center;">%s%s%s</div>' % (st('1.284', 'takipçi', '#'), st('312', 'takip', '#'), st('48', 'arkadaş', 'G-18-Messages.dc.html')))
    now = ('<a href="G-07-GameDetail.dc.html" class="press" style="position: relative; display: block; margin: 0 20px; height: 132px; border-radius: 20px; overflow: hidden;">%s'
           '<span style="position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,0,0,0.88) 0%%, rgba(0,0,0,0.6) 55%%, rgba(0,0,0,0.1) 100%%);"></span>'
           '<span style="position: absolute; left: 16px; top: 16px; right: 110px; display: flex; flex-direction: column;"><span style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: %s;"><span style="width: 7px; height: 7px; border-radius: 999px; background: %s;"></span>Şu an oynuyor</span>%s%s'
           '<span style="display: block; height: 5px; margin-top: 12px; border-radius: 3px; background: rgba(255,255,255,0.2);"><span style="display: block; width: 64%%; height: 5px; border-radius: 3px; background: #FFFFFF;"></span></span></span></a>') % (
        img('cyberpunk', 350, 132, 20, '60% center'), GREEN, GREEN, txt('Cyberpunk 2077', 18, 24, 700, '#FFFFFF', 'c1', ' margin-top: 6px;'), txt('45 saat oynandı · %64 başarım', 13, 18, 400, ONART, '', ' margin-top: 2px;'))
    def tile(v, l): return '<div style="height: 72px; box-sizing: border-box; padding: 12px 10px; border-radius: 14px; background: %s; display: flex; flex-direction: column; justify-content: center;"><span class="num" style="font-size: 17px; line-height: 22px; font-weight: 700;">%s</span><span style="font-size: 11px; line-height: 14px; color: %s; margin-top: 2px;">%s</span></div>' % (S1, v, T2, l)
    tiles = '<div style="padding: 0 20px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px;">%s%s%s%s</div>' % (tile('38', 'Tamamlanan'), tile('21', 'İnceleme'), tile('1.240', 'Saat'), tile('612', 'Başarım'))
    seg = pad(segmented(['Gönderiler', 'Oyunlar', 'İncelemeler', 'Medya'], 1, 350))
    def prow(k, t, meta, pos='center'):
        return '<a href="G-07-GameDetail.dc.html" style="display: flex; align-items: center; gap: 12px; height: 60px;">%s<div style="display: flex; flex-direction: column; flex: 1 1 auto;">%s%s</div>%s</a>' % (img(k, 46, 60, 9, pos), txt(t, 15, 20, 600), txt(meta, 13, 18, 400, T2), icon('chev', 16, T3, 2.4))
    hd1, _ = sec_head('Şu an oynuyor', right='<span style="font-size: 13px; color: %s;">2</span>' % T2)
    s_now = hd1 + pad('<div style="margin-top: 8px; display: flex; flex-direction: column; gap: 8px;">%s%s</div>' % (prow('cyberpunk', 'Cyberpunk 2077', '45 sa · %64 başarım', '52% center'), prow('eldenring', 'Elden Ring Nightreign', '12 sa · %18 başarım', '20% center')))
    hd2, _ = sec_head('Tamamlananlar', 'Tümü (38)', '#')
    done = rail(''.join(game_s(k, t, '', None, 100, 134, pos, sub='<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: %s;">%s%s</span>' % (T2, icon('checkc', 13, T2, 2.2), h)) for k, t, h, pos in [
        ('eldenring', 'Elden Ring', '134 sa', '48% center'), ('bg3', "Baldur's Gate 3", '112 sa', '28% center'), ('witcher', 'The Witcher 3', '98 sa', 'center'), ('rdr2', 'Red Dead Redemption 2', '76 sa', '70% center')]), 12, 20, GS_H(134))
    hd3, _ = sec_head('İstek Listesi', 'Tümü (27)', 'G-09-Wishlist.dc.html')
    wish = rail(''.join([game_s('hades2', 'Hades II', '₺499', '-%30', 100, 134), game_s('doom', 'DOOM: The Dark Ages', '₺1.299', '-%24', 100, 134), game_s('silksong', 'Hollow Knight: Silksong', '₺389', None, 100, 134), game_s('split', 'Split Fiction', '₺1.149', '-%21', 100, 134, '70% center')]), 12, 20, GS_H(134))
    hd4, _ = sec_head('Favoriler')
    fav = rail(''.join(game_s(k, t, '', None, 100, 134, pos, sub='<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: %s;">%s%s</span>' % (T2, star(11), r)) for k, t, r, pos in [
        ('eldenring', 'Elden Ring', '5,0', '48% center'), ('bg3', "Baldur's Gate 3", '5,0', '28% center'), ('rdr2', 'Red Dead Redemption 2', '4,5', '70% center'), ('hades2', 'Hades', '5,0', 'center')]), 12, 20, GS_H(134))
    content, tot = stack([(None, cover, 190), (-48, avrow, 96), (12, name, 52), (10, bio, 44), (12, stats, 24), (20, now, 132), (12, tiles, 72), (24, seg, 36),
                          (22, s_now, 28 + 8 + 128), (28, hd2 + '<div style="margin-top: 12px;">%s</div>' % done, 28 + 12 + GS_H(134)), (28, hd3 + '<div style="margin-top: 12px;">%s</div>' % wish, 28 + 12 + GS_H(134)),
                          (28, hd4 + '<div style="margin-top: 12px;">%s</div>' % fav, 28 + 12 + GS_H(134))])
    H = tot + 28 + TABBAR_H
    return page('Gamerisen — 21 Profil', 390, H, root(content + tabbar('me'), H), script()), H

def edit_profile():
    nb = ('<header style="padding: 54px 16px 0; height: 98px; box-sizing: border-box; display: grid; grid-template-columns: 90px 1fr 90px; align-items: center; border-bottom: 0.5px solid %s;">'
          '<a href="G-21-Profile.dc.html" style="height: 44px; display: flex; align-items: center; font-size: 16px; color: %s;">Vazgeç</a><span style="text-align: center; font-size: 17px; font-weight: 600;">Profili Düzenle</span>'
          '<div style="display: flex; justify-content: flex-end;">%s</div></header>') % (LINE, T2, btn('Kaydet', 'primary', 34, href='G-21-Profile.dc.html', extra=' padding: 0 16px;'))
    cover = ('<div style="position: relative; width: 390px; height: 140px;">%s<div style="position: absolute; inset: 0; background: rgba(0,0,0,0.45);"></div>'
             '<button style="position: absolute; left: 50%%; top: 50%%; transform: translate(-50%%, -50%%); height: 36px; padding: 0 14px; border-radius: 999px; %s display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #FFFFFF; white-space: nowrap;">%sKapağı değiştir</button></div>') % (img('bg3', 390, 140, 0, '50% 30%', ''), DARKGLASS, icon('camera', 16, '#FFFFFF', 2))
    av = ('<div style="padding: 0 20px; height: 88px;"><button aria-label="Profil fotoğrafını değiştir" style="position: relative; width: 88px; height: 88px; display: block;"><img src="%s" alt="" style="width: 88px; height: 88px; border-radius: 999px; object-fit: cover; display: block; box-sizing: border-box; border: 4px solid %s;">'
          '<span style="position: absolute; right: -2px; bottom: 2px; width: 32px; height: 32px; border-radius: 999px; background: %s; box-shadow: 0 0 0 3px %s; display: flex; align-items: center; justify-content: center;">%s</span></button></div>') % (art('eldenring'), BG, ACS, BG, icon('camera', 16, ONAC, 2.2))
    f1, h1 = field('gr-name', 'Görünen ad', 'Deniz Arslan')
    f2, h2 = field('gr-user', 'Kullanıcı adı', 'denizplays', icon_='hash', helper='Kullanılabilir', state='success')
    bio = ('<div style="display: flex; flex-direction: column; gap: 6px;"><label for="gr-bio" style="font-size: 13px; line-height: 18px; font-weight: 600; color: %s;">Biyografi</label>'
           '<textarea id="gr-bio" rows="3" style="height: 96px; box-sizing: border-box; border: 0; border-radius: 12px; background: %s; box-shadow: inset 0 0 0 2px %s; color: %s; font-size: 16px; line-height: 22px; padding: 12px 14px; resize: none;">Soulslike bağımlısı, co-op sever. Hafta içi CS2, hafta sonu uzun RPG seansları.</textarea>'
           '<span class="num" style="align-self: flex-end; font-size: 12px; line-height: 16px; color: %s;">86/160</span></div>') % (T2, S1, AC, TX, T3)
    f4, h4 = field('gr-loc', 'Konum', 'İstanbul', icon_='globe')
    fields = pad('<div style="display: flex; flex-direction: column; gap: 16px;">%s%s%s%s</div>' % (f1, f2, bio, f4))
    FH = h1 + h2 + (18 + 6 + 96 + 6 + 16) + h4 + 16 * 3
    acc = [(row_item('Steam', None, right='<span style="display: inline-flex; align-items: center; gap: 5px; font-size: 14px; color: %s;">%sBağlı</span>' % (GREEN, icon('checkc', 16, GREEN, 2.2)), sep=False).replace('<span style="flex: 1 1 auto; font-size: 16px;', '%s<span style="flex: 1 1 auto; font-size: 16px;' % mono('Steam', 30, 13, 8), 1), 52)]
    for n in ['PlayStation Store', 'Xbox Store', 'Epic Games']:
        lab = {'PlayStation Store': 'PlayStation Network', 'Xbox Store': 'Xbox', 'Epic Games': 'Epic Games'}[n]
        acc.append((row_item(lab, None, right='<span style="font-size: 15px; font-weight: 600; color: %s;">Bağla</span>' % AC).replace('<span style="flex: 1 1 auto; font-size: 16px;', '%s<span style="flex: 1 1 auto; font-size: 16px;' % mono(n, 30, 13, 8), 1).replace('left: 16px; right: 0; height: 0.5px', 'left: 60px; right: 0; height: 0.5px'), 52))
    ga, gah = group(acc, 'Oyun hesapları', 'Bağlı hesaplar oynama süreni ve kütüphaneni otomatik günceller.')
    gah += 16  # footnote wraps to two lines
    gen = pad('<div style="display: flex; flex-direction: column; gap: 10px;">%s<div style="display: flex; flex-wrap: wrap; gap: 8px;">%s%s</div></div>' % (txt('Favori türler', 13, 18, 600, T2), ''.join(chip(t, True, 34, fs=13) for t in ['RPG', 'Soulslike', 'Co-op', 'Açık dünya']), chip('Ekle', False, 34, 'plus', fs=13)))
    priv = [(row_item('Şu an oynuyor durumumu göster', None, right=toggle('p1', 'Şu an oynuyor durumumu göster'), sep=False), 52), (row_item('Oynama sürelerimi göster', None, right=toggle('p2', 'Oynama sürelerimi göster')), 52), (row_item('İstek listem herkese açık', None, right=toggle('p3', 'İstek listem herkese açık')), 52)]
    gp, gph = group(priv, 'Gizlilik')
    content, tot = stack([(None, nb, 98), (0, cover, 140), (-44, av, 88), (20, fields, FH), (28, ga, gah), (28, gen, 18 + 10 + 34 * 2 + 8), (28, gp, gph)])
    H = tot + 40
    return page('Gamerisen — 22 Profili Düzenle', 390, H, root(content, H), script("{ s: { p1: this.sw('s_p1', true), p2: this.sw('s_p2', true), p3: this.sw('s_p3', false) } }")), H

def settings():
    nb = nav_bar('Ayarlar', 'G-21-Profile.dc.html')
    prof = ('<a href="G-22-EditProfile.dc.html" style="margin: 0 20px; height: 76px; box-sizing: border-box; padding: 0 16px; border-radius: 16px; background: %s; display: flex; align-items: center; gap: 14px;">%s'
            '<div style="display: flex; flex-direction: column; flex: 1 1 auto;"><span style="font-size: 17px; font-weight: 600;">Deniz Arslan</span><span style="font-size: 13px; color: %s;">Hesap, güvenlik ve bağlı hesaplar</span></div>%s</a>') % (S1, avatar('eldenring', 52), T2, icon('chev', 16, T3, 2.4))
    T = lambda k, l: toggle(k, l)
    g1, h1 = group([(row_item('Fiyat düşüşleri', ic='down', right=T('n1', 'Fiyat düşüşleri'), sep=False), 52), (row_item('İstek listesi indirimleri', ic='heart', right=T('n2', 'İstek listesi indirimleri')), 52),
                    (row_item('Arkadaş etkinliği', ic='pad', right=T('n3', 'Arkadaş etkinliği')), 52), (row_item('Topluluk yanıtları', ic='comment', right=T('n4', 'Topluluk yanıtları')), 52),
                    (row_item('Oyun haberleri', ic='news', right=T('n5', 'Oyun haberleri')), 52), (row_item('Bildirim sıklığı', 'Anlık', ic='clock'), 52)], 'Bildirimler', 'Sessiz saatlerde bildirimler sabah özet olarak gelir.')
    g2, h2 = group([(row_item('Para birimi', '₺ TRY', ic='tag', sep=False), 52), (row_item('Bölge', 'Türkiye', ic='globe'), 52), (row_item('Platformlarım', 'PC, PS5', ic='monitor'), 52), (row_item('Takip ettiğim mağazalar', '5', ic='bag'), 52)], 'Fiyat tercihleri')
    g3, h3 = group([(row_item('Tema', 'Koyu', ic='moon', sep=False), 52), (row_item('Yazı boyutu', 'Sistem', ic='textsize'), 52), (row_item('Hareketi azalt', ic='layers', right=T('a1', 'Hareketi azalt')), 52), (row_item('Video önizleme', 'Yalnızca Wi-Fi', ic='play'), 52)], 'Görünüm ve erişilebilirlik')
    g4, h4 = group([(row_item('Profil görünürlüğü', 'Herkese açık', ic='eye', sep=False), 52), (row_item('Mesaj izinleri', 'Arkadaşlar', ic='msg'), 52), (row_item('Engellenen hesaplar', ic='lock'), 52)], 'Gizlilik ve güvenlik')
    g5, h5 = group([(row_item('Yardım merkezi', ic='help', sep=False), 52), (row_item('Geri bildirim gönder', ic='send'), 52), (row_item('Kullanım koşulları', ic='book'), 52)], 'Destek')
    out = '<a href="G-03-Login.dc.html" style="margin: 0 20px; height: 52px; border-radius: 16px; background: %s; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 16px; font-weight: 600; color: %s;">%sÇıkış yap</a>' % (S1, RED, icon('logout', 18, RED, 2))
    foot = '<div style="text-align: center; font-size: 12px; line-height: 16px; color: %s;">Gamerisen 1.0 (2026.09)</div>' % T3
    content, tot = stack([(None, nb, NB), (16, prof, 76), (28, g1, h1), (28, g2, h2), (28, g3, h3), (28, g4, h4), (28, g5, h5), (28, out, 52), (16, foot, 16)])
    H = tot + 40
    vals = "{ s: { n1: this.sw('s_n1', true), n2: this.sw('s_n2', true), n3: this.sw('s_n3', true), n4: this.sw('s_n4', true), n5: this.sw('s_n5', false), a1: this.sw('s_a1', false) } }"
    return page('Gamerisen — 23 Ayarlar', 390, H, root(content, H), script(vals)), H

if __name__ == '__main__':
    for n, f in [('G-18-Messages', messages), ('G-19-Chat', chat), ('G-20-Notifications', notifications), ('G-21-Profile', profile), ('G-22-EditProfile', edit_profile), ('G-23-Settings', settings)]:
        h, H = f(); open('root/project/%s.dc.html' % n, 'w').write(h); print(n, H, len(h))
