import { formatCurrency, formatDate } from "@/lib/format";
import { PLATFORM_NAME } from "@/lib/constants";

// Rank-specific design configs matching reference HTML themes
interface RankDesign {
  theme: "midnight" | "ivory" | "royal";
  bgPrimary: string;
  bgSecondary: string;
  accentPrimary: string;
  accentSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  sealColor: string;
  borderLayers: number;
  cornerOrnaments: boolean;
  sideFlourishes: boolean;
  ribbonColor: string;
  subtitleText: string;
}

const RANK_DESIGNS: Record<string, RankDesign> = {
  Bronze: {
    theme: "midnight",
    bgPrimary: "#1e293b",
    bgSecondary: "#0f172a",
    accentPrimary: "#b87333",
    accentSecondary: "#d4956a",
    textPrimary: "#fde6d0",
    textSecondary: "#b87333",
    textMuted: "#94a3b8",
    sealColor: "#b87333",
    borderLayers: 2,
    cornerOrnaments: true,
    sideFlourishes: false,
    ribbonColor: "#8b5a2b",
    subtitleText: "Of Achievement",
  },
  Silver: {
    theme: "midnight",
    bgPrimary: "#1a1a2e",
    bgSecondary: "#16213e",
    accentPrimary: "#c0c0c0",
    accentSecondary: "#e0e0e0",
    textPrimary: "#f0f0f0",
    textSecondary: "#c0c0c0",
    textMuted: "#8899aa",
    sealColor: "#c0c0c0",
    borderLayers: 2,
    cornerOrnaments: true,
    sideFlourishes: true,
    ribbonColor: "#808080",
    subtitleText: "Of Achievement",
  },
  Gold: {
    theme: "midnight",
    bgPrimary: "#0f172a",
    bgSecondary: "#1e293b",
    accentPrimary: "#d4af37",
    accentSecondary: "#fcf6ba",
    textPrimary: "#fcf6ba",
    textSecondary: "#d4af37",
    textMuted: "#94a3b8",
    sealColor: "#d4af37",
    borderLayers: 3,
    cornerOrnaments: true,
    sideFlourishes: true,
    ribbonColor: "#aa771c",
    subtitleText: "Of Excellence",
  },
  Diamond: {
    theme: "midnight",
    bgPrimary: "#030712",
    bgSecondary: "#0f172a",
    accentPrimary: "#93c5fd",
    accentSecondary: "#bfdbfe",
    textPrimary: "#e0f2fe",
    textSecondary: "#93c5fd",
    textMuted: "#64748b",
    sealColor: "#60a5fa",
    borderLayers: 4,
    cornerOrnaments: true,
    sideFlourishes: true,
    ribbonColor: "#3b82f6",
    subtitleText: "Of Distinction",
  },
  Platinum: {
    theme: "ivory",
    bgPrimary: "#faf9f6",
    bgSecondary: "#f1f0ec",
    accentPrimary: "#d4af37",
    accentSecondary: "#b38728",
    textPrimary: "#1e293b",
    textSecondary: "#d4af37",
    textMuted: "#64748b",
    sealColor: "#d4af37",
    borderLayers: 2,
    cornerOrnaments: false,
    sideFlourishes: false,
    ribbonColor: "#aa771c",
    subtitleText: "Of Achievement",
  },
  Elite: {
    theme: "royal",
    bgPrimary: "#1c0a1e",
    bgSecondary: "#2d0a0a",
    accentPrimary: "#d4af37",
    accentSecondary: "#fcf6ba",
    textPrimary: "#fef3c7",
    textSecondary: "#d4af37",
    textMuted: "#a78b8b",
    sealColor: "#d4af37",
    borderLayers: 3,
    cornerOrnaments: true,
    sideFlourishes: true,
    ribbonColor: "#aa771c",
    subtitleText: "Of Royal Distinction",
  },
};

const RANK_ICONS: Record<string, string> = {
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🏅",
  Diamond: "💎",
  Platinum: "⬡",
  Elite: "👑",
};

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function drawGradientRect(
  doc: any,
  x: number,
  y: number,
  w: number,
  h: number,
  colorA: string,
  colorB: string,
  steps = 20
) {
  const [r1, g1, b1] = hexToRgb(colorA);
  const [r2, g2, b2] = hexToRgb(colorB);
  const stepH = h / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    doc.setFillColor(r, g, b);
    doc.rect(x, y + i * stepH, w, stepH + 0.5, "F");
  }
}

