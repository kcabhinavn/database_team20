#!/usr/bin/env python3
"""
RideSync design artefacts generator (Assignment 2, Step 2).

Draws every low-fidelity wireframe from one shared shell, grid and set of
component helpers so the screens stay consistent, plus the coloured UI kit and
the CSS design tokens the web app will import.

    python3 docs/design/src/build_design.py

Outputs:
    docs/design/wireframes/*.svg   low-fidelity wireframes (greyscale + annotations)
    docs/design/ui_kit.svg         colours, type and components in the real palette
    docs/design/tokens.css         CSS custom properties (single source for the UI)
    web/src/styles/tokens.css      the same tokens, imported by the web app
"""
from __future__ import annotations

import html
import math
import random
import textwrap
from datetime import date, datetime, timedelta
from pathlib import Path

DESIGN = Path(__file__).resolve().parent.parent
WF_DIR = DESIGN / "wireframes"
WEB_TOKENS = DESIGN.parent.parent / "web" / "src" / "styles" / "tokens.css"

FONT = "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
MONO = "'JetBrains Mono', Menlo, Consolas, monospace"

# Wireframe greys (deliberately colourless: colour lives in the UI kit).
INK, MUTED, FAINT = "#212529", "#6C757D", "#ADB5BD"
LINE, LINE2 = "#CED4DA", "#868E96"
FILL, FILL2, FILL3 = "#F1F3F5", "#E9ECEF", "#DEE2E6"
DARK, WHITE, PAGE = "#343A40", "#FFFFFF", "#F8F9FA"
BODY = "#495057"
NOTE, NOTE_BG, NOTE_LINE = "#E8590C", "#FFF9DB", "#FAB005"

CW = 1640                  # canvas width
FX, FY = 24, 84            # browser frame origin on the canvas
FW, VH = 1240, 840         # viewport (laptop)
BAR = 32                   # fake browser bar
VX, VY = FX, FY + BAR      # viewport origin
NX = FX + FW + 24          # annotation column
NW = CW - NX - 24
CTRL = 36                  # control height (matches --rs-control-height)


def esc(s) -> str:
    return html.escape(str(s), quote=True)


def tw(text: str, size: float) -> float:
    """Approximate rendered width; generous so fallback fonts still fit."""
    return len(text) * size * 0.6


def money(v: float, sign: bool = False) -> str:
    s = f"${abs(v):,.2f}"
    if v < 0:
        return "−" + s
    return ("+" + s) if sign else s


# --------------------------------------------------------------------------- #
# SVG primitives
# --------------------------------------------------------------------------- #
class Svg:
    def __init__(self, w: int, h: int):
        self.w, self.h, self.parts = w, h, []

    def raw(self, s: str) -> None:
        self.parts.append(s)

    def rect(self, x, y, w, h, fill="none", stroke=LINE, rx=0, sw=1, dash=None, opacity=None):
        extra = f' stroke-dasharray="{dash}"' if dash else ""
        if opacity is not None:
            extra += f' fill-opacity="{opacity}"'
        self.raw(f'<rect x="{x:.1f}" y="{y:.1f}" width="{max(w, 0):.1f}" height="{max(h, 0):.1f}" '
                 f'rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{extra}/>')

    def text(self, x, y, s, size=13, fill=INK, weight=400, anchor="start", mono=False,
             italic=False, spacing=None):
        extra = f' font-family="{MONO}"' if mono else ""
        if italic:
            extra += ' font-style="italic"'
        if spacing:
            extra += f' letter-spacing="{spacing}"'
        self.raw(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{fill}" '
                 f'font-weight="{weight}" text-anchor="{anchor}"{extra}>{esc(s)}</text>')

    def line(self, x1, y1, x2, y2, stroke=LINE, sw=1, dash=None):
        extra = f' stroke-dasharray="{dash}"' if dash else ""
        self.raw(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" '
                 f'stroke-width="{sw}" stroke-linecap="round"{extra}/>')

    def circle(self, cx, cy, r, fill="none", stroke=LINE, sw=1, dash=None, opacity=None):
        extra = f' stroke-dasharray="{dash}"' if dash else ""
        if opacity is not None:
            extra += f' fill-opacity="{opacity}"'
        self.raw(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="{fill}" stroke="{stroke}" '
                 f'stroke-width="{sw}"{extra}/>')

    def path(self, d, fill="none", stroke=INK, sw=1.5, dash=None, marker=None):
        extra = f' stroke-dasharray="{dash}"' if dash else ""
        if marker:
            extra += f' marker-end="url(#{marker})"'
        self.raw(f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" '
                 f'stroke-linejoin="round" stroke-linecap="round"{extra}/>')

    def g(self, tx, ty) -> None:
        self.raw(f'<g transform="translate({tx},{ty})">')

    def end(self) -> None:
        self.raw("</g>")

    def save(self, path: Path, bg: str = PAGE) -> None:
        body = "\n".join(self.parts)
        path.write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" '
            f'viewBox="0 0 {self.w} {self.h}" font-family="{FONT}">\n'
            f'<rect width="100%" height="100%" fill="{bg}"/>\n{body}\n</svg>\n',
            encoding="utf-8",
        )


# --------------------------------------------------------------------------- #
# Wireframe components (greyscale)
# --------------------------------------------------------------------------- #
def button(s, x, y, label, kind="primary", w=None, h=CTRL, size=13, icon=None):
    pad = 18 if icon else 0
    w = w or round(tw(label, size) + 30 + pad)
    fill, stroke, color = {
        "primary": (DARK, DARK, WHITE),
        "secondary": (WHITE, LINE2, INK),
        "ghost": ("none", "none", INK),
        "disabled": (FILL2, LINE, FAINT),
    }[kind]
    s.rect(x, y, w, h, fill, stroke, rx=6)
    cx = x + w / 2 + pad / 2
    if icon == "spinner":
        s.circle(cx - tw(label, size) / 2 - 12, y + h / 2, 6, "none", color, 2, dash="22 10")
    elif icon == "refresh":
        ix, iy = cx - tw(label, size) / 2 - 12, y + h / 2
        s.path(f"M{ix + 5},{iy - 3} A6,6 0 1 0 {ix + 6},{iy + 2}", stroke=color, sw=1.6)
        s.path(f"M{ix + 6},{iy - 7} L{ix + 6},{iy - 2} L{ix + 1},{iy - 2}", stroke=color, sw=1.6)
    s.text(cx, y + h / 2 + size * 0.36, label, size, color, 600, "middle")
    return w


def field(s, x, y, w, label=None, value="", *, placeholder=False, h=CTRL, suffix=None,
          prefix=None, error=None, helper=None, mono=False, focus=False, readonly=False,
          icon=None, size=13):
    if label:
        s.text(x, y - 8, label, 12, MUTED, 600)
    stroke, sw = (INK, 2) if (focus or error) else (LINE, 1)
    s.rect(x, y, w, h, FILL if readonly else WHITE, stroke, rx=6, sw=sw)
    tx, base = x + 12, y + h / 2 + size * 0.36
    if icon == "search":
        s.circle(x + 18, y + h / 2 - 1.5, 5.5, "none", MUTED, 1.6)
        s.line(x + 22, y + h / 2 + 2.5, x + 26, y + h / 2 + 6.5, MUTED, 1.6)
        tx = x + 34
    if prefix:
        s.text(tx, base, prefix, size, MUTED)
        tx += tw(prefix, size) + 4
    s.text(tx, base, value, size, FAINT if placeholder else INK, mono=mono)
    if suffix:
        s.text(x + w - 12, base, suffix, 12, MUTED, anchor="end")
    if error:
        s.text(x, y + h + 17, "⚠ " + error, 12, INK, 700)
    elif helper:
        s.text(x, y + h + 17, helper, 12, MUTED)


def badge_w(label, size=11):
    return len(label) * size * 0.68 + 18


def badge(s, x, y, label, kind="soft", size=11, h=20):
    w = badge_w(label, size)
    fill, stroke, color = {
        "solid": (DARK, DARK, WHITE),
        "soft": (FILL3, FILL3, INK),
        "outline": (WHITE, LINE2, INK),
        "dashed": (WHITE, LINE2, MUTED),
    }[kind]
    s.rect(x, y, w, h, fill, stroke, rx=h / 2, dash="3 2" if kind == "dashed" else None)
    s.text(x + w / 2, y + h / 2 + size * 0.36, label, size, color, 700, "middle", spacing=0.3)
    return w


STATUS_KIND = {
    "REQUESTED": "outline", "IN TRANSIT": "soft", "COMPLETED": "solid",
    "DEBIT": "outline", "CREDIT": "soft", "ACTIVE": "soft", "INACTIVE": "dashed",
    "NEW": "solid", "PASSED": "soft", "FAILED": "outline", "READ-ONLY": "outline",
}


def status(s, x, y, label):
    return badge(s, x, y, label, STATUS_KIND.get(label, "soft"))


def chip(s, x, y, label, active=False, h=28, size=12):
    w = tw(label, size) + 24
    s.rect(x, y, w, h, DARK if active else WHITE, DARK if active else LINE2, rx=h / 2)
    s.text(x + w / 2, y + h / 2 + size * 0.36, label, size, WHITE if active else INK, 600, "middle")
    return w


def chips(s, x, y, labels, active=None, gap=8, h=28, size=12):
    for lab in labels:
        x += chip(s, x, y, lab, lab == active, h, size) + gap
    return x


def seg(s, x, y, labels, active, h=30, size=12):
    widths = [tw(lab, size) + 24 for lab in labels]
    s.rect(x, y, sum(widths), h, WHITE, LINE2, rx=6)
    cx = x
    for i, (lab, w) in enumerate(zip(labels, widths)):
        if i == active:
            s.rect(cx + 2, y + 2, w - 4, h - 4, DARK, "none", rx=4)
        s.text(cx + w / 2, y + h / 2 + size * 0.36, lab, size, WHITE if i == active else INK, 600, "middle")
        cx += w
    return sum(widths)


def card(s, x, y, w, h, title=None, sub=None, right=None):
    s.rect(x, y, w, h, WHITE, LINE, rx=8)
    if title:
        s.text(x + 16, y + 28, title, 15, INK, 700)
    if sub:
        s.text(x + 16, y + 47, sub, 12, MUTED)
    if right:
        s.text(x + w - 16, y + 28, right, 12, INK, 600, anchor="end")


def kpi(s, x, y, w, label, value, sub=None, h=96, vsize=24):
    card(s, x, y, w, h)
    s.text(x + 16, y + 26, label, 12, MUTED, 600)
    s.text(x + 16, y + 58, value, vsize, INK, 700)
    if sub:
        s.text(x + 16, y + 81, sub, 12, MUTED)


def skel(s, x, y, w, h=12):
    s.rect(x, y, w, h, FILL2, "none", rx=h / 2)


def marker(s, n, x, y):
    s.circle(x, y, 11, NOTE, WHITE, 2)
    s.text(x, y + 4.3, str(n), 12, WHITE, 700, "middle")


def cell_draw(s, cx, ry, w, h, align, cell):
    if align == "l":
        ax, anc = cx + 12, "start"
    elif align == "r":
        ax, anc = cx + w - 12, "end"
    else:
        ax, anc = cx + w / 2, "middle"
    base = ry + h / 2 + 4.5
    if isinstance(cell, str):
        s.text(ax, base, cell, 13, INK, anchor=anc)
        return
    kind = cell[0]
    if kind == "mono":
        s.text(ax, base, cell[1], 12, MUTED, anchor=anc, mono=True)
    elif kind == "bold":
        s.text(ax, base, cell[1], 13, INK, 700, anc)
    elif kind == "muted":
        s.text(ax, base, cell[1], 13, MUTED, anchor=anc)
    elif kind == "status":
        bx = ax if align == "l" else (ax - badge_w(cell[1]) if align == "r" else ax - badge_w(cell[1]) / 2)
        status(s, bx, ry + h / 2 - 10, cell[1])
    elif kind == "chev":
        s.text(cx + w / 2, base + 1, "›", 18, MUTED, anchor="middle")
    elif kind == "check":
        s.text(cx + w / 2, base, "✓", 14, INK, 700, "middle")
    elif kind == "btn":
        bw = tw(cell[1], 12) + 24
        button(s, cx + w - 12 - bw, ry + (h - 26) / 2, cell[1], "secondary", bw, 26, 12)
    elif kind == "skel":
        skel(s, cx + 12, ry + h / 2 - 6, (w - 24) * cell[1])


