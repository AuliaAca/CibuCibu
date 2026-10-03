"""Draws Cibu's wardrobe accessories as clean SVGs (sheet style: darker outline,
soft gradients, one highlight). Run: python3 tools/wear/draw_wear.py"""
import math, os
OUT = os.path.join(os.path.dirname(__file__), "../../public/assets/wear-extra")

def save(name, w, h, body):
    open(os.path.join(OUT, name + ".svg"), "w").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">\n{body}\n</svg>\n')

def lg(id, c1, c2, vertical=True):
    xy = 'x1="0" y1="0" x2="0" y2="1"' if vertical else 'x1="0" y1="0" x2="1" y2="0"'
    return f'<linearGradient id="{id}" {xy}><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>'

GOLD = '<radialGradient id="au" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff6c4"/><stop offset=".55" stop-color="#f5c843"/><stop offset="1" stop-color="#b8841a"/></radialGradient>'

# ---------------------------------------------------------------- beanies
def beanie(name, c1, c2, line, pom=True):
    dy = 22 if pom else 0
    ribs = "".join(f'<path d="M{x} {126+dy} L{x} {164+dy}" />' for x in range(34, 232, 14))
    dome_lines = "".join(f'<path d="M{130+k*26} {30+dy+abs(k)*6} Q{130+k*40} {80+dy} {130+k*46} {120+dy}"/>' for k in (-3, -2, -1, 1, 2, 3))
    pompom = (f'<circle cx="130" cy="{24}" r="22" fill="url(#p)" stroke="{line}" stroke-width="5"/>'
              f'<circle cx="122" cy="16" r="6" fill="#fff" opacity=".45"/>') if pom else ""
    dome = f"M26 {128+dy} C 22 {58+dy} 70 {16+dy} 130 {16+dy} C 190 {16+dy} 238 {58+dy} 234 {128+dy} Z"
    save(name, 260, 172 + dy, f'''<defs>{lg("b", c1, c2)}{lg("p", c1, c2)}<clipPath id="d"><path d="{dome}"/></clipPath></defs>
  {pompom}
  <path d="M26 {128+dy} C 22 {58+dy} 70 {16+dy} 130 {16+dy} C 190 {16+dy} 238 {58+dy} 234 {128+dy} Z" fill="url(#b)" stroke="{line}" stroke-width="5" stroke-linejoin="round"/>
  <g fill="none" stroke="{line}" stroke-width="2.5" opacity=".35" clip-path="url(#d)">{dome_lines}</g>
  <path d="M60 {48+dy} Q86 {30+dy} 116 {28+dy}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".3"/>
  <rect x="14" y="{118+dy}" width="232" height="50" rx="22" fill="url(#b)" stroke="{line}" stroke-width="5"/>
  <g stroke="{line}" stroke-width="3" opacity=".4" stroke-linecap="round">{ribs}</g>''')

beanie("beanie-navy", "#6f7fc8", "#3f4c8f", "#27306a")
beanie("beanie-blue", "#9db6f2", "#6b86d6", "#3f55a6")
beanie("beanie-sage", "#b9d8b0", "#86b27e", "#4d7a48", pom=False)

