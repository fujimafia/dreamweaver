import { getDb } from './client';
import { newId } from './id';
import type { Pattern, CreatePatternInput, UpdatePatternInput } from './types';

export async function listPatterns(): Promise<Pattern[]> {
  const db = await getDb();
  return db.select<Pattern[]>('SELECT * FROM patterns ORDER BY title ASC');
}

export async function getPattern(id: string): Promise<Pattern | null> {
  const db = await getDb();
  const rows = await db.select<Pattern[]>('SELECT * FROM patterns WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function createPattern(input: CreatePatternInput): Promise<Pattern> {
  const db = await getDb();
  const id = newId();
  await db.execute(
    `INSERT INTO patterns (
       id, title, designer, source_type, source_url,
       pdf_path, pdf_text, required_skills,
       called_for_yarn_weight, called_for_gauge_stitches, called_for_gauge_rows,
       called_for_needle_size_mm, called_for_yardage, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      id, input.title, input.designer ?? null, input.sourceType, input.sourceUrl ?? null,
      input.pdfPath ?? null, input.pdfText ?? null,
      input.requiredSkills ? JSON.stringify(input.requiredSkills) : null,
      input.calledForYarnWeight ?? null,
      input.calledForGaugeStitches ?? null, input.calledForGaugeRows ?? null,
      input.calledForNeedleSizeMm ?? null, input.calledForYardage ?? null,
      input.notes ?? null,
    ],
  );
  return (await getPattern(id))!;
}

export async function updatePattern(id: string, input: UpdatePatternInput): Promise<Pattern> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const col = (name: string, val: unknown) => {
    fields.push(`${name} = $${i++}`);
    values.push(val ?? null);
  };

  if (input.title !== undefined)       col('title', input.title);
  if (input.designer !== undefined)    col('designer', input.designer);
  if (input.sourceType !== undefined)  col('source_type', input.sourceType);
  if (input.sourceUrl !== undefined)   col('source_url', input.sourceUrl);
  if ('pdfPath' in input)              col('pdf_path', input.pdfPath ?? null);
  if (input.pdfText !== undefined)     col('pdf_text', input.pdfText);
  if (input.requiredSkills !== undefined)
    col('required_skills', JSON.stringify(input.requiredSkills));
  if (input.calledForYarnWeight !== undefined)
    col('called_for_yarn_weight', input.calledForYarnWeight);
  if (input.calledForGaugeStitches !== undefined)
    col('called_for_gauge_stitches', input.calledForGaugeStitches);
  if (input.calledForGaugeRows !== undefined)
    col('called_for_gauge_rows', input.calledForGaugeRows);
  if (input.calledForNeedleSizeMm !== undefined)
    col('called_for_needle_size_mm', input.calledForNeedleSizeMm);
  if (input.calledForYardage !== undefined)
    col('called_for_yardage', input.calledForYardage);
  if (input.notes !== undefined)       col('notes', input.notes);

  if (fields.length === 0) return (await getPattern(id))!;

  fields.push(`updated_at = datetime('now')`);
  values.push(id);

  await db.execute(
    `UPDATE patterns SET ${fields.join(', ')} WHERE id = $${i}`,
    values,
  );
  return (await getPattern(id))!;
}

export async function deletePattern(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM patterns WHERE id = $1', [id]);
}

export async function addYarnToPattern(
  patternId: string,
  yarnId: string,
  opts?: { isSubstitution?: boolean; yardage?: number; notes?: string },
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO pattern_yarns (pattern_id, yarn_id, is_substitution, yardage, notes)
     VALUES ($1, $2, $3, $4, $5)`,
    [patternId, yarnId, opts?.isSubstitution ? 1 : 0, opts?.yardage ?? null, opts?.notes ?? null],
  );
}

export async function removeYarnFromPattern(patternId: string, yarnId: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    'DELETE FROM pattern_yarns WHERE pattern_id = $1 AND yarn_id = $2',
    [patternId, yarnId],
  );
}

// ── Yarn → Patterns (all patterns that use a given yarn) ─────────────────────

export interface YarnPatternLink {
  pattern_id: string;
  pattern_title: string;
  pattern_source_type: string;
  is_substitution: number;
}

// ── Pattern → Yarns (all yarns linked to a given pattern) ────────────────────

export interface PatternYarnLink {
  yarn_id: string;
  yarn_name: string;
  yarn_brand: string | null;
  yarn_weight: string;
  is_substitution: number;
  yardage: number | null;
  notes: string | null;
}

export async function getYarnsForPattern(patternId: string): Promise<PatternYarnLink[]> {
  const db = await getDb();
  return db.select<PatternYarnLink[]>(
    `SELECT
       py.yarn_id,
       y.name   AS yarn_name,
       y.brand  AS yarn_brand,
       y.weight AS yarn_weight,
       py.is_substitution,
       py.yardage,
       py.notes
     FROM pattern_yarns py
     JOIN yarns y ON y.id = py.yarn_id
     WHERE py.pattern_id = $1
     ORDER BY y.name ASC`,
    [patternId],
  );
}

export async function getPatternsForYarn(yarnId: string): Promise<YarnPatternLink[]> {
  const db = await getDb();
  return db.select<YarnPatternLink[]>(
    `SELECT
       py.pattern_id,
       p.title       AS pattern_title,
       p.source_type AS pattern_source_type,
       py.is_substitution
     FROM pattern_yarns py
     JOIN patterns p ON p.id = py.pattern_id
     WHERE py.yarn_id = $1
     ORDER BY p.title ASC`,
    [yarnId],
  );
}