function drawCornerOrnaments(doc: any, accent: string) {
  const [r, g, b] = hexToRgb(accent);
  doc.setDrawColor(r, g, b);

  // Outer corners
  const size = 25;
  const offset = 15;
  doc.setLineWidth(0.8);

  // Top-left
  doc.line(offset, offset, offset + size, offset);
  doc.line(offset, offset, offset, offset + size);
  // Small inner corner
  doc.setLineWidth(0.4);
  doc.line(offset - 2, offset - 2, offset + 6, offset - 2);
  doc.line(offset - 2, offset - 2, offset - 2, offset + 6);

  // Top-right
  doc.setLineWidth(0.8);
  doc.line(297 - offset, offset, 297 - offset - size, offset);
  doc.line(297 - offset, offset, 297 - offset, offset + size);
  doc.setLineWidth(0.4);
  doc.line(297 - offset + 2, offset - 2, 297 - offset - 6, offset - 2);
  doc.line(297 - offset + 2, offset - 2, 297 - offset + 2, offset + 6);

  // Bottom-left
  doc.setLineWidth(0.8);
  doc.line(offset, 210 - offset, offset + size, 210 - offset);
  doc.line(offset, 210 - offset, offset, 210 - offset - size);
  doc.setLineWidth(0.4);
  doc.line(offset - 2, 210 - offset + 2, offset + 6, 210 - offset + 2);
  doc.line(offset - 2, 210 - offset + 2, offset - 2, 210 - offset - 6);

  // Bottom-right
  doc.setLineWidth(0.8);
  doc.line(297 - offset, 210 - offset, 297 - offset - size, 210 - offset);
  doc.line(297 - offset, 210 - offset, 297 - offset, 210 - offset - size);
  doc.setLineWidth(0.4);
  doc.line(297 - offset + 2, 210 - offset + 2, 297 - offset - 6, 210 - offset + 2);
  doc.line(297 - offset + 2, 210 - offset + 2, 297 - offset + 2, 210 - offset - 6);
}

function drawBorderLayers(doc: any, layers: number, accent: string) {
  const [r, g, b] = hexToRgb(accent);
  doc.setDrawColor(r, g, b);

  for (let i = 0; i < layers; i++) {
    const inset = 8 + i * 4;
    const width = i === 0 ? 1.5 : i === 1 ? 0.5 : 0.3;
    doc.setLineWidth(width);
    doc.rect(inset, inset, 297 - inset * 2, 210 - inset * 2);
  }
}

function drawSideFlourishes(doc: any, accent: string) {
  const [r, g, b] = hexToRgb(accent);
  doc.setDrawColor(r, g, b);
  // Left side vertical flourish
  doc.setLineWidth(0.3);
  const cx = 10;
  doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
  doc.line(cx, 70, cx, 140);
  // Right side
  doc.line(297 - cx, 70, 297 - cx, 140);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
}

function drawOfficialSeal(
  doc: any,
  x: number,
  y: number,
  design: RankDesign,
  hasRibbon = true
) {
  const [r, g, b] = hexToRgb(design.sealColor);

  // Outer ring
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(2);
  doc.circle(x, y, 14);

  // Inner ring
  doc.setLineWidth(0.8);
  doc.circle(x, y, 11);

  // Inner circle fill
  if (design.theme === "ivory") {
    doc.setFillColor(255, 255, 255);
  } else {
    const [bgR, bgG, bgB] = hexToRgb(design.bgPrimary);
    doc.setFillColor(bgR, bgG, bgB);
  }
  doc.circle(x, y, 10, "F");
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.5);
  doc.circle(x, y, 10);

  // Seal text
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.setFont("helvetica", "bold");
  doc.text("OFFICIAL", x, y - 2, { align: "center" });
  doc.setFontSize(5);
  doc.text("SEAL", x, y + 3, { align: "center" });

  // Ribbon tails
  if (hasRibbon) {
    const [rr, rg, rb] = hexToRgb(design.ribbonColor);
    doc.setFillColor(rr, rg, rb);
    // Left ribbon
    doc.triangle(x - 6, y + 14, x - 2, y + 14, x - 8, y + 26, "F");
    // Right ribbon
    const [r2, g2, b2] = hexToRgb(design.accentPrimary);
    doc.setFillColor(r2, g2, b2);
    doc.triangle(x + 2, y + 14, x + 6, y + 14, x + 8, y + 26, "F");
  }
}

