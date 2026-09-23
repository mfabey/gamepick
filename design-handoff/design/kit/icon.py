import math
import os
_D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'logo')
LOGO_G = open(os.path.join(_D, 'G_icon.d')).read().strip()
LOGO_R = open(os.path.join(_D, 'R_icon.d')).read().strip()
# compact geometry for small renders (< 100 px), visually identical at that size
LOGO_G_S = open(os.path.join(_D, 'G_icon_v1.d')).read().strip()
LOGO_R_S = open(os.path.join(_D, 'R_icon_v1.d')).read().strip()

def _squircle(S=1024, R=229.0, sm=0.6):
    # Figma-style continuous corner (iOS icon mask): radius 22.37 %, smoothing 60 %
    r = R; p = (1 + sm) * r
    arc = 90 * (1 - sm); L = math.sin(math.radians(arc / 2)) * r * math.sqrt(2)
    al = (90 - arc) / 2; p34 = r * math.tan(math.radians(al / 2)); be = 45 * sm
    c = p34 * math.cos(math.radians(be)); d = c * math.tan(math.radians(be))
    b = (p - L - c - d) / 3; a = 2 * b
    f = lambda *v: ' '.join('%.2f' % x for x in v)
    s = 'M%s' % f(S - p, 0)
    s += ' c%s a%s 0 0 1 %s c%s' % (f(a, 0, a + b, 0, a + b + c, d), f(r, r), f(L, L), f(d, c, d, b + c, d, a + b + c))
    s += ' L%s' % f(S, S - p)
    s += ' c%s a%s 0 0 1 %s c%s' % (f(0, a, 0, a + b, -d, a + b + c), f(r, r), f(-L, L), f(-c, d, -(b + c), d, -(a + b + c), d))
    s += ' L%s' % f(p, S)
    s += ' c%s a%s 0 0 1 %s c%s' % (f(-a, 0, -(a + b), 0, -(a + b + c), -d), f(r, r), f(-L, -L), f(-d, -c, -d, -(b + c), -d, -(a + b + c)))
    s += ' L%s' % f(0, p)
    s += ' c%s a%s 0 0 1 %s c%s Z' % (f(0, -a, 0, -(a + b), d, -(a + b + c)), f(r, r), f(L, -L), f(c, -d, b + c, -d, a + b + c, -d))
    return s.replace('  ', ' ')
SQ = _squircle()

SC = 1.2          # logo -> icon scale
CX, CY = 509, 508  # visual centre of the mark (logo units)
TX_, TY_ = 512 - SC * CX, 512 - SC * CY
LOGO_T = 'matrix(%.4f 0 0 %.4f %.1f %.1f)' % (SC, SC, TX_, TY_)
G_C = (512 + SC * (468.6 - CX), 512 + SC * (428.2 - CY))   # G centroid in icon units

