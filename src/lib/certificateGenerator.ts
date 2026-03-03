import { formatCurrency, formatDate } from "@/lib/format";
import { PLATFORM_NAME } from "@/lib/constants";

// Rank-specific design configs matching the premium HTML certificate themes
interface RankDesign {
  theme: "midnight" | "ivory" | "royal";
  bgPrimary: string;
  bgSecondary: string;
  accentPrimary: string;
  accentSecondary: string;
  accentGlow: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  sealOuter: string;
  sealInner: string;
  ribbonLeft: string;
  ribbonRight: string;
  borderLayers: number;
  cornerOrnaments: boolean;
  sideFlourishes: boolean;
  subtitleText: string;
  rankIcon: string;
}

const RANK_DESIGNS: Record<string, RankDesign> = {
  Bronze: {
    theme: "midnight",
    bgPrimary: "#1e293b",
    bgSecondary: "#0f172a",
    accentPrimary: "#b87333",
    accentSecondary: "#d4956a",
    accentGlow: "#cd7f32",
    textPrimary: "#fde6d0",
    textSecondary: "#b87333",
    textMuted: "#94a3b8",
    sealOuter: "#b87333",
    sealInner: "#0f172a",
    ribbonLeft: "#8b5a2b",
    ribbonRight: "#cd7f32",
    borderLayers: 2,
    cornerOrnaments: true,
    sideFlourishes: true,
    subtitleText: "Of Achievement",
    rankIcon: "🥉",
  },
  Silver: {
    theme: "midnight",
    bgPrimary: "#1a1a2e",
    bgSecondary: "#16213e",
    accentPrimary: "#c0c0c0",
    accentSecondary: "#e8e8e8",
    accentGlow: "#d9d9d9",
    textPrimary: "#f0f0f0",
    textSecondary: "#c0c0c0",
    textMuted: "#8899aa",
    sealOuter: "#c0c0c0",
    sealInner: "#16213e",
    ribbonLeft: "#808080",
    ribbonRight: "#b0b0b0",
    borderLayers: 2,
    cornerOrnaments: true,
    sideFlourishes: true,
    subtitleText: "Of Achievement",
    rankIcon: "🥈",
  },
  Gold: {
    theme: "midnight",
    bgPrimary: "#1e293b",
    bgSecondary: "#0f172a",
    accentPrimary: "#d4af37",
    accentSecondary: "#fcf6ba",
    accentGlow: "#b38728",
    textPrimary: "#fcf6ba",
    textSecondary: "#d4af37",
    textMuted: "#94a3b8",
    sealOuter: "#d4af37",
    sealInner: "#0f172a",
    ribbonLeft: "#aa771c",
    ribbonRight: "#d4af37",
    borderLayers: 3,
    cornerOrnaments: true,
    sideFlourishes: true,
    subtitleText: "Of Excellence",
    rankIcon: "🏅",
  },
  Diamond: {
    theme: "midnight",
    bgPrimary: "#030712",
    bgSecondary: "#0f172a",
    accentPrimary: "#93c5fd",
    accentSecondary: "#bfdbfe",
    accentGlow: "#60a5fa",
    textPrimary: "#e0f2fe",
    textSecondary: "#93c5fd",
    textMuted: "#64748b",
    sealOuter: "#60a5fa",
    sealInner: "#030712",
    ribbonLeft: "#3b82f6",
    ribbonRight: "#60a5fa",
    borderLayers: 3,
    cornerOrnaments: true,
    sideFlourishes: true,
    subtitleText: "Of Distinction",
    rankIcon: "💎",
  },
  Platinum: {
    theme: "ivory",
    bgPrimary: "#faf9f6",
    bgSecondary: "#f1f0ec",
    accentPrimary: "#d4af37",
    accentSecondary: "#b38728",
    accentGlow: "#aa771c",
    textPrimary: "#1e293b",
    textSecondary: "#d4af37",
    textMuted: "#64748b",
    sealOuter: "#d4af37",
    sealInner: "#faf9f6",
    ribbonLeft: "#8b6914",
    ribbonRight: "#d4af37",
    borderLayers: 2,
    cornerOrnaments: true,
    sideFlourishes: true,
    subtitleText: "Of Achievement",
    rankIcon: "⬡",
  },
  Elite: {
    theme: "royal",
    bgPrimary: "#1c0a1e",
    bgSecondary: "#2d0a0a",
    accentPrimary: "#d4af37",
    accentSecondary: "#fcf6ba",
    accentGlow: "#b38728",
    textPrimary: "#fef3c7",
    textSecondary: "#d4af37",
    textMuted: "#a78b8b",
    sealOuter: "#d4af37",
    sealInner: "#1c0a1e",
    ribbonLeft: "#8b6914",
    ribbonRight: "#d4af37",
    borderLayers: 3,
    cornerOrnaments: true,
    sideFlourishes: true,
    subtitleText: "Of Royal Distinction",
    rankIcon: "👑",
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

// Draw gradient background
function drawGradientRect(doc: any, x: number, y: number, w: number, h: number, colorA: string, colorB: string, steps = 30) {
  const [r1, g1, b1] = hexToRgb(colorA);
  const [r2, g2, b2] = hexToRgb(colorB);
  const stepH = h / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    doc.setFillColor(
      Math.round(r1 + (r2 - r1) * t),
      Math.round(g1 + (g2 - g1) * t),
      Math.round(b1 + (b2 - b1) * t)
    );
    doc.rect(x, y + i * stepH, w, stepH + 0.5, "F");
  }
}

// Draw ambient glow circles (simulates the radial glow from the HTML)
function drawAmbientGlows(doc: any, design: RankDesign) {
  const GState = (doc as any).GState;
  doc.setGState(new GState({ opacity: 0.08 }));
  setFill(doc, design.accentPrimary);
  // Top-right glow
  doc.circle(240, 30, 60, "F");
  // Bottom-left glow
  doc.circle(57, 180, 60, "F");
  doc.setGState(new GState({ opacity: 1 }));
}

// Draw ornate corner brackets (matching the HTML corner-ornament style)
function drawCornerOrnaments(doc: any, accent: string) {
  setDraw(doc, accent);
  const inset = 15;
  const size = 20;
  const innerInset = inset - 2;
  const innerSize = 5;

  doc.setLineWidth(1.2);
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

  // Inner corner accents (smaller)
  doc.setLineWidth(0.5);
  doc.line(innerInset, innerInset, innerInset + innerSize, innerInset);
  doc.line(innerInset, innerInset, innerInset, innerInset + innerSize);
  doc.line(297 - innerInset, innerInset, 297 - innerInset - innerSize, innerInset);
  doc.line(297 - innerInset, innerInset, 297 - innerInset, innerInset + innerSize);
  doc.line(innerInset, 210 - innerInset, innerInset + innerSize, 210 - innerInset);
  doc.line(innerInset, 210 - innerInset, innerInset, 210 - innerInset - innerSize);
  doc.line(297 - innerInset, 210 - innerInset, 297 - innerInset - innerSize, 210 - innerInset);
  doc.line(297 - innerInset, 210 - innerInset, 297 - innerInset, 210 - innerInset - innerSize);
}

// Draw decorative border layers
function drawBorderLayers(doc: any, layers: number, accent: string) {
  setDraw(doc, accent);
  for (let i = 0; i < layers; i++) {
    const inset = 8 + i * 4;
    doc.setLineWidth(i === 0 ? 1.5 : i === 1 ? 0.6 : 0.3);
    doc.rect(inset, inset, 297 - inset * 2, 210 - inset * 2);
  }
}

// Draw side flourish lines (matching HTML's side gradient lines)
function drawSideFlourishes(doc: any, accent: string) {
  const GState = (doc as any).GState;
  setDraw(doc, accent);
  doc.setLineWidth(0.3);
  doc.setGState(new GState({ opacity: 0.25 }));
  doc.line(10, 75, 10, 135);
  doc.line(287, 75, 287, 135);
  doc.setGState(new GState({ opacity: 1 }));
}

// Draw the star badge (matching HTML's gold-gradient circle with star)
function drawStarBadge(doc: any, x: number, y: number, radius: number, design: RankDesign) {
  const GState = (doc as any).GState;
  
  // Outer gold circle
  setFill(doc, design.accentPrimary);
  doc.circle(x, y, radius, "F");
  
  // Inner slightly darker circle for depth
  setFill(doc, design.accentGlow);
  doc.circle(x, y, radius - 1.5, "F");
  
  // Re-fill with primary for the main face
  setFill(doc, design.accentPrimary);
  doc.circle(x, y, radius - 2, "F");
  
  // Shine effect
  doc.setGState(new GState({ opacity: 0.3 }));
  doc.setFillColor(255, 255, 255);
  doc.ellipse(x - 1, y - 2, radius * 0.5, radius * 0.3, "F");
  doc.setGState(new GState({ opacity: 1 }));
  
  // Star symbol in center
  const starColor = design.theme === "ivory" ? "#1e293b" : "#0f172a";
  setTextCol(doc, starColor);
  doc.setFontSize(radius * 2.2);
  doc.setFont("helvetica", "bold");
  doc.text("★", x, y + radius * 0.7, { align: "center" });

  // Three dots below badge
  setFill(doc, design.accentPrimary);
  doc.circle(x - 3, y + radius + 3, 0.8, "F");
  doc.circle(x, y + radius + 3, 0.8, "F");
  doc.circle(x + 3, y + radius + 3, 0.8, "F");
}

// Draw the official seal with ribbons (matching the HTML seal design)
function drawOfficialSeal(doc: any, x: number, y: number, design: RankDesign) {
  const GState = (doc as any).GState;
  
  // Outer oval (gold gradient feel)
  setFill(doc, design.sealOuter);
  doc.ellipse(x, y, 14, 10.5, "F");
  
  // Inner dark oval
  setFill(doc, design.sealInner);
  doc.ellipse(x, y, 11.5, 8.5, "F");
  
  // Inner border ring
  setDraw(doc, design.accentPrimary);
  doc.setGState(new GState({ opacity: 0.3 }));
  doc.setLineWidth(0.5);
  doc.ellipse(x, y, 11.5, 8.5);
  doc.setGState(new GState({ opacity: 1 }));
  
  // Seal text
  setTextCol(doc, design.accentPrimary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("OFFICIAL", x, y - 1, { align: "center" });
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.text("SEAL", x, y + 3, { align: "center" });
  
  // Ribbon tails below seal
  setFill(doc, design.ribbonLeft);
  // Left ribbon (skewed trapezoid)
  const ry = y + 10;
  doc.triangle(x - 8, ry, x - 3, ry, x - 10, ry + 14, "F");
  
  setFill(doc, design.ribbonRight);
  // Right ribbon
  doc.triangle(x + 3, ry, x + 8, ry, x + 10, ry + 14, "F");
}

// Draw decorative divider line with center ornament
function drawDivider(doc: any, y: number, accent: string) {
  const GState = (doc as any).GState;
  setDraw(doc, accent);
  doc.setGState(new GState({ opacity: 0.4 }));
  doc.setLineWidth(0.4);
  doc.line(85, y, 212, y);
  doc.setGState(new GState({ opacity: 1 }));
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
  const centerX = pageW / 2;

  // === 1. BACKGROUND ===
  drawGradientRect(doc, 0, 0, pageW, 210, design.bgPrimary, design.bgSecondary);

  // === 2. AMBIENT GLOWS ===
  drawAmbientGlows(doc, design);

  // === 3. BORDER LAYERS ===
  drawBorderLayers(doc, design.borderLayers, design.accentPrimary);

  // === 4. CORNER ORNAMENTS ===
  if (design.cornerOrnaments) {
    drawCornerOrnaments(doc, design.accentPrimary);
  }

  // === 5. SIDE FLOURISHES ===
  if (design.sideFlourishes) {
    drawSideFlourishes(doc, design.accentPrimary);
  }

  // === 6. STAR BADGE (top center) ===
  drawStarBadge(doc, centerX, 28, 10, design);

  // === 7. TITLE: "CERTIFICATE" ===
  setTextCol(doc, design.textSecondary);
  doc.setFont("times", "bold");
  doc.setFontSize(36);
  doc.text("CERTIFICATE", centerX, 56, { align: "center" });

  // === 8. SUBTITLE: "Of Excellence" etc ===
  setTextCol(doc, design.accentSecondary);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setCharSpace(4);
  doc.text(design.subtitleText.toUpperCase(), centerX, 64, { align: "center" });
  doc.setCharSpace(0);

  // === 9. "This certifies that" ===
  setTextCol(doc, design.textMuted);
  doc.setFontSize(8);
  doc.setCharSpace(3);
  doc.text("THIS CERTIFIES THAT", centerX, 76, { align: "center" });
  doc.setCharSpace(0);

  // === 10. RECIPIENT NAME (script-style, large) ===
  setTextCol(doc, design.textPrimary);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(32);
  doc.text(data.fullName, centerX, 90, { align: "center" });

  // Name underline (matching HTML's border-b border-amber-500/30)
  const nameWidth = doc.getTextWidth(data.fullName);
  setDraw(doc, design.accentPrimary);
  doc.setGState(new GState({ opacity: 0.3 }));
  doc.setLineWidth(0.4);
  doc.line(centerX - nameWidth / 2 - 8, 93, centerX + nameWidth / 2 + 8, 93);
  doc.setGState(new GState({ opacity: 1 }));

  // === 11. "Has achieved the status of" ===
  setTextCol(doc, design.textMuted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setCharSpace(3);
  doc.text("HAS ACHIEVED THE STATUS OF", centerX, 102, { align: "center" });
  doc.setCharSpace(0);

  // === 12. RANK TITLE with icon ===
  setTextCol(doc, design.textPrimary);
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.text(`${design.rankIcon}  ${data.rankName} Tier Affiliate  ${design.rankIcon}`, centerX, 113, { align: "center" });

  // === 13. BODY COPY (italic, with left border accent) ===
  setDraw(doc, design.accentPrimary);
  doc.setGState(new GState({ opacity: 0.3 }));
  doc.setLineWidth(0.6);
  doc.line(68, 120, 68, 138);
  doc.setGState(new GState({ opacity: 1 }));

  doc.setFont("times", "italic");
  doc.setFontSize(9);
  setTextCol(doc, design.textMuted);
  const bodyText = `For achieving exceptional performance and verified achievement on ${PLATFORM_NAME}, demonstrating outstanding results and unwavering commitment to platform excellence.`;
  const bodyLines = doc.splitTextToSize(bodyText, 155);
  doc.text(bodyLines, 72, 125);

  // === 14. TOTAL VERIFIED EARNINGS ===
  if (data.totalCommission > 0) {
    setTextCol(doc, design.textSecondary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Total Verified Earnings: ${formatCurrency(data.totalCommission)}`, centerX, 146, { align: "center" });
  }

  // === 15. BOTTOM SECTION: Date / Seal / Signature ===
  const bottomY = 170;

  // --- Date (left side) ---
  setTextCol(doc, design.textPrimary);
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.text(formatDate(data.milestoneDate), 70, bottomY, { align: "center" });

  // Date underline
  setDraw(doc, design.accentPrimary);
  doc.setGState(new GState({ opacity: 0.4 }));
  doc.setLineWidth(0.3);
  doc.line(40, bottomY + 3, 100, bottomY + 3);
  doc.setGState(new GState({ opacity: 1 }));

  // Date label
  setTextCol(doc, design.textMuted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setCharSpace(2);
  doc.text("DATE", 70, bottomY + 8, { align: "center" });
  doc.setCharSpace(0);

  // --- Seal (center) ---
  drawOfficialSeal(doc, centerX, bottomY - 2, design);

  // --- Signature (right side) ---
  if (data.adminSignatureUrl) {
    try {
      doc.addImage(data.adminSignatureUrl, "PNG", 200, bottomY - 18, 50, 16);
    } catch {
      /* skip if image fails */
    }
  }

  const sigName = data.ceoName || "Platform CEO";
  setTextCol(doc, design.textPrimary);
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.text(sigName, 225, bottomY, { align: "center" });

  // Signature underline
  setDraw(doc, design.accentPrimary);
  doc.setGState(new GState({ opacity: 0.4 }));
  doc.setLineWidth(0.3);
  doc.line(195, bottomY + 3, 255, bottomY + 3);
  doc.setGState(new GState({ opacity: 1 }));

  // Signature title
  setTextCol(doc, design.textMuted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setCharSpace(2);
  doc.text("CHIEF EXECUTIVE OFFICER", 225, bottomY + 8, { align: "center" });
  doc.setCharSpace(0);

  // === 16. FOOTER: Certificate ID & Verification ===
  doc.setFont("courier", "normal");
  doc.setFontSize(6);
  setTextCol(doc, design.textMuted);
  doc.setGState(new GState({ opacity: 0.5 }));
  doc.setCharSpace(1);
  doc.text(`CERTIFICATE ID: ${data.certificateHash}`, centerX, 196, { align: "center" });
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  doc.text(
    `ISSUE DATE: ${formatDate(data.issuedAt)}  •  VERIFY: ${origin}/verify-certificate/${data.certificateHash}`,
    centerX,
    200,
    { align: "center" }
  );
  doc.setCharSpace(0);
  doc.setGState(new GState({ opacity: 1 }));

  // === 17. PLATFORM BRANDING (top-left) ===
  setTextCol(doc, design.textSecondary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(PLATFORM_NAME, 25, 18);

  // === 18. PROFILE PHOTO (top-right circle frame) ===
  if (data.avatarUrl) {
    try {
      // Draw circular frame first
      setDraw(doc, design.accentPrimary);
      doc.setLineWidth(1.2);
      doc.circle(268, 24, 12);

      // Add the image (square crop — jsPDF doesn't clip circles natively)
      doc.addImage(data.avatarUrl, "PNG", 257, 13, 22, 22);

      // Overlay the circle frame on top
      setDraw(doc, design.accentPrimary);
      doc.setLineWidth(1.2);
      doc.circle(268, 24, 12);
    } catch {
      /* skip if image fails */
    }
  }

  // === SAVE ===
  doc.save(`${PLATFORM_NAME}-${data.rankName}-Certificate.pdf`);
}
