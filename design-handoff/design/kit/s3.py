from c import *
from s1 import poll

def thread(t, meta, tags, sep, href='G-13-PostDetail.dc.html'):
    tg = ''.join('<span style="height: 20px; padding: 0 6px; border-radius: 5px; background: rgba(255,255,255,0.1); font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; color: %s;">%s</span>' % (T2, x) for x in tags)
    return ('<a href="%s" style="position: relative; display: flex; flex-direction: column; justify-content: center; gap: 4px; height: 76px; padding: 0 16px;">%s%s<div style="display: flex; align-items: center; gap: 8px; font-size: 12px; line-height: 16px; color: %s;">%s<span>%s</span></div></a>') % (
        href, '<span style="position: absolute; top: 0; left: 16px; right: 0; height: 0.5px; background: %s;"></span>' % LINE if sep else '', txt(t, 15, 20, 600, TX, 'c1'), T2, tg, meta)

def game_community():
    top = ('<div style="position: relative; width: 390px; height: 240px;">%s<div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,10,11,0.45) 0%%, rgba(10,10,11,0) 35%%, rgba(10,10,11,0.2) 60%%, #0A0A0B 100%%);"></div>'
           '<div style="position: absolute; top: 54px; left: 16px; right: 16px; display: flex; justify-content: space-between;"><a href="G-10-Community.dc.html" aria-label="Geri" style="width: 44px; height: 44px; border-radius: 999px; %s display: flex; align-items: center; justify-content: center;">%s</a>'
           '<div style="display: flex; gap: 10px;">%s%s</div></div></div>') % (img('eldenring', 390, 240, 0, 'center 35%', ''), DARKGLASS, icon('back', 22, '#FFFFFF', 2.4), iconbtn('share', 'Paylaş', 20, '#FFFFFF', onart=True), iconbtn('more', 'Diğer', 20, '#FFFFFF', onart=True))
    idrow = ('<div style="padding: 0 20px; display: flex; align-items: flex-end; justify-content: space-between; height: 84px;">'
             '<span style="display: flex; border-radius: 24px; box-shadow: 0 0 0 4px %s;">%s</span><div style="display: flex; gap: 8px; margin-bottom: 2px;">%s%s</div></div>') % (
        BG, img('eldenring', 80, 80, 22, '48% 40%', 'Elden Ring topluluk simgesi'), btn('Katıl', 'primary', 40, extra=' padding: 0 22px;'), iconbtn('bell', 'Topluluk bildirimleri', 20, TX, S2, 40))
    chips_ = ''.join('<span style="height: 28px; padding: 0 10px; border-radius: 8px; background: %s; display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: %s; flex-shrink: 0;">%s%s</span>' % (S1, T2, icon(i, 13, T2, 2.2), t) for i, t in [('shield', 'Moderatörlü'), ('globe', 'Türkçe'), ('alert', 'Spoiler etiketi zorunlu')])
    info = ('<div style="padding: 0 20px; display: flex; flex-direction: column;"><h1 style="margin: 0; font-family: %s; font-size: 24px; line-height: 30px; font-weight: 700; letter-spacing: -0.025em;">Elden Ring Topluluğu</h1>'
            '<div style="display: flex; align-items: center; gap: 6px; height: 20px; margin-top: 4px; font-size: 13px; color: %s;"><span class="num">84,2 B üye</span><span>·</span><span style="width: 7px; height: 7px; border-radius: 999px; background: %s;"></span><span class="num">1,2 B çevrimiçi</span></div>'
            '%s<div style="display: flex; gap: 8px; margin-top: 12px;">%s</div></div>') % (
        FD, T2, GREEN, txt("Rehberler, build’ler, boss taktikleri ve Ara Diyar’dan en güzel ekran görüntüleri. Spoiler’ları etiketlemeyi unutma.", 15, 22, 400, T2, 'c2', ' margin-top: 10px; height: 44px;'), chips_)
    INFO_H = 30 + 4 + 20 + 10 + 44 + 12 + 28
    seg = pad(segmented(['Gönderiler', 'Medya', 'Rehberler', 'Sorular'], 0, 350))
    pinned = ('<a href="G-13-PostDetail.dc.html" style="margin: 0 20px; height: 92px; box-sizing: border-box; padding: 14px 16px; border-radius: 18px; background: %s; display: flex; gap: 12px;">%s'
              '<div style="display: flex; flex-direction: column; gap: 3px; min-width: 0;"><span style="display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: %s;">%sSabitlenen</span>%s<span style="font-size: 12px; line-height: 16px; color: %s;">Moderatör ekibi · 2,4 B kaydetme</span></div></a>') % (
        S1, img('eldenring', 64, 64, 12, '20% 60%'), T2, icon('pin', 13, T2, 2.2), txt('Yeni başlayanlar rehberi: İlk 10 saatte bilmen gereken her şey', 15, 20, 600, TX, 'c1'), T3)
    hd, _ = sec_head('Popüler tartışmalar', 'Tümü', '#')
    thr = '<div style="margin: 12px 20px 0; padding: 4px 0; border-radius: 18px; background: %s;">%s%s%s</div>' % (S1, thread('Malenia için en etkili build hangisi?', '412 yanıt · 5 dk önce', ['Build'], False),
                                                                                           thread('Nightreign mi, ana oyun mu? Yeni başlayana hangisi?', '238 yanıt · 32 dk önce', ['Soru'], True), thread('Ekran görüntüsü yarışması: Eylül teması “Sis”', '96 gönderi · 2 sa önce', ['Etkinlik', 'Medya'], True))
    s_thr = hd + thr
    p1, h1 = post(post_head(avatar('forza', 40), 'MertGaming', '@mertgaming', '2 sa', badge('Lv 34')), 'Bu boss fight gerçekten inanılmazdı. 41 denemede geçtim ama her saniyesine değdi.', 2, 'e1', 1204, '186',
                  media_img('eldenring', 298, 168, '40% center'), 168, ('eldenring', 'Elden Ring', 'done'))
    p2, h2 = post(post_head(avatar(None, 40, 'A', AVC[6]), 'ayse.plays', '@aysplays', '4 sa', badge('Soru', 'q')), 'Ölümsüz Ağaç’a ulaşmadan önce hangi bölgeleri bitirmek mantıklı? Spoiler vermeden önerir misiniz?', 3, 'e2', 88, '23')
    hd2, _ = sec_head('Son gönderiler')
    s_posts = hd2 + pad('<div style="margin-top: 12px; display: flex; flex-direction: column; gap: 28px;">%s%s</div>' % (p1, p2))
    fab = '<a href="G-12-CreatePost.dc.html" aria-label="Toplulukta gönderi paylaş" class="press" style="position: absolute; right: 20px; bottom: 103px; width: 56px; height: 56px; border-radius: 18px; background: %s; box-shadow: 0 10px 24px rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 6;">%s</a>' % (ACS, icon('plus', 26, ONAC, 2.4))
    content, tot = stack([(None, top, 240), (-44, idrow, 84), (12, info, INFO_H), (20, seg, 36), (16, pinned, 92), (24, s_thr, 28 + 12 + 236), (28, s_posts, 28 + 12 + h1 + 28 + h2)])
    H = tot + 28 + TABBAR_H
    vals = "{ l: { e1: this.like('l_e1', 1204, true), e2: this.like('l_e2', 88, false) }, b: { e1: this.bm('b_e1', false, t.ac), e2: this.bm('b_e2', false, t.ac) } }"
    return page('Gamerisen — 11 Oyun Topluluğu', 390, H, root(content + fab + tabbar('users'), H), script(vals)), H

