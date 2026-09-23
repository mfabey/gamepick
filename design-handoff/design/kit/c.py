from k import *
GD = 'G-07-GameDetail.dc.html'

def heart(key, top=10, right=10, size=36, s=18, pos=True):
    p = 'position: absolute; top: %dpx; right: %dpx; z-index: 2;' % (top, right) if pos else ''
    return ('<button aria-label="[[w.%s.label]]" aria-pressed="[[w.%s.on]]" class="[[w.%s.cls]]" onClick="[[w.%s.t]]" style="%s width: %dpx; height: %dpx; border-radius: 999px; %s display: flex; align-items: center; justify-content: center; flex-shrink: 0;">'
            '<svg width="%d" height="%d" viewBox="0 0 24 24" fill="[[w.%s.fill]]" stroke="[[w.%s.stroke]]" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: block;">%s</svg></button>') % (
        key, key, key, key, p, size, size, DARKGLASS, s, s, key, key, IC['heart'])

def game_s(k, title, p, dsc=None, w=106, ch=142, pos='center', href=GD, sub=None):
    d = disc(dsc, 11, 20) if dsc else ''
    line = sub if sub else '%s%s' % (price(p, 14), d)
    return ('<a href="%s" class="press" style="display: flex; flex-direction: column; width: %dpx; flex-shrink: 0;">%s%s'
            '<div style="display: flex; align-items: center; gap: 6px; height: 20px; margin-top: 2px;">%s</div></a>') % (
        href, w, img(k, w, ch, 14, pos, '%s kapak görseli' % title), txt(title, 14, 18, 600, TX, 'c1', ' margin-top: 8px;'), line)
GS_H = lambda ch=142: ch + 8 + 18 + 2 + 20

def game_m(k, title, genre, rating, p, oldp, dsc, st, key, w=148, ch=198, pos='center', href=GD):
    s = '<div style="position: relative; width: %dpx; flex-shrink: 0;"><a href="%s" class="press" style="display: flex; flex-direction: column;">' % (w, href)
    s += '<div style="position: relative;">%s%s</div>' % (img(k, w, ch, 14, pos, '%s kapak görseli' % title), '<div style="position: absolute; left: 8px; bottom: 8px; display: flex;">%s</div>' % disc(dsc) if dsc else '')
    s += txt(title, 15, 20, 600, TX, 'c1', ' margin-top: 8px;')
    s += '<div style="display: flex; align-items: center; gap: 5px; height: 16px; margin-top: 2px; font-size: 12px; color: %s;"><span>%s</span><span aria-hidden="true">·</span>%s<span class="num">%s</span></div>' % (T2, genre, star(11), rating)
    s += '<div style="display: flex; align-items: center; gap: 6px; height: 22px; margin-top: 6px;">%s%s<span style="flex: 1 1 auto;"></span>%s</div>' % (price(p, 16), old(oldp, 12) if oldp else '', mono(st, 16))
    return s + '</a>%s</div>' % heart(key, 8, 8, 34, 17)
GM_H = lambda ch=198: ch + 8 + 20 + 2 + 16 + 6 + 22

