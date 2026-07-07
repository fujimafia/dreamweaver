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
  if (input.pdfPath !== undefined)     col('pdf_path', input.pdfPath);
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
  patternId: string, yarnId: string, isSubstitution = false, notes?: string,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO pattern_yarns (pattern_id, yarn_id, is_substitution, notes)
     VALUES ($1, $2, $3, $4)`,
    [patternId, yarnId, isSubstitution ? 1 : 0, notes ?? null],
  );
}

export async function removeYarnFromPattern(patternId: string, yarnId: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    'DELETE FROM pattern_yarns WHERE pattern_id = $1 AND yarn_id = $2',
    [patternId, yarnId],
  );
}