def create_post():
    nb = ('<header style="padding: 54px 16px 0; height: 98px; box-sizing: border-box; display: grid; grid-template-columns: 90px 1fr 90px; align-items: center; border-bottom: 0.5px solid %s;">'
          '<a href="G-10-Community.dc.html" style="height: 44px; display: flex; align-items: center; font-size: 16px; color: %s;">Vazgeç</a><span style="text-align: center; font-size: 17px; font-weight: 600;">Gönderi oluştur</span>'
          '<div style="display: flex; justify-content: flex-end;">%s</div></header>') % (LINE, T2, btn('Paylaş', 'primary', 34, href='G-13-PostDetail.dc.html', extra=' padding: 0 16px;'))
    types = rail(''.join(chip(t, t == 'Görsel', 34, ic, fs=13) for t, ic in [('Metin', 'edit'), ('Görsel', 'image'), ('Oyun', 'pad'), ('Video', 'video'), ('Anket', 'poll')]), 8, 20, 34)
    author = ('<div style="padding: 0 20px; display: flex; align-items: center; gap: 12px; height: 44px;">%s<div style="display: flex; flex-direction: column; gap: 3px;"><span style="font-size: 15px; font-weight: 600;">Deniz Arslan</span>'
              '<button style="height: 24px; padding: 0 8px; border-radius: 7px; background: %s; display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; align-self: flex-start;">%sElden Ring Topluluğu%s</button></div></div>') % (
        avatar('eldenring', 40), S2, img('eldenring', 14, 14, 4), icon('chevd', 12, TX, 2.6))
    ta = ('<div style="padding: 0 20px;"><label for="gr-post" style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%%);">Gönderi metni</label>'
          '<textarea id="gr-post" rows="4" style="display: block; width: 350px; height: 104px; box-sizing: border-box; border: 0; background: transparent; color: %s; font-size: 17px; line-height: 26px; padding: 0; resize: none;">Sonunda Malenia’yı devirdim. 41 deneme, iki kırık gamepad ve bir sürü sabır. Taktik: ikinci fazda sağa yuvarlanmayı bırakın.</textarea></div>') % TX
    att = ('<div style="margin: 0 20px; position: relative; width: 350px; height: 196px;">%s<button aria-label="Görseli kaldır" style="position: absolute; top: 10px; right: 10px; width: 32px; height: 32px; border-radius: 999px; %s display: flex; align-items: center; justify-content: center;">%s</button>'
           '<button style="position: absolute; left: 10px; bottom: 10px; height: 28px; padding: 0 10px; border-radius: 8px; %s display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: #FFFFFF;">%sAlt metin ekle</button></div>') % (
        img('eldenring', 350, 196, 16, '40% center', 'Elden Ring ekran görüntüsü'), DARKGLASS, icon('x', 16, '#FFFFFF', 2.4), DARKGLASS, icon('plus', 13, '#FFFFFF', 2.4))
    game = ('<div style="margin: 0 20px; box-sizing: border-box; padding: 12px; border-radius: 16px; background: %s; display: flex; flex-direction: column; gap: 12px;">'
            '<div style="display: flex; align-items: center; gap: 12px; height: 40px;">%s<div style="display: flex; flex-direction: column; flex: 1 1 auto;"><span style="font-size: 15px; font-weight: 600;">Elden Ring</span><span style="font-size: 12px; color: %s;">Oyun etiketi</span></div>%s</div>%s</div>') % (
        S1, img('eldenring', 40, 40, 10), T2, iconbtn('x', 'Oyun etiketini kaldır', 16, T2, size=36), segmented(['Oynuyor', 'Tamamladı', 'Tavsiye ediyorum'], 1, 326, 32, 12))
    spoil = ('<div style="margin: 0 20px; height: 52px; box-sizing: border-box; padding: 0 12px 0 14px; border-radius: 14px; background: %s; display: flex; align-items: center; gap: 10px;">%s<span style="flex: 1 1 auto; font-size: 15px;">Spoiler içeriyor</span>%s</div>') % (S1, icon('alert', 18, ORANGE, 2), toggle('sp', 'Spoiler içeriyor'))
    tools = ''.join(iconbtn(i, l, 22, T2, size=44) for i, l in [('image', 'Görsel ekle'), ('pad', 'Oyun etiketle'), ('video', 'Video ekle'), ('poll', 'Anket ekle'), ('hash', 'Etiket ekle')])
    bar = ('<div style="position: absolute; left: 0; right: 0; bottom: 0; height: 86px; box-sizing: border-box; padding: 0 16px 34px 8px; background: %s; border-top: 0.5px solid %s; display: flex; align-items: center;">%s<span style="flex: 1 1 auto;"></span>'
           '<span class="num" style="font-size: 13px; color: %s; margin-right: 8px;">142/500</span><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="9" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2.5"></circle>'
           '<circle cx="11" cy="11" r="9" fill="none" stroke="%s" stroke-width="2.5" stroke-dasharray="16 56.5" transform="rotate(-90 11 11)" stroke-linecap="round"></circle></svg></div>') % (BG2, LINE, tools, T2, AC)
    content, _ = stack([(None, nb, 98), (12, types, 34), (16, author, 44), (14, ta, 104), (8, att, 196), (12, game, 108), (10, spoil, 52)])
    return page('Gamerisen — 12 Gönderi Oluştur', 390, 844, root(content + bar, 844), script("{ s: { sp: this.sw('s_sp', false) } }")), 844