def hero(k, reason, title, meta, p, oldp, dsc, st, key, w=334, h=420, pos='center'):
    return ('<div style="position: relative; width: %dpx; height: %dpx; border-radius: 22px; overflow: hidden; flex-shrink: 0;">'
            '<a href="%s" aria-label="%s oyununu incele" style="position: absolute; inset: 0; display: block;">%s'
            '<span style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.28) 0%%, rgba(0,0,0,0) 22%%, rgba(0,0,0,0) 42%%, rgba(0,0,0,0.78) 74%%, rgba(0,0,0,0.9) 100%%);"></span></a>'
            '<span style="position: absolute; top: 14px; left: 14px; height: 28px; padding: 0 10px; border-radius: 8px; display: flex; align-items: center; gap: 6px; %s font-size: 12px; font-weight: 600; color: #FFFFFF;">%s%s</span>'
            '<div style="position: absolute; left: 18px; right: 18px; bottom: 18px; display: flex; flex-direction: column;">'
            '<h3 style="margin: 0; font-family: %s; font-size: 28px; line-height: 32px; font-weight: 700; letter-spacing: -0.03em; color: #FFFFFF;">%s</h3>'
            '<div style="font-size: 13px; line-height: 18px; color: %s; margin-top: 4px; display: flex; align-items: center; gap: 5px;">%s</div>'
            '<div style="display: flex; align-items: center; gap: 8px; height: 28px; margin-top: 12px;">%s%s%s<span style="font-size: 12px; color: %s; margin-left: 2px;">%s</span></div>'
            '<div style="display: flex; gap: 10px; margin-top: 14px;">%s%s</div></div></div>') % (
        w, h, GD, title, img(k, w, h, 0, pos, '%s görseli' % title), DARKGLASS, icon('spark', 13, '#FFFFFF', 2), reason, FD, title, ONART, meta,
        price(p, 22, col='#FFFFFF'), old(oldp, 14) if oldp else '', disc(dsc, 13, 24) if dsc else '', ONART, st, btn('İncele', 'primary', 44, href=GD, flex=True), heart(key, pos=False, size=44, s=20))

def drop_card(k, title, oldp, p, dsc, st, note, w=264, ih=132, pos='center'):
    return ('<a href="%s" class="press" style="display: flex; flex-direction: column; width: %dpx; border-radius: 16px; background: %s; overflow: hidden; flex-shrink: 0;">'
            '<div style="position: relative;">%s<div style="position: absolute; left: 10px; top: 10px; display: flex;">%s</div></div>'
            '<div style="padding: 12px; display: flex; flex-direction: column;">%s'
            '<div style="display: flex; align-items: center; gap: 8px; height: 24px; margin-top: 6px;">%s%s%s<span style="flex: 1 1 auto;"></span>%s</div>'
            '<div style="margin-top: 6px; display: flex;">%s</div></div></a>') % (
        GD, w, S1, img(k, w, ih, 0, pos, '%s görseli' % title), disc(dsc), txt(title, 15, 20, 600, TX, 'c1'), old(oldp), icon('chev', 12, T3, 2.4), price(p, 18), store(st), drop(note))
DROP_H = lambda ih=132: ih + 12 + 20 + 6 + 24 + 6 + 16 + 12

def deal_card(k, title, low, normal, dsc, st, w=300, pos='center', href='G-08-Prices.dc.html'):
    notch = '<span style="position: absolute; top: -9px; width: 18px; height: 18px; border-radius: 999px; background: %s; %s"></span>'
    return ('<div style="position: relative; width: %dpx; box-sizing: border-box; border-radius: 20px; background: %s; flex-shrink: 0; display: flex; flex-direction: column;">'
            '<a href="%s" style="display: flex; gap: 12px; padding: 16px 16px 14px;">%s<div style="display: flex; flex-direction: column; min-width: 0; flex: 1 1 auto;">%s<div style="margin-top: 6px; display: flex;">%s</div>'
            '<div style="margin-top: auto; display: flex;">%s</div></div></a>'
            '<div style="position: relative; height: 1px; margin: 0 16px; border-top: 1.5px dashed rgba(255,255,255,0.14);">%s%s</div>'
            '<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 14px 16px 0;">'
            '<div style="display: flex; flex-direction: column;"><span style="font-size: 12px; line-height: 16px; color: %s;">En düşük fiyat</span>%s</div>'
            '<div style="display: flex; flex-direction: column;"><span style="font-size: 12px; line-height: 16px; color: %s;">Normal fiyat</span><span style="height: 36px; display: flex; align-items: center;">%s</span></div></div>'
            '<div style="padding: 12px 16px 16px;">%s</div></div>') % (
        w, S1, GD, img(k, 64, 84, 12, pos, '%s kapak görseli' % title), txt(title, 16, 21, 600, TX, 'c2'), store(st), disc(dsc, 14, 26),
        notch % (BG, 'left: -26px;'), notch % (BG, 'right: -26px;'), T2, '<span style="height: 36px; display: flex; align-items: center;">%s</span>' % price(low, 28), T2, old(normal, 17),
        btn('Mağazaları Karşılaştır', 'secondary', 44, href=href, extra=' width: 100%;'))
