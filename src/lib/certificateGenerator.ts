import { formatCurrency, formatDate } from "@/lib/format";
import { PLATFORM_NAME } from "@/lib/constants";

interface RankDesign {
  theme: "midnight" | "ivory" | "royal";
  bgGradientFrom: string;
  bgGradientTo: string;
  accentPrimary: string;
  accentSecondary: string;
  accentGlow: string;
  textTitle: string;
  textSubtitle: string;
  textBody: string;
  textMuted: string;
  sealOuter: string;
  sealInner: string;
  sealText: string;
  ribbonA: string;
  ribbonB: string;
  borderColor: string;
  cornerColor: string;
  subtitleText: string;
  rankIcon: string;
  flourishColor: string;
}

const RANK_DESIGNS: Record<string, RankDesign> = {
  Bronze: {
    theme: "midnight",
    bgGradientFrom: "#1e293b",
    bgGradientTo: "#0f172a",
    accentPrimary: "#b87333",
    accentSecondary: "#d4956a",
    accentGlow: "#cd7f32",
    textTitle: "#d4956a",
    textSubtitle: "#b87333",
    textBody: "#e2c4a8",
    textMuted: "#94a3b8",
    sealOuter: "#b87333",
    sealInner: "#0f172a",
    sealText: "#b87333",
    ribbonA: "#8b5a2b",
    ribbonB: "#cd7f32",
    borderColor: "#b87333",
    cornerColor: "#b87333",
    subtitleText: "Of Achievement",
    rankIcon: "🥉",
    flourishColor: "#b87333",
  },
  Silver: {
    theme: "midnight",
    bgGradientFrom: "#1a1a2e",
    bgGradientTo: "#16213e",
    accentPrimary: "#c0c0c0",
    accentSecondary: "#e8e8e8",
    accentGlow: "#d9d9d9",
    textTitle: "#e0e0e0",
    textSubtitle: "#c0c0c0",
    textBody: "#f0f0f0",
    textMuted: "#8899aa",
    sealOuter: "#c0c0c0",
    sealInner: "#16213e",
    sealText: "#c0c0c0",
    ribbonA: "#808080",
    ribbonB: "#b0b0b0",
    borderColor: "#c0c0c0",
    cornerColor: "#c0c0c0",
    subtitleText: "Of Achievement",
    rankIcon: "🥈",
    flourishColor: "#c0c0c0",
  },
  Gold: {
    theme: "midnight",
    bgGradientFrom: "#1e293b",
    bgGradientTo: "#0f172a",
    accentPrimary: "#d4af37",
    accentSecondary: "#fcf6ba",
    accentGlow: "#b38728",
    textTitle: "#d4af37",
    textSubtitle: "#fcf6ba",
    textBody: "#fef3c7",
    textMuted: "#94a3b8",
    sealOuter: "#d4af37",
    sealInner: "#0f172a",
    sealText: "#d4af37",
    ribbonA: "#aa771c",
    ribbonB: "#d4af37",
    borderColor: "#d4af37",
    cornerColor: "#d4af37",
    subtitleText: "Of Excellence",
    rankIcon: "🏅",
    flourishColor: "#d4af37",
  },
  Diamond: {
    theme: "midnight",
    bgGradientFrom: "#030712",
    bgGradientTo: "#0f172a",
    accentPrimary: "#93c5fd",
    accentSecondary: "#bfdbfe",
    accentGlow: "#60a5fa",
    textTitle: "#93c5fd",
    textSubtitle: "#bfdbfe",
    textBody: "#e0f2fe",
    textMuted: "#64748b",
    sealOuter: "#60a5fa",
    sealInner: "#030712",
    sealText: "#60a5fa",
    ribbonA: "#3b82f6",
    ribbonB: "#60a5fa",
    borderColor: "#93c5fd",
    cornerColor: "#93c5fd",
    subtitleText: "Of Distinction",
    rankIcon: "💎",
    flourishColor: "#93c5fd",
  },
  Platinum: {
    theme: "ivory",
    bgGradientFrom: "#faf9f6",
    bgGradientTo: "#f1f0ec",
    accentPrimary: "#d4af37",
    accentSecondary: "#b38728",
    accentGlow: "#aa771c",
    textTitle: "#1e293b",
    textSubtitle: "#d4af37",
    textBody: "#374151",
    textMuted: "#64748b",
    sealOuter: "#d4af37",
    sealInner: "#faf9f6",
    sealText: "#d4af37",
    ribbonA: "#8b6914",
    ribbonB: "#d4af37",
    borderColor: "#d4af37",
    cornerColor: "#d4af37",
    subtitleText: "Of Achievement",
    rankIcon: "⬡",
    flourishColor: "#d4af37",
  },
  Elite: {
    theme: "royal",
    bgGradientFrom: "#1c0a1e",
    bgGradientTo: "#2d0a0a",
    accentPrimary: "#d4af37",
    accentSecondary: "#fcf6ba",
    accentGlow: "#b38728",
    textTitle: "#fef3c7",
    textSubtitle: "#d4af37",
    textBody: "#fce4ec",
    textMuted: "#a78b8b",
    sealOuter: "#d4af37",
    sealInner: "#1c0a1e",
    sealText: "#d4af37",
    ribbonA: "#8b6914",
    ribbonB: "#d4af37",
    borderColor: "#d4af37",
    cornerColor: "#d4af37",
    subtitleText: "Of Royal Distinction",
    rankIcon: "👑",
    flourishColor: "#d4af37",
  },
};

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function setFill(doc: any, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setFillColor(r, g, b);
}