def table(s, x, y, cols, rows, row_h=36, head_h=34, highlight=None, sort=None):
    """cols: [(label, width, align)], cells: str or (kind, ...) tuples."""
    width = sum(c[1] for c in cols)
    height = head_h + row_h * len(rows)
    s.rect(x, y, width, height, WHITE, LINE, rx=8)
    s.rect(x + 0.5, y + 0.5, width - 1, head_h - 0.5, FILL, "none", rx=7.5)
    s.rect(x + 0.5, y + head_h / 2, width - 1, head_h / 2, FILL, "none")
    cx = x
    for i, (label, w, align) in enumerate(cols):
        lab = label.upper()
        if sort and sort[0] == i:
            lab += " ↓" if sort[1] == "desc" else " ↑"
        ax, anc = {"l": (cx + 12, "start"), "r": (cx + w - 12, "end"), "c": (cx + w / 2, "middle")}[align]
        s.text(ax, y + head_h / 2 + 4, lab, 11, MUTED, 700, anc, spacing=0.4)
        cx += w
    for r, row in enumerate(rows):
        ry = y + head_h + r * row_h
        s.line(x, ry, x + width, ry, LINE)
        if highlight == r:
            s.rect(x + 1, ry + 0.5, width - 2, row_h - 1, FILL2, "none")
            s.rect(x + 1, ry + 0.5, 3, row_h - 1, DARK, "none")
        cx = x
        for (label, w, align), cell in zip(cols, row):
            cell_draw(s, cx, ry, w, row_h, align, cell)
            cx += w
    return width, height


def pagination(s, x, y, w, info, pages=("‹", "1", "2", "3", "…", "2,000", "›"),
               current="1", h=32):
    s.text(x, y + h / 2 + 4.5, info, 12, MUTED)
    bx = x + w
    for p in reversed(pages):
        bw = max(32, tw(p, 12) + 18)
        bx -= bw
        on = p == current
        s.rect(bx, y, bw, h, DARK if on else WHITE, DARK if on else LINE, rx=6)
        s.text(bx + bw / 2, y + h / 2 + 4.5, p, 12, WHITE if on else INK, 600, "middle")
        bx -= 6


def alert(s, x, y, w, h, kind, title, lines=(), actions=(), details=None, compact=False):
    glyph = {"error": "✕", "success": "✓", "info": "i", "warning": "!"}[kind]
    tsize, bsize, r = (13, 12, 10) if compact else (15, 13, 12)
    s.rect(x, y, w, h, FILL, LINE, rx=8)
    s.rect(x, y, 5, h, DARK, "none", rx=2)
    s.circle(x + 28, y + 26, r, DARK, "none")
    s.text(x + 28, y + 26 + tsize * 0.36, glyph, tsize, WHITE, 700, "middle")
    s.text(x + 50, y + 31, title, tsize, INK, 700)
    ly = y + 31 + (20 if compact else 24)
    for line in lines:
        s.text(x + 50, ly, line, bsize, BODY)
        ly += 18 if compact else 20
    ax = x + 50
    for label, kind_ in actions:
        ax += button(s, ax, ly - 4, label, kind_, h=30, size=12) + 8
    if details:
        dy = ly + 48 if actions else ly + 4
        s.text(x + 50, dy, "▸ Technical details: " + details, 11, MUTED, mono=True)


def stepper(s, x, y, w, steps, current):
    gap = w / (len(steps) - 1)
    for i in range(len(steps) - 1):
        x1, x2 = x + i * gap + 14, x + (i + 1) * gap - 14
        done = i < current
        s.line(x1, y, x2, y, DARK if done else LINE2, 2, None if done else "5 4")
    for i, lab in enumerate(steps):
        cx = x + i * gap
        if i < current:
            s.circle(cx, y, 11, DARK, DARK)
            s.text(cx, y + 4.5, "✓", 12, WHITE, 700, "middle")
        elif i == current:
            s.circle(cx, y, 11, WHITE, DARK, 3)
            s.circle(cx, y, 4, DARK, "none")
        else:
            s.circle(cx, y, 11, WHITE, LINE2, 1.5)
        s.text(cx, y + 30, lab, 11, INK if i <= current else MUTED, 700 if i == current else 500,
               "middle", spacing=0.3)


def hbars(s, x, y, w, items, label_w=96, bar_h=14, gap=13, value_w=96, fmt=None, shades=None):
    fmt = fmt or (lambda v: f"{v:,}")
    top = max(v for _, v in items)
    span = w - label_w - value_w
    for i, (lab, v) in enumerate(items):
        yy = y + i * (bar_h + gap)
        s.text(x, yy + bar_h - 2, lab, 12, INK)
        bl = max(span * v / top, 2)
        s.rect(x + label_w, yy, bl, bar_h, shades[i] if shades else "#ADB5BD", "none", rx=3)
        s.text(x + label_w + bl + 8, yy + bar_h - 2, fmt(v), 12, MUTED)


def stars(s, x, y, rating, size=14):
    s.text(x, y, "★" * rating + "☆" * (5 - rating), size, INK, spacing=1)


# --------------------------------------------------------------------------- #
# Page furniture
# --------------------------------------------------------------------------- #
RIDER_NAV = [("map", "Find a vehicle"), ("book", "Book a trip"), ("trips", "My trips"),
             ("wallet", "My wallet"), ("reviews", "Reviews")]
OPS_NAV = [("analytics", "Overview"), ("riders", "Riders"), ("vehicles", "Vehicles"),
           ("trips", "Trips"), ("map", "Live map"), ("reviews", "Reviews"), ("wallet", "Wallet audit")]


def new_page(code, title, sub, url, height=None):
    s = Svg(CW, height or FY + BAR + VH + 28)
    s.text(FX, 40, f"{code}  {title}", 22, INK, 800)
    s.text(FX, 64, sub, 13, MUTED)
    s.text(CW - 24, 40, "RideSync · Team 20 · low-fidelity wireframe", 12, FAINT, anchor="end")
    if url:
        s.rect(FX, FY, FW, BAR + VH, WHITE, LINE2, rx=10)
        s.rect(FX + 0.5, FY + 0.5, FW - 1, BAR, FILL2, "none", rx=10)
        s.rect(FX + 0.5, FY + BAR / 2, FW - 1, BAR / 2, FILL2, "none")
        s.line(FX, FY + BAR, FX + FW, FY + BAR, LINE)
        for i in range(3):
            s.circle(FX + 18 + i * 16, FY + 16, 5, LINE2, "none")
        s.rect(FX + 80, FY + 6, 460, 20, WHITE, LINE, rx=10)
        s.text(FX + 94, FY + 20, "localhost" + url, 12, MUTED, mono=True)
    return s


def shell(s, mode, active, title, crumb=None, rider=("Heather Brown", "$2,299.94")):
    """App chrome in viewport-local coordinates (call inside s.g(VX, VY))."""
    sb = 216
    s.rect(0.5, 0, sb, VH - 0.5, FILL, "none", rx=0)
    s.line(sb, 0, sb, VH, LINE)
    s.rect(20, 17, 26, 26, DARK, "none", rx=7)
    s.text(33, 35, "R", 14, WHITE, 800, "middle")
    s.text(56, 36, "RideSync", 18, INK, 800)
    s.text(20, 84, "RIDER" if mode == "rider" else "OPERATIONS", 11, MUTED, 700, spacing=0.8)
    y = 96
    for key, label in (RIDER_NAV if mode == "rider" else OPS_NAV):
        on = key == active
        if on:
            s.rect(12, y, sb - 24, 36, FILL3, "none", rx=6)
        s.rect(26, y + 12, 12, 12, "none", INK if on else MUTED, rx=3, sw=1.5)
        s.text(50, y + 23, label, 14, INK, 700 if on else 500)
        y += 40
    s.line(0, VH - 74, sb, VH - 74, LINE)
    s.text(20, VH - 50, "DATA SOURCES", 10, MUTED, 700, spacing=0.8)
    s.circle(25, VH - 28, 4, DARK, "none")
    s.text(35, VH - 24, "Postgres", 12, MUTED)
    s.circle(112, VH - 28, 4, DARK, "none")
    s.text(122, VH - 24, "MongoDB", 12, MUTED)
    # top bar
    s.line(sb, 56, FW, 56, LINE)
    tx = 240
    if crumb:
        s.text(tx, 35, crumb, 16, MUTED, 500)
        tx += tw(crumb, 16) * 0.92 + 8
        s.text(tx, 35, "/", 16, FAINT)
        tx += 16
    s.text(tx, 35, title, 20, INK, 700)
    s.text(690, 33, "View as", 12, MUTED, 600)
    seg(s, 744, 13, ["Rider", "Ops manager"], 0 if mode == "rider" else 1)
    px = 960
    s.rect(px, 12, 256, 32, WHITE, LINE, rx=16)
    if mode == "rider":
        name, bal = rider
        initials = "".join(p[0] for p in name.split()[:2])
        s.circle(px + 17, 28, 12, FILL3, "none")
        s.text(px + 17, 32, initials, 10, INK, 700, "middle")
        s.text(px + 36, 32, name, 13, INK, 600)
        s.text(px + 228, 32, bal, 13, INK, 700, anchor="end")
        s.text(px + 244, 32, "▾", 12, MUTED, anchor="end")
    else:
        s.circle(px + 17, 28, 12, FILL3, "none")
        s.text(px + 17, 32, "OM", 10, INK, 700, "middle")
        s.text(px + 36, 32, "Ops manager (demo)", 13, INK, 600)


def notes(s, items, y=None):
    y = y or FY
    s.text(NX, y - 10, "ANNOTATIONS", 11, MUTED, 700, spacing=0.8)
    for n, head, body in items:
        heads = textwrap.wrap(head, 36)
        lines = textwrap.wrap(body, 46)
        h = 22 + 18 * len(heads) + 17 * len(lines) + 12
        s.rect(NX, y, NW, h, NOTE_BG, NOTE_LINE, rx=8)
        marker(s, n, NX + 20, y + 21)
        for i, hl in enumerate(heads):
            s.text(NX + 38, y + 26 + 18 * i, hl, 13, INK, 700)
        ly = y + 26 + 18 * len(heads) + 4
        for i, line in enumerate(lines):
            s.text(NX + 14, ly + 17 * i, line, 12, BODY)
        y += h + 10
    s.h = max(s.h, y + 20)
    return y


# --------------------------------------------------------------------------- #
# Sample content (from the seeded database)
# --------------------------------------------------------------------------- #
TRIPS = [
    ("f35d765d", "Heather Brown", "RS00409", "POOL", 24.50, "REQUESTED", "09 Oct 2026, 09:12"),
    ("e886fc11", "Connie Lawrence", "RS00340", "XL", 101.43, "IN TRANSIT", "09 Oct 2026, 09:05"),
    ("93d2c3f5", "Kimberly Gutierrez", "RS00017", "ECONOMY", 78.89, "COMPLETED", "09 Oct 2026, 08:57"),
    ("b0dbd2e3", "Jeffery Ortega", "RS00107", "PREMIUM", 101.61, "COMPLETED", "09 Oct 2026, 08:48"),
    ("556cab10", "Allison Smith", "RS00124", "POOL", 110.57, "COMPLETED", "09 Oct 2026, 08:44"),
    ("4808b315", "Jose Allen", "RS00156", "XL", 187.38, "IN TRANSIT", "09 Oct 2026, 08:43"),
    ("9aff3a69", "Christopher Bass", "RS00379", "ECONOMY", 192.59, "COMPLETED", "09 Oct 2026, 08:42"),
    ("2ca2f44a", "Denise Jones", "RS00366", "POOL", 179.34, "COMPLETED", "09 Oct 2026, 08:28"),
    ("7c1e0b92", "Samantha Gardner", "RS00085", "POOL", 64.20, "REQUESTED", "09 Oct 2026, 08:21"),
    ("1f9a77d0", "Scott Alexander", "RS00402", "PREMIUM", 212.05, "COMPLETED", "09 Oct 2026, 08:15"),
    ("a3b5c6d1", "Susan Serrano", "RS00211", "ECONOMY", 18.75, "COMPLETED", "09 Oct 2026, 08:02"),
    ("c0ffee12", "Kaitlin Medina", "RS00087", "POOL", 143.92, "COMPLETED", "09 Oct 2026, 07:49"),
    ("5e6f7a8b", "Brittney Martin", "RS00394", "XL", 96.10, "COMPLETED", "09 Oct 2026, 07:31"),
    ("d4c3b2a1", "Eric Henry Jr.", "RS00000", "ECONOMY", 10.01, "COMPLETED", "09 Oct 2026, 07:12"),
]

