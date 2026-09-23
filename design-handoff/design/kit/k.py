# Gamerisen v2 kit — neutral, Apple-leaning, dark-first
import json
A = {
 'alanwake': 'cf8dfe7a4e49a85e1bc8773c123568fb', 'bg3': '3732200bba2daf671c4e0d682d09750e', 'cozy': '4bbc553f98ff1502f69d27d515d2f4aa',
 'cs2': '0fd1263edbd8dabe13163d6316bce946', 'cyberpunk': '6d4befbece8b2f0957d2da51f1d78761', 'doom': '17f41aaf2e1c3f26ece0103cf57d4909',
 'eldenring': '1b4525a9a312332a80683c237d50f7a9', 'esports': 'bc0d0c9a30bf03b95bf2bf022bbae7cf', 'exp33': '579f5dec0b2e2790e895454f0518002e',
 'forza': '4b5463f8d566b0300ad25a87f9308cbc', 'ghost': '4298bef08a8f6ba5756874edf748a8d9', 'gta': '9bcb51f244be237f153d747579b7b409',
 'hades2': '58f77df6c14dcf2f8459330b0452a1e6', 'kcd2': '03df02f1c459343b0d2b6f290a9617e0', 'mhwilds': '87fde4decc777a81d2da4bfcef70ca4e',
 'nms': 'a0fdc160a92f49531722d1c333436056', 'pixel': '8a2bf137fe0e8aa0483b55ac23eb0988', 'rdr2': '12302dc17c0984d144c65566351c5fac',
 'silksong': '549685fe783899c326ca04a6f74d572a', 'split': 'b3eea29cba3c393d6606d15fbd74b336', 'stardew': 'cd4351abe8cda251a95bb8c1eab3ba2a',
 'hogwarts': 'c794ce3e36712984a8f54e7eb3232aef', 'fc': '6bb580ff2a4c2835d15419d04b749402', 'witcher': '6aa9dad06e0628da92d3ed3d510247f8'}
def art(k): return '/_blob/' + A[k]

BG = '#0A0A0B'; BG2 = '#131315'; S1 = '#1C1C1E'; S2 = '#2C2C2E'; S3 = '#3A3A3C'
TX = '#F5F5F7'; T2 = '#A1A1A6'; T3 = '#8E8E93'; ONART = '#D1D1D6'
GREEN = '#30D158'; GREENT = 'rgba(48,209,88,0.14)'; ORANGE = '#FF9F0A'; ORANGET = 'rgba(255,159,10,0.15)'
RED = '#F34545'; REDT = 'rgba(188,12,12,0.22)'; BRAND = '#BC0C0C'; GOLD = '#FFD60A'; GOLDT = 'rgba(255,214,10,0.13)'
LINE = 'rgba(255,255,255,0.08)'; FILL = 'rgba(118,118,128,0.24)'; DARKGLASS = 'background: rgba(0,0,0,0.42); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);'
AC = '[[ac]]'; ACS = '[[acS]]'; ACT = '[[acT]]'; ACL = '[[acL]]'; ONAC = '[[onAc]]'; ONAC2 = '[[onAc2]]'; ACF = '[[acF]]'; ONACF = '[[onAcF]]'
F = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, 'Segoe UI', sans-serif"
FD = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, 'Segoe UI', sans-serif"
FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400..700&amp;display=swap'
CSS = """
body{margin:0;background:#0A0A0B;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Inter',system-ui,'Segoe UI',sans-serif;color:#F5F5F7;-webkit-font-smoothing:antialiased;letter-spacing:-0.01em}
a{color:#F5F5F7;text-decoration:none}a:hover{color:#FFFFFF}
button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:inherit;letter-spacing:inherit}
input,textarea{font:inherit;color:inherit;letter-spacing:inherit}
input::placeholder,textarea::placeholder{color:#8E8E93}input:focus,textarea:focus{outline:none}
button:focus-visible,a:focus-visible{outline:2px solid #F5F5F7;outline-offset:2px}
.rail{scrollbar-width:none}.rail::-webkit-scrollbar{display:none}
.c1,.c2,.c3,.c4{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}
.c1{-webkit-line-clamp:1}.c2{-webkit-line-clamp:2}.c3{-webkit-line-clamp:3}.c4{-webkit-line-clamp:4}
.num{font-variant-numeric:tabular-nums}
.press{transition:transform .15s ease-out,opacity .15s ease-out}.press:active{transform:scale(.97);opacity:.9}
@keyframes gr-pop{0%{transform:scale(1)}35%{transform:scale(1.28)}65%{transform:scale(.92)}100%{transform:scale(1)}}
.is-on svg{animation:gr-pop .24s cubic-bezier(.2,.9,.3,1.25)}
@keyframes gr-pulse{0%{box-shadow:0 0 0 0 rgba(243,69,69,.5)}100%{box-shadow:0 0 0 6px rgba(243,69,69,0)}}
.live{animation:gr-pulse 1.8s ease-out infinite}
@keyframes gr-dots{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}
.dot1{animation:gr-dots 1.2s infinite}.dot2{animation:gr-dots 1.2s .15s infinite}.dot3{animation:gr-dots 1.2s .3s infinite}
@keyframes gr-shim{from{background-position:120% 0}to{background-position:-120% 0}}
.sk{background:linear-gradient(90deg,#1C1C1E 25%,#2C2C2E 50%,#1C1C1E 75%);background-size:220% 100%;animation:gr-shim 1.3s linear infinite}
@media (prefers-reduced-motion: reduce){*{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important}}
"""

