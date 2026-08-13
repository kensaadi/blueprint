#!/usr/bin/env python3
"""Blueprint — Security & Architecture Brief (2-page, forwardable PDF)."""
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    HRFlowable, Table, TableStyle,
)

NAVY = HexColor("#0f172a")
SLATE = HexColor("#334155")
MUTED = HexColor("#64748b")
GREEN = HexColor("#16a34a")
RED = HexColor("#b91c1c")
LINE = HexColor("#e2e8f0")
ACCENT = HexColor("#4f46e5")

import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Blueprint-Security-Architecture-Brief.pdf")

styles = {
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=21, textColor=NAVY, leading=24),
    "sub": ParagraphStyle("sub", fontName="Helvetica", fontSize=10.5, textColor=MUTED, leading=14, spaceBefore=2),
    "eyebrow": ParagraphStyle("eyebrow", fontName="Helvetica-Bold", fontSize=8, textColor=ACCENT, leading=12, spaceBefore=12, spaceAfter=3),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=12, textColor=NAVY, leading=15, spaceBefore=11, spaceAfter=4),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, textColor=SLATE, leading=14),
    "bullet": ParagraphStyle("bullet", fontName="Helvetica", fontSize=9.5, textColor=SLATE, leading=14, leftIndent=13, spaceBefore=2, bulletIndent=2),
    "lead": ParagraphStyle("lead", fontName="Helvetica", fontSize=11, textColor=NAVY, leading=16),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8, textColor=MUTED, leading=11),
    "foot": ParagraphStyle("foot", fontName="Helvetica", fontSize=8.5, textColor=MUTED, leading=12),
}

def hx(color):
    return "#" + color.hexval()[2:]

def bullet(text, mark="&#8226;", markcolor=GREEN):
    return Paragraph(f'<font color="{hx(markcolor)}"><b>{mark}</b></font>&nbsp;&nbsp;{text}', styles["bullet"])

def link(url, label=None):
    label = label or url
    return f'<a href="https://{url}" color="#4f46e5">{label}</a>'

story = []

# ---------- Header ----------
story.append(Paragraph("Blueprint", styles["title"]))
story.append(Paragraph("Security &amp; Architecture Brief &nbsp;·&nbsp; an auditable, self-hosted UI layer for regulated teams", styles["sub"]))
story.append(Spacer(1, 6))
story.append(HRFlowable(width="100%", thickness=1.4, color=NAVY, spaceAfter=2))

# ---------- The thesis ----------
story.append(Paragraph("THE ARCHITECTURE, IN ONE LINE", styles["eyebrow"]))
story.append(Paragraph(
    "No eval &rarr; the contract describes the <b>screen, not the behavior</b> &rarr; you self-host it. "
    "Everything below follows from that.", styles["lead"]))

story.append(Paragraph("What it is", styles["h2"]))
story.append(Paragraph(
    "An open UI <b>contract</b> (JSON) plus a thin <b>runtime</b> you host yourself. The runtime walks each node and "
    "maps it to <b>your own React components</b> &mdash; it is not an interpreter, and it generates no code from "
    "strings. Real logic stays in typed, reviewable code; the JSON only describes structure.", styles["body"]))

story.append(Paragraph("Why it stays out of your audit scope", styles["h2"]))
story.append(bullet("<b>No eval / no code-from-strings.</b> The runtime validates a contract with zero dynamic code &mdash; it runs under a strict Content-Security-Policy with no <font face='Courier'>unsafe-eval</font>. Nothing is generated from strings, so what passes review is what ships."))
story.append(bullet("<b>Self-hosted, zero external calls.</b> It runs inside your boundary &mdash; no data egress, no vendor endpoint, nothing to allow-list outbound. It drops into an isolated subnet or an air-gap unchanged."))
story.append(bullet("<b>Versioned, diffable contract.</b> Every change to a regulated screen is a reviewable pull-request diff &mdash; &ldquo;prove this screen behaves&rdquo; becomes a diff you hand an auditor, not a promise."))
story.append(bullet("<b>Open source (AGPL) + commercial license.</b> Your team can read every line before it ships. A commercial (non-AGPL) license is available for closed-source products."))

story.append(Spacer(1, 8))
story.append(HRFlowable(width="100%", thickness=0.6, color=LINE))
story.append(Paragraph(
    "The single most attackable claim here is &ldquo;no eval.&rdquo; So we prove it, rather than assert it &mdash; see "
    "<i>Verify it yourself</i> overleaf.", styles["small"]))

story.append(PageBreak())

# ---------- Page 2 ----------
story.append(Paragraph("WHERE IT LANDS IN COMPLIANCE", styles["eyebrow"]))
story.append(Paragraph(
    "These are <b>deployment properties that enable mandates</b> &mdash; not certifications Blueprint holds. A library "
    "you run isn&rsquo;t a SaaS in your scope; the authorization is your system&rsquo;s.", styles["body"]))
story.append(Spacer(1, 4))