function setDraw(doc: any, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setDrawColor(r, g, b);
}

function setTextCol(doc: any, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

// Smooth gradient background with multiple steps
function drawBackground(doc: any, design: RankDesign) {
  const [r1, g1, b1] = hexToRgb(design.bgGradientFrom);
  const [r2, g2, b2] = hexToRgb(design.bgGradientTo);
  const steps = 60;
  const stepH = 210 / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    // Diagonal gradient effect: blend both x and y
    const tx = Math.sin(t * Math.PI * 0.5);
    doc.setFillColor(
      Math.round(r1 + (r2 - r1) * tx),
      Math.round(g1 + (g2 - g1) * tx),
      Math.round(b1 + (b2 - b1) * tx)
    );
    doc.rect(0, i * stepH, 297, stepH + 0.5, "F");
  }
}

// Ambient radial glow spots
function drawAmbientGlows(doc: any, design: RankDesign) {
  const GState = (doc as any).GState;
  // Top-right warm glow
  doc.setGState(new GState({ opacity: 0.06 }));
  setFill(doc, design.accentPrimary);
  doc.circle(245, 25, 65, "F");
  // Bottom-left warm glow
  doc.circle(52, 185, 65, "F");
  // Center subtle glow
  doc.setGState(new GState({ opacity: 0.03 }));
  doc.circle(148.5, 105, 90, "F");
  doc.setGState(new GState({ opacity: 1 }));
}

// Paper texture simulation with tiny dots
function drawPaperTexture(doc: any, design: RankDesign) {
  const GState = (doc as any).GState;
  doc.setGState(new GState({ opacity: 0.02 }));
  const color = design.theme === "ivory" ? "#000000" : "#ffffff";
  setFill(doc, color);
  // Sparse random dots for texture feel
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 297;
    const y = Math.random() * 210;
    doc.circle(x, y, 0.3, "F");
  }
  doc.setGState(new GState({ opacity: 1 }));
}

// Corner ornaments matching the reference: L-shaped brackets with inner accent
function drawCornerOrnaments(doc: any, design: RankDesign) {
  setDraw(doc, design.cornerColor);
  const inset = 12;
  const size = 25;

  // Outer corners - thicker
  doc.setLineWidth(1.0);
  // Top-left
  doc.line(inset, inset, inset + size, inset);
  doc.line(inset, inset, inset, inset + size);
  // Top-right
  doc.line(297 - inset, inset, 297 - inset - size, inset);
  doc.line(297 - inset, inset, 297 - inset, inset + size);
  // Bottom-left
  doc.line(inset, 210 - inset, inset + size, 210 - inset);
  doc.line(inset, 210 - inset, inset, 210 - inset - size);
  // Bottom-right
  doc.line(297 - inset, 210 - inset, 297 - inset - size, 210 - inset);
  doc.line(297 - inset, 210 - inset, 297 - inset, 210 - inset - size);

  // Inner corner accent marks - thinner, smaller
  doc.setLineWidth(0.4);
  const inner = inset - 2;
  const innerSize = 6;
  doc.line(inner, inner, inner + innerSize, inner);
  doc.line(inner, inner, inner, inner + innerSize);
  doc.line(297 - inner, inner, 297 - inner - innerSize, inner);
  doc.line(297 - inner, inner, 297 - inner, inner + innerSize);
  doc.line(inner, 210 - inner, inner + innerSize, 210 - inner);
  doc.line(inner, 210 - inner, inner, 210 - inner - innerSize);
  doc.line(297 - inner, 210 - inner, 297 - inner - innerSize, 210 - inner);
  doc.line(297 - inner, 210 - inner, 297 - inner, 210 - inner - innerSize);
}