IC = {
 'search': '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.6-3.6"></path>',
 'bell': '<path d="M6 8.5a6 6 0 0 1 12 0c0 6.5 2.5 8.5 2.5 8.5h-17S6 15 6 8.5"></path><path d="M10.3 20.5a1.9 1.9 0 0 0 3.4 0"></path>',
 'heart': '<path d="M19.5 13.6C21 12.1 22 10.6 22 8.6A5.1 5.1 0 0 0 16.9 3.5c-1.8 0-3.1.6-4.9 2.4C10.2 4.1 8.9 3.5 7.1 3.5A5.1 5.1 0 0 0 2 8.6c0 2 1 3.5 2.5 5L12 21z"></path>',
 'comment': '<path d="M20.5 11.6a8.4 8.4 0 0 1-12.3 7.5L3.5 20.5l1.4-4.6A8.5 8.5 0 1 1 20.5 11.6z"></path>',
 'bookmark': '<path d="M18.5 21 12 17l-6.5 4V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2z"></path>',
 'share': '<path d="M12 3v12"></path><path d="m7.5 7.5 4.5-4.5 4.5 4.5"></path><path d="M20 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5"></path>',
 'home': '<path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-6h-5.6v6H5A1.5 1.5 0 0 1 3.5 19z"></path>',
 'users': '<circle cx="9" cy="7" r="4"></circle><path d="M2 21v-1.5A5.5 5.5 0 0 1 7.5 14h3a5.5 5.5 0 0 1 5.5 5.5V21"></path><path d="M16.5 3.3a4 4 0 0 1 0 7.4M18.5 14.4A5.5 5.5 0 0 1 22 19.5V21"></path>',
 'play': '<rect x="2.5" y="4.5" width="19" height="15" rx="4"></rect><path d="m10 9 5 3-5 3z"></path>',
 'playf': '<path d="M7 4.8v14.4a1 1 0 0 0 1.5.9l11.3-7.2a1 1 0 0 0 0-1.8L8.5 3.9A1 1 0 0 0 7 4.8z"></path>',
 'msg': '<path d="M20.5 15a2 2 0 0 1-2 2H7.5l-4 3.5V5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"></path>',
 'star': '<path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"></path>',
 'chev': '<path d="m9 18 6-6-6-6"></path>', 'back': '<path d="m15 18-6-6 6-6"></path>', 'chevd': '<path d="m6 9 6 6 6-6"></path>',
 'down': '<path d="m22 17-8.5-8.5-5 5L2 7"></path><path d="M16 17h6v-6"></path>',
 'up': '<path d="m22 7-8.5 8.5-5-5L2 17"></path><path d="M16 7h6v6"></path>',
 'arrdown': '<path d="M12 5v14M19 12l-7 7-7-7"></path>', 'arrup': '<path d="M12 19V5M5 12l7-7 7 7"></path>',
 'flame': '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>',
 'clock': '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
 'eye': '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle>',
 'eyeoff': '<path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.2 3.3M6.6 6.6C3.9 8.4 2 12 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6"></path><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"></path><path d="m2 2 20 20"></path>',
 'more': '<circle cx="5" cy="12" r="1.2"></circle><circle cx="12" cy="12" r="1.2"></circle><circle cx="19" cy="12" r="1.2"></circle>',
 'plus': '<path d="M12 5v14M5 12h14"></path>', 'x': '<path d="M18 6 6 18M6 6l12 12"></path>', 'check': '<path d="M20 6 9 17l-5-5"></path>',
 'send': '<path d="m21.5 2.5-7 19-4-8.5-8-4z"></path><path d="M21.5 2.5 10.5 13"></path>',
 'image': '<rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-4-4L6 21"></path>',
 'pad': '<path d="M6 11h4M8 9v4"></path><path d="M15 12h.01M18 10h.01"></path><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6C2.6 9.4 2 14.5 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.4-1.4A2 2 0 0 1 9.8 16h4.4a2 2 0 0 1 1.4.6L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.5-.6-6.6-.7-7.3A4 4 0 0 0 17.3 5z"></path>',
 'poll': '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"></path>',
 'help': '<circle cx="12" cy="12" r="9"></circle><path d="M9.2 9a3 3 0 0 1 5.8 1c0 2-3 2.8-3 2.8"></path><path d="M12 17h.01"></path>',
 'info': '<circle cx="12" cy="12" r="9"></circle><path d="M12 16v-4.5M12 8h.01"></path>',
 'trophy': '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 21.5h16M10 14.7V17c0 .6-.5 1-1 1.2C7.8 18.8 7 20.2 7 21.5M14 14.7V17c0 .6.5 1 1 1.2 1.2.6 2 2 2 3.3"></path><path d="M18 2.5H6V9a6 6 0 0 0 12 0z"></path>',
 'gear': '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1h-.2a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5v-.2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"></path>',
 'edit': '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path>',
 'pen': '<path d="M12 3.5H5.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V12"></path><path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"></path>',
 'ext': '<path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>',
 'monitor': '<rect x="2.5" y="3.5" width="19" height="13" rx="2"></rect><path d="M8 20.5h8M12 16.5v4"></path>',
 'reply': '<path d="m9 17-5-5 5-5"></path><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>',
 'sliders': '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1.5 14h5M9.5 8h5M17.5 16h5"></path>',
 'zap': '<path d="M13 2 3.5 14H12l-1 8 9.5-12H12z"></path>',
 'video': '<path d="m22 8-6 4 6 4z"></path><rect x="2" y="6" width="14" height="12" rx="2.5"></rect>',
 'mute': '<path d="M11 5 6 9H2v6h4l5 4z"></path><path d="m22 9-6 6M16 9l6 6"></path>',
 'volume': '<path d="M11 5 6 9H2v6h4l5 4z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"></path>',
 'tag': '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"></path><circle cx="7.5" cy="7.5" r="1.2"></circle>',
 'refresh': '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"></path><path d="M21 3v5h-5"></path>',
 'mic': '<rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3"></path>',
 'userplus': '<path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><path d="M20 8v6M23 11h-6"></path>',
 'lock': '<rect x="4" y="11" width="16" height="10" rx="2.5"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>',
 'mail': '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"></rect><path d="m3 6.5 9 6.5 9-6.5"></path>',
 'camera': '<path d="M14.5 4h-5L7.5 6.5H4.5a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2V8.5a2 2 0 0 0-2-2h-3z"></path><circle cx="12" cy="13" r="3.5"></circle>',
 'globe': '<circle cx="12" cy="12" r="9.5"></circle><path d="M2.5 12h19M12 2.5a14.5 14.5 0 0 1 0 19M12 2.5a14.5 14.5 0 0 0 0 19"></path>',
 'moon': '<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"></path>',
 'textsize': '<path d="M4 7V5h10v2M9 5v14M7 19h4"></path><path d="M14 13v-1.5h7V13M17.5 11.5V19M16 19h3"></path>',
 'logout': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="m16 17 5-5-5-5M21 12H9"></path>',
 'sort': '<path d="m3 16 4 4 4-4M7 20V4M21 8l-4-4-4 4M17 4v16"></path>',
 'cpu': '<rect x="5" y="5" width="14" height="14" rx="2"></rect><rect x="9" y="9" width="6" height="6" rx="1"></rect><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"></path>',
 'hdd': '<rect x="2.5" y="12" width="19" height="8" rx="2"></rect><path d="M5.5 12 8 4.5h8l2.5 7.5"></path><path d="M6.5 16h.01M10 16h.01"></path>',
 'layers': '<path d="m12 2.5 9.5 5-9.5 5-9.5-5z"></path><path d="m2.5 12 9.5 5 9.5-5"></path><path d="m2.5 16.5 9.5 5 9.5-5"></path>',
 'alert': '<path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0z"></path><path d="M12 9v4M12 17h.01"></path>',
 'wifioff': '<path d="m2 2 20 20"></path><path d="M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.7M19 12.9a10 10 0 0 0-2.2-1.7M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 11 5M12 20h.01"></path>',
 'link': '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"></path><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"></path>',
 'pin': '<path d="M12 17v5"></path><path d="M9 10.8V4h6v6.8l3 3.2v1H6v-1z"></path>',
 'book': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"></path><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"></path>',
 'pause': '<rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect>',
 'max': '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"></path>',
 'cc': '<rect x="2.5" y="5" width="19" height="14" rx="3"></rect><path d="M10.5 10.2a2.2 2.2 0 1 0 0 3.6M17 10.2a2.2 2.2 0 1 0 0 3.6"></path>',
 'checkc': '<circle cx="12" cy="12" r="9.5"></circle><path d="m8 12 3 3 5-6"></path>',
 'news': '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"></path>',
 'hash': '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"></path>',
 'bag': '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><path d="M3 6h18M16 10a4 4 0 0 1-8 0"></path>',
 'calendar': '<rect x="3" y="4.5" width="18" height="17" rx="2.5"></rect><path d="M16 2.5v4M8 2.5v4M3 10h18"></path>',
 'spark': '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path>',
 'grid': '<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect>',
 'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path>',
 'phone': '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"></path>',
}
TAB_FILL = {
 'home': '<path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z" fill="%(c)s" stroke="%(c)s"></path><rect x="9.9" y="14" width="4.2" height="6.4" rx="1" fill="%(k)s"></rect>',
 'users': '<circle cx="9" cy="7" r="4" fill="%(c)s" stroke="%(c)s"></circle><path d="M2 21v-1.5A5.5 5.5 0 0 1 7.5 14h3a5.5 5.5 0 0 1 5.5 5.5V21z" fill="%(c)s" stroke="%(c)s"></path><path d="M16.5 3.3a4 4 0 0 1 0 7.4M18.5 14.4A5.5 5.5 0 0 1 22 19.5V21" stroke="%(c)s"></path>',
 'play': '<rect x="2.5" y="4.5" width="19" height="15" rx="4" fill="%(c)s" stroke="%(c)s"></rect><path d="m10 9 5 3-5 3z" fill="%(k)s" stroke="%(k)s" stroke-width="1.2" stroke-linejoin="round"></path>',
 'msg': '<path d="M20.5 15a2 2 0 0 1-2 2H7.5l-4 3.5V5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" fill="%(c)s" stroke="%(c)s"></path>',
}

