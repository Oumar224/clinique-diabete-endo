/**
 * Pure TypeScript Code128 Barcode SVG Generator
 *
 * Self-contained — zero external dependencies.
 * Implements Code128B encoding (full ASCII 32–126 alphanumeric + punctuation).
 *
 * ## Spec reference
 * - Code128 is a high-density linear barcode symbology defined by AIM (Automatic
 *   Identification Manufacturers) standard TSC-128.
 * - Each character (except Stop) encodes 11 modules as 3 bars + 3 spaces
 *   alternating, starting and ending with a bar. Each element is 1–4 modules wide.
 * - Stop encodes 13 modules as 4 bars + 3 spaces.
 * - Minimum quiet zone: 10 module widths on each side.
 * - Checksum: (start_value + Σ(i × value_i)) mod 103.
 */

// ─── Encoding Table ──────────────────────────────────────────────────────────
// 107 patterns for values 0–106.  Each digit string is a sequence of
// bar/space widths summing to 11 modules (13 for Stop at index 106).
// Positions: bar, space, bar, space, bar, space (plus bar for Stop).
const CODE128_PATTERNS: readonly string[] = [
  // 0–9
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  // 10–19
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  // 20–29
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  // 30–39
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  // 40–49
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  // 50–59
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  // 60–69
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  // 70–79
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  // 80–89
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  // 90–99
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  // 100–102
  '114131', '311141', '411131',
  // 103 = Start A, 104 = Start B, 105 = Start C
  '211412', '211214', '211232',
  // 106 = Stop (7 elements, 13 modules)
  '2331112',
] as const;

// ─── Constants ───────────────────────────────────────────────────────────────

/** Code128B start character value. */
const START_B = 104;

/** Stop character value (always last). */
const STOP = 106;

/**
 * Minimum quiet zone per AIM specification: 10 module widths per side.
 * We default to 11× (one encoded character width) for visual comfort.
 */
const QUIET_ZONE_MODULES = 11;

// ─── Options ─────────────────────────────────────────────────────────────────

export interface Code128Options {
  /** Height of the bars in pixels (default: 80). */
  height?: number;
  /**
   * Total SVG width in pixels.  When set, the barcode is uniformly scaled
   * (including bar width) to fit exactly this width.  When omitted the
   * width is derived from `barWidth`.
   */
  width?: number;
  /**
   * Width of the narrowest bar (one module) in pixels.
   * Ignored when `width` is provided (scaling is computed from `width`).
   * Default: 2.
   */
  barWidth?: number;
  /** Font size in pixels for the human-readable text (default: 14). */
  fontSize?: number;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generates an inline SVG string representing a Code128B barcode for `data`.
 *
 * @param data   - The string to encode.  Only ASCII characters 32–126
 *                 (printable US-ASCII) are valid.  Empty strings throw.
 * @param options - Optional sizing / styling overrides.
 * @returns A complete `<svg>` document as a string.
 * @throws {Error} If `data` is empty or contains non-encodable characters.
 */
export function generateCode128Svg(data: string, options?: Code128Options): string {
  const {
    height = 80,
    width: explicitWidth,
    barWidth = 2,
    fontSize = 14,
  } = options ?? {};

  // ── 1. Validate input ────────────────────────────────────────────────────
  if (!data) {
    throw new Error('[generateCode128Svg] Data must not be empty.');
  }

  // ── 2. Map string → Code128B values ──────────────────────────────────────
  const dataValues: number[] = [];
  for (let i = 0; i < data.length; i++) {
    dataValues.push(charToCode128BValue(data[i]));
  }

  // ── 3. Checksum ──────────────────────────────────────────────────────────
  const checksum = computeChecksum(START_B, dataValues);

  // ── 4. Full encoded sequence ─────────────────────────────────────────────
  //    [Start B, …, data …, checksum, Stop]
  const sequence = [START_B, ...dataValues, checksum, STOP];

  // ── 5. Compute geometry ──────────────────────────────────────────────────
  let totalModules = 2 * QUIET_ZONE_MODULES; // left + right quiet zones
  for (const v of sequence) {
    totalModules += patternLength(v);
  }

  const svgWidth = explicitWidth ?? totalModules * barWidth;
  const moduleWidth = svgWidth / totalModules; // effective px per module

  const textHeight = fontSize + 6;
  const totalHeight = height + textHeight;

  // ── 6. Render bars ───────────────────────────────────────────────────────
  // Start drawing after the left quiet zone.
  let cursorX = QUIET_ZONE_MODULES * moduleWidth;
  const barRects: string[] = [];

  for (const v of sequence) {
    const pattern = CODE128_PATTERNS[v];
    // Even-indexed characters in the pattern string = bars.
    for (let i = 0; i < pattern.length; i++) {
      const segWidth = Number(pattern[i]) * moduleWidth;
      if (i % 2 === 0) {
        // Bar segment
        barRects.push(
          `<rect x="${fmt(cursorX)}" y="0" width="${fmt(segWidth)}" height="${height}" fill="#000000" />`,
        );
      }
      cursorX += segWidth;
    }
  }

  // ── 7. Assemble SVG ─────────────────────────────────────────────────────
  const barsXml = barRects.join('\n    ');

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    `     width="${fmt(svgWidth)}" height="${totalHeight}"`,
    `     viewBox="0 0 ${fmt(svgWidth)} ${totalHeight}"`,
    `     shape-rendering="crispEdges"`,
    `     style="background-color: #ffffff;">`,
    `  <g>`,
    `    ${barsXml}`,
    `  </g>`,
    `  <text x="${fmt(svgWidth / 2)}" y="${totalHeight - 2}"`,
    `        font-family="monospace, 'Courier New', Courier"`,
    `        font-size="${fontSize}px"`,
    `        text-anchor="middle"`,
    `        fill="#000000">`,
    `    ${escapeXml(data)}`,
    `  </text>`,
    `</svg>`,
  ].join('\n');
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Convert a single ASCII character to its Code128B value.
 *
 * Code128B maps ASCII 32 (Space) → 0 through ASCII 126 (~) → 94.
 * Characters outside this range are rejected.
 */
function charToCode128BValue(ch: string): number {
  const code = ch.charCodeAt(0);
  if (code >= 32 && code <= 126) {
    return code - 32;
  }
  throw new Error(
    `Character ${JSON.stringify(ch)} (U+${code.toString(16).toUpperCase()}) ` +
      `is not encodable in Code128B. Only ASCII 32–126 are supported.`,
  );
}

/**
 * Compute Code128 checksum: (startValue + Σ((i+1) × valueᵢ)) mod 103.
 */
function computeChecksum(startValue: number, dataValues: number[]): number {
  let sum = startValue;
  for (let i = 0; i < dataValues.length; i++) {
    sum += (i + 1) * dataValues[i];
  }
  return sum % 103;
}

/** Number of modules consumed by the pattern for Code128 value `v`. */
function patternLength(v: number): number {
  return CODE128_PATTERNS[v].length;
}

/** Format a number to 3 decimal places — close enough for sub-pixel SVG. */
function fmt(n: number): string {
  // Cap at 3 decimals, strip trailing zeros (but keep at least ".0").
  return parseFloat(n.toFixed(3)).toString();
}

/** Minimal XML-escaping for the human-readable text. */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── Simple Quick Test (guarded) ─────────────────────────────────────────────
// Run with:  npx tsx electron/utils/barcode.ts
if (import.meta.url?.endsWith(process.argv[1] ?? '')) {
  const svg = generateCode128Svg('ABC-123', { height: 80, barWidth: 2, fontSize: 14 });
  // eslint-disable-next-line no-console
  console.log(svg);
}