# ---------------------------------------------------------------- caps
def cap(name, c1, c2, line, logo, brim_side="right", back=False):
    crown = "M40 124 C 36 52 86 18 140 18 C 194 18 242 52 240 124 Z"
    seams = f'<g fill="none" stroke="{line}" stroke-width="2.5" opacity=".35"><path d="M140 20 Q118 70 110 122"/><path d="M140 20 Q164 70 172 122"/></g>'
    if brim_side == "right":
        brim = f'<path d="M150 116 C 206 104 268 110 278 132 C 266 150 204 146 150 140 Z" fill="url(#br)" stroke="{line}" stroke-width="5" stroke-linejoin="round"/>'
    else:
        brim = f'<path d="M130 116 C 74 104 12 110 2 132 C 14 150 76 146 130 140 Z" fill="url(#br)" stroke="{line}" stroke-width="5" stroke-linejoin="round"/>'
    front = ""
    if back:
        # backwards snapback: we see the strap arch + snap buttons, never a hole
        front = (f'<path d="M110 124 Q110 92 140 92 Q170 92 170 124 Z" fill="{c2}" stroke="{line}" stroke-width="4"/>'
                 f'<path d="M104 118 L176 118" stroke="#2c2931" stroke-width="10" stroke-linecap="round"/>'
                 f'<circle cx="126" cy="118" r="3.5" fill="#d8d6de"/><circle cx="140" cy="118" r="3.5" fill="#d8d6de"/><circle cx="154" cy="118" r="3.5" fill="#d8d6de"/>')
    body = f'''<defs>{lg("b", c1, c2)}{lg("br", c2, c1)}</defs>
  {brim if back else ""}
  <path d="{crown}" fill="url(#b)" stroke="{line}" stroke-width="5" stroke-linejoin="round"/>
  {seams}
  <circle cx="140" cy="20" r="8" fill="url(#b)" stroke="{line}" stroke-width="4"/>
  <path d="M70 52 Q96 32 126 30" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".3"/>
  {logo}
  <path d="M40 120 Q140 140 240 120 L240 132 Q140 152 40 132 Z" fill="{c2}" stroke="{line}" stroke-width="4" stroke-linejoin="round"/>
  {front}
  {"" if back else brim}'''
    save(name, 280, 160, body)

cap("cap-red", "#f0555a", "#c12f3c", "#7e1822",
    '<path d="M140 58 C 124 58 118 72 118 84 L162 84 C 162 72 156 58 140 58 Z" fill="none" stroke="#ffd45a" stroke-width="7" stroke-linejoin="round"/>')
cap("cap-back", "#4a4652", "#25222b", "#0d0c10",
    '<path d="M140 50 L146 64 L161 64 L149 73 L154 88 L140 79 L126 88 L131 73 L119 64 L134 64 Z" fill="#fff" opacity=".9"/>',
    brim_side="left")

# ---------------------------------------------------------------- bucket hat (peach)
save("bucket-peach", 300, 176, f'''<defs>{lg("b", "#ffc79a", "#f19a5c")}{lg("br", "#f7ae76", "#e08448")}</defs>
  <path d="M78 116 C 74 50 108 22 150 22 C 192 22 226 50 222 116 Z" fill="url(#b)" stroke="#a4521c" stroke-width="5" stroke-linejoin="round"/>
  <path d="M96 52 Q116 34 140 32" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".35"/>
  <circle cx="150" cy="70" r="17" fill="#ffe8a8" stroke="#a4521c" stroke-width="3.5"/>
  <circle cx="144" cy="67" r="2.6" fill="#5a3218"/><circle cx="156" cy="67" r="2.6" fill="#5a3218"/>
  <path d="M143 74 Q150 80 157 74" fill="none" stroke="#5a3218" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M16 158 C 36 112 90 106 150 106 C 210 106 264 112 284 158 C 240 174 60 174 16 158 Z" fill="url(#br)" stroke="#a4521c" stroke-width="5" stroke-linejoin="round"/>
  <path d="M34 152 C 70 162 230 162 266 152" fill="none" stroke="#a4521c" stroke-width="2.5" stroke-dasharray="6 7" opacity=".55"/>
  <path d="M76 104 Q150 122 224 104 L224 118 Q150 136 76 118 Z" fill="#d9773a" stroke="#a4521c" stroke-width="4" stroke-linejoin="round"/>''')