# RS00409, completed-trip revenue per day and the Part A 7-day moving average.
TREND = {
    "09-09": (210.00, 248.34), "09-10": (508.02, 323.81), "09-11": (143.48, 309.64),
    "09-13": (98.84, 212.51), "09-14": (414.59, 274.99), "09-15": (206.52, 263.58),
    "09-16": (519.22, 315.11), "09-17": (163.93, 257.76), "09-20": (240.57, 308.97),
    "09-21": (238.36, 273.72), "09-22": (324.81, 297.38), "09-24": (145.01, 237.19),
    "09-25": (253.52, 240.45), "09-26": (176.02, 229.72), "09-27": (105.77, 207.25),
    "09-28": (458.55, 243.95), "09-29": (336.43, 245.88), "09-30": (127.68, 229.00),
    "10-01": (101.59, 222.79), "10-02": (797.44, 300.50), "10-03": (174.15, 300.23),
    "10-04": (159.47, 307.90), "10-07": (295.73, 305.68), "10-08": (49.95, 295.35),
}

RANKING = [
    (1, "RS00409", "POOL", 16801.83), (2, "RS00085", "POOL", 16308.88),
    (3, "RS00394", "POOL", 16121.06), (4, "RS00402", "PREMIUM", 16112.94),
    (5, "RS00087", "POOL", 16033.30), (6, "RS00382", "POOL", 15990.87),
    (7, "RS00140", "XL", 15874.12), (8, "RS00212", "ECONOMY", 15802.40),
    (9, "RS00033", "PREMIUM", 15760.05), (10, "RS00276", "ECONOMY", 15701.93),
    (11, "RS00451", "POOL", 15688.20), (12, "RS00318", "XL", 15641.77),
]

RATINGS = [("5 ★", 10067), ("4 ★", 8658), ("3 ★", 3726), ("2 ★", 1512), ("1 ★", 1037)]
TAGS = [("On Time", 6342), ("Clean Car", 6328), ("Safe", 6313), ("Music Too Loud", 6285),
        ("Late Pickup", 6240), ("Smooth Driving", 6238), ("Polite", 6221), ("Helpful", 6214)]
NEARBY = [
    (1, "RS00212", "ECONOMY", 0.12, "8 s ago", False), (2, "RS00409", "POOL", 0.31, "21 s ago", False),
    (3, "RS00140", "XL", 0.58, "4 s ago", True), (4, "RS00033", "PREMIUM", 0.94, "1 min ago", False),
    (5, "RS00276", "ECONOMY", 1.40, "12 s ago", False), (6, "RS00451", "POOL", 2.05, "35 s ago", False),
    (7, "RS00318", "XL", 3.12, "2 min ago", False), (8, "RS00090", "ECONOMY", 4.66, "49 s ago", False),
]


# --------------------------------------------------------------------------- #
# Screens
# --------------------------------------------------------------------------- #
def w01_trips():
    s = new_page("W01", "Browse · Trips (Ops manager)",
                 "Assignment screen 1: Browse. Same FilterBar + DataTable pattern for Riders and Vehicles.",
                 "/trips?status=all&page=1")
    s.g(VX, VY)
    shell(s, "ops", "trips", "Trips")
    y = 80
    field(s, 240, y, 300, None, "Search rider name or plate…", placeholder=True, icon="search")
    field(s, 552, y, 170, None, "Status: All", suffix="▾")
    field(s, 734, y, 236, None, "01 Sep 2026 – 09 Oct 2026", suffix="▾")
    s.text(984, y + 23, "Clear filters", 13, INK, 600)
    s.line(984, y + 26, 1066, y + 26, INK)
    s.text(1216, y + 23, "50,000 trips", 13, MUTED, anchor="end")
    cols = [("Trip", 116, "l"), ("Rider", 200, "l"), ("Vehicle", 110, "l"), ("Class", 100, "l"),
            ("Fare", 104, "r"), ("Status", 136, "l"), ("Created", 170, "l"), ("", 40, "c")]
    rows = [[("mono", tid + "…"), name, ("bold", plate), ("muted", cls), money(fare),
             ("status", st), ("muted", when), ("chev",)]
            for tid, name, plate, cls, fare, st, when in TRIPS]
    table(s, 240, 132, cols, rows, row_h=38, highlight=3, sort=(6, "desc"))
    pagination(s, 240, 714, 976, "Showing 1–25 of 50,000  ·  25 per page ▾")
    s.text(240, 780, "Row hover = light fill. Whole row is the click target (opens Trip detail).",
           12, MUTED, italic=True)
    marker(s, 1, 907, 14)
    marker(s, 2, 540, 78)
    marker(s, 3, 1216, 712)
    marker(s, 4, 822, 130)
    marker(s, 5, 1216, 266)
    marker(s, 6, 200, 774)
    s.end()
    notes(s, [
        (1, "View-as switch",
         "Rider or Ops manager. There is no login: this switch is the demo actor picker. In Rider mode a "
         "searchable picker chooses one of the 1,000 riders."),
        (2, "Filters are query parameters",
         "Search, status and date range map to GET /api/trips?search=&status=&from=&to=. Typing is "
         "debounced (300 ms). The URL keeps the filters, so back and refresh work."),
        (3, "Server-side paging",
         "25 rows per page (max 100). The browser never receives all 50,000 trips; the total comes from "
         "COUNT(*). Default sort: newest first."),
        (4, "Status badges",
         "One badge style per trip status, always with its text label so colour is never the only cue. "
         "Colours are in the style guide."),
        (5, "Row opens detail",
         "Trip detail shows the status stepper, rider, vehicle and review. Ops can advance the status there "
         "(PATCH /api/trips/:id/status)."),
        (6, "Data source health",
         "The sidebar footer polls GET /api/health. A store that is down greys its dot, and only the cards "
         "that use it show an error (see W09)."),
    ])
    s.save(WF_DIR / "01_trips_browse.svg")


def w02_vehicle():
    s = new_page("W02", "Browse · Vehicle detail (Ops manager)",
                 "Detail view for one record. Postgres (stats) and MongoDB (catalog, reviews) side by side.",
                 "/vehicles/3f2a9c1e")
    s.g(VX, VY)
    shell(s, "ops", "vehicles", "RS00409", crumb="Vehicles")
    x = 240
    x += badge(s, x, 82, "POOL", "outline") + 8
    badge(s, x, 82, "ACTIVE", "soft")
    s.text(x + 80, 96, "Vehicle ID 3f2a9c1e-77b4-4d0e-9a51-1c0d2b6f8e21  ⧉", 12, MUTED, mono=True)
    bx = 1216 - 120
    button(s, bx, 74, "Show on map", "secondary", w=120)
    button(s, bx - 136, 74, "Revenue trend", "secondary", w=128)
    w4 = (976 - 48) / 4
    kpi(s, 240, 124, w4, "Lifetime trips", "124", "completed · as of 09:05")
    kpi(s, 240 + (w4 + 16), 124, w4, "Total earnings", "$16,801.83", "rank #1 of 500")
    kpi(s, 240 + 2 * (w4 + 16), 124, w4, "Average rating", "4.12 ★", "48 reviews")
    kpi(s, 240 + 3 * (w4 + 16), 124, w4, "Last inspection", "Passed", "12 Aug 2026")
    # catalog card
    card(s, 240, 236, 600, 304, "Catalog", "VehicleMetadata · MongoDB document")
    s.text(256, 308, "FEATURES", 11, MUTED, 700, spacing=0.6)
    chips(s, 256, 318, ["Sunroof", "Wi-Fi", "Child seat"])
    s.text(256, 378, "INSPECTION RECORDS (3)", 11, MUTED, 700, spacing=0.6)
    table(s, 256, 388, [("Date", 170, "l"), ("Result", 130, "l"), ("Inspector", 268, "l")], [
        ["12 Aug 2026", ("status", "PASSED"), "Allison Hill"],
        ["03 Mar 2026", ("status", "FAILED"), "Brian Yang"],
        ["21 Nov 2025", ("status", "PASSED"), "Dana Ortiz"],
    ], row_h=32, head_h=30)
    s.text(256, 528, "Other attributes: none. Unknown fields are listed here as key → value.", 12, MUTED,
           italic=True)
    # reviews card
    card(s, 856, 236, 360, 304, "Reviews", "TripReviews · this vehicle", right="Open in Reviews ›")
    s.text(872, 324, "4.12", 34, INK, 800)
    stars(s, 960, 314, 4, 16)
    s.text(960, 332, "48 reviews", 12, MUTED)
    hbars(s, 872, 352, 328, [("5 ★", 22), ("4 ★", 15), ("3 ★", 7), ("2 ★", 3), ("1 ★", 1)],
          label_w=40, bar_h=11, gap=9, value_w=40)
    s.text(872, 480, "TOP TAGS", 11, MUTED, 700, spacing=0.6)
    chips(s, 872, 490, ["On Time 19", "Clean Car 17", "Safe 15"], h=26, size=11)
    # recent trips
    card(s, 240, 556, 976, 262, "Recent trips", right="View all trips ›")
    table(s, 256, 598, [("Created", 190, "l"), ("Rider", 250, "l"), ("Fare", 140, "r"), ("Status", 160, "l"),
                        ("Trip", 164, "l"), ("", 40, "c")], [
        [("muted", "09 Oct 2026, 09:12"), "Heather Brown", "$24.50", ("status", "REQUESTED"), ("mono", "f35d765d…"), ("chev",)],
        [("muted", "08 Oct 2026, 18:40"), "Jose Allen", "$49.95", ("status", "COMPLETED"), ("mono", "8b1c22e0…"), ("chev",)],
        [("muted", "07 Oct 2026, 12:03"), "Denise Jones", "$118.20", ("status", "COMPLETED"), ("mono", "41aa09f3…"), ("chev",)],
        [("muted", "07 Oct 2026, 08:55"), "Scott Alexander", "$177.53", ("status", "COMPLETED"), ("mono", "c9d0e1f2…"), ("chev",)],
        [("muted", "04 Oct 2026, 21:17"), "Susan Serrano", "$159.47", ("status", "COMPLETED"), ("mono", "77e6d5c4…"), ("chev",)],
    ], row_h=34, head_h=32)
    marker(s, 1, 240 + w4 - 8, 124)
    marker(s, 2, 830, 236)
    marker(s, 3, 840, 400)
    marker(s, 4, 1206, 236)
    marker(s, 5, 1206, 556)
    marker(s, 6, 960, 72)
    s.end()
    notes(s, [
        (1, "Postgres + MongoDB on one page",
         "The header and KPIs come from vehicles + vehicle_lifetime_stats (materialized view, so they show an "
         "'as of' time). Catalog and reviews come from MongoDB. Each card fetches on its own."),
        (2, "Flexible catalog document",
         "VehicleMetadata is rendered generically: string arrays become chips, object arrays become a small "
         "table, dates are formatted, and unknown keys are listed under 'Other attributes', so new fields "
         "never break the page."),
        (3, "Inspection history",
         "Newest first. Passed and Failed are labelled badges, not just colours."),
        (4, "Review summary",
         "The same $facet as the Reviews screen, filtered to this vehicle_id (needs the planned index)."),
        (5, "Recent trips",
         "GET /api/trips?vehicle_id=…&page_size=5. 'View all trips' opens Trips with this filter applied."),
        (6, "Shortcuts",
         "Revenue trend opens Overview with this vehicle selected. Show on map opens Live map centred on its "
         "latest ping."),
    ])
    s.save(WF_DIR / "02_vehicle_detail.svg")


def booking_form(s, vehicle, fare, fare_error=None):
    card(s, 240, 76, 560, 322, "New trip")
    field(s, 256, 142, 528, "Rider", "Heather Brown  (from View as)", readonly=True)
    field(s, 256, 210, 528, "Vehicle", vehicle, suffix="▾")
    field(s, 256, 278, 200, "Fare", fare, prefix="$", error=fare_error,
          helper=None if fare_error else "More than $0.00, at most your balance")
    button(s, 256, 346, "Book trip", "primary", w=120)
    button(s, 388, 346, "Reset", "secondary", w=84)


def wallet_card(s, before, after, delta_label, after_note):
    card(s, 816, 76, 400, 322, "Wallet")
    s.text(832, 132, "BALANCE BEFORE", 11, MUTED, 700, spacing=0.6)
    s.text(832, 166, before, 28, INK, 700)
    s.line(852, 184, 852, 222, LINE2, 2)
    s.path("M846,216 L852,224 L858,216", stroke=LINE2, sw=2)
    s.text(868, 210, delta_label, 13, INK, 600)
    s.text(832, 256, "BALANCE AFTER", 11, MUTED, 700, spacing=0.6)
    s.text(832, 290, after, 28, INK, 800)
    s.text(832, 320, after_note, 12, MUTED)
    s.text(832, 378, "Both values come from the API response.", 12, MUTED, italic=True)


