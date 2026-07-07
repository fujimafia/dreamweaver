import { getDb } from './client';
import { newId } from './id';
import type { Garment, CreateGarmentInput, UpdateGarmentInput } from './types';

export async function listGarments(): Promise<Garment[]> {
  const db = await getDb();
  return db.select<Garment[]>('SELECT * FROM garments ORDER BY created_at DESC');
}

export async function getGarment(id: string): Promise<Garment | null> {
  const db = await getDb();
  const rows = await db.select<Garment[]>('SELECT * FROM garments WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function getGarmentByProject(projectId: string): Promise<Garment | null> {
  const db = await getDb();
  const rows = await db.select<Garment[]>(
    'SELECT * FROM garments WHERE project_id = $1', [projectId],
  );
  return rows[0] ?? null;
}

export async function createGarment(input: CreateGarmentInput): Promise<Garment> {
  const db = await getDb();
  const id = newId();
  await db.execute(
    `INSERT INTO garments (
       id, project_id, garment_type, season,
       pre_block_chest_cm, pre_block_length_cm, pre_block_sleeve_cm,
       post_block_chest_cm, post_block_length_cm, post_block_sleeve_cm,
       care_instructions, process_notes,
       is_gift, gift_recipient, gift_notes,
       is_for_sale, listing_title, listing_description, listing_price, photos
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [
      id, input.projectId, input.garmentType ?? null, input.season ?? null,
      input.preBlockChestCm ?? null, input.preBlockLengthCm ?? null, input.preBlockSleeveCm ?? null,
      input.postBlockChestCm ?? null, input.postBlockLengthCm ?? null, input.postBlockSleeveCm ?? null,
      input.careInstructions ?? null, input.processNotes ?? null,
      input.isGift ? 1 : 0, input.giftRecipient ?? null, input.giftNotes ?? null,
      input.isForSale ? 1 : 0, input.listingTitle ?? null,
      input.listingDescription ?? null, input.listingPrice ?? null,
      input.photos ? JSON.stringify(input.photos) : null,
    ],
  );
  return (await getGarment(id))!;
}

export async function updateGarment(id: string, input: UpdateGarmentInput): Promise<Garment> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const col = (name: string, val: unknown) => {
    fields.push(`${name} = $${i++}`);
    values.push(val ?? null);
  };

  if (input.garmentType !== undefined)        col('garment_type', input.garmentType);
  if (input.season !== undefined)             col('season', input.season);
  if (input.preBlockChestCm !== undefined)    col('pre_block_chest_cm', input.preBlockChestCm);
  if (input.preBlockLengthCm !== undefined)  col('pre_block_length_cm', input.preBlockLengthCm);
  if (input.preBlockSleeveCm !== undefined)  col('pre_block_sleeve_cm', input.preBlockSleeveCm);
  if (input.postBlockChestCm !== undefined)  col('post_block_chest_cm', input.postBlockChestCm);
  if (input.postBlockLengthCm !== undefined) col('post_block_length_cm', input.postBlockLengthCm);
  if (input.postBlockSleeveCm !== undefined) col('post_block_sleeve_cm', input.postBlockSleeveCm);
  if (input.careInstructions !== undefined)  col('care_instructions', input.careInstructions);
  if (input.processNotes !== undefined)      col('process_notes', input.processNotes);
  if (input.isGift !== undefined)            col('is_gift', input.isGift ? 1 : 0);
  if (input.giftRecipient !== undefined)     col('gift_recipient', input.giftRecipient);
  if (input.giftNotes !== undefined)         col('gift_notes', input.giftNotes);
  if (input.isForSale !== undefined)         col('is_for_sale', input.isForSale ? 1 : 0);
  if (input.listingTitle !== undefined)      col('listing_title', input.listingTitle);
  if (input.listingDescription !== undefined) col('listing_description', input.listingDescription);
  if (input.listingPrice !== undefined)      col('listing_price', input.listingPrice);
  if (input.photos !== undefined)            col('photos', JSON.stringify(input.photos));

  if (fields.length === 0) return (await getGarment(id))!;

  fields.push(`updated_at = datetime('now')`);
  values.push(id);

  await db.execute(
    `UPDATE garments SET ${fields.join(', ')} WHERE id = $${i}`,
    values,
  );
  return (await getGarment(id))!;
}

export async function deleteGarment(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM garments WHERE id = $1', [id]);
}
