from ds import *
import json, re

def phone_crop(plat, h=520):
    body = ('<div style="position: absolute; left: 0; top: 0; right: 0; padding-top: 20px; display: flex; flex-direction: column;">%s'
            '<div style="padding: 0 20px; margin-top: 12px; display: flex; flex-direction: column; gap: 14px;">%s%s</div>'
            '<div style="padding: 0 20px; margin-top: 18px;">%s</div></div>') % (
        sec_head('Oyun Dünyasından', 'Tümü')[0],
        news_row('gta', 'GTA VI için yeni oynanış detayları paylaşıldı', 'Gündem', '42 dk önce', True, pos='50% 60%'),
        news_row('split', "Steam Sonbahar İndirimi'nin tarihleri belli oldu", 'PC', '2 sa önce'),
        img('cyberpunk', 350, 300, 18, '40% center', 'Cyberpunk 2077 görseli'))
    if plat == 'ios':
        bar = tabbar_ios('home')
        sys_ = '<span aria-hidden="true" style="position: absolute; left: 50%; bottom: 8px; width: 134px; height: 5px; margin-left: -67px; border-radius: 3px; background: rgba(255,255,255,0.85);"></span>'
    else:
        bar = tabbar_android('home')
        sys_ = '<span aria-hidden="true" style="position: absolute; left: 50%; bottom: 7px; width: 108px; height: 4px; margin-left: -54px; border-radius: 2px; background: rgba(255,255,255,0.55); z-index: 6;"></span>'
    return ('<div style="position: relative; width: 390px; height: %dpx; border-radius: 28px; overflow: hidden; background: %s; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06); flex-shrink: 0;">%s%s%s</div>') % (h, BG, body, bar, sys_)

def plat_head(title, sub):
    return '<div style="display: flex; flex-direction: column; height: 44px; margin-bottom: 12px;">%s%s</div>' % (txt(title, 17, 22, 700), txt(sub, 13, 18, 400, T2, 'c1', ' margin-top: 4px;'))

def notes():
    items = [
        ('Yalnızca ikon', 'Etiketler ekranda görünmez; ekran okuyucu için adı olarak kalır. Uzun basınca etiket balonu çıkar.'),
        ('iOS · cam kapsül', 'Çubuk içerikten ayrı yüzer, içerik altından akar. Seçili sekmede cam mercek ve kırmızı dolu ikon.'),
        ('Android · Material 3', 'Tam genişlik, opak yüzey. Seçili sekmede 56 × 32 hap gösterge; dokununca dalga efekti.'),
        ('Kırmızı ölçülü', 'Yalnızca seçili ikon ve okunmamış rozeti kırmızı. Çubuğun geri kalanı nötr.'),
    ]
    rows = ''.join('<div style="display: flex; gap: 12px; align-items: flex-start;"><span style="width: 8px; height: 8px; border-radius: 999px; background: %s; margin-top: 6px; flex-shrink: 0;"></span><div style="display: flex; flex-direction: column; gap: 2px;">%s%s</div></div>' % (
        RED if i == 3 else T3, txt(a, 15, 20, 600), txt(b, 13, 19, 400, T2)) for i, (a, b) in enumerate(items))
    return '<div style="width: 444px; box-sizing: border-box; padding: 24px; border-radius: 20px; background: %s; display: flex; flex-direction: column; gap: 18px;">%s</div>' % (S1, rows)

def states(plat):
    out = ''
    for key, _, _ in TABS:
        bar = tabbar_ios(key, abs_=False) if plat == 'ios' else tabbar_android(key, abs_=False)
        wrap = 'height: 83px; display: flex; align-items: center; justify-content: center;' if plat == 'ios' else 'height: 83px; display: flex; overflow: hidden; border-radius: 14px;'
        out += '<div style="width: 390px; border-radius: 14px; background: %s; %s">%s</div>' % (BG, wrap, bar)
    return '<div style="display: flex; flex-direction: column; gap: 12px;">%s</div>' % out

def tips():
    ios = '<div style="width: 444px; height: 150px; border-radius: 14px; background: %s; position: relative; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 21px; box-sizing: border-box;">%s</div>' % (BG, tabbar_ios('users', abs_=False, tip=True).replace('width: 350px;', 'width: 350px; position: relative;', 1))
    and_ = '<div style="width: 444px; height: 150px; border-radius: 14px; background: %s; position: relative; display: flex; align-items: flex-end; overflow: hidden;">%s</div>' % (BG, tabbar_android('users', abs_=False, tip=True).replace('width: 390px;', 'width: 444px;', 1))
    cap = lambda t: txt(t, 12, 16, 400, T3, '', ' margin-top: 8px;')
    return '<div style="display: flex; flex-direction: column;">%s%s<div style="height: 20px;"></div>%s%s</div>' % (ios, cap('iOS · uzun basınca etiket (Büyük İçerik Görüntüleyici ile aynı davranış)'), and_, cap('Android · uzun basınca Material ipucu'))