def app_icon(mode='light', size=120, uid='a', mask=True, tint='#D1D1D6', glow=True, rlight='#191919', label=None, style='', layer=None, glow_op=None, detail=None):
    if detail is None: detail = (not isinstance(size, (int, float))) or size >= 100
    LOGO_G, LOGO_R = (globals()['LOGO_G'], globals()['LOGO_R']) if detail else (LOGO_G_S, LOGO_R_S)
    """mode: light | dark | tint.  layer: None | bg | r | g (for exploded layer views)."""
    u = lambda n: '%s-%s' % (uid, n)
    aria = 'role="img" aria-label="%s"' % label if label else 'aria-hidden="true"'
    d = []
    clip = ' clip-path="url(#%s)"' % u('m') if mask else ''
    d.append('<defs>')
    if mask: d.append('<clipPath id="%s"><path d="%s"></path></clipPath>' % (u('m'), SQ))
    if mode == 'dark':
        d.append('<linearGradient id="%s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2A2F"></stop><stop offset="1" stop-color="#0A0A0C"></stop></linearGradient>' % u('bg'))
        d.append('<radialGradient id="%s" gradientUnits="userSpaceOnUse" cx="%.1f" cy="%.1f" r="440"><stop offset="0" stop-color="#FF2A22" stop-opacity="0.5"></stop><stop offset="0.45" stop-color="#C8100E" stop-opacity="0.2"></stop><stop offset="1" stop-color="#BC0C0C" stop-opacity="0"></stop></radialGradient>' % (u('gl'), G_C[0], G_C[1]))
        d.append('<linearGradient id="%s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7463F"></stop><stop offset="0.55" stop-color="#D9171A"></stop><stop offset="1" stop-color="#A90A0C"></stop></linearGradient>' % u('g'))
        d.append('<linearGradient id="%s" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="#4A4A50"></stop><stop offset="1" stop-color="#1C1C20"></stop></linearGradient>' % u('r'))
        d.append('<linearGradient id="%s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"></stop><stop offset="0.35" stop-color="#FFFFFF" stop-opacity="0"></stop></linearGradient>' % u('hl'))
        d.append('<linearGradient id="%s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"></stop><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"></stop></linearGradient>' % u('hr'))
        d.append('<filter id="%s" x="-30%%" y="-30%%" width="160%%" height="160%%"><feGaussianBlur stdDeviation="12"></feGaussianBlur></filter>' % u('sh'))
        if detail:
            d.append('<clipPath id="%s"><path d="%s" transform="%s"></path></clipPath>' % (u('cg'), LOGO_G, LOGO_T))
            d.append('<clipPath id="%s"><path d="%s" transform="%s" clip-rule="evenodd"></path></clipPath>' % (u('cr'), LOGO_R, LOGO_T))
    if mode == 'tint':
        d.append('<linearGradient id="%s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E1E20"></stop><stop offset="1" stop-color="#050505"></stop></linearGradient>' % u('bg'))
    d.append('</defs>')
    body = []
    show = lambda k: layer is None or layer == k
    if mode == 'light':
        if show('bg'): body.append('<rect width="1024" height="1024" fill="#FFFFFF"></rect>')
        if show('r'): body.append('<path d="%s" transform="%s" fill="%s" fill-rule="evenodd"></path>' % (LOGO_R, LOGO_T, rlight))
        if show('g'): body.append('<path d="%s" transform="%s" fill="#BC0C0C"></path>' % (LOGO_G, LOGO_T))
    elif mode == 'dark':
        if show('bg'):
            body.append('<rect width="1024" height="1024" fill="url(#%s)"></rect>' % u('bg'))
            if glow: body.append('<rect width="1024" height="1024" fill="url(#%s)"%s></rect>' % (u('gl'), ' opacity="%s"' % glow_op if glow_op else ''))
        if show('r'):
            body.append('<path d="%s" transform="%s" fill="url(#%s)" fill-rule="evenodd"></path>' % (LOGO_R, LOGO_T, u('r')))
            if detail: body.append('<g clip-path="url(#%s)"><path d="%s" transform="%s" fill="none" stroke="url(#%s)" stroke-width="7" fill-rule="evenodd"></path></g>' % (u('cr'), LOGO_R, LOGO_T, u('hr')))
        if show('g'):
            body.append('<path d="%s" transform="translate(0 18) %s" fill="#000000" fill-opacity="0.6" filter="url(#%s)"></path>' % (LOGO_G, LOGO_T, u('sh')))
            body.append('<path d="%s" transform="%s" fill="url(#%s)"></path>' % (LOGO_G, LOGO_T, u('g')))
            if detail: body.append('<g clip-path="url(#%s)"><path d="%s" transform="%s" fill="none" stroke="url(#%s)" stroke-width="8"></path></g>' % (u('cg'), LOGO_G, LOGO_T, u('hl')))
    else:  # tint
        if show('bg'): body.append('<rect width="1024" height="1024" fill="url(#%s)"></rect>' % u('bg'))
        if show('r'): body.append('<path d="%s" transform="%s" fill="%s" fill-opacity="0.34" fill-rule="evenodd"></path>' % (LOGO_R, LOGO_T, tint))
        if show('g'): body.append('<path d="%s" transform="%s" fill="%s"></path>' % (LOGO_G, LOGO_T, tint))
    if layer in ('r', 'g'):
        body.insert(0, '<path d="%s" fill="#FFFFFF" fill-opacity="0.05" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="10" stroke-dasharray="28 22"></path>' % SQ)
    return ('<svg width="%s" height="%s" viewBox="0 0 1024 1024" %s style="display: block; flex-shrink: 0;%s">%s<g%s>%s</g></svg>') % (size, size, aria, style, ''.join(d), clip, ''.join(body))