def post_detail():
    nb = nav_bar('Gönderi', 'G-10-Community.dc.html', iconbtn('more', 'Seçenekler', 22))
    p, ph = post(post_head(avatar('forza', 40), 'MertGaming', '@mertgaming', '2 sa', badge('Lv 34')), 'Bu boss fight gerçekten inanılmazdı. 41 denemede geçtim ama her saniyesine değdi. İkinci fazdaki çiçek açma saldırısında sağa değil, geriye kaçmayı öğrenince her şey değişti.', 4,
                 'pd', 1204, '186', media_img('eldenring', 298, 168, '40% center'), 168, ('eldenring', 'Elden Ring', 'done'))
    stats = pad('<div style="display: flex; gap: 16px; height: 40px; align-items: center; border-top: 0.5px solid %s; border-bottom: 0.5px solid %s; font-size: 13px; color: %s;"><span><b class="num" style="color: %s;">1.204</b> beğeni</span><span><b class="num" style="color: %s;">186</b> yorum</span><span><b class="num" style="color: %s;">38</b> paylaşım</span></div>' % (LINE, LINE, T2, TX, TX, TX))
    hdr = pad('<div style="display: flex; align-items: center; justify-content: space-between; height: 34px;"><span style="font-size: 17px; font-weight: 600;">Yanıtlar</span>%s</div>' % chip('En iyi', False, 32, chev=True, fs=13))
    c1, a = comment(avatar(None, 40, 'S', AVC[4]), 'selin.exe', '1 sa', '41 deneme mi? Ben 63’te geçtim, rahatla. Waterfowl Dance’i ilk gördüğüm an kumandayı bıraktım.', 2, '214')
    c2, b = comment(avatar('forza', 32), 'MertGaming', '48 dk', 'Ben de ikinci fazda sabrımı kaybettim ama geriye kaçmayı öğrenince her şey oturdu.', 2, '88', reply=True, op=True)
    c3, cc = comment(avatar(None, 40, 'E', AVC[1]), 'emrebgs', '40 dk', 'Kanama build’iyle çok daha rahat oluyor. Bir de mesafeyi koruyup büyü kullanmak işe yarıyor.', 2, '156')
    c4, d = comment(avatar(None, 40, 'A', AVC[6]), 'ayse.plays', '12 dk', 'Hangi silahı kullandın?', 1, '42')
    more = pad(btn('3 yanıt daha göster', 'tertiary', 36, extra=' padding: 0 0 0 52px; justify-content: flex-start; font-size: 14px;'))
    comments = pad('<div style="display: flex; flex-direction: column; gap: 18px;">%s%s%s%s</div>' % (c1, c2, c3, c4))
    CH = a + b + cc + d + 18 * 3
    comp = ('<div style="position: absolute; left: 0; right: 0; bottom: 0; height: 90px; box-sizing: border-box; padding: 10px 16px 34px; background: %s; border-top: 0.5px solid %s; display: flex; align-items: center; gap: 10px;">%s'
            '<div style="flex: 1 1 auto; height: 40px; border-radius: 20px; background: %s; display: flex; align-items: center; padding: 0 6px 0 16px;"><label for="gr-reply" style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%%);">Yanıt</label>'
            '<input id="gr-reply" placeholder="MertGaming’e yanıt yaz…" style="flex: 1 1 auto; min-width: 0; height: 38px; border: 0; background: transparent; color: %s; font-size: 15px; padding: 0;">%s</div></div>') % (
        BG2, LINE, avatar('eldenring', 32), S2, TX, iconbtn('send', 'Gönder', 18, T3, size=34))
    content, tot = stack([(None, nb, NB), (14, pad(p), ph), (8, stats, 40), (18, hdr, 34), (12, comments, CH), (6, more, 36)])
    H = tot + 30 + 90
    return page('Gamerisen — 13 Gönderi Detayı', 390, H, root(content + comp, H), script("{ l: { pd: this.like('l_pd', 1204, true) }, b: { pd: this.bm('b_pd', false, t.ac) } }")), H