def w03_book_success():
    s = new_page("W03", "Book a trip · success (Rider)",
                 "Assignment screen 2: Transaction (Workflow 1). Calls sp_atomic_booking and proves the trigger fired.",
                 "/book")
    s.g(VX, VY)
    shell(s, "rider", "book", "Book a trip", rider=("Heather Brown", "$2,275.44"))
    booking_form(s, "RS00409 · POOL · 0.31 km away", "24.50")
    wallet_card(s, "$2,299.94", "$2,275.44", "−$24.50 trip fare", "Updated in the top bar too.")
    alert(s, 240, 414, 976, 74, "success", "Trip booked: $24.50 paid from your wallet",
          ["Trip f35d765d… is REQUESTED with vehicle RS00409. Status: COMMITTED."])
    card(s, 240, 504, 560, 228, "Proof from the database",
         "New wallet_audit_logs row, written by the trigger")
    table(s, 256, 566, [("Time", 158, "l"), ("Type", 146, "l"), ("Amount", 96, "r"), ("Balance after", 128, "r")], [
        [("muted", "09 Oct 2026, 09:12:04"), ("status", "DEBIT"), "−$24.50", ("bold", "$2,275.44")],
        [("muted", "02 Oct 2026, 17:40:51"), ("status", "CREDIT"), "+$60.00", "$2,299.94"],
    ], row_h=36, head_h=32, highlight=0)
    badge(s, 256 + 158 + 12 + badge_w("DEBIT") + 6, 608, "NEW", "solid")
    s.text(256, 704, "p_status = COMMITTED  ·  p_trip_id = f35d765d-1b25-4f4e-b8b1-dcbed8151cd7", 11,
           MUTED, mono=True)
    card(s, 816, 504, 400, 228, "Your active trip", "RS00409 · $24.50 · booked 09:12")
    stepper(s, 878, 602, 276, ["REQUESTED", "IN TRANSIT", "COMPLETED"], 0)
    button(s, 832, 666, "Mark in transit", "secondary", w=150)
    s.text(994, 689, "Demo control", 12, MUTED, italic=True)
    marker(s, 1, 1206, 12)
    marker(s, 2, 784, 208)
    marker(s, 3, 456, 276)
    marker(s, 4, 376, 344)
    marker(s, 5, 1206, 76)
    marker(s, 6, 784, 602)
    marker(s, 7, 982, 664)
    s.end()
    notes(s, [
        (1, "Acting rider",
         "Comes from the View-as picker. Switching rider resets the form. The top-bar balance refreshes after "
         "every booking."),
        (2, "Vehicle combobox",
         "Server-side search by plate. Pre-filled (with distance) when opened from Find a vehicle. Inactive "
         "vehicles show greyed as 'Out of service' but stay selectable so the rejection can be demonstrated."),
        (3, "Fare",
         "Money input with a $ prefix and 2 decimals. The client blocks empty or ≤ 0 for quick feedback; the "
         "procedure validates again and is the source of truth."),
        (4, "Submit",
         "POST /api/bookings → CALL sp_atomic_booking. The button shows a spinner and the form is disabled "
         "while the request runs, so a double submit is impossible."),
        (5, "Before → after",
         "Both balances are read by the API in the same request, not calculated in the browser."),
        (6, "Trigger proof",
         "After COMMIT the API returns the newest wallet_audit_logs row. It is tagged NEW, so it is clear the "
         "trigger fired."),
        (7, "Status control",
         "Advances the trip (PATCH /api/trips/:id/status), so the partial unique index can be shown blocking "
         "and then allowing a second booking."),
    ])
    s.save(WF_DIR / "03_book_trip_success.svg")


def w04_book_failure():
    s = new_page("W04", "Book a trip · failure states (Rider)",
                 "Every ROLLED_BACK reason from sp_atomic_booking gets a plain-language message and a next step.",
                 "/book")
    s.g(VX, VY)
    shell(s, "rider", "book", "Book a trip", rider=("Heather Brown", "$2,275.44"))
    booking_form(s, "RS00212 · ECONOMY · 0.12 km away", "18.00")
    wallet_card(s, "$2,275.44", "$2,275.44", "No change", "Unchanged: nothing was charged.")
    alert(s, 240, 414, 976, 160, "error", "You already have a trip in progress",
          ["A rider can have only one requested or in-transit trip at a time, so this booking was not made.",
           "Nothing was charged. Your balance is still $2,275.44."],
          actions=[("View active trip", "secondary"), ("Mark it completed", "secondary")],
          details="ROLLED_BACK: rider already has an active trip")
    card(s, 240, 590, 976, 232, "Other failures use the same pattern")
    alert(s, 256, 630, 464, 84, "error", "Not enough money in your wallet",
          ["This trip costs $9,000.00 but your balance is $2,275.44.", "Nothing was charged."],
          compact=True)
    alert(s, 736, 630, 464, 84, "error", "This vehicle is out of service",
          ["RS00117 is not active right now.", "Choose another vehicle and try again."], compact=True)
    alert(s, 256, 724, 464, 84, "warning", "Your wallet changed at the same moment",
          ["Another update happened at the same time. Nothing was", "charged. Please try again."],
          compact=True)
    s.text(752, 740, "Inline field error (client check + INVALID_FARE)", 12, MUTED, 600)
    field(s, 752, 750, 200, None, "0.00", prefix="$", error="Enter an amount greater than $0.00")
    marker(s, 1, 1206, 414)
    marker(s, 2, 1206, 76)
    marker(s, 3, 636, 520)
    marker(s, 4, 776, 556)
    marker(s, 5, 784, 208)
    marker(s, 6, 1206, 590)
    s.end()
    notes(s, [
        (1, "Plain-language title",
         "Each ROLLED_BACK reason maps to a sentence and a next step. The full message list is in the style "
         "guide."),
        (2, "'Nothing was charged'",
         "Always said explicitly. The wallet card shows before = after, which is visible proof of the "
         "rollback."),
        (3, "Fix it from here",
         "For an active trip, the actions jump to that trip or advance it. Then the same form books "
         "successfully, which demonstrates the partial unique index."),
        (4, "Technical details",
         "Collapsed by default. Shows the raw p_status from the procedure for the demo and viva."),
        (5, "Input kept",
         "The vehicle and fare stay filled in after a failure, so nothing has to be retyped."),
        (6, "Business vs system errors",
         "Rollbacks are shown here (HTTP 409/400). Network errors and 500s use the generic error state (W09) "
         "with Retry."),
    ])
    s.save(WF_DIR / "04_book_trip_failure.svg")


def audit_rows():
    rng = random.Random(11)
    bal, when, rows = 2140.12, datetime(2026, 9, 1, 8, 15), []
    for _ in range(12):
        amt = round(rng.uniform(12, 110), 2) * (1 if rng.random() < 0.5 else -1)
        bal = round(bal + amt, 2)
        when += timedelta(days=rng.randint(1, 3), hours=rng.randint(0, 9), minutes=rng.randint(0, 59))
        rows.append([("muted", when.strftime("%d %b %Y, %H:%M")), ("mono", f"{rng.getrandbits(32):08x}…"),
                     ("status", "CREDIT" if amt > 0 else "DEBIT"), money(amt, sign=True), money(bal),
                     ("bold", money(bal)), ("check",)])
    return rows


def w05_audit():
    s = new_page("W05", "Wallet audit (Ops manager) / My wallet (Rider)",
                 "Assignment screen 3: Audit trail. Read-only view of wallet_audit_logs with a date filter and running balance.",
                 "/wallet?rider=25c47b7f&from=2026-09-01&to=2026-10-09")
    s.g(VX, VY)
    shell(s, "ops", "wallet", "Wallet audit")
    field(s, 240, 80, 300, None, "Heather Brown · 25c47b7f…", icon="search", suffix="▾")
    field(s, 552, 80, 244, None, "01 Sep 2026 – 09 Oct 2026", suffix="▾")
    chips(s, 808, 84, ["7 d", "30 d", "90 d", "All"], active="30 d")
    status(s, 1216 - badge_w("READ-ONLY"), 88, "READ-ONLY")
    w4 = (976 - 48) / 4
    kpi(s, 240, 132, w4, "Opening balance", "$2,140.12", "on 01 Sep 2026", h=90, vsize=22)
    kpi(s, 240 + (w4 + 16), 132, w4, "Credits", "+$1,212.40", "18 entries", h=90, vsize=22)
    kpi(s, 240 + 2 * (w4 + 16), 132, w4, "Debits", "−$1,052.58", "14 entries", h=90, vsize=22)
    kpi(s, 240 + 3 * (w4 + 16), 132, w4, "Closing balance", "$2,299.94", "= current wallet ✓", h=90, vsize=22)
    cols = [("Date & time", 196, "l"), ("Entry", 120, "l"), ("Type", 110, "l"), ("Amount", 140, "r"),
            ("Balance after", 160, "r"), ("Running balance", 170, "r"), ("Match", 80, "c")]
    table(s, 240, 238, cols, audit_rows(), row_h=36, sort=(0, "asc"))
    pagination(s, 240, 712, 976, "Entries 1–12 of 32  ·  oldest first ▾",
               pages=("‹", "1", "2", "3", "›"))
    s.text(240, 778, "No edit or delete controls exist anywhere on this screen: the table is append-only in "
                     "the database too.", 12, MUTED, italic=True)
    marker(s, 1, 540, 78)
    marker(s, 2, 1026, 82)
    marker(s, 3, 240 + 3 * (w4 + 16) + w4 - 8, 132)
    marker(s, 4, 1052, 238)
    marker(s, 5, 1176, 238)
    marker(s, 6, 1216, 86)
    s.end()
    notes(s, [
        (1, "Rider picker",
         "Ops can pick any rider (server-side search). In Rider mode this screen is 'My wallet' and is locked "
         "to the acting rider."),
        (2, "Date filter",
         "Quick ranges or a custom range, mapped to from/to on GET /api/riders/:id/wallet-audit and served by "
         "idx_wallet_audit_logs_rider_time."),
        (3, "Summary for the range",
         "Opening balance = the balance before the first entry in the range. Credits and debits are summed in "
         "SQL. Closing matches the wallet."),
        (4, "Running balance",
         "Computed in SQL: opening + SUM(amount_changed) OVER (ORDER BY timestamp, id). Shown next to the "
         "balance_after the trigger recorded."),
        (5, "Match ✓",
         "Ticks when the computed and recorded balances agree, so a gap in the trail would show up "
         "immediately."),
        (6, "Read-only",
         "No edit or delete anywhere, and the database blocks UPDATE/DELETE too. Amounts carry a +/− sign as "
         "well as colour."),
    ])
    s.save(WF_DIR / "05_wallet_audit.svg")


def trend_chart(s, x, y, w, h):
    pad_l, pad_b = 52, 26
    cw, ch = w - pad_l - 8, h - pad_b - 8
    top = 800
    days = [date(2026, 9, 9) + timedelta(days=i) for i in range(30)]
    for v in range(0, top + 1, 200):
        gy = y + 8 + ch - ch * v / top
        s.line(x + pad_l, gy, x + w - 8, gy, FILL2 if v else LINE2, 1)
        s.text(x + pad_l - 8, gy + 4, f"${v}", 11, MUTED, anchor="end")
    step = cw / len(days)
    pts = []
    for i, d in enumerate(days):
        key = d.strftime("%m-%d")
        cx = x + pad_l + step * i + step / 2
        if key in TREND:
            daily, ma = TREND[key]
            bh = ch * daily / top
            s.rect(cx - step * 0.32, y + 8 + ch - bh, step * 0.64, bh, "#CED4DA", "none", rx=2)
            pts.append((cx, y + 8 + ch - ch * ma / top))
        if i % 7 == 0:
            s.text(cx, y + h - 6, d.strftime("%d %b"), 11, MUTED, anchor="middle")
    s.path("M" + " L".join(f"{px:.1f},{py:.1f}" for px, py in pts), stroke=DARK, sw=2.2)
    for px, py in pts:
        s.circle(px, py, 2.6, DARK, WHITE, 1)
    # hover crosshair + tooltip on 02 Oct
    hx = x + pad_l + step * 23 + step / 2
    s.line(hx, y + 8, hx, y + 8 + ch, INK, 1, "3 3")
    s.rect(hx - 196, y + 14, 182, 66, WHITE, LINE2, rx=6)
    s.text(hx - 184, y + 34, "Fri 02 Oct 2026", 12, INK, 700)
    s.text(hx - 184, y + 52, "Daily revenue", 12, MUTED)
    s.text(hx - 24, y + 52, "$797.44", 12, INK, 700, "end")
    s.text(hx - 184, y + 70, "7-day moving avg", 12, MUTED)
    s.text(hx - 24, y + 70, "$300.50", 12, INK, 700, "end")