def icon(n, s=20, col=TX, sw=2, fill='none', style=''):
    return ('<svg width="%s" height="%s" viewBox="0 0 24 24" fill="%s" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink: 0; display: block;%s">%s</svg>') % (s, s, fill, col, sw, style, IC[n])
def star(s=12, col=GOLD): return icon('star', s, col, 1, fill=col)
def stars(n, s=12, total=5): return '<span style="display: inline-flex; gap: 1px;">%s</span>' % ''.join(star(s, GOLD if i < n else '#48484A') for i in range(total))

LOGO_VB = '217 215 593 593'
LOGO_R = 'M609 415 L603 415 L545 470 L539 496 L539 516 L543 534 L542 541 L537 541 L527 536 L513 534 L490 534 L471 540 L393 614 L388 625 L385 638 L386 664 L390 677 L404 702 L497 800 L502 800 L748 567 L748 562 L698 510 L693 510 L624 575 L619 575 L617 573 L612 560 L608 540 L608 524 L611 512 L619 502 L655 469 L655 464ZM579 613 L579 618 L494 698 L490 698 L469 676 L461 665 L460 657 L463 650 L517 600 L526 597 L547 598 L560 602Z'
LOGO_G = 'M800 515 L537 238 L519 227 L506 223 L483 224 L467 231 L451 243 L247 436 L233 456 L227 477 L228 503 L236 522 L348 640 L550 448 L482 377 L436 420 L436 422 L449 436 L449 439 L348 535 L344 536 L311 502 L308 496 L309 489 L498 309 L508 308 L751 563 L800 517Z'
def mark(s=30, anim=False, label=None):
    c1 = ' class="rf1"' if anim else ''; c2 = ' class="rf2"' if anim else ''
    aria = 'role="img" aria-label="%s"' % label if label else 'aria-hidden="true"'
    return ('<svg width="%d" height="%d" viewBox="%s" %s style="flex-shrink: 0; display: block;">'
            '<path%s d="%s" fill="#F8F8F8" fill-rule="evenodd"></path><path%s d="%s" fill="#BC0C0C" fill-rule="evenodd"></path></svg>') % (s, s, LOGO_VB, aria, c1, LOGO_R, c2, LOGO_G)
def wordmark(size=21):
    return ('<div style="font-family: %s; font-size: %dpx; font-weight: 700; letter-spacing: -0.035em; line-height: 1; color: #F5F5F7;">game<span style="color: #BC0C0C;">risen</span></div>') % (FD, size)

def img(k, w, h, r=16, pos='center', alt='', extra=''):
    return '<img src="%s" alt="%s" style="width: %spx; height: %spx; object-fit: cover; object-position: %s; border-radius: %spx; display: block; flex-shrink: 0;%s">' % (art(k), alt, w, h, pos, r, extra)
def txt(t, fs, lh, w=400, col=TX, cls='', extra='', font=F, tag='div'):
    c = ' class="%s"' % cls if cls else ''
    return '<%s%s style="font-family: %s; font-size: %dpx; line-height: %dpx; font-weight: %d; color: %s;%s">%s</%s>' % (tag, c, font, fs, lh, w, col, extra, t, tag)