# ---------------------------------------------------------------- newsboy cap (grey tweed)
save("newsboy", 290, 160, f'''<defs>{lg("b", "#9fa3b8", "#6c7086")}{lg("br", "#7c8098", "#555970")}
  <pattern id="tw" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 6 H12 M6 0 V12" stroke="#fff" stroke-width="1.2" opacity=".14"/></pattern></defs>
  <path d="M26 112 C 10 62 70 20 152 22 C 232 24 282 62 262 110 Z" fill="url(#b)" stroke="#3c3f52" stroke-width="5" stroke-linejoin="round"/>
  <path d="M26 112 C 10 62 70 20 152 22 C 232 24 282 62 262 110 Z" fill="url(#tw)"/>
  <g fill="none" stroke="#3c3f52" stroke-width="2.5" opacity=".35"><path d="M150 24 Q110 60 88 108"/><path d="M152 24 Q196 60 214 108"/></g>
  <circle cx="151" cy="26" r="8" fill="url(#b)" stroke="#3c3f52" stroke-width="4"/>
  <path d="M60 58 Q94 34 130 32" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".28"/>
  <path d="M56 106 Q146 128 236 106 L236 116 Q146 140 56 116 Z" fill="#5d6176" stroke="#3c3f52" stroke-width="4" stroke-linejoin="round"/>
  <path d="M72 116 Q146 142 222 116 Q216 146 146 152 Q80 146 72 116 Z" fill="url(#br)" stroke="#3c3f52" stroke-width="5" stroke-linejoin="round"/>''')

# ---------------------------------------------------------------- body wear (clip: masked to Cibu)
# neckline is a gentle U (mid dips DIP/2 px); everything below is cloth, clipped to Cibu's body
DIP = 24
def neck(y0=0, extra=0):
    return f"M0 {y0} Q200 {y0 + DIP + extra} 400 {y0}"
def mid(y0=0, extra=0):
    return y0 + (DIP + extra) / 2
def garment(name, defs, fill, collar, extra="", h=170):
    shape = f"{neck()} L400 {h} L0 {h} Z"
    save(name, 400, h, f'''<defs>{defs}</defs>
  <path d="{shape}" fill="{fill}"/>
  {extra}
  {collar}''')
def band(y1, extra=0, **kw):
    """collar band from the neckline down to y1 at the sides"""
    return f"{neck()} L400 {y1} Q200 {y1 + DIP + extra} 0 {y1} Z"

# sweater: cream cable knit, ribbed collar
cables = "".join(f'<path d="M{x-9} {y} L{x} {y+9} L{x+9} {y}" />' for x in (120, 280) for y in range(34, 170, 14))
knit = "".join(f'<path d="M{x} 20 V170"/>' for x in range(20, 400, 24))
ribs = "".join(f'<path d="M{x} {DIP/2*(1-((x-200)/200)**2)*2*0.5:.1f} v14"/>' for x in range(14, 400, 12))
garment("sweater-cream", lg("b", "#f7ead3", "#e3c9a0"), "url(#b)",
    f'<path d="{band(16)}" fill="#e6cfa8" stroke="#b08d5c" stroke-width="3.5"/><g stroke="#b08d5c" stroke-width="2.5" opacity=".55">{ribs}</g>',
    extra=f'<g fill="none" stroke="#c9a672" stroke-width="3" opacity=".5">{knit}</g><g fill="none" stroke="#b08d5c" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">{cables}</g>')

# pajama: soft blue with little stars, rounded collar + buttons
def star(cx, cy, r):
    p = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5; rr = r if i % 2 == 0 else r * .45
        p.append(f"{cx + rr*math.cos(a):.1f} {cy + rr*math.sin(a):.1f}")
    return "M" + " L".join(p) + "Z"
stars = "".join(f'<path d="{star(x, y, 6)}"/>' for (x, y) in [(60,50),(120,92),(300,50),(350,100),(80,132),(262,132),(150,150),(40,90),(360,30),(110,40)])
m = mid()
garment("pajama-blue", lg("b", "#c9dcfa", "#98b6ea"), "url(#b)",
    f'<path d="{band(10)}" fill="#a9c3f0" stroke="#6f8fcf" stroke-width="3"/>'
    f'<path d="M156 {m+2} Q176 {m+36} 200 {m+14} Q224 {m+36} 244 {m+2} Q222 {m+10} 200 {m+8} Q178 {m+10} 156 {m+2} Z" fill="#fff" stroke="#6f8fcf" stroke-width="3.5" stroke-linejoin="round"/>'
    f'<path d="M200 {m+14} V170" stroke="#6f8fcf" stroke-width="3.5"/>'
    + "".join(f'<circle cx="212" cy="{m+y}" r="5" fill="#fff" stroke="#6f8fcf" stroke-width="2.5"/>' for y in (40, 74, 108)),
    extra=f'<g fill="#fff6c9" stroke="#e7c85c" stroke-width="1.5">{stars}</g>')