DEAL_H = 16 + 84 + 14 + 1 + 14 + 16 + 36 + 12 + 44 + 16

def friend(av, name, game, st, playing=True, href=GD):
    stt = '<span style="display: inline-flex; align-items: center; gap: 4px; color: %s; font-weight: 600;"><span style="width: 6px; height: 6px; border-radius: 999px; background: %s;"></span>%s</span>' % (GREEN, GREEN, st) if playing else '<span style="color: %s;">%s</span>' % (T3, st)
    return ('<a href="%s" class="press" style="width: 96px; display: flex; flex-direction: column; align-items: center; flex-shrink: 0; text-align: center;">%s%s%s'
            '<div style="font-size: 11px; line-height: 14px; margin-top: 2px; white-space: nowrap;">%s</div></a>') % (
        href, av, txt(name, 13, 18, 600, TX, 'c1', ' margin-top: 10px; width: 96px;'), txt(game, 12, 16, 400, T2, 'c1', ' width: 96px;'), stt)
FR_H = 56 + 10 + 18 + 16 + 2 + 14

def trend_card(rows, href='G-10-Community.dc.html'):
    s = '<div style="padding: 4px 0; border-radius: 18px; background: %s;">' % S1
    for i, (tg, n, meta, delta, hot) in enumerate(rows):
        sep = '<span style="position: absolute; top: 0; left: 56px; right: 0; height: 0.5px; background: %s;"></span>' % LINE if i else ''
        ind = ('<span style="display: inline-flex; align-items: center; gap: 3px; height: 22px; padding: 0 7px; border-radius: 6px; background: %s; color: %s; font-size: 11px; font-weight: 700;">%s%s</span>' % (ORANGET, ORANGE, icon('flame', 11, ORANGE, 2.2), delta)) if hot else drop(delta, 12, T2, 'up')
        s += ('<a href="%s" style="position: relative; display: flex; align-items: center; gap: 12px; height: 60px; padding: 0 14px 0 16px;">%s'
              '<span style="width: 28px; height: 28px; border-radius: 8px; background: %s; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">%s</span>'
              '<div style="display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0;"><span style="font-size: 16px; line-height: 21px; font-weight: 600;">%s</span><span class="c1" style="font-size: 12px; line-height: 16px; color: %s;">%s · %s</span></div>%s</a>') % (
            href, sep, S2, icon('hash', 15, T2, 2.2), tg, T2, n, meta, ind)
    return s + '</div>', 8 + 60 * len(rows)