STORES = {'Steam': ('S', '#2B4566'), 'Epic Games': ('E', '#3A3B45'), 'Epic': ('E', '#3A3B45'), 'GOG': ('G', '#4B3868'), 'Humble': ('H', '#8A3B2E'),
          'Fanatical': ('F', '#8A5A1E'), 'Microsoft Store': ('M', '#23603A'), 'Xbox Store': ('X', '#23603A'), 'PlayStation Store': ('P', '#1F3F7A'), 'Nintendo eShop': ('N', '#7A2323')}
def mono(st, s=16, fs=9, r=5):
    l, bg = STORES[st]
    return ('<span aria-hidden="true" style="width: %dpx; height: %dpx; border-radius: %dpx; background: %s; color: #F5F5F7; font-size: %dpx; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; letter-spacing: 0;">%s</span>') % (s, s, r, bg, fs, l)
def store(name, fs=12, col=T2, label=None, s=16):
    return '<span style="display: inline-flex; align-items: center; gap: 5px; font-size: %dpx; line-height: 16px; color: %s; font-weight: 500; white-space: nowrap;">%s%s</span>' % (fs, col, mono(name, s), label or name)

def disc(t, fs=12, h=22): return '<span class="num" style="display: inline-flex; align-items: center; height: %dpx; padding: 0 7px; background: %s; color: #00210B; font-size: %dpx; font-weight: 700; border-radius: 6px; flex-shrink: 0; white-space: nowrap; letter-spacing: 0;">%s</span>' % (h, GREEN, fs, t)
def old(p, fs=13): return '<span class="num" style="font-size: %dpx; color: %s; text-decoration: line-through; white-space: nowrap;">%s</span>' % (fs, T3, p)
def price(p, fs=18, w=700, col=TX): return '<span class="num" style="font-family: %s; font-size: %dpx; font-weight: %d; color: %s; white-space: nowrap; letter-spacing: -0.02em;">%s</span>' % (FD, fs, w, col, p)
def drop(t, fs=12, col=GREEN, ic='down'): return '<span style="display: inline-flex; align-items: center; gap: 4px; font-size: %dpx; line-height: 16px; font-weight: 600; color: %s; white-space: nowrap;">%s%s</span>' % (fs, col, icon(ic, fs + 2, col, 2.4), t)

def status(kind):
    base = 'display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 8px; border-radius: 6px; font-size: 12px; font-weight: 600; flex-shrink: 0; white-space: nowrap;'
    if kind == 'playing': return '<span style="%s background: %s; color: %s;"><span style="width: 6px; height: 6px; border-radius: 999px; background: %s;"></span>Oynuyor</span>' % (base, GREENT, GREEN, GREEN)
    if kind == 'done': return '<span style="%s background: rgba(255,255,255,0.1); color: %s;">%sTamamladı</span>' % (base, TX, icon('checkc', 12, TX, 2.2))
    if kind == 'rec': return '<span style="%s background: %s; color: %s;">%sTavsiye ediyor</span>' % (base, GOLDT, GOLD, icon('star', 11, GOLD, 1, fill=GOLD))
    return ''
def badge(t, kind='lv'):
    base = 'display: inline-flex; align-items: center; gap: 3px; height: 18px; padding: 0 6px; border-radius: 5px; font-size: 11px; font-weight: 700; flex-shrink: 0; letter-spacing: 0;'
    if kind == 'lv': return '<span style="%s background: rgba(255,255,255,0.12); color: %s;">%s</span>' % (base, TX, t)
    if kind == 'trophy': return '<span style="%s background: %s; color: %s;">%s%s</span>' % (base, GOLDT, GOLD, icon('trophy', 11, GOLD, 2.2), t)
    if kind == 'q': return '<span style="%s background: rgba(255,255,255,0.12); color: %s;">%s%s</span>' % (base, TX, icon('help', 11, TX, 2.2), t)
    if kind == 'poll': return '<span style="%s background: rgba(255,255,255,0.12); color: %s;">%s%s</span>' % (base, TX, icon('poll', 11, TX, 2.2), t)
    if kind == 'mod': return '<span style="%s background: rgba(255,255,255,0.12); color: %s;">%s%s</span>' % (base, TX, icon('shield', 11, TX, 2.2), t)
    return ''
def fresh(t, hot=True):
    if hot: return '<span style="display: inline-flex; align-items: center; gap: 6px; color: %s; font-weight: 600;"><span class="live" style="width: 7px; height: 7px; border-radius: 999px; background: %s;"></span>%s</span>' % (RED, RED, t)
    return '<span style="color: %s;">%s</span>' % (T3, t)
def count(n, h=20): return '<span class="num" style="min-width: %dpx; height: %dpx; padding: 0 6px; box-sizing: border-box; border-radius: 999px; background: %s; color: %s; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">%s</span>' % (h, h, ACF, ONACF, n)

AVC = ['#48484A', '#2F4A45', '#5A4535', '#34435A', '#4E3A45', '#44492F', '#4A3434']
def avatar(k=None, s=40, init=None, bg=None, online=False, ring=False, pos='center', ob=BG, gk=None):
    if k: inner = '<img src="%s" alt="" style="width: %dpx; height: %dpx; border-radius: 999px; object-fit: cover; object-position: %s; display: block;">' % (art(k), s, s, pos)
    else: inner = '<span style="width: %dpx; height: %dpx; border-radius: 999px; background: %s; color: #F5F5F7; font-size: %dpx; font-weight: 600; display: flex; align-items: center; justify-content: center; letter-spacing: 0;">%s</span>' % (s, s, bg or AVC[0], int(s * .4), init)
    extra = ''
    if online:
        d = max(10, int(s * .28))
        extra += '<span style="position: absolute; right: -1px; bottom: -1px; width: %dpx; height: %dpx; border-radius: 999px; background: %s; border: 2.5px solid %s; box-sizing: border-box;"></span>' % (d, d, GREEN, ob)
    if gk:
        g = int(s * .46)
        extra += '<span style="position: absolute; right: -4px; bottom: -4px; display: flex; border-radius: 8px; box-shadow: 0 0 0 2.5px %s;">%s</span>' % (ob, img(gk, g, g, 7))
    if ring:
        return '<div style="position: relative; width: %dpx; height: %dpx; flex-shrink: 0; border-radius: 999px; padding: 3px; border: 2px solid %s; box-sizing: content-box;">%s%s</div>' % (s, s, AC, inner, extra)
    return '<div style="position: relative; width: %dpx; height: %dpx; flex-shrink: 0;">%s%s</div>' % (s, s, inner, extra)

