import { getDb } from './client';
import { newId } from './id';
import type { Sample, CreateSampleInput } from './types';

export async function listSamples(projectId?: string): Promise<Sample[]> {
  const db = await getDb();
  if (projectId) {
    return db.select<Sample[]>(
      'SELECT * FROM samples WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId],
    );
  }
  return db.select<Sample[]>('SELECT * FROM samples ORDER BY created_at DESC');
}

export async function getSample(id: string): Promise<Sample | null> {
  const db = await getDb();
  const rows = await db.select<Sample[]>('SELECT * FROM samples WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function createSample(input: CreateSampleInput): Promise<Sample> {
  const db = await getDb();
  const id = newId();
  await db.execute(
    `INSERT INTO samples (
       id, project_id, pattern_id, yarn_id,
       needle_size_mm, stitch_count_per_10cm, row_count_per_10cm,
       photo_path, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id, input.projectId, input.patternId ?? null, input.yarnId,
      input.needleSizeMm, input.stitchCountPer10cm ?? null, input.rowCountPer10cm ?? null,
      input.photoPath ?? null, input.notes ?? null,
    ],
  );
  return (await getSample(id))!;
}

export async function deleteSample(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM samples WHERE id = $1', [id]);
}
