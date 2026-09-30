from ds import *
from icon import app_icon
import json

LT, LT2 = '#1C1C1E', '#6E6E73'          # text on light surfaces
RL, GO = '#191919', '[[glowO]]'          # light R colour, glow tweak hole

def ic(mode, s, uid, **kw):
    if mode == 'light': kw.setdefault('rlight', RL)
    if mode == 'dark': kw.setdefault('glow_op', GO)
    return app_icon(mode, s, uid, **kw)

def chip(bg, name, val, light):
    tc, sc = (LT, LT2) if light else (TX, T2)
    ring = 'rgba(0,0,0,0.12)' if light else 'rgba(255,255,255,0.16)'
    return ('<div style="width: 168px; flex-shrink: 0; display: flex; align-items: center; gap: 10px; height: 36px;"><span style="width: 28px; height: 28px; border-radius: 999px; background: %s; box-shadow: inset 0 0 0 1px %s; flex-shrink: 0;"></span>'
            '<div style="display: flex; flex-direction: column;"><span style="font-size: 13px; line-height: 17px; font-weight: 600; color: %s;">%s</span><span class="num" style="font-size: 12px; line-height: 16px; color: %s;">%s</span></div></div>') % (bg, ring, tc, name, sc, val)

def hero(light):
    bg = '#F2F2F7' if light else '#000000'
    tc, sc = (LT, LT2) if light else (TX, T2)
    icon_ = ic('light' if light else 'dark', 280, 'h' + ('l' if light else 'd'), label='Gamerisen uygulama simgesi, %s görünüm' % ('açık' if light else 'koyu'),
               style=' filter: drop-shadow(0 18px 40px rgba(0,0,0,%s));' % ('0.14' if light else '0.6'))
    if light:
        tag, title, note = 'Varsayılan', 'Açık', 'Açık zemin logosu, vektörle yeniden çizildi: beyaz zemin, marka kırmızısı G ve koyu R. Her boyutta keskin.'
        chips = [chip('#FFFFFF', 'Zemin', '#FFFFFF', True), chip('#BC0C0C', 'G · marka', '#BC0C0C', True), chip(RL, 'R · koyu', RL, True)]
    else:
        tag, title, note = 'iOS 18+', 'Koyu', 'Aynı kompozisyon, gece için yeniden ışıklandırıldı: grafit zemin, parlatılmış kırmızı G, ton-sür-ton R ve G’nin ardında yumuşak bir kor.'
        chips = [chip('linear-gradient(180deg, #2A2A2F, #0A0A0C)', 'Zemin', '#2A2A2F → #0A0A0C', False), chip('linear-gradient(180deg, #F7463F, #A90A0C)', 'G · parlak kırmızı', '#F7463F → #A90A0C', False),
                 chip('linear-gradient(135deg, #4A4A50, #1C1C20)', 'R · grafit', '#4A4A50 → #1C1C20', False)]
    return ('<div style="width: 624px; height: 560px; box-sizing: border-box; border-radius: 28px; background: %s; box-shadow: inset 0 0 0 1px %s; padding: 40px; display: flex; flex-direction: column; position: relative;">'
            '<div style="height: 300px; display: flex; align-items: center; justify-content: center;">%s</div>'
            '<div style="margin-top: 28px; display: flex; align-items: center; gap: 10px; height: 28px;"><span style="font-family: %s; font-size: 24px; line-height: 28px; font-weight: 700; letter-spacing: -0.02em; color: %s;">%s</span>'
            '<span style="height: 22px; padding: 0 8px; border-radius: 6px; background: %s; color: %s; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center;">%s</span></div>'
            '<div style="margin-top: 6px; height: 40px; font-size: 14px; line-height: 20px; color: %s;">%s</div>'
            '<div style="margin-top: 14px; display: flex; gap: 20px;">%s</div></div>') % (
        bg, 'rgba(0,0,0,0.04)' if light else 'rgba(255,255,255,0.08)', icon_, FD, tc, title,
        'rgba(0,0,0,0.06)' if light else 'rgba(255,255,255,0.1)', sc, tag, sc, note, ''.join(chips))

NB_APPS = [('calendar', 'Takvim', '#4AA3DF'), ('image', 'Fotoğraflar', '#E3A33B'), ('camera', 'Kamera', '#8E8E93'), ('mail', 'Posta', '#5E7BBF'),
           ('clock', 'Saat', '#6C6C70'), (None, 'Gamerisen', None), ('pin', 'Haritalar', '#5DAA68'), ('news', 'Haberler', '#D9824A'),
           ('book', 'Kitaplar', '#C9884A'), ('edit', 'Notlar', '#D4B84A'), ('gear', 'Ayarlar', '#8E8E93'), ('video', 'Video', '#3FA7A0')]