def w06_analytics():
    s = new_page("W06", "Overview · analytics (Ops manager)",
                 "Assignment screen 4: Workflow 2 (7-day moving average + DENSE_RANK) and the materialized view.",
                 "/analytics?vehicle=RS00409&range=30d")
    s.g(VX, VY)
    shell(s, "ops", "analytics", "Overview")
    s.text(240, 98, "Fleet summary", 16, INK, 700)
    s.text(364, 98, "materialized view vehicle_lifetime_stats", 12, MUTED, mono=True)
    bw = 142
    button(s, 1216 - bw, 76, "Refresh now", "secondary", w=bw, icon="refresh")
    s.text(1216 - bw - 14, 99, "Last refreshed 09 Oct 2026, 09:05 · 7 min ago", 12, MUTED, anchor="end")
    w4 = (976 - 48) / 4
    kpi(s, 240, 124, w4, "Vehicles", "500", "446 active")
    kpi(s, 240 + (w4 + 16), 124, w4, "Completed trips", "49,588", "lifetime")
    kpi(s, 240 + 2 * (w4 + 16), 124, w4, "Total earnings", "$6,322,471", "lifetime, completed trips")
    kpi(s, 240 + 3 * (w4 + 16), 124, w4, "Avg per vehicle", "$12,644.94", "lifetime earnings")
    card(s, 240, 236, 600, 432, "Revenue trend", "Daily revenue and 7-day moving average")
    field(s, 256, 296, 260, None, "RS00409 · rank #1", icon="search", suffix="▾")
    chips(s, 528, 300, ["30 days", "90 days"], active="30 days")
    s.rect(700, 306, 12, 12, "#CED4DA", "none", rx=2)
    s.text(718, 317, "Daily revenue", 12, INK)
    s.line(700, 336, 712, 336, DARK, 2.2)
    s.text(718, 340, "7-day avg", 12, INK)
    trend_chart(s, 256, 352, 568, 270)
    s.text(256, 648, "Gaps are days with no completed trips.", 12, MUTED, italic=True)
    s.text(824, 648, "View as table", 12, INK, 600, "end")
    s.line(740, 651, 824, 651, INK)
    card(s, 856, 236, 360, 580, "Revenue ranking", "DENSE_RANK() over lifetime revenue")
    rows = [[("bold", str(r)), ("bold" if r == 1 else "muted", p) if r == 1 else p, ("muted", c), money(v)]
            for r, p, c, v in RANKING]
    table(s, 872, 296, [("Rank", 56, "c"), ("Vehicle", 96, "l"), ("Class", 84, "l"), ("Revenue", 92, "r")],
          rows, row_h=36, head_h=32, highlight=0)
    pagination(s, 872, 768, 328, "1–12 of 500", pages=("‹", "1", "2", "…", "42", "›"))
    card(s, 240, 684, 600, 132, "RS00409, last 30 days")
    for i, (lab, val) in enumerate([("Revenue", "$6,250.83"), ("Days with trips", "24 of 30"),
                                    ("Best day", "02 Oct · $797.44")]):
        s.text(256 + i * 196, 748, lab.upper(), 11, MUTED, 700, spacing=0.5)
        s.text(256 + i * 196, 778, val, 18, INK, 700)
    marker(s, 1, 1216 - bw, 74)
    marker(s, 2, 812, 94)
    marker(s, 3, 516, 294)
    marker(s, 4, 712, 368)
    marker(s, 5, 1206, 296)
    marker(s, 6, 734, 646)
    s.end()
    notes(s, [
        (1, "Refresh now",
         "POST /api/analytics/fleet-summary/refresh → REFRESH MATERIALIZED VIEW CONCURRENTLY. Spinner while it "
         "runs, then the KPIs reload. Errors show inline in this section."),
        (2, "Freshness",
         "'Last refreshed' comes from a refresh log written by the refresh function, because Postgres does "
         "not record it. The relative time updates every minute."),
        (3, "Pick a vehicle",
         "Use the combobox or click a ranking row. Calls GET /api/analytics/vehicles/:id/revenue-trend, which "
         "is the Part A window query for one vehicle."),
        (4, "One axis, two series",
         "Bars are daily revenue and the line is the 7-day moving average, both in $, so there is a single "
         "y-axis. Hover shows a crosshair and tooltip; the legend is always visible."),
        (5, "Dense ranking",
         "Paged on the server. DENSE_RANK gives equal revenue the same rank and does not skip the next one "
         "(4, 4, 5). The selected vehicle is highlighted."),
        (6, "Table view",
         "Every chart has a 'View as table' toggle, for accessibility and for exact numbers."),
    ])
    s.save(WF_DIR / "06_analytics_overview.svg")


def map_view(s, x, y, w, h, ox, oy, radius, pins, clip_id, small=False):
    s.raw(f'<clipPath id="{clip_id}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8"/></clipPath>')
    s.raw(f'<g clip-path="url(#{clip_id})">')
    s.rect(x, y, w, h, "#EDEFF2", "none")
    s.path(f"M{x + w * 0.58},{y} C{x + w * 0.66},{y + h * 0.16} {x + w * 0.80},{y + h * 0.20} "
           f"{x + w},{y + h * 0.30} L{x + w},{y} Z", fill="#DCE1E7", stroke="none")
    s.rect(x + w * 0.06, y + h * 0.66, w * 0.24, h * 0.12, "#E3E7E3", "none", rx=4)
    rng = random.Random(3)
    for i in range(1, 14):
        gx = x + i * w / 13 + rng.uniform(-6, 6)
        s.line(gx, y, gx + rng.uniform(-20, 20), y + h, WHITE, rng.choice([2, 3, 3, 5]))
    for i in range(1, 16):
        gy = y + i * h / 15 + rng.uniform(-5, 5)
        s.line(x, gy, x + w, gy + rng.uniform(-14, 14), WHITE, rng.choice([2, 3, 3, 5]))
    s.line(x, y + h * 0.95, x + w * 0.75, y, WHITE, 7)
    s.raw("</g>")
    s.rect(x, y, w, h, "none", LINE, rx=8)
    s.circle(ox, oy, radius, DARK, DARK, 1.5, dash="7 5", opacity=0.05)
    s.text(ox + radius * 0.72 + 6, oy - radius * 0.72, "5 km", 12 if not small else 11, INK, 700)
    for n, px, py, new in pins:
        if new:
            s.circle(px, py, 17, "none", DARK, 1.5, dash="3 3")
        r = 9 if small else 11
        s.circle(px, py, r, WHITE, DARK, 2)
        s.text(px, py + 4, str(n), 10 if small else 11, INK, 700, "middle")
    s.circle(ox, oy, 12, DARK, WHITE, 3)
    s.circle(ox, oy, 4, WHITE, "none")
    if not small:
        s.rect(ox - 34, oy + 18, 68, 22, DARK, "none", rx=4)
        s.text(ox, oy + 33, "Origin", 12, WHITE, 700, "middle")
        s.rect(x + 12, y + 12, 32, 64, WHITE, LINE2, rx=6)
        s.text(x + 28, y + 36, "+", 18, INK, 600, "middle")
        s.line(x + 16, y + 44, x + 40, y + 44, LINE)
        s.text(x + 28, y + 66, "−", 18, INK, 600, "middle")
        s.text(x + w - 8, y + h - 8, "© OpenStreetMap contributors", 10, MUTED, anchor="end")


def pin_positions(ox, oy, base, px_per_km, data):
    """Markers keep distance order; a small base offset keeps them off the origin pin."""
    angles = [40, 150, 95, 200, 330, 250, 170, 10]
    out = []
    for (n, _p, _c, km, _t, new), a in zip(data, angles):
        r = base + km * px_per_km
        out.append((n, ox + r * math.cos(math.radians(a)), oy - r * math.sin(math.radians(a)), new))
    return out


def w07_map():
    s = new_page("W07", "Find a vehicle (Rider) / Live map (Ops manager)",
                 "Assignment screen 5: Workflow 3. $geoNear within 5 km of a selectable origin, refreshed by polling.",
                 "/map?origin=union-square")
    s.g(VX, VY)
    shell(s, "rider", "map", "Find a vehicle")
    s.text(240, 103, "Origin", 12, MUTED, 600)
    end = chips(s, 290, 84, ["Union Square", "Mission", "Embarcadero"], active="Union Square")
    s.text(end + 4, 103, "or click the map", 12, MUTED, italic=True)
    bw = 140
    button(s, 1216 - bw, 80, "Simulate pings", "secondary", w=bw)
    button(s, 1216 - bw - 80, 80, "Pause", "secondary", w=72)
    s.circle(812, 98, 5, DARK, "none")
    s.circle(812, 98, 9, "none", DARK, 1, dash="2 2")
    s.text(826, 103, "Live · updated 3 s ago", 12, INK, 600)
    ox, oy = 540, 466
    map_view(s, 240, 128, 600, 688, ox, oy, 230, pin_positions(ox, oy, 30, 42, NEARBY), "map07")
    s.rect(252, 780, 300, 26, WHITE, LINE2, rx=6)
    s.text(264, 797, "37.7880, −122.4075  ·  radius 5 km", 12, INK, mono=True)
    card(s, 856, 128, 360, 688, "8 available within 5 km", "Sorted by distance · one row per vehicle")
    for i, (n, plate, cls, km, ago, new) in enumerate(NEARBY):
        ry = 190 + i * 74
        if i:
            s.line(872, ry - 4, 1200, ry - 4, FILL2)
        s.circle(886, ry + 22, 12, WHITE, DARK, 2)
        s.text(886, ry + 26, str(n), 11, INK, 700, "middle")
        s.text(908, ry + 20, plate, 14, INK, 700)
        if new:
            badge(s, 976, ry + 6, "NEW", "solid")
        s.text(908, ry + 40, f"{cls} · ping {ago}", 12, MUTED)
        s.text(1120, ry + 20, f"{km:.2f} km", 13, INK, 700, "end")
        button(s, 1132, ry + 6, "Book", "secondary", w=56, h=30, size=12)
    s.text(872, 800, "Shows at most the nearest 20 vehicles.", 12, MUTED, italic=True)
    marker(s, 1, 290, 82)
    marker(s, 2, 800, 80)
    marker(s, 3, ox + 162, oy + 162)
    marker(s, 4, 1030, 196)
    marker(s, 5, 1206, 190)
    marker(s, 6, 1206, 78)
    marker(s, 7, 1206, 128)
    s.end()
    notes(s, [
        (1, "Origin",
         "Preset chips, or click anywhere on the map. The radius is fixed at 5 km (Workflow 3); the circle "
         "is drawn to scale and markers are numbered by distance."),
        (2, "Live without reload",
         "Polls GET /api/map/nearby-vehicles every 5 s, and only the markers and list update. Polling pauses "
         "while the tab is hidden or Pause is on."),
        (3, "One marker per vehicle",
         "The server groups pings by vehicle_id and keeps the nearest, so a vehicle never appears twice."),
        (4, "What changed",
         "A vehicle that is new since the last poll gets a NEW tag for one cycle. Vehicles that left the "
         "radius fade out."),
        (5, "Book",
         "Opens Book a trip with this vehicle already selected (rider journey: find → book). Ops mode shows "
         "'Details' instead."),
        (6, "Simulate pings",
         "Inserts fresh pings near the origin so the live update is visible. Seeded pings expire after 2 h "
         "because of the TTL index."),
        (7, "List = accessible view",
         "The list carries the same information as the map, sorted by distance and reachable by keyboard."),
    ])
    s.save(WF_DIR / "07_find_vehicle_map.svg")