def actions(key, likes_base, comments, dflt_like=False, dflt_bm=False):
    s = '<div style="display: flex; align-items: center; height: 40px; margin-left: -10px;">'
    s += ('<button aria-label="Beğen" aria-pressed="[[l.%s.on]]" class="[[l.%s.cls]]" onClick="[[l.%s.t]]" style="display: flex; align-items: center; gap: 6px; height: 40px; min-width: 44px; padding: 0 10px; font-size: 13px; font-weight: 500; color: [[l.%s.col]];">'
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="[[l.%s.fill]]" stroke="[[l.%s.stroke]]" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: block;">%s</svg><span class="num">[[l.%s.n]]</span></button>') % (key, key, key, key, key, key, IC['heart'], key)
    s += '<a href="G-13-PostDetail.dc.html" aria-label="Yorumlar" style="display: flex; align-items: center; gap: 6px; height: 40px; min-width: 44px; padding: 0 10px; color: %s; font-size: 13px; font-weight: 500;">%s<span class="num">%s</span></a>' % (T2, icon('comment', 20, T2), comments)
    s += '<button aria-label="Paylaş" style="display: flex; align-items: center; height: 40px; min-width: 44px; padding: 0 10px;">%s</button>' % icon('share', 20, T2)
    s += '<span style="flex: 1 1 auto;"></span>'
    s += ('<button aria-label="[[b.%s.label]]" aria-pressed="[[b.%s.on]]" class="[[b.%s.cls]]" onClick="[[b.%s.t]]" style="width: 44px; height: 40px; display: flex; align-items: center; justify-content: flex-end;">'
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="[[b.%s.fill]]" stroke="[[b.%s.stroke]]" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: block;">%s</svg></button>') % (key, key, key, key, key, key, IC['bookmark'])
    return s + '</div>'

def post_head(av, name, handle, time, bdg='', more=True):
    m = iconbtn('more', 'Gönderi seçenekleri', 20, T3, size=40, extra=' margin-right: -10px;') if more else ''
    return ('<div style="display: flex; align-items: center; gap: 12px; height: 40px;">%s<div style="display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0;">'
            '<div style="display: flex; align-items: center; gap: 6px; height: 20px;"><span style="font-size: 15px; font-weight: 600; white-space: nowrap;">%s</span>%s<span style="font-size: 13px; color: %s; white-space: nowrap;">· %s</span></div>'
            '<div style="font-size: 13px; line-height: 18px; color: %s;">%s</div></div>%s</div>') % (av, name, bdg, T3, time, T3, handle, m)

def game_tag(k, title, st=None, href=GD):
    return ('<div style="display: flex; align-items: center; gap: 8px; height: 32px;"><a href="%s" style="display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 12px 0 4px; border-radius: 10px; background: %s; font-size: 13px; font-weight: 600;">%s%s%s</a>%s</div>') % (
        href, S1, img(k, 24, 24, 7), title, icon('chev', 13, T3, 2.4), status(st) if st else '')

def post(head, text, lines, key, likes, comments, media=None, media_h=0, game=None, w=350, dl=False, db=False, extra_after_text='', eh=0):
    body = txt(text, 15, 22, 400, TX, 'c%d' % lines, ' height: %dpx;' % (lines * 22)) if lines else ''
    h = 40 + 10 + lines * 22
    if extra_after_text: body += extra_after_text; h += eh
    if media: body += '<div style="margin-top: 12px;">%s</div>' % media; h += 12 + media_h
    if game: body += '<div style="margin-top: 10px;">%s</div>' % game_tag(*game); h += 10 + 32
    body += '<div style="margin-top: 6px;">%s</div>' % actions(key, likes, comments, dl, db); h += 6 + 40
    return '<article style="width: %dpx; height: %dpx; display: flex; flex-direction: column;">%s<div style="padding-left: 52px; margin-top: 10px; display: flex; flex-direction: column;">%s</div></article>' % (w, h, head, body), h

def media_img(k, w, h, pos='center', tag=None, r=14):
    t = '<span style="position: absolute; top: 10px; left: 10px; height: 24px; padding: 0 8px; border-radius: 7px; display: flex; align-items: center; gap: 5px; %s font-size: 12px; font-weight: 600; color: #FFFFFF;">%s</span>' % (DARKGLASS, tag) if tag else ''
    return '<a href="G-13-PostDetail.dc.html" style="position: relative; display: block; width: %dpx; height: %dpx;">%s%s</a>' % (w, h, img(k, w, h, r, pos, 'Paylaşılan ekran görüntüsü'), t)

def ovl(t, pos='top: 10px; left: 10px;', ic=None):
    i = icon(ic, 12, '#FFFFFF', 2.2) if ic else ''
    return '<span style="position: absolute; %s height: 22px; padding: 0 7px; border-radius: 6px; display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.62); font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0;">%s%s</span>' % (pos, i, t)
def playc(s=48):
    return ('<span style="position: absolute; left: 50%%; top: 50%%; width: %dpx; height: %dpx; margin: -%dpx 0 0 -%dpx; border-radius: 999px; ' % (s, s, s // 2, s // 2)) + DARKGLASS + (' display: flex; align-items: center; justify-content: center;">%s</span>' % icon('playf', int(s * .4), '#FFFFFF', 0, fill='#FFFFFF', style=' margin-left: 2px;'))

def news_feat(k, headline, cat, time, src, desc=None, w=350, ih=196, hot=True, lines=2, fs=18, lh=24, href='G-17-NewsDetail.dc.html', pos='center'):
    s = '<a href="%s" class="press" style="display: flex; flex-direction: column; width: %dpx;">' % (href, w)
    s += '<div style="position: relative;">%s</div>' % img(k, w, ih, 18, pos, '')
    s += '<div style="display: flex; align-items: center; gap: 6px; height: 16px; margin-top: 12px; font-size: 12px;"><span style="font-weight: 600; color: %s;">%s</span><span style="color: %s;">·</span>%s<span style="color: %s;">· %s</span></div>' % (TX, cat, T3, fresh(time, hot), T3, src)
    s += txt(headline, fs, lh, 700, TX, 'c%d' % lines, ' margin-top: 6px; height: %dpx; letter-spacing: -0.015em;' % (lines * lh), FD)
    h = ih + 12 + 16 + 6 + lines * lh
    if desc:
        s += txt(desc, 14, 20, 400, T2, 'c2', ' margin-top: 6px; height: 40px;'); h += 46
    return s + '</a>', h

def news_row(k, headline, cat, time, hot=False, src=None, href='G-17-NewsDetail.dc.html', pos='center'):
    meta = '<span style="color: %s; font-weight: 600;">%s</span><span style="color: %s;">·</span>%s' % (TX, cat, T3, fresh(time, hot))
    if src: meta += '<span style="color: %s;">· %s</span>' % (T3, src)
    return ('<a href="%s" class="press" style="display: flex; gap: 14px; height: 72px;">%s<div style="display: flex; flex-direction: column; min-width: 0; flex: 1 1 auto;">'
            '<div style="display: flex; align-items: center; gap: 6px; height: 16px; font-size: 12px; white-space: nowrap;">%s</div>%s</div></a>') % (
        href, img(k, 96, 72, 12, pos, ''), meta, txt(headline, 15, 20, 600, TX, 'c2', ' margin-top: 6px; height: 40px;'))

def video(k, title, creator, meta, dur, typ=None, gk=None, gt=None, w=280, th=158, pos='center', href='G-15-VideoPlayer.dc.html', av=None):
    s = '<a href="%s" class="press" style="display: flex; flex-direction: column; width: %dpx; flex-shrink: 0;">' % (href, w)
    s += '<div style="position: relative;">%s%s%s%s</div>' % (img(k, w, th, 16, pos, ''), ovl(typ) if typ else '', ovl(dur, 'right: 10px; bottom: 10px;'), playc(44))
    info = txt(title, 15, 20, 600, TX, 'c2', ' height: 40px;') + txt('%s · %s' % (creator, meta), 13, 18, 400, T2, 'c1', ' margin-top: 4px;')
    if av: s += '<div style="display: flex; gap: 10px; margin-top: 10px;">%s<div style="display: flex; flex-direction: column; min-width: 0; flex: 1 1 auto;">%s</div></div>' % (av, info)
    else: s += '<div style="margin-top: 10px; display: flex; flex-direction: column;">%s</div>' % info
    h = th + 10 + 40 + 4 + 18
    if gk:
        s += '<div style="display: flex; margin-top: 8px;"><span style="display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px 0 3px; border-radius: 7px; background: %s; font-size: 12px; font-weight: 600; color: %s; white-space: nowrap;">%s%s</span></div>' % (S1, T2, img(gk, 18, 18, 5), gt); h += 32
    return s + '</a>', h

def short(k, title, views, w=132, h=234, pos='center'):
    return ('<a href="G-15-VideoPlayer.dc.html" class="press" style="position: relative; display: block; width: %dpx; height: %dpx; border-radius: 16px; overflow: hidden; flex-shrink: 0;">%s'
            '<span style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 45%%, rgba(0,0,0,0.85) 100%%);"></span>'
            '<span style="position: absolute; left: 10px; right: 10px; bottom: 10px; display: flex; flex-direction: column;">%s<span style="display: flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 12px; font-weight: 600; color: %s;">%s%s</span></span></a>') % (
        w, h, img(k, w, h, 16, pos), txt(title, 13, 17, 600, '#FFFFFF', 'c2', ' height: 34px;'), ONART, icon('playf', 11, ONART, 0, fill=ONART), views)

def follow_btn(key, h=34):
    return ('<button aria-pressed="[[f.%s.on]]" class="[[f.%s.cls]]" onClick="[[f.%s.t]]" style="height: %dpx; padding: 0 14px; border-radius: 10px; background: [[f.%s.bg]]; color: [[f.%s.col]]; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 5px; white-space: nowrap; flex-shrink: 0; transition: background .2s, color .2s;">'
            '<sc-if value="[[f.%s.on]]" hint-placeholder-val="[[false]]">%s</sc-if>[[f.%s.label]]</button>') % (key, key, key, h, key, key, key, icon('check', 14, T2, 2.6), key)

def user_row(av, name, handle, meta, key=None, href='G-21-Profile.dc.html', right=None):
    r = right if right is not None else (follow_btn(key) if key else '')
    return ('<div style="display: flex; align-items: center; gap: 12px; height: 60px;"><a href="%s" style="display: flex; align-items: center; gap: 12px; flex: 1 1 auto; min-width: 0;">%s'
            '<div style="display: flex; flex-direction: column; min-width: 0;"><span style="font-size: 15px; line-height: 20px; font-weight: 600;">%s</span><span class="c1" style="font-size: 13px; line-height: 18px; color: %s;">%s · %s</span></div></a>%s</div>') % (href, av, name, T2, handle, meta, r)

def comm_row(k, name, meta, right='', href='G-11-GameCommunity.dc.html', pos='center'):
    return ('<div style="display: flex; align-items: center; gap: 12px; height: 60px;"><a href="%s" style="display: flex; align-items: center; gap: 12px; flex: 1 1 auto; min-width: 0;">%s<div style="display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0;">'
            '<span style="font-size: 15px; line-height: 20px; font-weight: 600;">%s</span><span class="c1" style="font-size: 13px; line-height: 18px; color: %s;">%s</span></div></a>%s</div>') % (href, img(k, 44, 44, 12, pos), name, T2, meta, right)

def msg_row(av, name, prev, time, unread=0, read=None, href='G-19-Chat.dc.html'):
    right = count(unread) if unread else ('<span aria-label="Okundu" style="display: flex;">%s</span>' % icon('check', 15, T2 if read == 2 else T3, 2.4) if read else '')
    return ('<a href="%s" style="display: flex; align-items: center; gap: 12px; height: 72px; padding: 0 20px;">%s<div style="display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0;">'
            '<div style="display: flex; align-items: center; gap: 8px; height: 20px;"><span class="c1" style="flex: 1 1 auto; font-size: 16px; font-weight: %d;">%s</span><span class="num" style="font-size: 12px; color: %s; font-weight: %d;">%s</span></div>'
            '<div style="display: flex; align-items: center; gap: 8px; height: 20px; margin-top: 4px;"><span style="flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 5px; font-size: 14px; color: %s; overflow: hidden; white-space: nowrap;">%s</span>%s</div></div></a>') % (
        href, av, 700 if unread else 600, name, AC if unread else T3, 600 if unread else 400, time, TX if unread else T2, prev, right)

def notif(lead, text, time, unread=False, action='', thumb=None, h=76, href='#'):
    bg = 'background: rgba(255,255,255,0.04);' if unread else ''
    dot = '<span aria-label="Okunmadı" style="position: absolute; left: 8px; top: 50%%; margin-top: -4px; width: 8px; height: 8px; border-radius: 999px; background: %s;"></span>' % AC if unread else ''
    th = '<a href="%s" aria-hidden="true" tabindex="-1" style="display: flex;">%s</a>' % (href, img(thumb, 44, 44, 10)) if thumb else ''
    return ('<div style="position: relative; display: flex; align-items: center; gap: 12px; min-height: %dpx; padding: 12px 20px 12px 22px; box-sizing: border-box; %s">%s%s'
            '<div style="display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0;"><a href="%s" style="display: flex; flex-direction: column; gap: 2px;"><span class="c2" style="font-size: 14px; line-height: 20px;">%s</span><span style="font-size: 12px; line-height: 16px; color: %s;">%s</span></a>%s</div>%s</div>') % (
        h, bg, dot, lead, href, text, T3, time, action, th)

def nlead(kind, k=None, av=None):
    if av: return av
    ic, col, bg = {'price': ('down', GREEN, GREENT), 'like': ('heart', RED, REDT), 'news': ('news', TX, S2), 'comm': ('comment', TX, S2), 'friend': ('pad', TX, S2), 'follow': ('userplus', TX, S2), 'cal': ('calendar', ORANGE, ORANGET)}[kind]
    if k:
        return '<div style="position: relative; width: 44px; height: 44px; flex-shrink: 0;">%s<span style="position: absolute; right: -4px; bottom: -4px; width: 22px; height: 22px; border-radius: 999px; background: %s; box-shadow: 0 0 0 2.5px %s; display: flex; align-items: center; justify-content: center;">%s</span></div>' % (img(k, 44, 44, 12), col if kind == 'price' else S2, BG, icon(ic, 12, '#00210B' if kind == 'price' else col, 2.6))
    return '<span style="width: 44px; height: 44px; border-radius: 999px; background: %s; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">%s</span>' % (bg, icon(ic, 20, col, 2))

def comment(av, name, time, text, lines, likes, reply=False, bdg='', key=None, op=False):
    ind = 'padding-left: 52px;' if reply else ''
    h = 20 + 4 + lines * 21 + 6 + 28
    opb = '<span style="height: 18px; padding: 0 6px; border-radius: 5px; background: rgba(255,255,255,0.12); font-size: 11px; font-weight: 700; display: inline-flex; align-items: center;">Yazar</span>' if op else ''
    return ('<div style="display: flex; gap: 10px; %s height: %dpx;">%s<div style="display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0;">'
            '<div style="display: flex; align-items: center; gap: 6px; height: 20px;"><span style="font-size: 14px; font-weight: 600;">%s</span>%s%s<span style="font-size: 12px; color: %s;">· %s</span></div>'
            '%s<div style="display: flex; align-items: center; gap: 18px; height: 28px; margin-top: 6px; font-size: 13px; font-weight: 600; color: %s;">'
            '<button style="display: inline-flex; align-items: center; gap: 5px; height: 28px;">%s<span class="num">%s</span></button><button style="height: 28px;">Yanıtla</button></div></div></div>') % (
        ind, h, av, name, bdg, opb, T3, time, txt(text, 15, 21, 400, TX, 'c%d' % lines, ' margin-top: 4px; height: %dpx;' % (lines * 21)), T2, icon('heart', 15, T2), likes), h

def stat(v, l, ic=None):
    i = icon(ic, 18, T2, 2) if ic else ''
    return '<div style="display: flex; flex-direction: column; gap: 2px; padding: 12px; border-radius: 14px; background: %s; height: 84px; box-sizing: border-box;">%s<span class="num" style="font-size: 18px; line-height: 24px; font-weight: 700; margin-top: %dpx;">%s</span><span style="font-size: 12px; line-height: 16px; color: %s;">%s</span></div>' % (S1, i, 4 if ic else 20, v, T2, l)

def store_row(st, name, sub, p, right='', sep=True, h=64, href='#'):
    line = '<span style="position: absolute; top: 0; left: 68px; right: 0; height: 0.5px; background: %s;"></span>' % LINE if sep else ''
    return ('<a href="%s" style="position: relative; display: flex; align-items: center; gap: 12px; height: %dpx; padding: 0 14px 0 16px;">%s%s'
            '<div style="display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0;"><span style="font-size: 15px; line-height: 20px; font-weight: 600;">%s</span><span class="c1" style="font-size: 12px; line-height: 16px; color: %s;">%s</span></div>'
            '<div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">%s%s</div>%s</a>') % (href, h, line, mono(st, 40, 16, 11), name, T2, sub, price(p, 16), right, icon('chev', 16, T3, 2.4))

def row_item(label, value=None, ic=None, chev=True, right=None, sep=True, danger=False, h=52, href='#', icbg=None):
    line = '<span style="position: absolute; top: 0; left: %dpx; right: 0; height: 0.5px; background: %s;"></span>' % (60 if ic else 16, LINE) if sep else ''
    i = '<span style="width: 30px; height: 30px; border-radius: 8px; background: %s; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">%s</span>' % (icbg or S2, icon(ic, 17, TX, 2)) if ic else ''
    v = '<span style="font-size: 15px; color: %s; white-space: nowrap;">%s</span>' % (T2, value) if value else ''
    r = right if right is not None else (icon('chev', 16, T3, 2.4) if chev else '')
    tag = 'a href="%s"' % href if right is None or 'role="switch"' not in right else 'div'
    close = 'a' if tag.startswith('a') else 'div'
    return ('<%s style="position: relative; display: flex; align-items: center; gap: 14px; height: %dpx; padding: 0 16px;">%s%s<span style="flex: 1 1 auto; font-size: 16px; color: %s;">%s</span>%s%s</%s>') % (
        tag, h, line, i, RED if danger else TX, label, v, r, close)
def group(rows, title=None, foot=None):
    s = ''
    h = 0
    if title: s += '<div style="padding: 0 36px; font-size: 13px; line-height: 18px; font-weight: 600; color: %s; margin-bottom: 8px;">%s</div>' % (T2, title); h += 26
    s += '<div style="margin: 0 20px; border-radius: 16px; background: %s; overflow: hidden;">%s</div>' % (S1, ''.join(r for r, _ in rows)); h += sum(x for _, x in rows)
    if foot: s += '<div style="padding: 0 36px; margin-top: 8px; font-size: 12px; line-height: 16px; color: %s;">%s</div>' % (T3, foot); h += 24
    return s, h

def chart(vals, w=318, h=120, lo=400, hi=1300, low_idx=None, now_label=True):
    n = len(vals); xs = [round(i * w / n, 1) for i in range(n + 1)]
    ys = [round(8 + (hi - v) / (hi - lo) * (h - 16), 1) for v in vals]
    d = 'M%s %s' % (xs[0], ys[0])
    for i in range(1, n): d += ' H%s V%s' % (xs[i], ys[i])
    d += ' H%s' % w
    area = d + ' V%s H0 Z' % h
    grid = ''.join('<path d="M0 %s H%s" stroke="rgba(255,255,255,0.07)" stroke-width="1" stroke-dasharray="3 5"></path>' % (round(8 + (hi - g) / (hi - lo) * (h - 16), 1), w) for g in (lo + (hi - lo) * .25, lo + (hi - lo) * .5, lo + (hi - lo) * .75))
    li = low_idx if low_idx is not None else vals.index(min(vals))
    lx = round((xs[li] + xs[li + 1]) / 2, 1)
    svg = ('<svg width="%d" height="%d" viewBox="0 0 %d %d" role="img" aria-label="Fiyat geçmişi grafiği" style="display: block; overflow: visible;">%s'
           '<path d="%s" fill="rgba(255,255,255,0.06)" stroke="none"></path><path d="%s" fill="none" stroke="%s" stroke-width="2" stroke-linejoin="round"></path>'
           '<circle cx="%s" cy="%s" r="5" fill="%s" stroke="%s" stroke-width="3"></circle><circle cx="%s" cy="%s" r="9" fill="rgba(255,255,255,0.16)"></circle><circle cx="%s" cy="%s" r="5" fill="%s" stroke="%s" stroke-width="3"></circle></svg>') % (
        w, h, w, h, grid, area, d, TX, lx, ys[li], GREEN, S1, w, ys[-1], w, ys[-1], TX, S1)
    lab = '<span class="num" style="position: absolute; left: %spx; top: %spx; transform: translateX(-50%%); font-size: 11px; font-weight: 700; color: %s;">%s</span>' % (lx, ys[li] - 22, GREEN, '₺' + '{:,}'.format(min(vals)).replace(',', '.'))
    return svg + lab, xs