DOCK = [('phone', '#5DAA68'), ('globe', '#4AA3DF'), ('msg', '#58B368'), ('play', '#E3A33B')]

def tile(icon_name, hue, light, s=62):
    if light:
        bg = 'linear-gradient(180deg, %s, %s)' % (hue, hue); g = icon(icon_name, 30, '#FFFFFF', 2.1)
        return '<span style="width: %dpx; height: %dpx; border-radius: 14px; background: %s; box-shadow: inset 0 0 0 0.5px rgba(255,255,255,0.25), inset 0 -18px 24px rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">%s</span>' % (s, s, bg, g)
    g = icon(icon_name, 30, hue, 2.1)
    return '<span style="width: %dpx; height: %dpx; border-radius: 14px; background: linear-gradient(180deg, #2A2A2F, #0E0E10); box-shadow: inset 0 0 0 0.5px rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">%s</span>' % (s, s, g)

def home(light):
    m = 'light' if light else 'dark'
    wall = ('radial-gradient(90% 55% at 10% 0%, #E7B79B 0%, rgba(231,183,155,0) 70%), radial-gradient(80% 60% at 100% 100%, #6A82B8 0%, rgba(106,130,184,0) 72%), linear-gradient(165deg, #C8A490 0%, #8B9AC2 100%)')
    if not light: wall = 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), ' + wall
    cells = ''
    for i, (n, lab, hue) in enumerate(NB_APPS):
        t = ic(m, 62, 'hs' + m[0], label='Gamerisen') if n is None else tile(n, hue, light)
        cells += ('<div style="width: 62px; display: flex; flex-direction: column; align-items: center;">%s<span style="margin-top: 6px; width: 80px; text-align: center; font-size: 12px; line-height: 14px; font-weight: 500; color: #FFFFFF; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">%s</span></div>') % (t, lab)
    dock = ''.join(tile(n, h, light) for n, h in DOCK)
    status = ('<div style="position: absolute; left: 0; right: 0; top: 0; height: 54px; padding: 0 30px 0 44px; display: flex; align-items: center; justify-content: space-between; color: #FFFFFF;">'
              '<span class="num" style="font-size: 17px; font-weight: 600;">9:41</span><span style="display: flex; align-items: center; gap: 6px;">'
              '<span style="display: flex; align-items: flex-end; gap: 2px; height: 12px;"><span style="width: 3px; height: 4px; border-radius: 1px; background: #FFFFFF;"></span><span style="width: 3px; height: 6px; border-radius: 1px; background: #FFFFFF;"></span><span style="width: 3px; height: 9px; border-radius: 1px; background: #FFFFFF;"></span><span style="width: 3px; height: 12px; border-radius: 1px; background: #FFFFFF;"></span></span>'
              '<span style="width: 25px; height: 12px; box-sizing: border-box; border-radius: 4px; border: 1px solid rgba(255,255,255,0.5); padding: 1px; display: flex;"><span style="width: 17px; border-radius: 2px; background: #FFFFFF;"></span></span></span></div>')
    return ('<div style="width: 390px; height: 600px; border-radius: 44px; overflow: hidden; position: relative; background: %s; flex-shrink: 0; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);">%s'
            '<div style="position: absolute; left: 0; right: 0; top: 72px; display: grid; grid-template-columns: repeat(4, 62px); column-gap: 28px; row-gap: 22px; justify-content: center;">%s</div>'
            '<div style="position: absolute; left: 0; right: 0; top: 452px; display: flex; justify-content: center;"><span style="height: 28px; padding: 0 12px; border-radius: 999px; background: %s; display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: #FFFFFF;">%sAra</span></div>'
            '<div style="position: absolute; left: 14px; right: 14px; bottom: 14px; height: 92px; border-radius: 36px; background: %s; display: flex; align-items: center; justify-content: space-around; padding: 0 12px;">%s</div>'
            '<span style="position: absolute; left: 20px; top: 20px; display: none;"></span></div>') % (
        wall, status, cells, 'rgba(255,255,255,0.24)' if light else 'rgba(255,255,255,0.12)', icon('search', 13, '#FFFFFF', 2.6),
        'rgba(255,255,255,0.3)' if light else 'rgba(58,58,62,0.5)', dock)