# striped home tee
stripes = "".join(f'<path d="M0 {y} Q200 {y+DIP} 400 {y}" />' for y in range(30, 190, 24))
garment("tee-stripe", lg("b", "#ffffff", "#e9eef7"), "url(#b)",
    f'<path d="{band(12)}" fill="#3f5aa6" stroke="#2c3f7a" stroke-width="3"/>',
    extra=f'<g fill="none" stroke="#5b76c2" stroke-width="9">{stripes}</g>')

# royal robe: red velvet with damask, ermine collar, gold chain & jewelled placket
ermine = "".join(f'<path d="M{x} {y} q2.5 5 0 9 q-2.5 -4 0 -9Z" />' for (x, y) in [(28,6),(84,13),(140,17),(260,17),(316,13),(372,6)])
m2 = mid(22, 8)
garment("robe-royal",
    lg("b", "#e24a5d", "#931a33") + GOLD + '<pattern id="dm" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M17 6 L23 17 L17 28 L11 17 Z" fill="none" stroke="#ffd36b" stroke-width="1.6" opacity=".45"/></pattern>',
    "url(#b)",
    f'<path d="M{186} {m2-4} L214 {m2-4} L214 170 L186 170 Z" fill="url(#au)" stroke="#9a6c12" stroke-width="3"/>'
    f'<circle cx="200" cy="{m2+30}" r="8" fill="#e8453c" stroke="#9a6c12" stroke-width="3"/><circle cx="197" cy="{m2+27}" r="2.4" fill="#fff"/>'
    f'<circle cx="200" cy="{m2+62}" r="7" fill="#5aa6e8" stroke="#9a6c12" stroke-width="3"/>'
    f'<circle cx="200" cy="{m2+94}" r="7" fill="#e8453c" stroke="#9a6c12" stroke-width="3"/>'
    f'<path d="{neck(22)} L400 30 Q200 {30 + DIP + 8} 0 30 Z" fill="url(#au)" stroke="#9a6c12" stroke-width="2.5"/>'
    f'<path d="{band(22, 8)}" fill="#fffaf2" stroke="#cfc2ad" stroke-width="3.5"/>'
    f'<g fill="#2b2230">{ermine}</g>'
    f'<path d="M138 {m2-8} C 156 {m2+14} 184 {m2+16} 200 {m2+8} C 216 {m2+16} 244 {m2+14} 262 {m2-8}" fill="none" stroke="url(#au)" stroke-width="6" stroke-linecap="round"/>'
    f'<circle cx="200" cy="{m2+8}" r="11" fill="url(#au)" stroke="#9a6c12" stroke-width="3"/><circle cx="200" cy="{m2+8}" r="4" fill="#e8453c"/>',
    extra='<path d="M0 0 L400 0 L400 170 L0 170 Z" fill="url(#dm)"/>')

# baddie: black leather jacket, open over a pink top, silver zips & studs
m = mid()
studs = "".join(f'<circle cx="{x}" cy="{m+y}" r="3" />' for (x, y) in [(150,10),(162,26),(250,10),(238,26)])
garment("leather-jacket", lg("b", "#45404c", "#141118"), "url(#b)",
    f'<path d="M168 {m-2} Q200 {m+2} 232 {m-2} L214 170 L186 170 Z" fill="#ff8fb8" stroke="#c9557f" stroke-width="3"/>'
    f'<path d="M168 {m-2} Q200 {m+8} 232 {m-2} L226 {m+10} Q200 {m+18} 174 {m+10} Z" fill="#ffc2d8" stroke="#c9557f" stroke-width="2.5"/>'
    f'<path d="M110 {m-8} L168 {m-2} L186 {m+70} L150 {m+34} Z" fill="#2a2630" stroke="#0b090e" stroke-width="3.5" stroke-linejoin="round"/>'
    f'<path d="M290 {m-8} L232 {m-2} L214 {m+70} L250 {m+34} Z" fill="#2a2630" stroke="#0b090e" stroke-width="3.5" stroke-linejoin="round"/>'
    f'<path d="M186 {m+70} L186 170 M214 {m+70} L214 170" stroke="#c9c6cf" stroke-width="4" stroke-dasharray="3 3"/>'
    f'<g fill="#d8d6de" stroke="#6f6b77" stroke-width="1.2">{studs}</g>'
    f'<path d="M{neck()[1:]}" fill="none" stroke="#0b090e" stroke-width="3"/>',
    extra='<path d="M60 40 Q90 30 120 36" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".18" fill="none"/>'
          '<path d="M300 44 Q330 38 356 44" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".14" fill="none"/>'
          '<path d="M40 130 L150 130 M250 130 L360 130" stroke="#c9c6cf" stroke-width="3.5" stroke-dasharray="3 3" opacity=".8"/>')