def btn(label, kind='primary', h=48, w=None, icon_=None, href=None, fs=None, extra='', aria=None, icon_right=None, flex=False):
    fs = fs or (16 if h >= 48 else 15 if h >= 44 else 14)
    r = 12 if h >= 40 else 10
    bg, col = {'primary': (ACS, ONAC), 'secondary': (S2, TX), 'tertiary': ('transparent', AC), 'destructive': ('transparent', RED), 'tinted': (ACT, AC), 'onart': ('rgba(255,255,255,0.16)', '#FFFFFF')}[kind]
    ww = 'width: %dpx;' % w if w else ('flex: 1 1 0;' if flex else 'padding: 0 %dpx;' % (18 if h >= 44 else 14))
    ic = icon(icon_, fs + 2, col, 2.2) if icon_ else ''
    icr = icon(icon_right, fs + 1, col, 2.2) if icon_right else ''
    blur = ' -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);' if kind == 'onart' else ''
    st = 'height: %dpx; %s box-sizing: border-box; border-radius: %dpx; background: %s; color: %s; font-size: %dpx; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; flex-shrink: 0; white-space: nowrap;%s%s' % (h, ww, r, bg, col, fs, blur, extra)
    a = ' aria-label="%s"' % aria if aria else ''
    if href: return '<a href="%s" class="press"%s style="%s">%s%s%s</a>' % (href, a, st, ic, label, icr)
    return '<button class="press"%s style="%s">%s%s%s</button>' % (a, st, ic, label, icr)

def iconbtn(n, label, s=22, col=TX, bg=None, size=44, dot=False, onart=False, href=None, extra='', badge_=None):
    b = 'background: %s;' % bg if bg else ''
    if onart: b = DARKGLASS
    d = '<span style="position: absolute; top: 9px; right: 10px; width: 8px; height: 8px; border-radius: 999px; background: %s; box-shadow: 0 0 0 2px %s;"></span>' % (RED, BG) if dot else ''
    if badge_: d = '<span class="num" style="position: absolute; top: 4px; right: 2px; min-width: 18px; height: 18px; padding: 0 5px; box-sizing: border-box; border-radius: 999px; background: %s; color: #FFFFFF; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;">%s</span>' % (BRAND, badge_)
    st = 'position: relative; width: %dpx; height: %dpx; border-radius: 999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; %s%s' % (size, size, b, extra)
    if href: return '<a href="%s" aria-label="%s" style="%s">%s%s</a>' % (href, label, st, icon(n, s, col), d)
    return '<button aria-label="%s" style="%s">%s%s</button>' % (label, st, icon(n, s, col), d)

def chip(t, active=False, h=34, icon_=None, chev=False, fs=14):
    bg = ACS if active else S2; col = ONAC if active else TX
    ic = icon(icon_, 15, col, 2.2) if icon_ else ''
    cv = icon('chevd', 14, col, 2.4) if chev else ''
    return '<button aria-pressed="%s" style="height: %dpx; padding: 0 14px; border-radius: 999px; background: %s; color: %s; font-size: %dpx; font-weight: 600; display: flex; align-items: center; gap: 6px; flex-shrink: 0; white-space: nowrap;">%s%s%s</button>' % ('true' if active else 'false', h, bg, col, fs, ic, t, cv)

def segmented(items, active=0, w=350, h=36, fs=13):
    n = len(items); sw = (w - 4) / n
    s = '<div role="tablist" style="position: relative; width: %dpx; height: %dpx; box-sizing: border-box; padding: 2px; border-radius: 10px; background: %s; display: flex; flex-shrink: 0;">' % (w, h, FILL)
    s += '<span style="position: absolute; top: 2px; left: %spx; width: %spx; height: %dpx; border-radius: 8px; background: #636366; box-shadow: 0 3px 8px rgba(0,0,0,0.18);"></span>' % (round(2 + active * sw, 2), round(sw, 2), h - 4)
    for i, t in enumerate(items):
        s += '<button role="tab" aria-selected="%s" style="position: relative; flex: 1 1 0; height: %dpx; font-size: %dpx; font-weight: 600; color: %s; text-align: center; white-space: nowrap;">%s</button>' % ('true' if i == active else 'false', h - 4, fs, TX, t)
    return s + '</div>'

def toggle(key, label, dflt=False):
    return ('<button role="switch" aria-label="%s" aria-checked="[[s.%s.on]]" onClick="[[s.%s.t]]" style="position: relative; width: 51px; height: 31px; border-radius: 999px; background: [[s.%s.bg]]; transition: background .2s ease-out; flex-shrink: 0;">'
            '<span style="position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; border-radius: 999px; background: #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: translateX([[s.%s.x]]px); transition: transform .2s cubic-bezier(.3,.9,.4,1);"></span></button>') % (label, key, key, key, key)
def static_toggle(on=True):
    return '<span aria-hidden="true" style="position: relative; width: 51px; height: 31px; border-radius: 999px; background: %s; flex-shrink: 0; display: block;"><span style="position: absolute; top: 2px; left: %dpx; width: 27px; height: 27px; border-radius: 999px; background: #FFFFFF;"></span></span>' % (GREEN if on else 'rgba(120,120,128,0.32)', 22 if on else 2)

def field(fid, label, value='', placeholder='', icon_=None, helper=None, state='default', trailing='', h=48, typ='text', w=None):
    ring = {'default': 'rgba(255,255,255,0.08)', 'focus': AC, 'error': RED, 'success': 'rgba(255,255,255,0.08)'}[state]
    ws = 'width: %dpx;' % w if w else ''
    s = '<div style="display: flex; flex-direction: column; gap: 6px;%s"><label for="%s" style="font-size: 13px; line-height: 18px; font-weight: 600; color: %s;">%s</label>' % (ws, fid, T2, label)
    s += '<div style="height: %dpx; box-sizing: border-box; border-radius: 12px; background: %s; box-shadow: inset 0 0 0 %spx %s; display: flex; align-items: center; gap: 10px; padding: 0 14px;">%s' % (h, S1, 2 if state in ('focus', 'error') else 1, ring, icon(icon_, 18, T2) if icon_ else '')
    s += '<input id="%s" type="%s" value="%s" placeholder="%s" style="flex: 1 1 auto; min-width: 0; height: %dpx; border: 0; background: transparent; color: %s; font-size: 16px; padding: 0;">%s</div>' % (fid, typ, value, placeholder, h - 2, TX, trailing)
    hh = 18 + 6 + h
    if helper:
        col = RED if state == 'error' else GREEN if state == 'success' else T3
        ic = icon('alert', 13, RED, 2.2) if state == 'error' else icon('checkc', 13, GREEN, 2.2) if state == 'success' else ''
        s += '<div style="display: flex; align-items: center; gap: 5px; font-size: 12px; line-height: 16px; color: %s;">%s%s</div>' % (col, ic, helper); hh += 6 + 16
    return s + '</div>', hh