comp = [
    ["PCI DSS 6.4.3 / 11.6.1",
     "Every script on a payment page inventoried, justified, tamper-monitored. Blueprint generates nothing from strings &mdash; the inventory is short and the CSP stays strict."],
    ["Data residency / sovereignty",
     "You run it on your own infrastructure, in your own region. There is no vendor endpoint in another country to account for."],
    ["NIST SC-7 / AC-4 &middot; isolation",
     "Control and isolate flows at the boundary. The runtime makes zero external calls, so there is nothing to egress from an isolated or classified enclave."],
]
rows = []
for k, v in comp:
    rows.append([Paragraph(f"<b>{k}</b>", styles["body"]), Paragraph(v, styles["body"])])
t = Table(rows, colWidths=[1.65*inch, 4.55*inch])
t.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LINEBELOW", (0,0), (-1,-2), 0.5, LINE),
    ("TOPPADDING", (0,0), (-1,-1), 6),
    ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ("LEFTPADDING", (0,0), (0,-1), 0),
]))
story.append(t)

story.append(Paragraph("VERIFY IT YOURSELF &mdash; FROM SOURCE, NOT A HOSTED PAGE", styles["eyebrow"]))
story.append(Paragraph(
    "There is no demo server to trust. The runtime is open source &mdash; clone it and run the proof on your own "
    "machine, against your own contract.", styles["small"]))
story.append(Spacer(1, 3))
story.append(bullet("<b>Live no-eval proof.</b> Open <font face='Courier'>packages/blueprint-runtime/security/csp-no-eval.html</font>: the real validator runs under a strict CSP (no <font face='Courier'>unsafe-eval</font>) &mdash; zero violations, and a deliberate <font face='Courier'>new Function()</font> blocked by the browser. Drop in your own contract and prove it on your screens.", markcolor=ACCENT))
story.append(bullet("<b>Zero-eval CI test.</b> <font face='Courier'>pnpm --filter @dashforge/blueprint-core test</font> swaps <font face='Courier'>Function</font>/<font face='Courier'>eval</font> for throwing stubs and asserts they are never called &mdash; it fails loudly on any regression.", markcolor=ACCENT))
story.append(bullet(f"<b>Dependency SBOM + full source.</b> The production closure is small and auditable (<font face='Courier'>SBOM.md</font>). Read every line: {link('github.com/kensaadi/blueprint', 'github.com/kensaadi/blueprint')} &mdash; AGPL-3.0.", markcolor=ACCENT))

story.append(Paragraph("WHAT WE CLAIM &mdash; AND WHAT WE DON&rsquo;T", styles["eyebrow"]))
claim = [
    bullet("<b>No eval</b> in the payload &mdash; nothing generated from strings.", markcolor=GREEN),
    bullet("<b>No data egress</b> &mdash; self-hosted, runs in your environment.", markcolor=GREEN),
    bullet("The contract is <b>versioned, diffable, CSP-clean</b>.", markcolor=GREEN),
]
dont = [
    bullet("<b>Not SOC 2 / PCI / ISO certified</b> &mdash; a library you run isn&rsquo;t a SaaS in your scope.", mark="&#215;", markcolor=RED),
    bullet("We <b>don&rsquo;t process or store your data</b> &mdash; nothing of yours for us to lose.", mark="&#215;", markcolor=RED),
    bullet("We <b>don&rsquo;t make you compliant</b> &mdash; we make your compliance <i>provable</i>.", mark="&#215;", markcolor=RED),
]
ct = Table([[claim[0]],[claim[1]],[claim[2]]], colWidths=[3.0*inch])
dt = Table([[dont[0]],[dont[1]],[dont[2]]], colWidths=[3.2*inch])
for tt in (ct, dt):
    tt.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("TOPPADDING",(0,0),(-1,-1),1),("BOTTOMPADDING",(0,0),(-1,-1),1),("LEFTPADDING",(0,0),(-1,-1),0)]))
two = Table([[ct, dt]], colWidths=[3.05*inch, 3.25*inch])
two.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(0,-1),0),("LEFTPADDING",(1,0),(1,-1),8)]))
story.append(Spacer(1,2))
story.append(two)

story.append(Spacer(1, 14))
story.append(HRFlowable(width="100%", thickness=0.8, color=LINE, spaceAfter=6))
story.append(Paragraph(
    "Talk to us about your audit &mdash; <b><a href='mailto:info@dashforge-ui.com' color='#0f172a'>info@dashforge-ui.com</a></b>"
    "&nbsp;&nbsp;·&nbsp;&nbsp;As of August 2026. Blueprint is pre-1.0; the claims above are architectural and verifiable today.",
    styles["foot"]))

# ---------- build ----------
doc = BaseDocTemplate(OUT, pagesize=letter,
                      leftMargin=0.72*inch, rightMargin=0.72*inch,
                      topMargin=0.66*inch, bottomMargin=0.6*inch,
                      title="Blueprint — Security & Architecture Brief", author="Blueprint")
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
doc.addPageTemplates([PageTemplate(id="main", frames=[frame])])
doc.build(story)
print("wrote", OUT)
