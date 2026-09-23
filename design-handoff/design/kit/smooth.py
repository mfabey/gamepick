import re, math
def polys(d):
    return [[tuple(map(float, p)) for p in re.findall(r'(-?\d+\.?\d*)[ ,](-?\d+\.?\d*)', s)] for s in d.split('M') if s.strip()]
def smooth(d, sharp=52, reach=14):
    out = []
    f = lambda p: '%s %s' % (('%.1f' % p[0]).rstrip('0').rstrip('.'), ('%.1f' % p[1]).rstrip('0').rstrip('.'))
    for P in polys(d):
        # drop duplicate closing point
        if P[0] == P[-1]: P = P[:-1]
        n = len(P)
        def turn(i):
            a, b, c = P[i - 1], P[i], P[(i + 1) % n]
            t1 = math.atan2(b[1] - a[1], b[0] - a[0]); t2 = math.atan2(c[1] - b[1], c[0] - b[0])
            return abs((math.degrees(t2 - t1) + 180) % 360 - 180)
        def toward(p, q):
            L = math.hypot(q[0] - p[0], q[1] - p[1]); t = min(0.5, reach / L) if L else 0
            return (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)
        s = ''
        for i in range(n):
            pi, prv, nxt = P[i], P[i - 1], P[(i + 1) % n]
            A, B = toward(pi, prv), toward(pi, nxt)
            if turn(i) < sharp:
                seg = 'L%sQ%s %s' % (f(A), f(pi), f(B))
            else:
                seg = 'L%s' % f(pi)
                B = pi
            if i == 0:
                start = seg; first_B = B
            else:
                s += seg
        # rotate so we start at vertex 0's exit point
        out.append('M%s%s%sZ' % (f(first_B), s, start))
    return ''.join(out)