def search_field(ph='Oyun, oyuncu, topluluk, haber ara', value=None, h=40, w=None, href=None, focus=False, fid='gr-q'):
    ws = 'width: %dpx;' % w if w else 'flex: 1 1 auto;'
    ring = ' box-shadow: inset 0 0 0 1.5px %s;' % AC if focus else ''
    inner = icon('search', 18, T2, 2.2)
    if value is not None:
        inner += '<label for="%s" style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%%);">Ara</label><input id="%s" type="search" value="%s" style="flex: 1 1 auto; min-width: 0; border: 0; background: transparent; color: %s; font-size: 16px; padding: 0; height: %dpx;"><button aria-label="Aramayı temizle" style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;"><span style="width: 18px; height: 18px; border-radius: 999px; background: #8E8E93; display: flex; align-items: center; justify-content: center;">%s</span></button>' % (fid, fid, value, TX, h - 4, icon('x', 11, S1, 3))
    else:
        inner += '<span style="flex: 1 1 auto; font-size: 16px; color: %s; white-space: nowrap; overflow: hidden;">%s</span>%s' % (T3, ph, icon('mic', 17, T2, 2))
    st = 'position: relative; height: %dpx; %s box-sizing: border-box; border-radius: 12px; background: %s; display: flex; align-items: center; gap: 8px; padding: 0 8px 0 12px; color: %s;%s' % (h, ws, FILL, T2, ring)
    if href: return '<a href="%s" aria-label="Arama" style="%s">%s</a>' % (href, st, inner)
    return '<div style="%s">%s</div>' % (st, inner)

def sec_head(title, link=None, href='#', sub=None, pad=20, right=None, fs=20):
    r = right or ''
    h2 = '<h2 style="margin: 0; font-family: %s; font-size: %dpx; line-height: 26px; font-weight: 700; letter-spacing: -0.02em; color: %s;">%s</h2>' % (FD, fs, TX, title)
    if link:
        r = '<a href="%s" style="display: flex; align-items: center; gap: 2px; height: 28px; font-size: 15px; font-weight: 500; color: %s;">%s%s</a>' % (href, T2, link, icon('chev', 16, T2, 2.4))
    s = '<div style="padding: 0 %dpx; display: flex; flex-direction: column; gap: 2px;"><div style="display: flex; align-items: center; justify-content: space-between; height: 28px;">%s%s</div>' % (pad, h2, r)
    h = 28
    if sub:
        s += txt(sub, 13, 18, 400, T2, 'c1'); h += 20
    return s + '</div>', h

TABS = [('home', 'Ana Sayfa', 'G-04-Home.dc.html'), ('users', 'Topluluk', 'G-10-Community.dc.html'), ('play', 'Videolar', 'G-14-Videos.dc.html'), ('msg', 'Mesajlar', 'G-18-Messages.dc.html'), ('me', 'Profil', 'G-21-Profile.dc.html')]
def tab_icon(key, on, col, s=24, k=None):
    if on: return '<svg width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: block;">%s</svg>' % (s, s, TAB_FILL[key] % {'c': col, 'k': k or BG2})
    return icon(key, s, col, 1.9)

# Sekme çubuğu — yalnızca ikon, platforma özel.
# iOS: yüzen Liquid Glass kapsül (350 × 62, alttan 21), seçili sekmede cam "mercek" + kırmızı dolu ikon.
# Android: Material 3 gezinme çubuğu (64 + 19 alt boşluk), seçili sekmede 56 × 32 hap göstergesi.
TAB_IOS_OFF = '#C7C7CC'
TAB_AND_OFF = '#A1A1A6'
def _tab_avatar(on, s, ring_off):
    return '<img src="%s" alt="" style="width: %dpx; height: %dpx; border-radius: 999px; object-fit: cover; display: block; box-sizing: border-box; border: 2px solid %s;">' % (art('eldenring'), s, s, AC if on else ring_off)
def tabbar_ios(active, abs_=True, tip=False):
    pos = 'position: absolute; left: 20px; right: 20px; bottom: 21px;' if abs_ else 'position: relative; width: 350px; flex-shrink: 0;'
    s = ('<nav data-gr-tabbar="ios" aria-label="Ana gezinme" style="%s height: 62px; box-sizing: border-box; padding: 0 4px; border-radius: 31px; '
         'background: rgba(30,30,32,0.64); -webkit-backdrop-filter: blur(24px) saturate(160%%); backdrop-filter: blur(24px) saturate(160%%); '
         'box-shadow: inset 0 0 0 0.5px rgba(255,255,255,0.14), inset 0 1px 0 rgba(255,255,255,0.1), 0 12px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3); '
         'display: flex; align-items: center; z-index: 5;">'
         '<span aria-hidden="true" style="position: absolute; left: 0; top: 0; right: 0; bottom: 0; border-radius: 31px; background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%%, rgba(255,255,255,0) 55%%); pointer-events: none;"></span>') % pos
    for key, label, href in TABS:
        on = key == active
        ico = _tab_avatar(on, 28, 'rgba(255,255,255,0.28)') if key == 'me' else tab_icon(key, on, AC if on else TAB_IOS_OFF, 26, '#303033')
        lens = ('<span aria-hidden="true" style="position: absolute; left: 50%; top: 5px; width: 60px; height: 52px; margin-left: -30px; border-radius: 26px; background: rgba(255,255,255,0.12); '
                'box-shadow: inset 0 0 0 0.5px rgba(255,255,255,0.16), inset 0 1px 0 rgba(255,255,255,0.12);"></span>') if on else ''
        bd = ('<span class="num" style="position: absolute; top: -5px; left: 17px; min-width: 18px; height: 18px; padding: 0 5px; box-sizing: border-box; border-radius: 999px; background: %s; color: #FFFFFF; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px #2A2A2D;">3</span>' % BRAND) if key == 'msg' else ''
        tt = ('<span aria-hidden="true" style="position: absolute; bottom: 70px; left: 50%%; transform: translateX(-50%%); height: 30px; padding: 0 12px; border-radius: 10px; background: %s; box-shadow: 0 8px 24px rgba(0,0,0,0.45); display: flex; align-items: center; font-size: 13px; font-weight: 600; white-space: nowrap;">%s</span>' % (S3, label)) if (tip and on) else ''
        s += ('<a href="%s" aria-label="%s"%s style="position: relative; flex: 1 1 0; height: 62px; display: flex; align-items: center; justify-content: center;">%s'
              '<span style="position: relative; display: flex;">%s%s</span>%s</a>') % (href, label, ' aria-current="page"' if on else '', lens, ico, bd, tt)
    return s + '</nav>'