def videos():
    head = page_head('Videolar', iconbtn('search', 'Video ara', 22, href='G-05-Search.dc.html') + iconbtn('bookmark', 'Kaydedilenler', 21))
    chips = rail(''.join(chip(t, i == 0) for i, t in enumerate(['Senin İçin', 'Fragmanlar', 'Oynanış', 'İncelemeler', 'Haberler', 'Yaratıcılar'])), 8, 20, 34)
    feat = ('<div style="padding: 0 20px;"><div style="position: relative; width: 350px; height: 197px;"><a href="G-15-VideoPlayer.dc.html" aria-label="Videoyu oynat" style="position: relative; display: block; width: 350px; height: 197px;">%s%s'
            '<span style="position: absolute; left: 14px; right: 14px; bottom: 12px; height: 3px; border-radius: 3px; background: rgba(255,255,255,0.25);"><span style="display: block; width: 36%%; height: 3px; border-radius: 3px; background: #FFFFFF;"></span></span>%s</a>'
            '<button aria-label="Sesi aç" style="position: absolute; top: 8px; right: 8px; width: 40px; height: 40px; border-radius: 999px; %s display: flex; align-items: center; justify-content: center;">%s</button></div>'
            '<div style="display: flex; gap: 12px; margin-top: 12px;">%s<div style="display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0;">%s%s'
            '<div style="display: flex; gap: 6px; margin-top: 10px; height: 26px; align-items: center;"><span style="display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 8px 0 3px; border-radius: 7px; background: %s; font-size: 12px; font-weight: 600; color: %s;">%sAlan Wake 2</span>'
            '<span style="display: inline-flex; align-items: center; height: 26px; padding: 0 8px; border-radius: 7px; background: %s; color: %s; font-size: 12px; font-weight: 700;">₺599 · -%%40</span></div></div></div></div>') % (
        img('alanwake', 350, 197, 18, '48% center', ''), ovl('Önizleme', 'top: 12px; left: 12px;', 'eye'), ovl('18:40', 'right: 14px; bottom: 24px;'), DARKGLASS, icon('mute', 18, '#FFFFFF'),
        avatar(None, 36, 'GR', AVC[3]), txt('Alan Wake 2 — Spoilersız İnceleme: Yılın en iyi korku oyunu mu?', 17, 22, 700, TX, 'c2', ' height: 44px;'), txt('GameReviewTR · 215 B görüntülenme · 2 gün önce', 13, 18, 400, T2, 'c1', ' margin-top: 4px;'),
        S1, T2, img('alanwake', 20, 20, 5), GREENT, GREEN)
    FEAT_H = 197 + 12 + 44 + 4 + 18 + 10 + 26
    hd, _ = sec_head('Kısa Klipler', 'Tümü', '#')
    s_sh = hd + '<div style="margin-top: 12px;">%s</div>' % rail(short('silksong', "Silksong'da 1 dakikada 3 gizli oda", '84 B', pos='45% center') + short('cs2', 'CS2: Mirage A bölgesine yeni smoke', '126 B', pos='55% center') +
                                                           short('hades2', 'Hades II: Bu build’i mutlaka deneyin', '61 B') + short('fc', 'FC 26: En etkili köşe vuruşu', '39 B', pos='60% center'), 10, 20, 234)
    def creator(av, n, new):
        return '<a href="G-15-VideoPlayer.dc.html" style="width: 72px; display: flex; flex-direction: column; align-items: center; flex-shrink: 0;">%s%s%s</a>' % (av, txt(n, 12, 16, 600, TX, 'c1', ' margin-top: 8px; text-align: center; width: 72px;'), txt(new, 11, 14, 600, AC if new != 'Güncel' else T3, '', ' margin-top: 2px;'))
    cr = ''.join([creator(avatar(None, 56, 'GR', AVC[3], ring=True), 'GameReviewTR', '2 yeni'), creator(avatar(None, 56, 'LU', AVC[1], ring=True), 'Level Up TR', '1 yeni'), creator(avatar('stardew', 56, ring=True), 'PixelNur', '3 yeni'),
                  creator('<div style="padding: 5px;">%s</div>' % avatar('pixel', 56), 'Retro Kutusu', 'Güncel'), creator('<div style="padding: 5px;">%s</div>' % avatar(None, 56, 'KO', AVC[5]), 'Kaan Oynuyor', 'Güncel')])
    hd2, _ = sec_head('Takip Ettiğin Yaratıcılar', 'Tümü', '#')
    s_cr = hd2 + '<div style="margin-top: 12px;">%s</div>' % rail(cr, 8, 20, 106)
    hd3, _ = sec_head('Bugün İzleniyor')
    b1, bh = video('doom', 'DOOM: The Dark Ages — Kâbus zorlukta ilk 30 dakika', 'Level Up TR', '92 B görüntülenme · 5 sa önce', '31:05', 'Oynanış', 'doom', 'DOOM: The Dark Ages', w=350, th=197, av=avatar(None, 32, 'LU', AVC[1]))
    b2, _ = video('kcd2', 'Kingdom Come: Deliverance II geliştiricileriyle 20 dakika', 'Gamerisen Stüdyo', '41 B görüntülenme · 1 gün önce', '21:40', 'Geliştirici', 'kcd2', 'Kingdom Come: Deliverance II', w=350, th=197, pos='60% center', av='<div style="width: 32px; height: 32px; flex-shrink: 0;">%s</div>' % mark(32))
    b3, _ = video('gta', 'GTA VI fragmanını kare kare inceledik: kaçırdığınız 25 detay', 'GameReviewTR', '318 B görüntülenme · 3 gün önce', '16:12', 'Fragman', 'gta', 'Grand Theft Auto VI', w=350, th=197, pos='50% 60%', av=avatar(None, 32, 'GR', AVC[3]))
    s_big = hd3 + pad('<div style="margin-top: 12px; display: flex; flex-direction: column; gap: 28px;">%s%s%s</div>' % (b1, b2, b3))
    content, tot = stack([(None, head, PH), (4, chips, 34), (18, feat, FEAT_H), (32, s_sh, 28 + 12 + 234), (32, s_cr, 28 + 12 + 106), (32, s_big, 28 + 12 + bh * 3 + 56)])
    H = tot + 28 + TABBAR_H
    return page('Gamerisen — 14 Videolar', 390, H, root(content + tabbar('play'), H), script()), H