def picker():
    opt = lambda inner, lab, sel: ('<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;"><span style="width: 68px; height: 68px; border-radius: 19px; display: flex; align-items: center; justify-content: center; box-shadow: %s;">%s</span>'
                                    '<span style="font-size: 13px; line-height: 16px; font-weight: %s; color: %s;">%s</span></div>') % (
        '0 0 0 2px %s' % TX if sel else 'none', inner, 600 if sel else 500, TX if sel else T2, lab)
    auto = ('<span style="width: 60px; height: 60px; position: relative; display: block;">%s<span style="position: absolute; left: 0; top: 0; width: 60px; height: 60px; clip-path: polygon(0 0, 100%% 0, 0 100%%);">%s</span></span>') % (ic('dark', 60, 'pa1'), ic('light', 60, 'pa2'))
    row = ''.join([opt(auto, 'Otomatik', False), opt(ic('dark', 60, 'pd'), 'Koyu', True), opt(ic('light', 60, 'pl'), 'Açık', False), opt(app_icon('tint', 60, 'pt', tint='#D1D1D6'), 'Tonlu', False)])
    return ('<div style="height: 200px; box-sizing: border-box; border-radius: 20px; background: %s; padding: 22px 24px; display: flex; flex-direction: column;">'
            '%s%s<div style="margin-top: 20px; display: flex; justify-content: space-between;">%s</div></div>') % (
        S1, txt('Ana Ekranı Özelleştir', 17, 22, 600), txt('iOS 18 ve sonrası · seçimi kullanıcı yapar', 13, 18, 400, T2, '', ' margin-top: 4px;'), row)

def rules():
    items = ['Kompozisyon iki görünümde aynı: G ve R yerini ve boyunu korur, yalnızca ışık değişir.',
             'Koyuda kırmızı hâlâ tek vurgu: zemin grafit, R geri çekilir, kor yalnızca G’nin ardında.',
             'Köşe ve maske sistemden gelir; dosyalar kare ve köşesiz teslim edilir.']
    return '<div style="display: flex; flex-direction: column; gap: 12px;">%s</div>' % ''.join(
        '<div style="display: flex; gap: 10px; align-items: flex-start; height: 40px;">%s%s</div>' % (icon('check', 16, GREEN, 2.6, style=' margin-top: 2px;'), txt(t, 14, 20, 400, T2, 'c2')) for t in items)

def files():
    rows = [('AppIcon-Light.png', 'Açık · 1024 × 1024 · opak'), ('AppIcon-Dark.png', 'Koyu · 1024 × 1024 · degrade zemin'), ('AppIcon-Tinted.png', 'Tonlu · 1024 × 1024 · gri tonlamalı')]
    return ('<div style="border-radius: 16px; background: %s; padding: 0 16px;">%s</div>') % (S1, ''.join(
        '<div style="height: 44px; display: flex; align-items: center; justify-content: space-between; border-top: %s;"><span class="num" style="font-size: 13px; font-weight: 600;">%s</span><span style="font-size: 12px; color: %s;">%s</span></div>' % (
            'none' if i == 0 else '0.5px solid %s' % LINE, a, T3, b) for i, (a, b) in enumerate(rows)))

def tinted():
    tints = [('#D1D1D6', 'Gri'), ('#FFB340', 'Amber'), ('#7FD3FF', 'Buz mavisi')]
    icons_ = ''.join('<div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">%s<span style="font-size: 12px; color: %s;">%s</span></div>' % (app_icon('tint', 96, 'tn%d' % i, tint=c_), T2, n) for i, (c_, n) in enumerate(tints))
    return ('<div style="width: 400px; height: 400px; box-sizing: border-box; border-radius: 20px; background: %s; padding: 24px; display: flex; flex-direction: column;">%s%s'
            '<div style="margin-top: 20px; flex: 1 1 auto; border-radius: 16px; background: #000000; display: flex; align-items: center; justify-content: space-around;">%s</div></div>') % (
        S1, txt('Tonlu', 17, 22, 600), txt('iOS gri tonlamalı dosyayı seçilen renge boyar; G tam, R %34 opaklıkta kalır.', 13, 18, 400, T2, 'c2', ' margin-top: 4px; height: 36px;'), icons_)