def tabbar_android(active, abs_=True, tip=False):
    pos = 'position: absolute; left: 0; right: 0; bottom: 0;' if abs_ else 'position: relative; width: 390px; flex-shrink: 0;'
    s = '<nav data-gr-tabbar="android" aria-label="Ana gezinme" style="%s height: 83px; box-sizing: border-box; padding: 0 8px 19px; background: %s; display: flex; align-items: center; z-index: 5;">' % (pos, BG2)
    for key, label, href in TABS:
        on = key == active
        ico = _tab_avatar(on, 24, 'rgba(255,255,255,0.18)') if key == 'me' else tab_icon(key, on, AC if on else TAB_AND_OFF, 24, '#3C1113')
        ind = '<span aria-hidden="true" style="position: absolute; left: 50%%; top: 16px; width: 56px; height: 32px; margin-left: -28px; border-radius: 16px; background: %s;"></span>' % ACT if on else ''
        bd = ('<span class="num" style="position: absolute; top: -4px; left: 13px; min-width: 16px; height: 16px; padding: 0 4px; box-sizing: border-box; border-radius: 999px; background: %s; color: #FFFFFF; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;">3</span>' % BRAND) if key == 'msg' else ''
        tt = ('<span aria-hidden="true" style="position: absolute; bottom: 60px; left: 50%%; transform: translateX(-50%%); height: 32px; padding: 0 8px; border-radius: 4px; background: #E6E1E5; color: #1C1B1F; display: flex; align-items: center; font-size: 12px; font-weight: 500; white-space: nowrap;">%s</span>' % label) if (tip and on) else ''
        s += ('<a href="%s" aria-label="%s"%s style="position: relative; flex: 1 1 0; height: 64px; display: flex; align-items: center; justify-content: center;">%s'
              '<span style="position: relative; display: flex;">%s%s</span>%s</a>') % (href, label, ' aria-current="page"' if on else '', ind, ico, bd, tt)
    return s + '</nav>'
def tabbar(active, abs_=True):
    """Ekranlarda kullanılan sekme çubuğu: Tweaks → platform (iOS / Android) ile değişir."""
    return ('<sc-if value="[[pf.ios]]" hint-placeholder-val="[[true]]">%s</sc-if><sc-if value="[[pf.android]]" hint-placeholder-val="[[false]]">%s</sc-if>') % (tabbar_ios(active, abs_), tabbar_android(active, abs_))
TABBAR_H = 83

def page_head(title, right_html, sub=None):
    return ('<header style="padding: 54px 20px 0; height: 106px; box-sizing: border-box; flex-shrink: 0; display: flex; align-items: center;">'
            '<div style="display: flex; align-items: center; justify-content: space-between; height: 52px; width: 100%%;">'
            '<h1 style="margin: 0; font-family: %s; font-size: 28px; line-height: 34px; font-weight: 700; letter-spacing: -0.03em;">%s</h1>'
            '<div style="display: flex; align-items: center; gap: 4px; margin-right: -8px;">%s</div></div></header>') % (FD, title, right_html)
PH = 106
def nav_bar(title, back='G-04-Home.dc.html', right_html='', left_html=None, border=True, sub=None, back_label='Geri'):
    left = left_html if left_html is not None else '<a href="%s" aria-label="%s" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; margin-left: -10px;">%s</a>' % (back, back_label, icon('back', 24, TX, 2.3))
    t = '<div style="display: flex; flex-direction: column; align-items: center;"><span style="font-size: 17px; line-height: 22px; font-weight: 600;">%s</span>%s</div>' % (title, '<span style="font-size: 12px; line-height: 14px; color: %s;">%s</span>' % (T2, sub) if sub else '')
    return ('<header style="padding: 54px 16px 0; height: 98px; box-sizing: border-box; flex-shrink: 0; display: grid; grid-template-columns: 96px 1fr 96px; align-items: center; %s">'
            '<div style="display: flex; align-items: center;">%s</div><div style="display: flex; justify-content: center; min-width: 0;">%s</div><div style="display: flex; justify-content: flex-end; align-items: center; margin-right: -8px;">%s</div></header>') % (
        'border-bottom: 0.5px solid %s;' % LINE if border else '', left, t, right_html)
NB = 98

def rail(inner, gap=12, pad=20, h=None, align='flex-start'):
    hh = 'height: %dpx; ' % h if h else ''
    return '<div class="rail" style="%sdisplay: flex; gap: %dpx; padding: 0 %dpx; overflow-x: auto; align-items: %s;">%s</div>' % (hh, gap, pad, align, inner)
def stack(parts):
    out = ''; tot = 0
    for mt, html, h in parts:
        out += '<section style="margin-top: %dpx; height: %dpx; flex-shrink: 0; position: relative;">%s</section>\n' % (mt, h, html) if mt is not None else html
        tot += (mt or 0) + h
    return out, tot
def root(content, h, extra='', w=390):
    return '<div style="width: %dpx; height: %dpx; position: relative; overflow: hidden; background: %s; color: %s; font-family: %s; display: flex; flex-direction: column;%s">\n%s\n</div>' % (w, h, BG, TX, F, extra, content)
def pad(html, p=20): return '<div style="padding: 0 %dpx;">%s</div>' % (p, html)