def player():
    pl = ('<div style="position: relative; width: 390px; height: 273px; background: #000000;"><div style="position: absolute; left: 0; top: 54px; width: 390px; height: 219px;">%s'
          '<div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.55) 0%%, rgba(0,0,0,0.05) 30%%, rgba(0,0,0,0.05) 65%%, rgba(0,0,0,0.7) 100%%);"></div>'
          '<div style="position: absolute; top: 6px; left: 6px; right: 6px; display: flex; justify-content: space-between;"><a href="G-14-Videos.dc.html" aria-label="Küçült" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">%s</a><div style="display: flex;">%s%s</div></div>'
          '<div style="position: absolute; left: 50%%; top: 50%%; margin: -30px 0 0 -30px; display: flex;"><button aria-label="Duraklat" style="width: 60px; height: 60px; border-radius: 999px; %s display: flex; align-items: center; justify-content: center;">%s</button></div>'
          '<div style="position: absolute; left: 14px; right: 10px; bottom: 6px; display: flex; flex-direction: column;"><div style="display: flex; align-items: center; justify-content: space-between; height: 32px;"><span class="num" style="font-size: 12px; font-weight: 600; color: #FFFFFF;">4:12 / 18:40</span>%s</div>'
          '<div style="position: relative; height: 12px;"><span style="position: absolute; left: 0; right: 4px; top: 4px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.3);"></span><span style="position: absolute; left: 0; width: 44%%; top: 4px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.55);"></span>'
          '<span style="position: absolute; left: 0; width: 22%%; top: 4px; height: 4px; border-radius: 2px; background: #FFFFFF;"></span><span role="slider" aria-label="Video konumu" aria-valuenow="252" style="position: absolute; left: calc(22%% - 6px); top: 0; width: 12px; height: 12px; border-radius: 999px; background: #FFFFFF;"></span></div></div></div></div>') % (
        img('alanwake', 390, 219, 0, '48% center', 'Video karesi'), icon('chevd', 26, '#FFFFFF', 2.4), iconbtn('cc', 'Altyazı', 21, '#FFFFFF'), iconbtn('gear', 'Video ayarları', 21, '#FFFFFF'), DARKGLASS, icon('pause', 26, '#FFFFFF', 0, fill='#FFFFFF'), iconbtn('max', 'Tam ekran', 20, '#FFFFFF', size=36))
    info = ('<div style="padding: 0 20px; display: flex; flex-direction: column;">%s%s</div>') % (txt('Alan Wake 2 — Spoilersız İnceleme: Yılın en iyi korku oyunu mu?', 18, 24, 600, TX, 'c2', ' height: 48px;'), txt('215 B görüntülenme · 2 gün önce · #İnceleme', 13, 18, 400, T2, '', ' margin-top: 4px;'))
    crow = pad('<div style="display: flex; align-items: center; gap: 12px; height: 44px;">%s<div style="display: flex; flex-direction: column; flex: 1 1 auto;"><span style="display: flex; align-items: center; gap: 5px; font-size: 15px; font-weight: 600;">GameReviewTR%s</span><span style="font-size: 12px; color: %s;">184 B takipçi</span></div>%s</div>' % (
        avatar(None, 40, 'GR', AVC[3]), icon('checkc', 14, T2, 2.2), T2, follow_btn('cr', 36)))
    likeb = ('<button aria-label="Beğen" aria-pressed="[[l.v.on]]" class="[[l.v.cls]]" onClick="[[l.v.t]]" style="height: 36px; padding: 0 14px; border-radius: 999px; background: %s; display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: [[l.v.col]]; flex-shrink: 0;">'
             '<svg width="18" height="18" viewBox="0 0 24 24" fill="[[l.v.fill]]" stroke="[[l.v.stroke]]" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: block;">%s</svg><span class="num">12,4 B</span></button>') % (S2, IC['heart'])
    pill = lambda ic, t: '<button style="height: 36px; padding: 0 14px; border-radius: 999px; background: %s; display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; flex-shrink: 0;">%s%s</button>' % (S2, icon(ic, 17, TX, 2), t)
    acts = rail(likeb + pill('comment', '842') + pill('share', 'Paylaş') + pill('bookmark', 'Kaydet') + pill('video', 'Klip'), 8, 20, 36)
    gcard = ('<div style="margin: 0 20px; box-sizing: border-box; padding: 14px; border-radius: 18px; background: %s; display: flex; flex-direction: column; gap: 10px;"><span style="font-size: 12px; line-height: 16px; font-weight: 600; color: %s;">Bu video şu oyunla ilgili</span>'
             '<div style="display: flex; align-items: center; gap: 12px; height: 74px;">%s<div style="display: flex; flex-direction: column; flex: 1 1 auto; gap: 3px;"><span style="font-size: 16px; line-height: 21px; font-weight: 600;">Alan Wake 2</span><span style="font-size: 12px; line-height: 16px; color: %s;">Korku · Remedy Entertainment</span>'
             '<span style="display: flex; align-items: center; gap: 6px; height: 22px;">%s%s%s</span></div>%s</div></div>') % (
        S1, T2, img('alanwake', 56, 74, 10, '48% center'), T2, price('₺599', 16), disc('-%40', 11, 20), store('Epic', 11), btn('Oyunu Gör', 'tinted', 36, href='G-07-GameDetail.dc.html', extra=' padding: 0 12px;'))
    GC_H = 14 + 16 + 10 + 74 + 14
    com = ('<a href="G-13-PostDetail.dc.html" style="margin: 0 20px; height: 100px; box-sizing: border-box; padding: 14px; border-radius: 18px; background: %s; display: flex; flex-direction: column; gap: 10px;">'
           '<div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-size: 15px; font-weight: 600;">Yorumlar <span class="num" style="color: %s; font-weight: 500;">842</span></span>%s</div>'
           '<div style="display: flex; gap: 10px;">%s%s</div></a>') % (S1, T2, icon('chevd', 16, T2, 2.4), avatar(None, 28, 'S', AVC[4]), txt('Müzikli bölümün spoilersız anlatılması çok iyi olmuş. İncelemeye katılıyorum, ses tasarımı ayrı bir karakter gibi.', 14, 20, 400, TX, 'c2'))
    def upnext(k, t, meta, dur, pos='center'):
        return ('<a href="G-15-VideoPlayer.dc.html" style="display: flex; gap: 12px; height: 90px;"><div style="position: relative;">%s%s</div><div style="display: flex; flex-direction: column; min-width: 0; flex: 1 1 auto; gap: 4px;">%s%s</div></a>') % (
            img(k, 160, 90, 12, pos), ovl(dur, 'right: 6px; bottom: 6px;'), txt(t, 14, 19, 600, TX, 'c2'), txt(meta, 12, 16, 400, T2, 'c2'))
    hd, _ = sec_head('Sıradaki', right='<span style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: %s;">Otomatik oynat%s</span>' % (T2, static_toggle(True).replace('width: 51px; height: 31px', 'width: 40px; height: 24px').replace('width: 27px; height: 27px', 'width: 20px; height: 20px').replace('left: 22px', 'left: 18px')))
    nxt = ''.join([upnext('alanwake', 'Alan Wake 2: Tüm el yazması sayfaları nerede?', 'Level Up TR · 61 B görüntülenme', '22:05', '20% center'), upnext('exp33', 'Expedition 33 incelemesi: Yılın sürprizi mi?', 'GameReviewTR · 184 B görüntülenme', '14:32', '66% center'),
                   upnext('ghost', 'Ghost of Yōtei — Hikâye fragmanı (Türkçe altyazılı)', 'Gamerisen Fragman · 412 B görüntülenme', '2:48'), upnext('silksong', 'Silksong: Son boss’a kadar en iyi rota', 'PixelNur · 38 B görüntülenme', '27:40')])
    s_n = hd + pad('<div style="margin-top: 12px; display: flex; flex-direction: column; gap: 14px;">%s</div>' % nxt)
    content, tot = stack([(None, pl, 273), (16, info, 70), (14, crow, 44), (14, acts, 36), (18, gcard, GC_H), (12, com, 100), (24, s_n, 28 + 12 + 90 * 4 + 42)])
    H = tot + 40
    return page('Gamerisen — 15 Video Oynatıcı', 390, H, root(content, H), script("{ l: { v: this.like('l_v', 12400, false) }, f: { cr: this.follow('f_cr', false, t) } }")), H