def layers():
    def plane(layer, top, uid):
        return ('<div style="position: absolute; left: 22px; top: %dpx; width: 150px; height: 150px; transform: perspective(800px) rotateX(58deg) rotateZ(-20deg); filter: drop-shadow(0 14px 18px rgba(0,0,0,0.55));">%s</div>') % (top, app_icon('dark', 150, uid, layer=layer))
    lab = lambda y, t, s: ('<div style="position: absolute; left: 236px; top: %dpx; width: 156px; display: flex; flex-direction: column;"><span style="font-size: 13px; line-height: 18px; font-weight: 600;">%s</span><span style="font-size: 12px; line-height: 16px; color: %s;">%s</span></div>'
                           '<span style="position: absolute; left: 200px; top: %dpx; width: 28px; border-top: 1px dashed rgba(255,255,255,0.3);"></span>') % (y - 18, t, T2, s, y)
    art = ''.join([plane('bg', 124, 'ly3'), plane('r', 58, 'ly2'), plane('g', -8, 'ly1'),
                   lab(64, 'G · ön', 'Parlak kırmızı, üst ışık, gölge'), lab(130, 'R · orta', 'Grafit, ton-sür-ton'), lab(196, 'Arka plan', 'Koyu degrade ve kor ışığı')])
    return ('<div style="width: 440px; height: 400px; box-sizing: border-box; border-radius: 20px; background: %s; padding: 24px; display: flex; flex-direction: column;">%s%s'
            '<div style="margin-top: 20px; flex: 1 1 auto; position: relative;">%s</div></div>') % (
        S1, txt('Katmanlar · Icon Composer', 17, 22, 600), txt('iOS 26 Liquid Glass için üç ayrı katman; derinliği, parlamayı ve gölgeyi sistem ekler.', 13, 18, 400, T2, 'c2', ' margin-top: 4px; height: 36px;'), art)

def sizes():
    sz = [(60, 'Ana ekran'), (40, 'Spotlight'), (29, 'Ayarlar'), (20, 'Bildirim')]
    def strip(m, bg):
        return ('<div style="height: 96px; border-radius: 14px; background: %s; display: flex; align-items: center; justify-content: space-around; padding: 0 8px;">%s</div>') % (
            bg, ''.join('<span style="width: 60px; display: flex; justify-content: center;">%s</span>' % ic(m, s, 'sz%s%d' % (m[0], s)) for s, _ in sz))
    labs = '<div style="display: flex; justify-content: space-around; padding: 0 8px; margin-top: 10px;">%s</div>' % ''.join(
        '<span style="width: 60px; display: flex; flex-direction: column; align-items: center;"><span class="num" style="font-size: 12px; line-height: 16px; font-weight: 600;">%d pt</span><span style="font-size: 11px; line-height: 14px; color: %s;">%s</span></span>' % (s, T3, n) for s, n in sz)
    return ('<div style="width: 384px; height: 400px; box-sizing: border-box; border-radius: 20px; background: %s; padding: 24px; display: flex; flex-direction: column;">%s%s'
            '<div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">%s%s</div>%s</div>') % (
        S1, txt('Boyutlar', 17, 22, 600), txt('20 pt’de bile G okunur; R küçük boyutta dokuya dönüşür, işareti bozmaz.', 13, 18, 400, T2, 'c2', ' margin-top: 4px; height: 36px;'),
        strip('light', '#F2F2F7'), strip('dark', '#000000'), labs)

def appicon_board():
    r1 = '%s<div style="margin-top: 16px; display: flex; gap: 24px;">%s%s</div>' % (sec('İki görünüm, tek işaret'), hero(True), hero(False))
    R1 = 32 + 16 + 560
    info = '<div style="width: 444px; display: flex; flex-direction: column; gap: 24px;">%s%s%s</div>' % (picker(), rules(), files())
    r2 = '%s<div style="margin-top: 16px; display: flex; gap: 24px;">%s%s%s</div>' % (sec('Ana ekranda'), home(True), home(False), info)
    R2 = 32 + 16 + 600
    r3 = '%s<div style="margin-top: 16px; display: flex; gap: 24px;">%s%s%s</div>' % (sec('Tonlu, katmanlar ve boyutlar'), tinted(), layers(), sizes())
    R3 = 32 + 16 + 400
    js = "{ glowO: this.props.darkGlow === false ? 0 : 1 }"
    html, H = board('Uygulama Simgesi', 'G-DS-6', 'Açık simge açık zemin logosu; koyu simge aynı işaret, gece için yeniden ışıklandırıldı. iOS açık, koyu ve tonlu görünümler.', [(48, r1, R1), (56, r2, R2), (56, r3, R3)], js)
    import re
    m = re.search(r"data-props='([^']*)'", html); old = m.group(0)
    p = json.loads(m.group(1).replace('&#39;', "'").replace('&amp;', '&'))
    p['darkGlow'] = {'editor': 'boolean', 'default': True, 'section': 'Uygulama simgesi'}
    new = "data-props='%s'" % json.dumps(p, ensure_ascii=False).replace('&', '&amp;').replace("'", '&#39;').replace('}}', '} }')
    return html.replace(old, new), H

if __name__ == '__main__':
    h, H = appicon_board()
    open('root/project/G-DS-6-AppIcon.dc.html', 'w').write(h); print('G-DS-6-AppIcon', H, len(h))