def spec_table(rows):
    return '<div style="border-radius: 16px; background: %s; padding: 0 16px;">%s</div>' % (S1, ''.join(
        '<div style="display: flex; align-items: center; gap: 12px; min-height: 40px; border-top: %s;"><span style="width: 120px; flex-shrink: 0; font-size: 13px; font-weight: 600;">%s</span><span class="num" style="font-size: 13px; line-height: 18px; color: %s;">%s</span></div>' % (
            'none' if i == 0 else '0.5px solid %s' % LINE, a, T2, b) for i, (a, b) in enumerate(rows)))

IOS_SPEC = [('Kapsül', '350 × 62 · köşe 31 · yanlardan 20, alttan 21'), ('Cam', 'rgba(30,30,32,.64) + blur 24 + doygunluk %160'), ('Kenar', 'iç 0.5 pt beyaz %14 · üstte 1 pt parlama'),
            ('Gölge', '0 12 32 siyah %50 · 0 2 8 siyah %30'), ('Mercek', '60 × 52 · köşe 26 · beyaz %12 + 0.5 pt kenar'), ('İkon', '26 · kapalı #C7C7CC çizgi 1.9 · açık #F34545 dolu'),
            ('Profil', '28 avatar · 2 pt halka (açık: kırmızı)'), ('Rozet', '18 · #BC0C0C · 2 pt #2A2A2D halka'), ('Hareket', 'mercek yayla kayar 250 ms · basınca ikon %92')]
AND_SPEC = [('Çubuk', '390 × 64 + 19 sistem alanı · zemin #131315'), ('Gösterge', '56 × 32 · köşe 16 · kırmızı ton %24'), ('İkon', '24 · kapalı #A1A1A6 çizgi 1.9 · açık #F34545 dolu'),
            ('Profil', '24 avatar · 2 pt halka (açık: kırmızı)'), ('Rozet', '16 · #BC0C0C · halkasız (M3)'), ('Dokunma', 'dalga efekti · hedef 64 yükseklik'),
            ('Hareket', 'gösterge ortadan açılır 250 ms · ikon dolguya geçer'), ('İpucu', 'uzun basınca etiket · 32 yükseklik, köşe 4')]

def tabbar_board():
    r1 = '%s<div style="margin-top: 16px; display: flex; gap: 24px;"><div>%s%s</div><div>%s%s</div><div style="padding-top: 56px;">%s</div></div>' % (
        sec('İki platform, aynı ikonlar'), plat_head('iOS', 'Liquid Glass kapsül · iOS 26 görünümü'), phone_crop('ios'), plat_head('Android', 'Material 3 gezinme çubuğu'), phone_crop('android'), notes())
    R1 = 32 + 16 + 56 + 520
    r2 = '%s<div style="margin-top: 16px; display: flex; gap: 24px;"><div>%s%s</div><div>%s%s</div><div>%s%s</div></div>' % (
        sec('Seçili durumlar ve uzun basış'), plat_head('iOS', 'Her sekme seçili'), states('ios'), plat_head('Android', 'Her sekme seçili'), states('android'), plat_head('Etiket nerede?', 'Uzun basınca görünür, ekran okuyucu her zaman okur'), tips())
    R2 = 32 + 16 + 56 + 5 * 83 + 4 * 12
    r3 = '%s<div style="margin-top: 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px;"><div>%s%s</div><div>%s%s</div></div>' % (
        sec('Ölçüler'), plat_head('iOS', 'Tüm değerler pt'), spec_table(IOS_SPEC), plat_head('Android', 'Tüm değerler dp'), spec_table(AND_SPEC))
    R3 = 32 + 16 + 56 + 9 * 40
    html, H = board('Sekme Çubuğu', 'G-DS-7', 'Yalnızca ikon, platforma özel: iOS’ta yüzen cam kapsül, Android’de Material 3 çubuğu. Ekranlarda Tweaks → platform ile değiştir.', [(48, r1, R1), (56, r2, R2), (56, r3, R3)])
    return html, H

if __name__ == '__main__':
    h, H = tabbar_board()
    open('root/project/G-DS-7-TabBar.dc.html', 'w').write(h); print('G-DS-7-TabBar', H, len(h))
