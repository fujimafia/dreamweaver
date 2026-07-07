// ── DB row types (snake_case matches SQLite column names) ────────────────────

export type YarnWeight =
  | 'lace' | 'fingering' | 'sport' | 'dk'
  | 'worsted' | 'aran' | 'bulky' | 'super_bulky';

export type PatternSourceType = 'etsy' | 'free_pdf' | 'physical_book' | 'magazine';

export type ProjectStatus = 'planned' | 'in_progress' | 'paused' | 'completed' | 'ready_to_wear';

export type ColorFeature = 'Tweed' | 'Heather' | 'Variegated' | 'Solid' | 'Speckled' | 'Marled' | string;

export interface Yarn {
  id: string;
  name: string;
  brand: string | null;
  fiber_content: string;
  weight: YarnWeight;
  gauge_stitches: number | null;
  gauge_rows: number | null;
  needle_size_mm: number | null;
  yardage_per_skein: number | null;
  meters_per_skein: number | null;
  skeins_owned: number;
  color: string | null;
  color_feature: ColorFeature | null;
  colorway: string | null;
  dye_lot: string | null;
  price_per_skein: number | null;
  purchase_url: string | null;
  notes: string | null;
  photos: string | null;  // JSON array of base64 data URLs
  created_at: string;
  updated_at: string;
}

export interface Pattern {
  id: string;
  title: string;
  designer: string | null;
  source_type: PatternSourceType;
  source_url: string | null;
  pdf_path: string | null;
  pdf_text: string | null;
  required_skills: string | null;  // JSON array serialized as text
  called_for_yarn_weight: string | null;
  called_for_gauge_stitches: number | null;
  called_for_gauge_rows: number | null;
  called_for_needle_size_mm: number | null;
  called_for_yardage: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  pattern_id: string | null;
  priority: number;
  target_date: string | null;
  start_date: string | null;
  end_date: string | null;
  process_notes: string | null;
  is_sample: number;   // 0 | 1
  total_rounds: number;
  planner_start_date: string | null;
  planner_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectYarn {
  id: string;
  project_id: string;
  yarn_id: string;
  skeins_used: number;
  yardage_used: number;
  held_with_yarn_id: string | null;
  notes: string | null;
}

export interface PatternYarn {
  pattern_id: string;
  yarn_id: string;
  is_substitution: number;  // 0 | 1
  notes: string | null;
}

export interface TimeEntry {
  id: string;
  project_id: string;
  duration_minutes: number;
  rounds_knitted: number;
  session_date: string;
  notes: string | null;
  created_at: string;
}

export interface Garment {
  id: string;
  project_id: string;
  garment_type: string | null;
  season: string | null;
  pre_block_chest_cm: number | null;
  pre_block_length_cm: number | null;
  pre_block_sleeve_cm: number | null;
  post_block_chest_cm: number | null;
  post_block_length_cm: number | null;
  post_block_sleeve_cm: number | null;
  care_instructions: string | null;
  process_notes: string | null;
  is_gift: number;    // 0 | 1
  gift_recipient: string | null;
  gift_notes: string | null;
  is_for_sale: number;  // 0 | 1
  listing_title: string | null;
  listing_description: string | null;
  listing_price: number | null;
  photos: string | null;  // JSON array of file paths
  created_at: string;
  updated_at: string;
}

export interface Sample {
  id: string;
  project_id: string;
  pattern_id: string | null;
  yarn_id: string;
  needle_size_mm: number;
  stitch_count_per_10cm: number | null;
  row_count_per_10cm: number | null;
  photo_path: string | null;
  notes: string | null;
  created_at: string;
}

// ── Input types (camelCase, used by app layer) ────────────────────────────────

export interface CreateYarnInput {
  name: string;
  brand?: string;
  fiberContent: string;
  weight: YarnWeight;
  gaugeStitches?: number;
  gaugeRows?: number;
  needleSizeMm?: number;
  yardagePerSkein?: number;
  metersPerSkein?: number;
  skeinsOwned?: number;
  color?: string;
  colorFeature?: ColorFeature;
  colorway?: string;
  dyeLot?: string;
  pricePerSkein?: number;
  purchaseUrl?: string;
  notes?: string;
  photos?: string[];  // base64 data URLs
}

export interface UpdateYarnInput extends Partial<CreateYarnInput> {}

export interface CreatePatternInput {
  title: string;
  designer?: string;
  sourceType: PatternSourceType;
  sourceUrl?: string;
  pdfPath?: string;
  pdfText?: string;
  requiredSkills?: string[];
  calledForYarnWeight?: string;
  calledForGaugeStitches?: number;
  calledForGaugeRows?: number;
  calledForNeedleSizeMm?: number;
  calledForYardage?: number;
  notes?: string;
}

export interface UpdatePatternInput extends Partial<CreatePatternInput> {}

export interface CreateProjectInput {
  title: string;
  status?: ProjectStatus;
  patternId?: string;
  priority?: number;
  startDate?: string;
  processNotes?: string;
  isSample?: boolean;
  plannerStartDate?: string;
  plannerEndDate?: string;
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  status?: ProjectStatus;
  endDate?: string;
  totalRounds?: number;
}

export interface CreateGarmentInput {
  projectId: string;
  garmentType?: string;
  season?: string;
  preBlockChestCm?: number;
  preBlockLengthCm?: number;
  preBlockSleeveCm?: number;
  postBlockChestCm?: number;
  postBlockLengthCm?: number;
  postBlockSleeveCm?: number;
  careInstructions?: string;
  processNotes?: string;
  isGift?: boolean;
  giftRecipient?: string;
  giftNotes?: string;
  isForSale?: boolean;
  listingTitle?: string;
  listingDescription?: string;
  listingPrice?: number;
  photos?: string[];
}

export interface UpdateGarmentInput extends Partial<Omit<CreateGarmentInput, 'projectId'>> {
  garmentType?: string;
  season?: string;
}

export interface CreateSampleInput {
  projectId: string;
  patternId?: string;
  yarnId: string;
  needleSizeMm: number;
  stitchCountPer10cm?: number;
  rowCountPer10cm?: number;
  photoPath?: string;
  notes?: string;
}

export interface CreateTimeEntryInput {
  projectId: string;
  durationMinutes: number;
  roundsKnitted?: number;
  sessionDate?: string;
  notes?: string;
}