def w08_reviews():
    s = new_page("W08", "Reviews + vehicle catalog (Ops manager & Rider)",
                 "Assignment screen 6: Workflow 4 $facet (rating distribution, top tags, average) and a VehicleMetadata document.",
                 "/reviews?scope=all")
    s.g(VX, VY)
    shell(s, "ops", "reviews", "Reviews")
    seg(s, 240, 82, ["All vehicles", "One vehicle"], 0, h=CTRL - 2)
    field(s, 456, 80, 260, None, "Choose a vehicle…", placeholder=True, icon="search", suffix="▾",
          readonly=True)
    s.text(1216, 103, "25,000 reviews · rating ≥ 1", 12, MUTED, anchor="end")
    card(s, 240, 132, 240, 252, "Average rating")
    s.text(256, 232, "4.01", 52, INK, 800)
    stars(s, 258, 266, 4, 22)
    s.text(256, 296, "out of 5", 12, MUTED)
    s.text(256, 316, "from 25,000 reviews", 12, MUTED)
    card(s, 496, 132, 344, 252, "Rating distribution")
    shades = ["#495057", "#6C757D", "#868E96", "#ADB5BD", "#CED4DA"]
    hbars(s, 512, 176, 312, RATINGS, label_w=40, bar_h=16, gap=20, value_w=108,
          fmt=lambda v: f"{v:,}  ({v / 250:.0f}%)", shades=shades)
    card(s, 856, 132, 360, 252, "Top feedback tags")
    hbars(s, 872, 184, 328, TAGS, label_w=112, bar_h=12, gap=10, value_w=52)
    card(s, 240, 400, 600, 416, "Recent reviews", right="Newest first ▾")
    reviews = [
        (5, ["Smooth Driving", "Helpful"], "Against amount of claim picture always occur argue election.", "e13cc74e", "RS00409", "07 Oct 2026"),
        (4, ["On Time", "Clean Car"], "Quick pickup, car was spotless and the driver knew the route.", "8b1c22e0", "RS00212", "07 Oct 2026"),
        (2, ["Late Pickup", "Music Too Loud"], "Waited twelve minutes and the music was far too loud.", "41aa09f3", "RS00140", "06 Oct 2026"),
        (5, ["Safe", "Polite"], "Very polite driver, felt safe the whole way home.", "c9d0e1f2", "RS00033", "06 Oct 2026"),
    ]
    for i, (r, tags, text, trip, plate, when) in enumerate(reviews):
        ry = 446 + i * 80
        if i:
            s.line(256, ry - 8, 824, ry - 8, FILL2)
        stars(s, 256, ry + 14, r, 14)
        chips(s, 352, ry, tags, h=22, size=11)
        s.text(256, ry + 40, "“" + text + "”", 13, BODY, italic=True)
        s.text(256, ry + 60, f"Trip {trip}… · {plate} · {when}", 11, MUTED, mono=True)
    pagination(s, 256, 770, 568, "1–10 of 25,000", pages=("‹", "1", "2", "…", "2,500", "›"))
    card(s, 856, 400, 360, 416, "Vehicle catalog", "VehicleMetadata document")
    field(s, 872, 460, 328, None, "RS00409 · POOL", icon="search", suffix="▾")
    s.text(872, 522, "FEATURES", 11, MUTED, 700, spacing=0.6)
    chips(s, 872, 532, ["Sunroof", "Wi-Fi", "Child seat"], h=26, size=11)
    s.text(872, 590, "INSPECTIONS", 11, MUTED, 700, spacing=0.6)
    for i, (d, res, who) in enumerate([("12 Aug 2026", "PASSED", "Allison Hill"),
                                       ("03 Mar 2026", "FAILED", "Brian Yang"),
                                       ("21 Nov 2025", "PASSED", "Dana Ortiz")]):
        ry = 604 + i * 44
        s.rect(872, ry, 328, 36, WHITE, LINE, rx=6)
        s.text(884, ry + 23, d, 12, INK, 600)
        status(s, 980, ry + 8, res)
        s.text(1188, ry + 23, who, 12, MUTED, anchor="end")
    s.text(872, 760, "OTHER ATTRIBUTES", 11, MUTED, 700, spacing=0.6)
    s.text(872, 782, "none (unknown keys would list here)", 12, MUTED, italic=True)
    marker(s, 1, 446, 80)
    marker(s, 2, 470, 132)
    marker(s, 3, 830, 132)
    marker(s, 4, 1206, 132)
    marker(s, 5, 1206, 400)
    marker(s, 6, 830, 400)
    s.end()
    notes(s, [
        (1, "Scope",
         "All vehicles, or one vehicle, which adds vehicle_id to the $match (needs the planned "
         "TripReviews {vehicle_id, rating} index)."),
        (2, "One request, three widgets",
         "The average, distribution and tags all come from one $facet call: GET /api/reviews/summary."),
        (3, "Rating distribution",
         "Ordered 5★ to 1★ with count and share. Uses an ordinal colour ramp (style guide); the numbers are "
         "printed, so colour is never needed to read it."),
        (4, "Top tags",
         "Single-colour bars sorted by count, exact numbers shown, axis from 0. The tags are nearly equal in "
         "the seed data, and the chart shows that honestly."),
        (5, "Catalog document",
         "VehicleMetadata shown readably: features as chips, inspections newest first with Passed/Failed. "
         "Same generic renderer as Vehicle detail."),
        (6, "Recent reviews",
         "Paged list (GET /api/reviews). Clicking the trip id opens Trip detail."),
    ])
    s.save(WF_DIR / "08_reviews_catalog.svg")


def panel_label(s, x, y, text):
    w = badge_w(text, 11) + 6
    s.rect(x, y, w, 22, NOTE, "none", rx=11)
    s.text(x + w / 2, y + 15, text, 11, WHITE, 700, "middle", spacing=0.6)


def w09_states():
    s = new_page("W09", "Loading, empty and error states (all screens)",
                 "General expectation: every data region handles loading, empty and error. No blank pages.",
                 "/trips")
    s.g(VX, VY)
    shell(s, "ops", "trips", "Trips")
    # A loading
    card(s, 240, 76, 480, 360)
    panel_label(s, 256, 90, "A · LOADING")
    skel(s, 256, 130, 200, 30)
    skel(s, 468, 130, 120, 30)
    table(s, 256, 176, [("", 120, "l"), ("", 160, "l"), ("", 168, "l")],
          [[("skel", 0.7), ("skel", 0.9), ("skel", 0.5)] for _ in range(5)], row_h=34, head_h=30)
    button(s, 256, 388, "Booking…", "disabled", w=130, icon="spinner")
    s.text(398, 410, "busy button: spinner + disabled", 12, MUTED, italic=True)
    # B empty
    card(s, 736, 76, 480, 360)
    panel_label(s, 752, 90, "B · EMPTY")
    s.rect(936, 146, 80, 60, FILL, LINE2, rx=8, dash="4 3")
    s.line(946, 156, 1006, 196, LINE2)
    s.line(1006, 156, 946, 196, LINE2)
    s.text(976, 246, "No trips match these filters", 16, INK, 700, "middle")
    s.text(976, 270, "Try a wider date range or clear the status filter.", 13, MUTED, anchor="middle")
    button(s, 920, 292, "Clear filters", "secondary", w=112)
    s.text(976, 380, "'No data yet' and 'no match' use different text.", 12, MUTED, anchor="middle", italic=True)
    # C error
    card(s, 240, 452, 480, 364)
    panel_label(s, 256, 466, "C · ERROR (WHOLE REGION)")
    alert(s, 256, 504, 448, 158, "error", "Couldn't load trips",
          ["The server didn't respond (HTTP 503).", "Your filters are kept."],
          actions=[("Retry", "primary")], details="GET /api/trips → 503")
    s.text(256, 690, "Live map: the last result stays on screen with", 12, MUTED, italic=True)
    s.text(256, 708, "'Last updated 1 min ago, retrying…'", 12, MUTED, italic=True)
    # D partial
    card(s, 736, 452, 480, 364)
    panel_label(s, 752, 466, "D · ONE SOURCE DOWN")
    kpi(s, 752, 504, 216, "Lifetime trips", "124", "Postgres ✓", h=88)
    kpi(s, 984, 504, 216, "Total earnings", "$16,801.83", "Postgres ✓", h=88)
    card(s, 752, 608, 448, 192, "Catalog")
    alert(s, 768, 652, 416, 100, "warning", "Catalog unavailable",
          ["MongoDB isn't responding. Other sections", "still work."], actions=(), compact=True)
    button(s, 768, 760, "Retry", "secondary", w=72, h=30, size=12)
    marker(s, 1, 710, 76)
    marker(s, 2, 1206, 76)
    marker(s, 3, 710, 452)
    marker(s, 4, 1206, 452)
    s.end()
    notes(s, [
        (1, "Loading",
         "Skeletons shaped like the final content, so the layout doesn't jump. Shown after 150 ms to avoid a "
         "flash. A busy button shows a spinner and is disabled."),
        (2, "Empty",
         "Says what is empty, why it might be, and offers one action. 'No data yet' and 'no match for these "
         "filters' use different text."),
        (3, "Error",
         "A plain message, filters and inputs are kept, a Retry button, and collapsible technical details. "
         "The page is never blank."),
        (4, "Partial failure",
         "Each card owns its data request. A MongoDB outage only affects the MongoDB-backed cards, and the "
         "Postgres cards stay usable."),
        (5, "Screen readers",
         "Booking results, errors and map updates are announced through aria-live='polite'."),
    ])
    s.save(WF_DIR / "09_states.svg")


def phone(s, x, y, title, avatar):
    s.rect(x, y, 375, 800, DARK, DARK, rx=46)
    s.rect(x + 10, y + 10, 355, 780, WHITE, "none", rx=36)
    s.g(x + 10, y + 10)
    s.text(30, 30, "9:41", 13, INK, 700)
    s.rect(140, 12, 76, 22, DARK, "none", rx=11)
    s.rect(300, 20, 26, 11, "none", INK, rx=3)
    for i in range(3):
        s.line(18, 60 + i * 7, 36, 60 + i * 7, INK, 2)
    s.text(177, 74, title, 17, INK, 700, "middle")
    s.circle(326, 66, 14, FILL3, "none")
    s.text(326, 70, avatar, 10, INK, 700, "middle")
    s.line(0, 92, 355, 92, LINE)


def w10_mobile():
    s = Svg(CW, 960)
    s.text(FX, 40, "W10  Phone layouts (375 px)", 22, INK, 800)
    s.text(FX, 64, "General expectation: usable on a laptop and reasonably usable on a phone.", 13, MUTED)
    s.text(CW - 24, 40, "RideSync · Team 20 · low-fidelity wireframe", 12, FAINT, anchor="end")
    # A: book
    phone(s, 24, 112, "Book a trip", "HB")
    s.rect(16, 108, 323, 80, FILL, LINE, rx=10)
    s.text(32, 134, "WALLET BALANCE", 11, MUTED, 700, spacing=0.6)
    s.text(32, 170, "$2,275.44", 28, INK, 800)
    s.text(323, 134, "Heather ▾", 12, INK, 600, "end")
    field(s, 16, 226, 323, "Vehicle", "RS00409 · POOL · 0.31 km", suffix="▾", h=44)
    field(s, 16, 300, 323, "Fare", "24.50", prefix="$", h=44, helper="Numeric keypad opens")
    button(s, 16, 372, "Book trip", "primary", w=323, h=48, size=15)
    alert(s, 16, 436, 323, 96, "success", "Trip booked: $24.50 paid",
          ["$2,299.94 → $2,275.44", "Audit row: DEBIT −$24.50"], compact=True)
    card(s, 16, 548, 323, 168, "Your active trip")
    stepper(s, 66, 610, 222, ["REQUESTED", "IN TRANSIT", "COMPLETED"], 0)
    button(s, 32, 658, "Mark in transit", "secondary", w=291, h=44)
    s.end()
    # B: map
    phone(s, 439, 112, "Find a vehicle", "HB")
    ox, oy = 177, 250
    data = NEARBY[:6]
    map_view(s, 0, 92, 355, 360, ox, oy, 120, pin_positions(ox, oy, 16, 22, data), "map10", small=True)
    chips(s, 12, 104, ["Union Sq", "Mission", "Embarcadero"], active="Union Sq", h=26, size=11)
    s.rect(0, 404, 355, 376, WHITE, LINE, rx=20)
    s.rect(157, 414, 40, 5, FILL3, "none", rx=2.5)
    s.text(16, 446, "8 available within 5 km", 16, INK, 700)
    s.text(16, 466, "● Live · updated 3 s ago", 12, MUTED)
    for i, (n, plate, cls, km, ago, new) in enumerate(NEARBY[:4]):
        ry = 482 + i * 66
        s.line(16, ry, 339, ry, FILL2)
        s.circle(30, ry + 32, 12, WHITE, DARK, 2)
        s.text(30, ry + 36, str(n), 11, INK, 700, "middle")
        s.text(52, ry + 28, plate, 14, INK, 700)
        s.text(52, ry + 47, f"{cls} · {km:.2f} km", 12, MUTED)
        button(s, 263, ry + 14, "Book", "secondary", w=76, h=36, size=13)
    s.end()
    # C: trips as cards
    phone(s, 854, 112, "Trips", "OM")
    field(s, 16, 106, 232, None, "Search…", placeholder=True, icon="search", h=40)
    button(s, 256, 106, "Filters · 2", "secondary", w=83, h=40, size=12)
    chips(s, 16, 156, ["Active ✕", "Last 7 days ✕"], h=26, size=11)
    for i, (tid, name, plate, cls, fare, st, when) in enumerate(TRIPS[:5]):
        ry = 196 + i * 100
        s.rect(16, ry, 323, 90, WHITE, LINE, rx=10)
        s.text(32, ry + 28, plate, 15, INK, 700)
        status(s, 323 - badge_w(st), ry + 13, st)
        s.text(32, ry + 52, name, 13, INK)
        s.text(32, ry + 74, f"{money(fare)} · {when[:6]}, {when[-5:]}", 12, MUTED)
        s.text(323, ry + 74, "›", 18, MUTED, anchor="end")
    s.text(177, 718, "‹ Prev    Page 1 of 2,000    Next ›", 13, INK, 600, "middle")
    s.end()
    marker(s, 1, 30, 108)
    marker(s, 2, 380, 494)
    marker(s, 3, 798, 520)
    marker(s, 4, 1214, 312)
    marker(s, 5, 380, 680)
    notes(s, [
        (1, "Breakpoints",
         "1024 px and up: two columns. 768–1023 px: one column with the sidebar. Below 768 px the sidebar "
         "becomes a ☰ drawer and the top bar keeps the actor and balance."),
        (2, "Forms",
         "Full-width fields and a 48 px primary button. Inputs use 16 px text so phones don't zoom, and the "
         "fare opens a decimal keypad."),
        (3, "Map",
         "The map sits on top and the results are in a bottom sheet that can be dragged up. Polling works the "
         "same as on desktop."),
        (4, "Tables become cards",
         "Below 640 px each table row becomes a card with the key fields. Paging stays on the server."),
        (5, "Touch",
         "Targets are at least 44 px. No information is hover-only: chart tooltips also open on tap."),
    ], y=112)
    s.save(WF_DIR / "10_mobile.svg")


