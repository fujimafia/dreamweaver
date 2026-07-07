import { getDb } from './client';
import { newId } from './id';
import type { Yarn, CreateYarnInput, UpdateYarnInput } from './types';

export async function listYarns(): Promise<Yarn[]> {
  const db = await getDb();
  return db.select<Yarn[]>('SELECT * FROM yarns ORDER BY name ASC');
}

export async function getYarn(id: string): Promise<Yarn | null> {
  const db = await getDb();
  const rows = await db.select<Yarn[]>('SELECT * FROM yarns WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function createYarn(input: CreateYarnInput): Promise<Yarn> {
  const db = await getDb();
  const id = newId();
  await db.execute(
    `INSERT INTO yarns (
       id, name, brand, fiber_content, weight,
       gauge_stitches, gauge_rows, needle_size_mm,
       yardage_per_skein, meters_per_skein, skeins_owned,
       color, color_feature, colorway, dye_lot, price_per_skein, purchase_url, notes, photos
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    [
      id, input.name, input.brand ?? null, input.fiberContent, input.weight,
      input.gaugeStitches ?? null, input.gaugeRows ?? null, input.needleSizeMm ?? null,
      input.yardagePerSkein ?? null, input.metersPerSkein ?? null, input.skeinsOwned ?? 0,
      input.color ?? null, input.colorFeature ?? null, input.colorway ?? null, input.dyeLot ?? null,
      input.pricePerSkein ?? null, input.purchaseUrl ?? null, input.notes ?? null,
      input.photos ? JSON.stringify(input.photos) : null,
    ],
  );
  return (await getYarn(id))!;
}

export async function updateYarn(id: string, input: UpdateYarnInput): Promise<Yarn> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const col = (name: string, val: unknown) => {
    fields.push(`${name} = $${i++}`);
    values.push(val ?? null);
  };

  if (input.name !== undefined)         col('name', input.name);
  if (input.brand !== undefined)        col('brand', input.brand);
  if (input.fiberContent !== undefined) col('fiber_content', input.fiberContent);
  if (input.weight !== undefined)       col('weight', input.weight);
  if (input.gaugeStitches !== undefined) col('gauge_stitches', input.gaugeStitches);
  if (input.gaugeRows !== undefined)    col('gauge_rows', input.gaugeRows);
  if (input.needleSizeMm !== undefined) col('needle_size_mm', input.needleSizeMm);
  if (input.yardagePerSkein !== undefined) col('yardage_per_skein', input.yardagePerSkein);
  if (input.metersPerSkein !== undefined)  col('meters_per_skein', input.metersPerSkein);
  if (input.skeinsOwned !== undefined)     col('skeins_owned', input.skeinsOwned);
  if (input.color !== undefined)         col('color', input.color);
  if (input.colorFeature !== undefined)  col('color_feature', input.colorFeature);
  if (input.colorway !== undefined)      col('colorway', input.colorway);
  if (input.dyeLot !== undefined)      col('dye_lot', input.dyeLot);
  if (input.pricePerSkein !== undefined) col('price_per_skein', input.pricePerSkein);
  if (input.purchaseUrl !== undefined) col('purchase_url', input.purchaseUrl);
  if (input.notes !== undefined)   col('notes', input.notes);
  if (input.photos !== undefined)  col('photos', JSON.stringify(input.photos));

  if (fields.length === 0) return (await getYarn(id))!;

  fields.push(`updated_at = datetime('now')`);
  values.push(id);

  await db.execute(
    `UPDATE yarns SET ${fields.join(', ')} WHERE id = $${i}`,
    values,
  );
  return (await getYarn(id))!;
}

export async function deleteYarn(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM yarns WHERE id = $1', [id]);
}
