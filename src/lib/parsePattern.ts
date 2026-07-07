/**
 * Pattern parser — extracts structured fields from raw pattern text.
 *
 * Currently uses regex heuristics. Replace or extend individual extractors
 * when a real NLP / LLM pipeline is ready; the ParsedPattern shape is the
 * stable contract between the parser and the UI.
 */

export interface ParsedPattern {
  // Yarn specs
  yarnWeight:     string | null;
  yardage:        number | null;
  gaugeStitches:  number | null;
  gaugeRows:      number | null;
  needleSizeMm:   number | null;

  // Construction
  skills:         string[];

  // Sizing
  sizes:          string[];

  // Free-form sections extracted from the text
  sections: {
    label: string;
    body:  string;
  }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function firstMatch(text: string, re: RegExp): string | null {
  return text.match(re)?.[1]?.trim() ?? null;
}

function firstNum(text: string, re: RegExp): number | null {
  const m = text.match(re);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  return isNaN(n) ? null : n;
}

// ── Extractors ───────────────────────────────────────────────────────────────

function extractYarnWeight(text: string): string | null {
  const weights = ['lace','fingering','sport','dk','double knit','worsted','aran','bulky','super bulky','chunky'];
  const lower = text.toLowerCase();
  for (const w of weights) {
    if (lower.includes(w)) return w.replace('double knit', 'dk');
  }
  return firstMatch(text, /\byarn\s+weight[:\s]+([^\n,]+)/i);
}

function extractYardage(text: string): number | null {
  // "approx 400 yards", "400 yds", "400m / 440yds"
  return (
    firstNum(text, /(\d[\d,]+)\s*(?:yards?|yds?)\b/i) ??
    firstNum(text, /(\d[\d,]+)\s*(?:meters?|m)\b/i)
  );
}

function extractGauge(text: string): { stitches: number | null; rows: number | null } {
  // "22 sts × 30 rows", "22 sts x 30 rows per 10cm", "22 stitches = 10cm"
  const m = text.match(/(\d+(?:\.\d+)?)\s*(?:sts?|stitches?)[^\d\n]{0,10}(\d+(?:\.\d+)?)\s*(?:rows?)/i);
  if (m) return { stitches: parseFloat(m[1]), rows: parseFloat(m[2]) };
  return {
    stitches: firstNum(text, /(\d+(?:\.\d+)?)\s*(?:sts?|stitches?)\s*(?:per|=|\/)\s*10\s*cm/i),
    rows:     firstNum(text, /(\d+(?:\.\d+)?)\s*rows?\s*(?:per|=|\/)\s*10\s*cm/i),
  };
}

function extractNeedle(text: string): number | null {
  // "3.5mm", "US 4 (3.5mm)", "4.0 mm"
  return firstNum(text, /(\d+(?:\.\d+)?)\s*mm/i);
}

function extractSkills(text: string): string[] {
  const KNOWN = [
    ['cable', 'Cable'],
    ['lace', 'Lace'],
    ['brioche', 'Brioche'],
    ['fair isle', 'Fair Isle'],
    ['stranded', 'Colourwork'],
    ['colourwork', 'Colourwork'],
    ['colorwork', 'Colourwork'],
    ['short row', 'Short rows'],
    ['short-row', 'Short rows'],
    ['provisional', 'Provisional cast-on'],
    ['magic loop', 'Magic loop'],
    ['dpn', 'DPNs'],
    ['double pointed', 'DPNs'],
    ['intarsia', 'Intarsia'],
    ['slip stitch', 'Slip stitch'],
    ['seed stitch', 'Seed stitch'],
    ['moss stitch', 'Seed stitch'],
    ['garter', 'Garter'],
    ['rib', 'Rib'],
    ['brioche', 'Brioche'],
    ['smocking', 'Smocking'],
    ['entrelac', 'Entrelac'],
  ] as const;
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const [kw, label] of KNOWN) {
    if (lower.includes(kw)) found.add(label);
  }
  return [...found];
}

function extractSizes(text: string): string[] {
  // "Sizes: XS (S, M, L, XL)" or "Size: 36 (38, 40, 42)"
  const m = text.match(/\bsizes?\s*:?\s*([^\n]{3,80})/i);
  if (!m) return [];
  return m[1]
    .replace(/[()[\]]/g, '')
    .split(/[,/]/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function extractSections(text: string): { label: string; body: string }[] {
  // Split on ALL-CAPS or Title Case section headings followed by a newline
  const parts = text.split(/\n(?=[A-Z][A-Z\s]{2,}\n|[A-Z][a-z]+ [A-Z][a-z]+\n)/);
  const sections: { label: string; body: string }[] = [];

  for (const part of parts) {
    const lines = part.trim().split('\n');
    const heading = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();
    if (heading.length < 60 && body.length > 0) {
      sections.push({ label: heading, body });
    }
  }

  // Fallback: if we got no sections, treat the whole text as one block
  if (sections.length === 0 && text.trim().length > 0) {
    sections.push({ label: 'Pattern', body: text.trim() });
  }

  return sections;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function parsePattern(text: string): ParsedPattern {
  const gauge = extractGauge(text);
  return {
    yarnWeight:    extractYarnWeight(text),
    yardage:       extractYardage(text),
    gaugeStitches: gauge.stitches,
    gaugeRows:     gauge.rows,
    needleSizeMm:  extractNeedle(text),
    skills:        extractSkills(text),
    sizes:         extractSizes(text),
    sections:      extractSections(text),
  };
}