def w00_sitemap():
    s = Svg(CW, 940)
    s.raw('<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" '
          'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#495057"/></marker></defs>')
    s.text(FX, 40, "W00  Users, screens and flows", 22, INK, 800)
    s.text(FX, 64, "Two user types share one app. 'View as' switches between them (no login). Arrows are the "
                   "main journeys used in the demo.", 13, MUTED)
    s.text(CW - 24, 40, "RideSync · Team 20 · low-fidelity wireframe", 12, FAINT, anchor="end")

    def persona(y, h, title, sub, goals):
        s.rect(24, y, 380, h, WHITE, LINE2, rx=10)
        s.circle(60, y + 40, 22, FILL3, "none")
        s.text(60, y + 46, title[0], 16, INK, 800, "middle")
        s.text(96, y + 36, title, 16, INK, 800)
        s.text(96, y + 56, sub, 12, MUTED)
        for i, goal in enumerate(goals):
            s.text(44, y + 96 + i * 24, "•  " + goal, 13, BODY)

    persona(96, 330, "Rider · Heather", "Daily commuter · phone first · in a hurry", [
        "Find an available vehicle nearby", "Book a trip and see what it cost",
        "Understand a failed booking", "Follow her active trip", "Check her wallet history",
        "Read reviews of a vehicle"])
    persona(456, 420, "Ops manager · Arjun", "Fleet operations lead · laptop · data-heavy", [
        "Browse 50,000 trips quickly", "Revenue trend and ranking per vehicle",
        "Fleet totals with a freshness time", "Live availability around a hotspot",
        "Rating spread and feedback tags", "Vehicle catalog and inspections",
        "Resolve wallet disputes", "Move a stuck trip forward"])

    def lane(y, h, label):
        s.rect(436, y, 1180, h, FILL, "none", rx=12)
        s.text(456, y + 26, label, 12, MUTED, 800, spacing=1)

    lane(96, 330, "RIDER MODE")
    lane(456, 420, "OPS MANAGER MODE")
    bw, bh = 230, 86

    def box(x, y, name, route, src, wf, shared=False):
        s.rect(x, y, bw, bh, WHITE, DARK if not shared else LINE2, rx=10, sw=1.5,
               dash="5 3" if shared else None)
        s.text(x + 14, y + 26, name, 15, INK, 800)
        s.text(x + bw - 12, y + 26, wf, 11, MUTED, 700, "end")
        s.text(x + 14, y + 47, route, 12, MUTED, mono=True)
        s.text(x + 14, y + 70, src, 12, BODY)

    def arrow(x1, y1, x2, y2, label=None, lx=None, ly=None):
        s.path(f"M{x1},{y1} L{x2},{y2}", stroke="#495057", sw=1.6, marker="arr")
        if label:
            lx = lx if lx is not None else (x1 + x2) / 2
            ly = ly if ly is not None else (y1 + y2) / 2 - 8
            w = tw(label, 11) + 12
            s.rect(lx - w / 2, ly - 13, w, 18, PAGE, "none", rx=4)
            s.text(lx, ly, label, 11, BODY, 600, "middle")

    c = [470, 760, 1050, 1340]
    # rider lane
    box(c[0], 140, "Find a vehicle", "/map", "W3 · $geoNear 5 km + polling", "W07")
    box(c[1], 140, "Book a trip", "/book", "W1 · CALL sp_atomic_booking", "W03-04")
    box(c[2], 140, "My wallet", "/wallet (self)", "wallet_audit_logs, read-only", "W05", True)
    box(c[3], 140, "Reviews", "/reviews", "W4 · $facet + VehicleMetadata", "W08", True)
    box(c[1], 316, "My trips", "/trips (self)", "trips + status stepper", "W01", True)
    arrow(c[0] + bw, 183, c[1], 183, "Book this vehicle", ly=132)
    arrow(c[1] + bw, 183, c[2], 183, "success: see debit", ly=132)
    arrow(c[1] + 80, 226, c[1] + 80, 316, "blocked: active trip", lx=c[1] + 4, ly=276)
    arrow(c[1] + 150, 316, c[1] + 150, 226, "completed: book again", lx=c[1] + 226, ly=276)
    # ops lane
    box(c[0], 500, "Overview", "/analytics", "W2 window query + MV", "W06")
    box(c[1], 500, "Vehicle detail", "/vehicles/:id", "PG stats + VehicleMetadata", "W02")
    box(c[2], 500, "Reviews", "/reviews", "W4 · $facet", "W08", True)
    box(c[3], 500, "Live map", "/map", "W3 · $geoNear + polling", "W07", True)
    box(c[0], 640, "Vehicles", "/vehicles", "vehicle_lifetime_stats", "W01")
    box(c[1], 640, "Trips", "/trips", "trips, paged + filtered", "W01", True)
    box(c[2], 640, "Trip detail", "/trips/:id", "status stepper (PATCH)", "W01")
    box(c[0], 776, "Riders", "/riders", "riders, paged + search", "W01")
    box(c[1], 776, "Rider detail", "/riders/:id", "riders + trips", "W01")
    box(c[2], 776, "Wallet audit", "/wallet?rider=", "wallet_audit_logs, read-only", "W05", True)
    arrow(c[0] + bw, 543, c[1], 543, "click rank row", ly=492)
    arrow(c[1] + bw, 543, c[2], 543, "open in Reviews", ly=492)
    arrow(c[0] + bw, 670, c[1] + 40, 586, "row click", lx=c[0] + bw + 4, ly=614)
    arrow(c[1] + bw, 683, c[2], 683, "row click", ly=632)
    arrow(c[0] + bw, 819, c[1], 819, "row click", ly=768)
    arrow(c[1] + bw, 819, c[2], 819, "view wallet", ly=768)
    # legend
    s.rect(c[3], 650, bw, 40, WHITE, DARK, rx=8, sw=1.5)
    s.text(c[3] + 14, 675, "Screen for one user type", 12, INK, 600)
    s.rect(c[3], 702, bw, 40, WHITE, LINE2, rx=8, sw=1.5, dash="5 3")
    s.text(c[3] + 14, 727, "Shared screen, scoped by role", 12, INK, 600)
    s.text(c[3], 772, "W-codes refer to the wireframe files.", 12, MUTED, italic=True)
    s.save(WF_DIR / "00_sitemap.svg")


# --------------------------------------------------------------------------- #
# Design tokens + coloured UI kit
# --------------------------------------------------------------------------- #
TOKENS = {
    "color": {
        "primary": "#0F766E", "primary-hover": "#115E59", "primary-soft": "#CCFBF1", "on-primary": "#FFFFFF",
        "bg": "#F8FAFC", "surface": "#FFFFFF", "surface-muted": "#F1F5F9",
        "border": "#E2E8F0", "border-strong": "#CBD5E1",
        "text": "#0F172A", "text-muted": "#475569", "text-placeholder": "#64748B",
        "text-faint": "#94A3B8",  # disabled controls only (2.6:1)
        "success": "#15803D", "success-soft": "#DCFCE7",
        "warning": "#B45309", "warning-soft": "#FEF3C7",
        "danger": "#B91C1C", "danger-soft": "#FEE2E2",
        "info": "#1D4ED8", "info-soft": "#DBEAFE",
    },
    # Charts use the validated dataviz reference palette (see style_guide.md).
    "chart": {
        "series-1": "#2a78d6", "series-2": "#eb6834", "grid": "#E2E8F0", "axis": "#CBD5E1",
        "ordinal-1": "#86b6ef", "ordinal-2": "#5598e7", "ordinal-3": "#2a78d6",
        "ordinal-4": "#1c5cab", "ordinal-5": "#104281",
    },
}
C = TOKENS["color"]
CH = TOKENS["chart"]


def write_tokens_css():
    lines = ["/* RideSync design tokens. Generated by docs/design/src/build_design.py; edit there. */",
             "/* Light theme only (see style_guide.md). */", ":root {"]
    for k, v in TOKENS["color"].items():
        lines.append(f"  --rs-color-{k}: {v};")
    for k, v in TOKENS["chart"].items():
        lines.append(f"  --rs-chart-{k}: {v};")
    lines += [
        "",
        '  --rs-font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;',
        '  --rs-font-mono: "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace;',
        "  --rs-text-xs: 12px;   /* captions, table headers */",
        "  --rs-text-sm: 13px;   /* secondary text, table cells */",
        "  --rs-text-md: 14px;   /* body */",
        "  --rs-text-lg: 16px;   /* section titles, mobile inputs */",
        "  --rs-text-xl: 20px;   /* page title */",
        "  --rs-text-2xl: 24px;  /* KPI values */",
        "  --rs-text-3xl: 40px;  /* hero number (average rating) */",
        "",
        "  --rs-space-1: 4px;  --rs-space-2: 8px;  --rs-space-3: 12px; --rs-space-4: 16px;",
        "  --rs-space-5: 24px; --rs-space-6: 32px; --rs-space-7: 48px;",
        "",
        "  --rs-radius-sm: 6px;   /* buttons, inputs */",
        "  --rs-radius-md: 8px;   /* cards, tables, alerts */",
        "  --rs-radius-pill: 999px;",
        "  --rs-shadow-card: 0 1px 2px rgba(15, 23, 42, 0.06);",
        "  --rs-shadow-overlay: 0 8px 24px rgba(15, 23, 42, 0.12);",
        "  --rs-focus-ring: 0 0 0 2px #FFFFFF, 0 0 0 4px #0F766E;",
        "",
        "  --rs-control-height: 36px;",
        "  --rs-touch-target: 44px;",
        "  --rs-sidebar-width: 216px;",
        "  --rs-content-max: 1200px;",
        "}",
        "",
    ]
    css = "\n".join(lines)
    (DESIGN / "tokens.css").write_text(css, encoding="utf-8")
    # The web app imports the same file, so the UI cannot drift from the design.
    WEB_TOKENS.parent.mkdir(parents=True, exist_ok=True)
    WEB_TOKENS.write_text(css, encoding="utf-8")