// Side flourish vertical lines
function drawSideFlourishes(doc: any, design: RankDesign) {
  const GState = (doc as any).GState;
  setDraw(doc, design.flourishColor);
  doc.setLineWidth(0.3);

  // Left side - gradient-like vertical line
  const segments = 20;
  const startY = 70;
  const lineH = 70;
  const segH = lineH / segments;
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const opacity = Math.sin(t * Math.PI) * 0.3;
    doc.setGState(new GState({ opacity: Math.max(opacity, 0.02) }));
    doc.line(8, startY + i * segH, 8, startY + (i + 1) * segH);
  }
  // Right side
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const opacity = Math.sin(t * Math.PI) * 0.3;
    doc.setGState(new GState({ opacity: Math.max(opacity, 0.02) }));
    doc.line(289, startY + i * segH, 289, startY + (i + 1) * segH);
  }
  doc.setGState(new GState({ opacity: 1 }));
}

// Premium star badge with shine effect
function drawStarBadge(doc: any, cx: number, cy: number, radius: number, design: RankDesign) {
  const GState = (doc as any).GState;

  // Shadow
  doc.setGState(new GState({ opacity: 0.15 }));
  doc.setFillColor(0, 0, 0);
  doc.circle(cx + 1, cy + 2, radius + 1, "F");
  doc.setGState(new GState({ opacity: 1 }));

  // Outer ring
  setFill(doc, design.accentPrimary);
  doc.circle(cx, cy, radius, "F");

  // Inner darker ring for depth
  setFill(doc, design.accentGlow);
  doc.circle(cx, cy, radius - 1.5, "F");

  // Main face
  setFill(doc, design.accentPrimary);
  doc.circle(cx, cy, radius - 2, "F");

  // Shine highlight (ellipse top-left)
  doc.setGState(new GState({ opacity: 0.35 }));
  doc.setFillColor(255, 255, 255);
  doc.ellipse(cx - 2, cy - 3, radius * 0.45, radius * 0.25, "F");
  doc.setGState(new GState({ opacity: 1 }));

  // Star symbol
  const starColor = design.theme === "ivory" ? "#1e293b" : "#0f172a";
  setTextCol(doc, starColor);
  doc.setFontSize(radius * 2);
  doc.setFont("helvetica", "bold");
  doc.text("★", cx, cy + radius * 0.6, { align: "center" });

  // Three dots below
  setFill(doc, design.accentPrimary);
  doc.circle(cx - 3.5, cy + radius + 4, 0.9, "F");
  doc.circle(cx, cy + radius + 4, 0.9, "F");
  doc.circle(cx + 3.5, cy + radius + 4, 0.9, "F");
}

// Official seal with ribbon tails
function drawOfficialSeal(doc: any, cx: number, cy: number, design: RankDesign) {
  const GState = (doc as any).GState;

  // Shadow
  doc.setGState(new GState({ opacity: 0.2 }));
  doc.setFillColor(0, 0, 0);
  doc.ellipse(cx + 1, cy + 2, 15, 11, "F");
  doc.setGState(new GState({ opacity: 1 }));

  // Outer gold ellipse
  setFill(doc, design.sealOuter);
  doc.ellipse(cx, cy, 14.5, 11, "F");

  // Inner dark ellipse
  setFill(doc, design.sealInner);
  doc.ellipse(cx, cy, 12, 9, "F");

  // Inner border
  setDraw(doc, design.sealText);
  doc.setGState(new GState({ opacity: 0.3 }));
  doc.setLineWidth(0.5);
  doc.ellipse(cx, cy, 12, 9);
  doc.setGState(new GState({ opacity: 1 }));

  // Seal text
  setTextCol(doc, design.sealText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("OFFICIAL", cx, cy - 1.5, { align: "center" });
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  setTextCol(doc, design.textBody);
  doc.text("SEAL", cx, cy + 3, { align: "center" });

  // Ribbon tails
  const ry = cy + 11;
  setFill(doc, design.ribbonA);
  doc.triangle(cx - 8, ry, cx - 2, ry, cx - 11, ry + 15, "F");
  setFill(doc, design.ribbonB);
  doc.triangle(cx + 2, ry, cx + 8, ry, cx + 11, ry + 15, "F");
}

// Gradient divider line
function drawAccentDivider(doc: any, y: number, design: RankDesign) {
  const GState = (doc as any).GState;
  setDraw(doc, design.accentPrimary);
  doc.setLineWidth(0.4);

  // Fade in from left, full in center, fade out right
  const segments = 30;
  const startX = 80;
  const endX = 217;
  const segW = (endX - startX) / segments;
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const opacity = Math.sin(t * Math.PI) * 0.5;
    doc.setGState(new GState({ opacity: Math.max(opacity, 0.05) }));
    doc.line(startX + i * segW, y, startX + (i + 1) * segW, y);
  }
  doc.setGState(new GState({ opacity: 1 }));
}