def news_head(title, back='G-04-Home.dc.html', right=''):
    return ('<header style="padding: 54px 16px 0; height: 142px; box-sizing: border-box; flex-shrink: 0; display: flex; flex-direction: column;">'
            '<div style="display: flex; align-items: center; justify-content: space-between; height: 44px;"><a href="%s" aria-label="Geri" style="width: 44px; height: 44px; display: flex; align-items: center; margin-left: -6px;">%s</a><div style="display: flex; margin-right: -8px;">%s</div></div>'
            '<h1 style="margin: 6px 4px 0; font-family: %s; font-size: 28px; line-height: 34px; font-weight: 700; letter-spacing: -0.03em;">%s</h1></header>') % (back, icon('back', 24, TX, 2.3), right, FD, title)

def news():
    head = news_head('Oyun Haberleri', right=iconbtn('search', 'Haberlerde ara', 22, href='G-05-Search.dc.html') + iconbtn('bookmark', 'Kaydedilen haberler', 21))
    cats = [('gundem', 'Gündem'), ('pc', 'PC'), ('ps', 'PlayStation'), ('xbox', 'Xbox'), ('nin', 'Nintendo'), ('mob', 'Mobil'), ('esp', 'Espor'), ('ind', 'Indie')]
    chips = rail(''.join('<button aria-pressed="[[n.%s.on]]" onClick="[[n.%s.t]]" style="height: 34px; padding: 0 14px; border-radius: 999px; background: [[n.%s.bg]]; color: [[n.%s.col]]; font-size: 14px; font-weight: 600; flex-shrink: 0; white-space: nowrap; transition: background .15s, color .15s;">%s</button>' % (k, k, k, k, t) for k, t in cats), 8, 20, 34)
    lead = ('<a href="G-17-NewsDetail.dc.html" class="press" style="display: flex; flex-direction: column; padding: 0 20px;"><div style="position: relative;">%s'
            '<span style="position: absolute; top: 12px; left: 12px; height: 26px; padding: 0 9px; border-radius: 8px; display: flex; align-items: center; gap: 5px; background: %s; color: #FFFFFF; font-size: 12px; font-weight: 700;">%sSon dakika</span></div>'
            '<div style="display: flex; align-items: center; gap: 6px; height: 18px; margin-top: 14px; font-size: 13px;"><span style="font-weight: 600;">Gündem</span><span style="color: %s;">·</span>%s<span style="color: %s;">· Rockstar Games</span></div>%s%s</a>') % (
        img('gta', 350, 220, 20, '50% 62%', ''), BRAND, icon('zap', 13, '#FFFFFF', 2, fill='#FFFFFF'), T3, fresh('12 dk önce'), T3,
        txt('GTA VI’nın yeni fragmanı yayınlandı: Leonida’ya ilk yakın bakış', 22, 28, 700, TX, 'c3', ' margin-top: 8px; height: 84px; letter-spacing: -0.02em;', FD),
        txt('Fragmanda iki ana karakterin hikâyesine ve Vice City’nin gece hayatına dair ilk kez görülen sahneler yer alıyor.', 15, 21, 400, T2, 'c2', ' margin-top: 8px; height: 42px;'))
    LEAD_H = 220 + 14 + 18 + 8 + 84 + 8 + 42
    def med(k, cat, time, t, pos='center'):
        return ('<a href="G-17-NewsDetail.dc.html" class="press" style="display: flex; flex-direction: column;">%s<div style="display: flex; align-items: center; gap: 6px; height: 16px; margin-top: 10px; font-size: 12px;"><span style="font-weight: 600;">%s</span><span style="color: %s;">·</span>%s</div>%s</a>') % (
            img(k, 169, 112, 14, pos), cat, T3, fresh(time, False), txt(t, 15, 20, 600, TX, 'c3', ' margin-top: 4px; height: 60px;'))
    meds = '<div style="padding: 0 20px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">%s%s</div>' % (med('esports', 'Espor', '1 sa önce', "Espor Ligi TR'de yeni sezon fikstürü açıklandı"), med('cozy', 'Nintendo', '2 sa önce', 'Nintendo yeni Direct yayınını bu akşam yapacak'))
    live = '<span style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: %s;"><span class="live" style="width: 7px; height: 7px; border-radius: 999px; background: %s;"></span>Canlı akış</span>' % (RED, RED)
    hd, _ = sec_head('Son Gelişmeler', right=live)
    grp = lambda t: txt(t, 13, 20, 600, T3)
    today = [('ghost', 'PlayStation yeni oyunlarını duyurdu: sonbahar takvimi netleşti', 'PlayStation', '8 dk önce', True), ('split', "Steam Sonbahar İndirimi'nin tarihleri belli oldu", 'PC', '38 dk önce', True),
             ('forza', "Game Pass'e bu ay eklenecek 9 oyun açıklandı", 'Xbox', '3 sa önce', False), ('silksong', "Silksong'a ilk büyük ücretsiz güncelleme geliyor", 'Indie', '5 sa önce', False)]
    yday = [('stardew', "Popüler mobil RPG'ye Türkçe dil desteği geldi", 'Mobil', 'Dün 22.14', False), ('hogwarts', 'Hogwarts Legacy devam oyunu için ilk ipuçları', 'Gündem', 'Dün 18.40', False)]
    lst = pad('%s<div style="margin-top: 12px; display: flex; flex-direction: column; gap: 16px;">%s</div><div style="margin-top: 24px;">%s</div><div style="margin-top: 12px; display: flex; flex-direction: column; gap: 16px;">%s</div>' % (
        grp('Bugün'), ''.join(news_row(k, t, c_, tm, h_) for k, t, c_, tm, h_ in today), grp('Dün'), ''.join(news_row(k, t, c_, tm, h_) for k, t, c_, tm, h_ in yday)))
    LST_H = 20 + 12 + 4 * 72 + 3 * 16 + 24 + 20 + 12 + 2 * 72 + 16
    content, tot = stack([(None, head, 142), (6, chips, 34), (20, lead, LEAD_H), (24, meds, 202), (28, hd + '<div style="margin-top: 12px;">%s</div>' % lst, 28 + 12 + LST_H)])
    H = tot + 28 + TABBAR_H
    vals = '{ n: { ' + ', '.join("%s: this.one('cat', '%s', 'gundem', t)" % (k, k) for k, _ in cats) + ' } }'
    return page('Gamerisen — 16 Oyun Haberleri', 390, H, root(content + tabbar('home'), H), script(vals)), H