function drawStarBadge(doc: any, x: number, y: number, radius: number, accent: string) {
  const [r, g, b] = hexToRgb(accent);
  doc.setFillColor(r, g, b);
  doc.circle(x, y, radius, "F");

  // Star in center (simplified as text)
  doc.setFontSize(radius * 2.5);
  doc.setTextColor(255, 255, 255);
  if (doc.getFont().fontName !== "helvetica") doc.setFont("helvetica", "normal");
  doc.text("★", x, y + radius * 0.8, { align: "center" });
}

function drawDecorativeDivider(doc: any, y: number, accent: string) {
  const [r, g, b] = hexToRgb(accent);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.5);
  doc.line(75, y, 222, y);
  doc.setLineWidth(0.2);
  doc.line(85, y + 2, 212, y + 2);
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

  const design = RANK_DESIGNS[data.rankName] || RANK_DESIGNS.Gold;
  const rankIcon = RANK_ICONS[data.rankName] || "🏅";

  // === BACKGROUND ===
  drawGradientRect(doc, 0, 0, 297, 210, design.bgPrimary, design.bgSecondary);

  // === BORDER LAYERS ===
  drawBorderLayers(doc, design.borderLayers, design.accentPrimary);

  // === CORNER ORNAMENTS ===
  if (design.cornerOrnaments) {
    drawCornerOrnaments(doc, design.accentPrimary);
  }

  // === SIDE FLOURISHES ===
  if (design.sideFlourishes) {
    drawSideFlourishes(doc, design.accentPrimary);
  }

  // === TOP STAR BADGE ===
  drawStarBadge(doc, 148.5, 30, 10, design.accentPrimary);

  // 3 dots below badge
  const [dotR, dotG, dotB] = hexToRgb(design.accentPrimary);
  doc.setFillColor(dotR, dotG, dotB);
  doc.circle(145.5, 42, 0.8, "F");
  doc.circle(148.5, 42, 0.8, "F");
  doc.circle(151.5, 42, 0.8, "F");

  // === TITLE ===
  const [tpR, tpG, tpB] = hexToRgb(design.textSecondary);
  doc.setTextColor(tpR, tpG, tpB);
  doc.setFont("times", "bold");
  doc.setFontSize(32);
  doc.text("CERTIFICATE", 148.5, 58, { align: "center" });

  // Subtitle
  const [tsR, tsG, tsB] = hexToRgb(design.accentSecondary);
  doc.setTextColor(tsR, tsG, tsB);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setCharSpace(3);
  doc.text(design.subtitleText.toUpperCase(), 148.5, 66, { align: "center" });
  doc.setCharSpace(0);

  // === "This certifies that" ===
  const [tmR, tmG, tmB] = hexToRgb(design.textMuted);
  doc.setTextColor(tmR, tmG, tmB);
  doc.setFontSize(9);
  doc.setCharSpace(2);
  doc.text("THIS CERTIFIES THAT", 148.5, 78, { align: "center" });
  doc.setCharSpace(0);

  // === RECIPIENT NAME (script-style) ===
  const [npR, npG, npB] = hexToRgb(design.textPrimary);
  doc.setTextColor(npR, npG, npB);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(30);
  doc.text(data.fullName, 148.5, 92, { align: "center" });

  // Underline beneath name
  const nameWidth = doc.getTextWidth(data.fullName);
  const [ulR, ulG, ulB] = hexToRgb(design.accentPrimary);
  doc.setDrawColor(ulR, ulG, ulB);
  doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
  doc.setLineWidth(0.3);
  doc.line(148.5 - nameWidth / 2, 95, 148.5 + nameWidth / 2, 95);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // === "Has achieved the status of" ===
  doc.setTextColor(tmR, tmG, tmB);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setCharSpace(2);
  doc.text("HAS ACHIEVED THE STATUS OF", 148.5, 104, { align: "center" });
  doc.setCharSpace(0);

  // === RANK TITLE ===
  doc.setTextColor(npR, npG, npB);
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.text(`${rankIcon}  ${data.rankName} Tier Affiliate  ${rankIcon}`, 148.5, 115, { align: "center" });

  // === BODY COPY ===
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(tmR, tmG, tmB);
  // Left border line for the description
  doc.setDrawColor(ulR, ulG, ulB);
  doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
  doc.setLineWidth(0.5);
  doc.line(70, 122, 70, 138);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  const bodyText = `For achieving exceptional performance and verified achievement on ${PLATFORM_NAME}, demonstrating outstanding results and unwavering commitment to platform excellence.`;
  const bodyLines = doc.splitTextToSize(bodyText, 150);
  doc.text(bodyLines, 74, 126);

  // === EARNINGS & MILESTONE ===
  doc.setTextColor(tpR, tpG, tpB);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  if (data.totalCommission > 0) {
    doc.text(`Total Verified Earnings: ${formatCurrency(data.totalCommission)}`, 148.5, 146, { align: "center" });
  }

  // === BOTTOM SECTION: Date / Seal / Signature ===
  const bottomY = 168;

  // Date (left)
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(tpR, tpG, tpB);
  doc.text(formatDate(data.milestoneDate), 70, bottomY, { align: "center" });

  // Date line
  doc.setDrawColor(ulR, ulG, ulB);
  doc.setGState(new (doc as any).GState({ opacity: 0.5 }));
  doc.setLineWidth(0.3);
  doc.line(40, bottomY + 3, 100, bottomY + 3);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // Date label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(tmR, tmG, tmB);
  doc.setCharSpace(2);
  doc.text("DATE", 70, bottomY + 8, { align: "center" });
  doc.setCharSpace(0);

  // Official Seal (center)
  drawOfficialSeal(doc, 148.5, bottomY - 4, design);

  // Signature (right)
  if (data.adminSignatureUrl) {
    try {
      doc.addImage(data.adminSignatureUrl, "PNG", 200, bottomY - 18, 50, 18);
    } catch {
      /* skip if image fails */
    }
  }
  const sigName = data.ceoName || "Platform CEO";
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(tpR, tpG, tpB);
  doc.text(sigName, 225, bottomY, { align: "center" });

  // Signature line
  doc.setDrawColor(ulR, ulG, ulB);
  doc.setGState(new (doc as any).GState({ opacity: 0.5 }));
  doc.setLineWidth(0.3);
  doc.line(195, bottomY + 3, 255, bottomY + 3);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // Signature title label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(tmR, tmG, tmB);
  doc.setCharSpace(2);
  doc.text("CHIEF EXECUTIVE OFFICER", 225, bottomY + 8, { align: "center" });
  doc.setCharSpace(0);

  // === FOOTER ===
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  const [fR, fG, fB] = hexToRgb(design.textMuted);
  doc.setTextColor(fR, fG, fB);
  doc.setGState(new (doc as any).GState({ opacity: 0.6 }));
  doc.setCharSpace(1);
  doc.text(`CERTIFICATE ID: ${data.certificateHash}`, 148.5, 195, { align: "center" });
  doc.text(`ISSUE DATE: ${formatDate(data.issuedAt)}  •  VERIFY: ${typeof window !== "undefined" ? window.location.origin : ""}/verify-certificate/${data.certificateHash}`, 148.5, 200, { align: "center" });
  doc.setCharSpace(0);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // === PLATFORM BRANDING ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(tpR, tpG, tpB);
  doc.text(PLATFORM_NAME, 25, 18);

  // === PROFILE PHOTO (top-right circle) ===
  if (data.avatarUrl) {
    try {
      doc.addImage(data.avatarUrl, "PNG", 257, 12, 22, 22);
      // Circle frame around photo
      doc.setDrawColor(ulR, ulG, ulB);
      doc.setLineWidth(1);
      doc.circle(268, 23, 12);
    } catch {
      /* skip if image fails */
    }
  }

  doc.save(`${PLATFORM_NAME}-${data.rankName}-Certificate.pdf`);
}