// Ivory theme: elegant wave on left side
function drawIvoryWave(doc: any, design: RankDesign) {
  const GState = (doc as any).GState;
  doc.setGState(new GState({ opacity: 0.08 }));
  setFill(doc, design.accentPrimary);
  // Simulate wave with overlapping circles
  for (let y = 0; y < 210; y += 5) {
    const x = 15 + Math.sin(y * 0.03) * 10;
    doc.circle(x, y, 20, "F");
  }
  doc.setGState(new GState({ opacity: 1 }));
}

// Royal theme: ornate double border
function drawRoyalBorders(doc: any, design: RankDesign) {
  setDraw(doc, design.borderColor);
  const GState = (doc as any).GState;

  // Outer border
  doc.setGState(new GState({ opacity: 0.3 }));
  doc.setLineWidth(1.5);
  doc.roundedRect(6, 6, 285, 198, 3, 3);

  // Inner border
  doc.setLineWidth(0.6);
  doc.roundedRect(9, 9, 279, 192, 2, 2);
  doc.setGState(new GState({ opacity: 1 }));

  // Corner flourishes for royal
  doc.setLineWidth(1.2);
  const cs = 18;
  const ci = 6;
  doc.line(ci, ci, ci + cs, ci);
  doc.line(ci, ci, ci, ci + cs);
  doc.line(297 - ci, ci, 297 - ci - cs, ci);
  doc.line(297 - ci, ci, 297 - ci, ci + cs);
  doc.line(ci, 210 - ci, ci + cs, 210 - ci);
  doc.line(ci, 210 - ci, ci, 210 - ci - cs);
  doc.line(297 - ci, 210 - ci, 297 - ci - cs, 210 - ci);
  doc.line(297 - ci, 210 - ci, 297 - ci, 210 - ci - cs);
}

// Royal theme: heart/fleur divider
function drawRoyalDivider(doc: any, y: number, design: RankDesign) {
  const GState = (doc as any).GState;
  const cx = 148.5;

  // Left line
  setDraw(doc, design.accentPrimary);
  doc.setLineWidth(0.4);
  doc.setGState(new GState({ opacity: 0.5 }));
  doc.line(cx - 45, y, cx - 8, y);
  // Right line
  doc.line(cx + 8, y, cx + 45, y);
  doc.setGState(new GState({ opacity: 1 }));

  // Center ornament: ❦
  setTextCol(doc, design.accentPrimary);
  doc.setFontSize(14);
  doc.text("❦", cx, y + 3.5, { align: "center" });
}

export interface CertificateData {
  rankName: string;
  fullName: string;
  certificateHash: string;
  issuedAt: string;
  totalCommission: number;
  milestoneDate: string;
  avatarUrl?: string | null;
  adminSignatureUrl?: string | null;
  ceoName?: string;
}