# baddie night: plum sequin top with a silver neckline & chain belt
import random
random.seed(7)
seq = "".join(f'<circle cx="{random.randint(4,396)}" cy="{random.randint(14,168)}" r="{random.choice([2.5,3,3.5])}" fill="{random.choice(["#d48ff0","#f3b6ff","#9d5cc4","#ffd9f6"])}" opacity="{random.choice([.7,.85,1])}"/>' for _ in range(170))
glints = "".join(f'<path d="M{x} {y-6} L{x+1.6} {y-1.6} L{x+6} {y} L{x+1.6} {y+1.6} L{x} {y+6} L{x-1.6} {y+1.6} L{x-6} {y} L{x-1.6} {y-1.6} Z" fill="#fff"/>' for (x, y) in [(90,50),(300,70),(170,120),(340,140),(50,110)])
links = "".join(f'<ellipse cx="{x}" cy="{118 + 10*math.sin(x/64)}" rx="7" ry="4"/>' for x in range(6, 400, 12))
garment("sequin-top", lg("b", "#6b3284", "#2b1036"), "url(#b)",
    f'<path d="{band(8)}" fill="#cfd2dc" stroke="#7d8192" stroke-width="2.5"/>',
    extra=f'{seq}{glints}<g fill="none" stroke="#e6e8ef" stroke-width="3">{links}</g>')

# baddie accessories (no clothes): studded headband + silver chain necklace
studs = "".join(f'<path d="M{x} {20+ 14*math.sin((x-20)/260*math.pi)-8} l5 10 h-10 Z" fill="#e6e8ef" stroke="#7d8192" stroke-width="1.5"/>' for x in range(40, 250, 26))
save("spike-band", 280, 70, f'''<defs>{lg("b", "#45404c", "#141118")}</defs>
  <path d="M10 46 Q140 -6 270 46" fill="none" stroke="#0b090e" stroke-width="18" stroke-linecap="round"/>
  <path d="M10 46 Q140 -6 270 46" fill="none" stroke="#2a2630" stroke-width="12" stroke-linecap="round"/>
  <path d="M40 34 Q110 8 170 14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".25"/>
  <g fill="#e6e8ef" stroke="#7d8192" stroke-width="1.5">{"".join(f'<circle cx="{x}" cy="{46 - 40*math.sin((x-10)/260*math.pi)*0.98 + 0.1:.1f}" r="4.5"/>' for x in range(34, 260, 24))}</g>''')

sl = "".join(f'<ellipse cx="{x}" cy="{12 + 70*(1-((x-110)/100)**2):.1f}" rx="7" ry="4" transform="rotate({(x-110)*0.35:.0f} {x} {12 + 70*(1-((x-110)/100)**2):.1f})"/>' for x in range(14, 210, 12) if abs(x-110) > 9)
save("silver-chain", 220, 110, f'''<defs><radialGradient id="ag" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#d7dbe6"/><stop offset="1" stop-color="#8d92a6"/></radialGradient></defs>
  <g fill="none" stroke="#6d7287" stroke-width="6.5">{sl}</g><g fill="none" stroke="url(#ag)" stroke-width="3.6">{sl}</g>
  <path d="M110 80 l14 14 l-14 22 l-14 -22 Z" transform="translate(0 -12)" fill="url(#ag)" stroke="#6d7287" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="110" cy="92" r="3" fill="#d48ff0"/>''')