JS = r"""
  tone() {
    var hex = String(this.props.accent || '#BC0C0C').replace('#', '');
    if (hex.length === 3) { hex = hex.split('').map(function (ch) { return ch + ch; }).join(''); }
    var r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) { r = 188; g = 12; b = 12; hex = 'BC0C0C'; }
    function lin(c) { c = c / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    function lum(x, y, z) { return 0.2126 * lin(x) + 0.7152 * lin(y) + 0.0722 * lin(z); }
    function h2(v) { var q = Math.round(Math.max(0, Math.min(255, v))).toString(16); return q.length < 2 ? '0' + q : q; }
    function f(p, q, t) { if (t < 0) { t += 1; } if (t > 1) { t -= 1; } if (t < 1 / 6) { return p + (q - p) * 6 * t; } if (t < 1 / 2) { return q; } if (t < 2 / 3) { return p + (q - p) * (2 / 3 - t) * 6; } return p; }
    var R = r / 255, G = g / 255, B = b / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn, hh = 0, ss = 0, L = (mx + mn) / 2;
    if (d > 0) { ss = L > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); if (mx === R) { hh = (G - B) / d + (G < B ? 6 : 0); } else if (mx === G) { hh = (B - R) / d + 2; } else { hh = (R - G) / d + 4; } hh = hh / 6; }
    var c = [r, g, b], bgl = lum(28, 28, 30);
    while ((lum(c[0], c[1], c[2]) + 0.05) / (bgl + 0.05) < 4.6 && L < 0.95) {
      L += 0.02;
      if (ss === 0) { c = [L * 255, L * 255, L * 255]; } else { var q2 = L < 0.5 ? L * (1 + ss) : L + ss - L * ss, p2 = 2 * L - q2; c = [f(p2, q2, hh + 1 / 3) * 255, f(p2, q2, hh) * 255, f(p2, q2, hh - 1 / 3) * 255]; }
    }
    var light = lum(r, g, b) > 0.4;
    return { ac: '#' + h2(c[0]) + h2(c[1]) + h2(c[2]), acF: '#' + hex, onAcF: light ? '#0A0A0B' : '#FFFFFF', acS: '#F5F5F7', onAc: '#0A0A0B', onAc2: 'rgba(10,10,11,0.55)',
      acT: 'rgba(' + r + ',' + g + ',' + b + ',0.24)', acL: 'rgba(' + r + ',' + g + ',' + b + ',0.45)' };
  }
  flag(key, dflt) { var s = this.state || {}; return s[key] === undefined ? !!dflt : !!s[key]; }
  toggler(key, dflt) { var self = this; return function () { var o = {}; o[key] = !self.flag(key, dflt); self.setState(o); }; }
  wish(key, dflt) { var on = this.flag(key, dflt); return { fill: on ? '#F34545' : 'none', stroke: on ? '#F34545' : '#F5F5F7', cls: on ? 'is-on' : '', on: on, label: on ? 'İstek listesinden çıkar' : 'İstek listesine ekle', t: this.toggler(key, dflt) }; }
  like(key, base, dflt) { var on = this.flag(key, dflt); var n = base + (on ? 1 : 0) - (dflt ? 1 : 0); return { fill: on ? '#F34545' : 'none', stroke: on ? '#F34545' : '#A1A1A6', col: on ? '#F34545' : '#A1A1A6', cls: on ? 'is-on' : '', on: on, n: String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'), t: this.toggler(key, dflt) }; }
  bm(key, dflt, ac) { var on = this.flag(key, dflt); return { fill: on ? ac : 'none', stroke: on ? ac : '#A1A1A6', cls: on ? 'is-on' : '', on: on, label: on ? 'Kaydedildi' : 'Kaydet', t: this.toggler(key, dflt) }; }
  sw(key, dflt) { var on = this.flag(key, dflt); return { on: on, bg: on ? '#30D158' : 'rgba(120,120,128,0.32)', x: on ? 20 : 0, t: this.toggler(key, dflt) }; }
  csel(key, dflt, t) { var on = this.flag(key, dflt); return { on: on, bg: on ? t.acS : '#2C2C2E', col: on ? t.onAc : '#F5F5F7', t: this.toggler(key, dflt) }; }
  one(group, id, dflt, t) { var s = this.state || {}; var cur = s[group] === undefined ? dflt : s[group]; var on = cur === id; var self = this; return { on: on, bg: on ? t.acS : '#2C2C2E', col: on ? t.onAc : '#F5F5F7', t: function () { var o = {}; o[group] = id; self.setState(o); } }; }
  follow(key, dflt, t) { var on = this.flag(key, dflt); return { on: on, off: !on, label: on ? 'Takip ediliyor' : 'Takip et', bg: on ? '#2C2C2E' : t.acS, col: on ? '#A1A1A6' : t.onAc, cls: on ? 'is-on' : '', t: this.toggler(key, dflt) }; }
"""
def script(vals='{}', extra=''):
    return ('class Component extends DCLogic {\n' + JS + extra + '  renderVals() {\n    var t = this.tone();\n    var v = ' + vals + ';\n    for (var k in v) { t[k] = v[k]; }\n    return t;\n  }\n}\n')
def props(w, h, platform=False):
    p = {'accent': {'editor': 'color', 'default': '#BC0C0C', 'options': ['#BC0C0C', '#F5F5F7', '#0A84FF'], 'section': 'Vurgu'}, '$preview': {'width': w, 'height': h}}
    if platform: p['platform'] = {'editor': 'enum', 'default': 'iOS', 'options': ['iOS', 'Android'], 'section': 'Sekme çubuğu'}
    return json.dumps(p, ensure_ascii=False).replace('&', '&amp;').replace("'", '&#39;')
def page(title, w, h, body, js=None, css_extra=''):
    js = js or script()
    plat = 'pf.ios' in body
    if plat:
        js = js.replace('    var t = this.tone();\n', "    var t = this.tone();\n    t.pf = { ios: this.props.platform !== 'Android', android: this.props.platform === 'Android' };\n", 1)
    html = ('<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n<title>%s</title>\n<script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n'
            '<link rel="stylesheet" href="%s">\n<style>%s</style>\n</helmet>\n%s\n</x-dc>\n'
            "<script type=\"text/x-dc\" data-dc-script data-props='%s'>\n%s</script>\n</body>\n</html>\n") % (title, FONTS, CSS + css_extra, body, props(w, h, plat), js)
    html = html.replace('}}', '} }')
    return html.replace('[[', '{{').replace(']]', '}}')