def ui_kit():
    s = Svg(CW, 1180)
    t = s.text
    t(24, 44, "RideSync UI kit", 26, C["text"], 800)
    t(24, 68, "Colours, type and the reusable components, in the real palette. Values live in tokens.css.",
      13, C["text-muted"])

    def section(y, label):
        t(24, y, label.upper(), 12, C["text-muted"], 800, spacing=1)
        s.line(24, y + 10, CW - 24, y + 10, C["border"])

    def swatch(x, y, name, hexv):
        s.rect(x, y, 132, 54, hexv, C["border-strong"] if hexv.upper() in ("#FFFFFF", "#F8FAFC") else "none", rx=8)
        t(x, y + 72, name, 12, C["text"], 600)
        t(x, y + 88, hexv.upper(), 11, C["text-muted"], mono=True)

    section(108, "Colour tokens")
    groups = [
        ("Brand", ["primary", "primary-hover", "primary-soft"]),
        ("Neutrals", ["text", "text-muted", "text-placeholder", "text-faint", "border-strong", "border", "surface-muted", "bg", "surface"]),
        ("Status", ["success", "success-soft", "warning", "warning-soft", "danger", "danger-soft", "info", "info-soft"]),
    ]
    y = 132
    for gname, keys in groups:
        t(24, y + 32, gname, 13, C["text"], 700)
        for i, k in enumerate(keys):
            swatch(150 + i * 146, y, k, C[k])
        y += 110
    t(24, y + 32, "Charts", 13, C["text"], 700)
    for i, k in enumerate(["series-1", "series-2", "ordinal-1", "ordinal-2", "ordinal-3", "ordinal-4", "ordinal-5", "grid"]):
        swatch(150 + i * 146, y, k, CH[k])
    y += 124

    section(y, "Typography: Inter (fallback system-ui), JetBrains Mono for IDs")
    y += 44
    samples = [(20, 700, "Page title 20/700", None), (16, 700, "Section title 16/700", None),
               (14, 400, "Body 14/400: Book a trip from your wallet.", None),
               (12, 600, "Caption 12/600 · helper and table header text", C["text-muted"]),
               (24, 700, "KPI 24/700  $2,275.44", None)]
    for i, (sz, wt, label, col) in enumerate(samples):
        t(24 + (i % 3) * 520, y + (i // 3) * 46, label, sz, col or C["text"], wt)
    t(24 + 2 * 520, y + 46, "f35d765d-1b25… (mono 12)", 12, C["text-muted"], mono=True)
    y += 96

    section(y, "Buttons and inputs")
    y += 28

    def btn(x, y, label, bg, fg, border=None, w=None):
        w = w or tw(label, 14) + 32
        s.rect(x, y, w, 36, bg, border or bg, rx=6)
        t(x + w / 2, y + 23, label, 14, fg, 600, "middle")
        return w

    x = 24
    x += btn(x, y, "Book trip", C["primary"], C["on-primary"]) + 12
    x += btn(x, y, "Book trip (hover)", C["primary-hover"], C["on-primary"]) + 12
    x += btn(x, y, "Reset", C["surface"], C["text"], C["border-strong"]) + 12
    x += btn(x, y, "Cancel", "none", C["primary"], "none") + 12
    w = btn(x, y, "     Booking…", C["surface-muted"], C["text-faint"], C["border"], w=140)
    s.circle(x + 26, y + 18, 6, "none", C["text-faint"], 2, dash="22 10")
    x += w + 12
    s.rect(x - 3, y - 3, 128, 42, "none", C["primary"], rx=8, sw=2)
    btn(x, y, "Focused", C["surface"], C["text"], C["border-strong"], w=122)
    x = 24
    y += 76

    def inp(x, y, w, label, value, border, help_=None, help_col=None, sw=1, fill=None, val_col=None):
        t(x, y - 8, label, 12, C["text-muted"], 600)
        s.rect(x, y, w, 36, fill or C["surface"], border, rx=6, sw=sw)
        t(x + 12, y + 23, value, 14, val_col or C["text"])
        if help_:
            t(x, y + 54, help_, 12, help_col or C["text-muted"], 600 if help_col else 400)

    inp(24, y, 240, "Fare (default)", "$ 24.50", C["border-strong"], "More than $0.00")
    inp(288, y, 240, "Fare (focus)", "$ 24.50", C["primary"], "More than $0.00", sw=2)
    inp(552, y, 240, "Fare (error)", "$ 0.00", C["danger"], "⚠ Enter an amount greater than $0.00",
        C["danger"], sw=2)
    inp(816, y, 240, "Rider (read-only)", "Heather Brown", C["border"], fill=C["surface-muted"],
        val_col=C["text-muted"])
    inp(1080, y, 300, "Vehicle (combobox)", "RS00409 · POOL", C["border-strong"])
    t(1366, y + 23, "▾", 13, C["text-muted"], anchor="end")
    y += 100
    t(24, y - 8, "View as (segmented)", 12, C["text-muted"], 600)
    s.rect(24, y, 180, 34, C["surface"], C["border-strong"], rx=6)
    s.rect(27, y + 3, 64, 28, C["primary"], "none", rx=4)
    t(59, y + 22, "Rider", 13, C["on-primary"], 600, "middle")
    t(148, y + 22, "Ops manager", 13, C["text"], 600, "middle")
    t(240, y - 8, "Chips (quick filters, tags)", 12, C["text-muted"], 600)
    cx = 240
    for lab, on in [("7 d", False), ("30 d", True), ("90 d", False), ("Clean Car 17", False)]:
        w = tw(lab, 12) + 24
        s.rect(cx, y + 3, w, 28, C["primary-soft"] if on else C["surface"],
               C["primary"] if on else C["border-strong"], rx=14)
        t(cx + w / 2, y + 21, lab, 12, C["primary-hover"] if on else C["text"], 600, "middle")
        cx += w + 8
    t(620, y - 8, "Pagination", 12, C["text-muted"], 600)
    px = 620
    for p_ in ["‹", "1", "2", "3", "…", "2,000", "›"]:
        w = max(32, tw(p_, 12) + 18)
        on = p_ == "1"
        s.rect(px, y + 1, w, 32, C["primary"] if on else C["surface"],
               C["primary"] if on else C["border-strong"], rx=6)
        t(px + w / 2, y + 21, p_, 12, C["on-primary"] if on else C["text"], 600, "middle")
        px += w + 6
    y += 66

    section(y, "Badges (always text + colour)")
    y += 30

    def pill(x, y, label, bg, fg):
        w = badge_w(label)
        s.rect(x, y, w, 22, bg, "none", rx=11)
        t(x + w / 2, y + 15, label, 11, fg, 700, "middle", spacing=0.3)
        return w + 10

    x = 24
    for label, bg, fg in [("REQUESTED", "warning-soft", "warning"), ("IN TRANSIT", "info-soft", "info"),
                          ("COMPLETED", "success-soft", "success"), ("CREDIT", "success-soft", "success"),
                          ("DEBIT", "danger-soft", "danger"), ("ACTIVE", "success-soft", "success"),
                          ("INACTIVE", "surface-muted", "text-muted"), ("PASSED", "success-soft", "success"),
                          ("FAILED", "danger-soft", "danger"), ("NEW", "primary", "on-primary"),
                          ("READ-ONLY", "surface-muted", "text-muted")]:
        x += pill(x, y, label, C[bg], C[fg])
    t(x + 16, y + 15, "+$60.00", 14, C["success"], 700)
    t(x + 96, y + 15, "−$24.50", 14, C["danger"], 700)
    y += 58

    section(y, "Alerts")
    y += 26
    alerts = [("success", "✓", "Trip booked: $24.50 paid", "Balance $2,299.94 → $2,275.44."),
              ("danger", "✕", "You already have a trip in progress", "Nothing was charged."),
              ("warning", "!", "Your wallet changed at the same moment", "Nothing was charged. Try again."),
              ("info", "i", "Fleet summary refreshed", "As of 09 Oct 2026, 09:12.")]
    for i, (k, g, title, body) in enumerate(alerts):
        ax = 24 + i * 400
        s.rect(ax, y, 384, 76, C[k + "-soft"], "none", rx=8)
        s.rect(ax, y, 4, 76, C[k], "none", rx=2)
        s.circle(ax + 28, y + 26, 11, C[k], "none")
        t(ax + 28, y + 30.5, g, 12, "#FFFFFF", 700, "middle")
        t(ax + 48, y + 31, title, 14, C["text"], 700)
        t(ax + 48, y + 53, body, 13, C["text"])
    y += 106

    section(y, "Card, KPI, table, stepper, chart")
    y += 24
    s.rect(24, y, 300, 100, C["surface"], C["border"], rx=8)
    t(40, y + 28, "Total earnings", 12, C["text-muted"], 600)
    t(40, y + 62, "$6,322,471", 24, C["text"], 700)
    t(40, y + 86, "lifetime, completed trips", 12, C["text-muted"])
    tx0, tw0 = 344, 520
    s.rect(tx0, y, tw0, 150, C["surface"], C["border"], rx=8)
    s.rect(tx0 + 0.5, y + 0.5, tw0 - 1, 32, C["surface-muted"], "none", rx=7.5)
    for i, (h, xx, a) in enumerate([("TRIP", 12, "start"), ("RIDER", 120, "start"), ("FARE", 380, "end"),
                                    ("STATUS", 400, "start")]):
        t(tx0 + xx, y + 21, h, 11, C["text-muted"], 700, a, spacing=0.4)
    rows = [("f35d765d…", "Heather Brown", "$24.50", "REQUESTED", "warning"),
            ("e886fc11…", "Connie Lawrence", "$101.43", "IN TRANSIT", "info"),
            ("93d2c3f5…", "Kimberly Gutierrez", "$78.89", "COMPLETED", "success")]
    for i, (tid, name, fare, st, k) in enumerate(rows):
        ry = y + 32 + i * 39
        s.line(tx0, ry, tx0 + tw0, ry, C["border"])
        if i == 1:
            s.rect(tx0 + 1, ry + 0.5, tw0 - 2, 38, C["surface-muted"], "none")
        t(tx0 + 12, ry + 25, tid, 12, C["text-muted"], mono=True)
        t(tx0 + 120, ry + 25, name, 13, C["text"])
        t(tx0 + 380, ry + 25, fare, 13, C["text"], anchor="end")
        pill(tx0 + 400, ry + 9, st, C[k + "-soft"], C[k])
    # stepper
    sx, sy = 900, y + 40
    for i, lab in enumerate(["REQUESTED", "IN TRANSIT", "COMPLETED"]):
        cx = sx + i * 120
        if i < 2:
            s.line(cx + 14, sy, cx + 106, sy, C["primary"] if i < 1 else C["border-strong"], 2,
                   None if i < 1 else "5 4")
        if i == 0:
            s.circle(cx, sy, 11, C["primary"], C["primary"])
            t(cx, sy + 4.5, "✓", 12, "#FFFFFF", 700, "middle")
        elif i == 1:
            s.circle(cx, sy, 11, "#FFFFFF", C["primary"], 3)
            s.circle(cx, sy, 4, C["primary"], "none")
        else:
            s.circle(cx, sy, 11, "#FFFFFF", C["border-strong"], 1.5)
        t(cx, sy + 30, lab, 11, C["text"] if i <= 1 else C["text-muted"], 700 if i == 1 else 500, "middle")
    # mini chart
    cx0, cy0, cw0, ch0 = 1200, y, 416, 150
    s.rect(cx0, cy0, cw0, ch0, C["surface"], C["border"], rx=8)
    base = cy0 + ch0 - 24
    vals = [210, 508, 143, 0, 99, 415, 207, 519, 164, 0, 0, 241, 238, 325]
    mas = [248, 324, 310, None, 213, 275, 264, 315, 258, None, None, 309, 274, 297]
    for gy in (0, 300, 600):
        yy = base - gy * 0.15
        s.line(cx0 + 16, yy, cx0 + cw0 - 16, yy, CH["grid"] if gy else CH["axis"])
    pts = []
    for i, (v, m) in enumerate(zip(vals, mas)):
        bx = cx0 + 24 + i * 27
        if v:
            s.rect(bx, base - v * 0.15, 16, v * 0.15, CH["series-1"], "none", rx=2)
        if m:
            pts.append((bx + 8, base - m * 0.15))
    s.raw('<path d="M' + " L".join(f"{a:.1f},{b:.1f}" for a, b in pts) +
          '" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linejoin="round"/>')
    s.raw('<path d="M' + " L".join(f"{a:.1f},{b:.1f}" for a, b in pts) +
          f'" fill="none" stroke="{CH["series-2"]}" stroke-width="2" stroke-linejoin="round"/>')
    s.rect(cx0 + 16, cy0 + 12, 10, 10, CH["series-1"], "none", rx=2)
    t(cx0 + 32, cy0 + 21, "Daily revenue", 11, C["text"])
    s.line(cx0 + 130, cy0 + 17, cx0 + 142, cy0 + 17, CH["series-2"], 2)
    t(cx0 + 148, cy0 + 21, "7-day moving avg", 11, C["text"])
    y += 180

    section(y, "Rating distribution: ordinal ramp, values always printed")
    y += 30
    for i, (lab, v) in enumerate(RATINGS):
        yy = y + i * 24
        t(24, yy + 13, lab, 12, C["text"])
        bl = 420 * v / 10067
        s.rect(64, yy, bl, 16, CH[f"ordinal-{5 - i}"], "none", rx=3)
        t(72 + bl, yy + 13, f"{v:,} ({v / 250:.0f}%)", 12, C["text-muted"])
    t(640, y + 20, "Text always uses text tokens, never the series colour.", 13, C["text-muted"])
    t(640, y + 44, "Status colours (success/warning/danger) are never used as chart series.", 13, C["text-muted"])
    t(640, y + 68, "One y-axis per chart. Hover tooltip on every mark; 'View as table' toggle.", 13, C["text-muted"])
    s.h = y + 140
    s.save(DESIGN / "ui_kit.svg", bg=C["bg"])


def main():
    WF_DIR.mkdir(parents=True, exist_ok=True)
    w00_sitemap()
    w01_trips()
    w02_vehicle()
    w03_book_success()
    w04_book_failure()
    w05_audit()
    w06_analytics()
    w07_map()
    w08_reviews()
    w09_states()
    w10_mobile()
    write_tokens_css()
    ui_kit()
    print("wrote", ", ".join(sorted(p.name for p in WF_DIR.glob("*.svg"))), "+ ui_kit.svg + tokens.css")


if __name__ == "__main__":
    main()