export async function generatePremiumCertificatePDF(data: CertificateData): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const GState = (doc as any).GState;

  const design = RANK_DESIGNS[data.rankName] || RANK_DESIGNS.Gold;
  const pageW = 297;
  const cx = pageW / 2;

  // ======== LAYER 1: BACKGROUND ========
  drawBackground(doc, design);

  // ======== LAYER 2: PAPER TEXTURE ========
  drawPaperTexture(doc, design);

  // ======== LAYER 3: AMBIENT GLOWS ========
  drawAmbientGlows(doc, design);

  // ======== LAYER 4: THEME-SPECIFIC DECORATIONS ========
  if (design.theme === "ivory") {
    drawIvoryWave(doc, design);
  }
  if (design.theme === "royal") {
    drawRoyalBorders(doc, design);
  }

  // ======== LAYER 5: CORNER ORNAMENTS ========
  drawCornerOrnaments(doc, design);

  // ======== LAYER 6: SIDE FLOURISHES ========
  drawSideFlourishes(doc, design);

  // ======== LAYER 7: BORDER LAYERS ========
  if (design.theme !== "royal") {
    setDraw(doc, design.borderColor);
    doc.setGState(new GState({ opacity: 0.4 }));
    doc.setLineWidth(1.0);
    doc.rect(10, 10, 277, 190);
    doc.setGState(new GState({ opacity: 0.2 }));
    doc.setLineWidth(0.4);
    doc.rect(13, 13, 271, 184);
    doc.setGState(new GState({ opacity: 1 }));
  }

  // ======== LAYER 8: PLATFORM BRANDING (top-left) ========
  setTextCol(doc, design.textSubtitle);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(PLATFORM_NAME, 22, 20);

  // ======== LAYER 9: STAR BADGE (top center) ========
  drawStarBadge(doc, cx, 30, 11, design);

  // ======== LAYER 10: TITLE "CERTIFICATE" ========
  let titleY = 58;
  setTextCol(doc, design.textTitle);
  doc.setFont("times", "bold");
  doc.setFontSize(38);
  doc.setCharSpace(3);
  doc.text("CERTIFICATE", cx, titleY, { align: "center" });
  doc.setCharSpace(0);

  // ======== LAYER 11: SUBTITLE ========
  setTextCol(doc, design.textSubtitle);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setCharSpace(5);
  doc.text(design.subtitleText.toUpperCase(), cx, titleY + 9, { align: "center" });
  doc.setCharSpace(0);

  // ======== LAYER 12: "This certifies that" ========
  setTextCol(doc, design.textMuted);
  doc.setFontSize(7.5);
  doc.setCharSpace(3);
  doc.text("THIS CERTIFIES THAT", cx, titleY + 22, { align: "center" });
  doc.setCharSpace(0);

  // ======== LAYER 13: RECIPIENT NAME (large script) ========
  const nameY = titleY + 35;
  setTextCol(doc, design.textBody);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(34);
  doc.text(data.fullName, cx, nameY, { align: "center" });

  // Name underline with fade
  const nameW = doc.getTextWidth(data.fullName);
  setDraw(doc, design.accentPrimary);
  doc.setGState(new GState({ opacity: 0.3 }));
  doc.setLineWidth(0.4);
  doc.line(cx - nameW / 2 - 10, nameY + 3, cx + nameW / 2 + 10, nameY + 3);
  doc.setGState(new GState({ opacity: 1 }));

  // ======== LAYER 14: "Has achieved the status of" ========
  setTextCol(doc, design.textMuted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setCharSpace(3);
  doc.text("HAS ACHIEVED THE STATUS OF", cx, nameY + 14, { align: "center" });
  doc.setCharSpace(0);

  // ======== LAYER 15: RANK TITLE ========
  setTextCol(doc, design.textTitle);
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  const rankTitle = `${data.rankName} Tier Affiliate`;
  doc.text(rankTitle, cx, nameY + 25, { align: "center" });

  // ======== LAYER 16: BODY DESCRIPTION ========
  if (design.theme === "royal") {
    drawRoyalDivider(doc, nameY + 31, design);
  } else {
    drawAccentDivider(doc, nameY + 31, design);
  }

  // Remove the left accent bar to allow centered text
  // Left accent bar for body text (optional - commented out for cleaner look)
  // setDraw(doc, design.accentPrimary);
  // doc.setGState(new GState({ opacity: 0.3 }));
  // doc.setLineWidth(0.7);
  // const bodyStartY = nameY + 37;
  // doc.line(65, bodyStartY - 1, 65, bodyStartY + 16);
  // doc.setGState(new GState({ opacity: 1 }));

  doc.setFont("times", "italic");
  doc.setFontSize(9);
  setTextCol(doc, design.textMuted);
  const bodyText = `For achieving exceptional performance and generating verified revenue on ${PLATFORM_NAME}, demonstrating outstanding results and unwavering commitment to platform excellence.`;
  const bodyLines = doc.splitTextToSize(bodyText, 200);
  const bodyStartY = nameY + 37;
  doc.text(bodyLines as string[], cx, bodyStartY + 3, { align: "center" });

  // ======== LAYER 17: VERIFIED EARNINGS ========
  if (data.totalCommission > 0) {
    setTextCol(doc, design.textSubtitle);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const earningsText = `Total Verified Earnings: ${formatCurrency(data.totalCommission)}`;
    const earningsWidth = doc.getTextWidth(earningsText);
    const maxWidth = 250;
    if (earningsWidth > maxWidth) {
      doc.setFontSize(9);
    }
    doc.text(earningsText, cx, bodyStartY + 26, { align: "center" });
  }

  // ======== LAYER 18: BOTTOM SECTION ========
  const bottomY = 174;

  // --- Date (left) ---
  setTextCol(doc, design.textBody);
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.text(formatDate(data.milestoneDate), 70, bottomY, { align: "center" });

  // Date underline
  setDraw(doc, design.accentPrimary);
  doc.setGState(new GState({ opacity: 0.4 }));
  doc.setLineWidth(0.3);
  doc.line(38, bottomY + 3, 102, bottomY + 3);
  doc.setGState(new GState({ opacity: 1 }));

  setTextCol(doc, design.textMuted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setCharSpace(2.5);
  doc.text("DATE", 70, bottomY + 8, { align: "center" });
  doc.setCharSpace(0);

  // --- Seal (center) ---
  drawOfficialSeal(doc, cx, bottomY - 2, design);

  // --- Signature (right) ---
  if (data.adminSignatureUrl) {
    try {
      doc.addImage(data.adminSignatureUrl, "PNG", 198, bottomY - 20, 54, 17);
    } catch { /* skip */ }
  }

  const sigName = data.ceoName || "Platform CEO";
  setTextCol(doc, design.textBody);
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.text(sigName, 225, bottomY, { align: "center" });

  // Signature underline
  setDraw(doc, design.accentPrimary);
  doc.setGState(new GState({ opacity: 0.4 }));
  doc.setLineWidth(0.3);
  doc.line(193, bottomY + 3, 257, bottomY + 3);
  doc.setGState(new GState({ opacity: 1 }));

  setTextCol(doc, design.textMuted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setCharSpace(2.5);
  doc.text("CHIEF EXECUTIVE OFFICER", 225, bottomY + 8, { align: "center" });
  doc.setCharSpace(0);

  // ======== LAYER 19: FOOTER ========
  doc.setFont("courier", "normal");
  doc.setFontSize(5.5);
  setTextCol(doc, design.textMuted);
  doc.setGState(new GState({ opacity: 0.45 }));
  doc.setCharSpace(1.5);
  doc.text(`CERTIFICATE ID: ${data.certificateHash}`, cx, 197, { align: "center" });
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const verifyText = `ISSUE DATE: ${formatDate(data.issuedAt)}  •  VERIFY: ${origin}/verify-certificate/${data.certificateHash}`;
  const verifyLines = doc.splitTextToSize(verifyText, 270);
  doc.text(verifyLines, cx, 201, { align: "center", maxWidth: 270 });
  doc.setCharSpace(0);
  doc.setGState(new GState({ opacity: 1 }));

  // ======== LAYER 20: PROFILE PHOTO (top-right, circular clip) ========
  if (data.avatarUrl) {
    try {
      const photoCx = 268;
      const photoCy = 26;
      const photoR = 11;

      // Save graphics state, create circular clipping path
      (doc as any).saveGraphicsState();
      // Create circular clip by drawing circle path
      const ctx = (doc as any).context2d || null;
      // Use internal API for clip: draw circle path then clip
      doc.circle(photoCx, photoCy, photoR, null as any);
      (doc as any).clip();
      // Draw image inside clipped region
      doc.addImage(data.avatarUrl, "JPEG", photoCx - photoR, photoCy - photoR, photoR * 2, photoR * 2);
      (doc as any).restoreGraphicsState();

      // Draw circle border on top
      setDraw(doc, design.accentPrimary);
      doc.setLineWidth(1.2);
      doc.circle(photoCx, photoCy, photoR);

      // Outer glow ring
      doc.setGState(new GState({ opacity: 0.15 }));
      setDraw(doc, design.accentGlow);
      doc.setLineWidth(0.6);
      doc.circle(photoCx, photoCy, photoR + 2);
      doc.setGState(new GState({ opacity: 1 }));
    } catch { /* skip if image fails */ }
  }

  // ======== SAVE ========
  doc.save(`${PLATFORM_NAME}-${data.rankName}-Certificate.pdf`);
}