def news_detail():
    hero_ = ('<div style="position: relative; width: 390px; height: 300px;">%s<div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,10,11,0.5) 0%%, rgba(10,10,11,0) 30%%, rgba(10,10,11,0) 60%%, #0A0A0B 100%%);"></div>'
             '<div style="position: absolute; top: 54px; left: 16px; right: 16px; display: flex; justify-content: space-between;"><a href="G-16-News.dc.html" aria-label="Geri" style="width: 44px; height: 44px; border-radius: 999px; %s display: flex; align-items: center; justify-content: center;">%s</a>'
             '<div style="display: flex; gap: 10px;">%s%s</div></div></div>') % (img('gta', 390, 300, 0, '50% 62%', 'GTA VI fragmanından bir kare'), DARKGLASS, icon('back', 22, '#FFFFFF', 2.4), iconbtn('share', 'Paylaş', 20, '#FFFFFF', onart=True), iconbtn('bookmark', 'Kaydet', 20, '#FFFFFF', onart=True))
    meta = pad('<div style="display: flex; align-items: center; gap: 8px; height: 26px; font-size: 13px;"><span style="height: 26px; padding: 0 10px; border-radius: 8px; background: %s; display: inline-flex; align-items: center; font-weight: 600;">Gündem</span>%s<span style="color: %s;">· 4 dk okuma</span></div>' % (S2, fresh('12 dk önce'), T3))
    h1 = pad('<h1 style="margin: 0; font-family: %s; font-size: 26px; line-height: 32px; font-weight: 700; letter-spacing: -0.025em; height: 96px;">GTA VI’nın yeni fragmanı yayınlandı: Leonida’ya ilk yakın bakış</h1>' % FD)
    by = pad('<div style="display: flex; align-items: center; gap: 10px; height: 44px;">%s<div style="display: flex; flex-direction: column;"><span style="font-size: 14px; font-weight: 600;">Ayşe Demir</span><span style="font-size: 12px; color: %s;">Gamerisen Haber · Kaynak: Rockstar Games</span></div></div>' % (avatar(None, 36, 'AD', AVC[2]), T2))
    P = lambda t, lines: txt(t, 17, 27, 400, '#E5E5EA', '', '')
    body = pad('<div style="display: flex; flex-direction: column;">%s<h2 style="margin: 22px 0 0; font-family: %s; font-size: 20px; line-height: 26px; font-weight: 700;">Çıkış tarihi değişmedi</h2><div style="margin-top: 10px;">%s</div>'
               '<figure style="margin: 20px 0 0;">%s<figcaption style="margin-top: 8px; font-size: 12px; line-height: 16px; color: %s;">Fragmandan: Vice City’nin sahil şeridi. Görsel: Rockstar Games</figcaption></figure><div style="margin-top: 18px;">%s</div></div>' % (
        P('Rockstar Games, merakla beklenen Grand Theft Auto VI için yeni bir fragman yayınladı. İki buçuk dakikalık videoda Jason ve Lucia’nın hikâyesine dair yeni sahneler, Vice City’nin neon ışıklı gece hayatı ve Leonida’nın bataklıklarla çevrili kırsalı ilk kez bu kadar yakından görülüyor.', 7), FD,
        P('Stüdyo, oyunun 19 Kasım 2026’da PlayStation 5 ve Xbox Series X|S için çıkacağını bir kez daha doğruladı. PC sürümüne dair ise henüz bir açıklama yapılmadı.', 4),
        img('gta', 350, 196, 14, '70% 80%', 'Fragmandan sahil şeridi görüntüsü'), T3,
        P('Gamerisen topluluğunda #GTA6 etiketi şimdiden 12,4 bin gönderiye ulaştı. Oyuncular en çok haritanın büyüklüğünü ve yeni sosyal medya sistemini konuşuyor.', 4)))
    BODY_H = 8 * 27 + 22 + 26 + 10 + 5 * 27 + 20 + 196 + 8 + 16 + 18 + 5 * 27
    rel = ('<div style="margin: 0 20px; box-sizing: border-box; padding: 14px; border-radius: 18px; background: %s; display: flex; flex-direction: column; gap: 10px;"><span style="font-size: 12px; line-height: 16px; font-weight: 600; color: %s;">Bu haberle ilgili</span>'
           '<div style="display: flex; align-items: center; gap: 12px; height: 74px;"><a href="G-07-GameDetail.dc.html" style="display: flex; align-items: center; gap: 12px; flex: 1 1 auto; min-width: 0;">%s<div style="display: flex; flex-direction: column; gap: 3px; min-width: 0;"><span style="font-size: 16px; line-height: 21px; font-weight: 600;">Grand Theft Auto VI</span>'
           '<span class="c2" style="font-size: 12px; line-height: 16px; color: %s;">Çıkış: 19 Kasım 2026 · PS5, Xbox Series X|S</span></div></a>%s</div></div>') % (S1, T2, img('gta', 56, 74, 10, '55% 70%'), T2, btn('Listeye ekle', 'secondary', 36, icon_='heart', extra=' padding: 0 12px; font-size: 13px;'))
    hd, _ = sec_head('Topluluk Tepkileri', 'Tartışmaya git', 'G-10-Community.dc.html')
    rx = ''.join('<span style="height: 32px; padding: 0 12px; border-radius: 999px; background: %s; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;">%s<span class="num">%s</span></span>' % (S1, icon(i, 15, c_, 2, fill=f), n) for i, c_, f, n in [('heart', RED, RED, '1,2 B'), ('comment', TX, 'none', '318'), ('share', TX, 'none', '96')])
    c1, a = comment(avatar(None, 36, 'B', AVC[3]), 'burak_cs', '8 dk', 'Gece sahnelerindeki ışıklandırma inanılmaz. Kasım gelsin artık.', 2, '142')
    c2, b = comment(avatar(None, 36, 'Z', AVC[2]), 'zeyneponline', '5 dk', 'PC sürümü için hâlâ açıklama yok mu? Beklemek zor olacak.', 2, '88')
    s_rx = hd + pad('<div style="margin-top: 12px; display: flex; gap: 8px;">%s</div><div style="margin-top: 16px; display: flex; flex-direction: column; gap: 16px;">%s%s</div>' % (rx, c1, c2))
    hd2, _ = sec_head('İlgili Haberler')
    s_rel = hd2 + pad('<div style="margin-top: 12px; display: flex; flex-direction: column; gap: 14px;">%s%s%s</div>' % (
        news_row('gta', 'GTA VI’nın haritası ne kadar büyük? Bilinen her şey', 'Gündem', 'Dün', pos='20% 50%'), news_row('rdr2', 'Rockstar’ın açık dünya tasarımı: RDR2’den GTA VI’ya', 'Analiz', '2 gün önce', pos='70% center'),
        news_row('ghost', 'PlayStation sonbahar takvimi netleşti', 'PlayStation', '8 dk önce', True)))
    content, tot = stack([(None, hero_, 300), (4, meta, 26), (10, h1, 96), (14, by, 44), (18, body, BODY_H), (24, rel, 14 + 16 + 10 + 74 + 14), (28, s_rx, 28 + 12 + 32 + 16 + a + 16 + b), (28, s_rel, 28 + 12 + 72 * 3 + 28)])
    H = tot + 40
    return page('Gamerisen — 17 Haber Detayı', 390, H, root(content, H), script()), H

if __name__ == '__main__':
    for n, f in [('G-11-GameCommunity', game_community), ('G-12-CreatePost', create_post), ('G-13-PostDetail', post_detail), ('G-14-Videos', videos), ('G-15-VideoPlayer', player), ('G-16-News', news), ('G-17-NewsDetail', news_detail)]:
        h, H = f(); open('root/project/%s.dc.html' % n, 'w').write(h); print(n, H, len(h))