# DJ headphones: slim band hugging the head, cups on the sides (clear of the face)
def cupgrp(x):
    return (f'<rect x="{x}" y="74" width="58" height="68" rx="24" fill="url(#c)" stroke="#232a57" stroke-width="5"/>'
            f'<rect x="{x+12}" y="88" width="34" height="40" rx="14" fill="#6d7bd6" stroke="#232a57" stroke-width="3"/>'
            f'<circle cx="{x+29}" cy="108" r="7" fill="#ffd45a" stroke="#232a57" stroke-width="2.5"/>')
save("headphones", 300, 160, f'''<defs>{lg("c", "#7483d8", "#3a4596")}</defs>
  <path d="M40 104 C 38 34 92 14 150 14 C 208 14 262 34 260 104" fill="none" stroke="#232a57" stroke-width="20" stroke-linecap="round"/>
  <path d="M40 104 C 38 34 92 14 150 14 C 208 14 262 34 260 104" fill="none" stroke="#5a68c4" stroke-width="12" stroke-linecap="round"/>
  <path d="M86 34 Q116 20 146 20" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".45"/>
  {cupgrp(10)}{cupgrp(232)}''')

# simple little-princess sash: thin pastel ribbon + small bow, no gold
save("sash-pink", 400, 110, f'''<defs>{lg("b", "#ffd3e2", "#f7a6c3")}</defs>
  <path d="M0 26 Q200 72 400 26 L400 52 Q200 98 0 52 Z" fill="url(#b)" stroke="#d9789d" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M30 42 Q200 84 370 42" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round" opacity=".9"/>
  <g stroke="#d9789d" stroke-width="3" stroke-linejoin="round" fill="#fff">
    <path d="M270 66 L246 52 Q240 66 246 80 Z"/><path d="M270 66 L294 52 Q300 66 294 80 Z"/>
    <path d="M266 70 L256 96 L264 92 L268 100 Z"/><path d="M274 70 L284 96 L276 92 L272 100 Z"/>
    <circle cx="270" cy="66" r="7" fill="#ffd3e2"/>
  </g>''')

# sporty sweatband (clip): terry white with blue stripes
dots = "".join(f'<circle cx="{x}" cy="{y}" r="1.6"/>' for x in range(8, 400, 12) for y in (12, 30))
save("sweatband", 400, 44, f'''<defs>{lg("b", "#ffffff", "#e6ecf3")}</defs>
  <rect x="0" y="2" width="400" height="40" fill="url(#b)" stroke="#9aa9bd" stroke-width="3"/>
  <rect x="0" y="11" width="400" height="6" fill="#4a90d9"/><rect x="0" y="27" width="400" height="6" fill="#4a90d9"/>
  <g fill="#9aa9bd" opacity=".35">{dots}</g>''')

# streetwear sling bag (clip): strap across the body + small pouch on the belly
save("sling-bag", 400, 170, f'''<defs>{lg("s", "#3b3542", "#1f1b25")}{lg("bg", "#8a6a55", "#5e4535")}</defs>
  <path d="M-10 30 L410 96 L410 116 L-10 50 Z" fill="url(#s)" stroke="#0f0d12" stroke-width="3"/>
  <path d="M-10 40 L410 106" stroke="#fff" stroke-width="2" stroke-dasharray="6 8" opacity=".35"/>
  <rect x="96" y="42" width="26" height="22" rx="4" transform="rotate(9 109 53)" fill="#c9c6cf" stroke="#4a4652" stroke-width="3"/>
  <rect x="214" y="62" width="104" height="72" rx="16" fill="url(#bg)" stroke="#3e2c21" stroke-width="4.5"/>
  <path d="M214 82 Q266 100 318 82 L318 76 Q318 62 302 62 L230 62 Q214 62 214 76 Z" fill="#735645" stroke="#3e2c21" stroke-width="4" stroke-linejoin="round"/>
  <rect x="258" y="84" width="16" height="12" rx="3" fill="#e9d9a0" stroke="#3e2c21" stroke-width="2.5"/>
  <path d="M228 118 H304" stroke="#3e2c21" stroke-width="2.5" stroke-dasharray="5 6" opacity=".6"/>''')
print("ok")
