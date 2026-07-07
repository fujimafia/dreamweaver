import { getDb } from './client';
import { newId } from './id';
import type {
  Project, ProjectYarn,
  CreateProjectInput, UpdateProjectInput, CreateTimeEntryInput, TimeEntry,
} from './types';

export async function listProjects(): Promise<Project[]> {
  const db = await getDb();
  return db.select<Project[]>('SELECT * FROM projects ORDER BY priority DESC, created_at DESC');
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await getDb();
  const rows = await db.select<Project[]>('SELECT * FROM projects WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const db = await getDb();
  const id = newId();
  await db.execute(
    `INSERT INTO projects (
       id, title, status, pattern_id, priority,
       target_date, start_date, process_notes, is_sample,
       planner_start_date, planner_end_date
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      id, input.title, input.status ?? 'planned', input.patternId ?? null,
      input.priority ?? 0, null, input.startDate ?? null,
      input.processNotes ?? null, input.isSample ? 1 : 0,
      input.plannerStartDate ?? null, input.plannerEndDate ?? null,
    ],
  );
  return (await getProject(id))!;
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const col = (name: string, val: unknown) => {
    fields.push(`${name} = $${i++}`);
    values.push(val ?? null);
  };

  if (input.title !== undefined)        col('title', input.title);
  if (input.status !== undefined)       col('status', input.status);
  if (input.patternId !== undefined)    col('pattern_id', input.patternId);
  if (input.priority !== undefined)     col('priority', input.priority);
  if (input.startDate !== undefined)    col('start_date', input.startDate);
  if (input.endDate !== undefined)      col('end_date', input.endDate);
  if (input.processNotes !== undefined) col('process_notes', input.processNotes);
  if (input.isSample !== undefined)     col('is_sample', input.isSample ? 1 : 0);
  if (input.totalRounds !== undefined)  col('total_rounds', input.totalRounds);
  if (input.plannerStartDate !== undefined) col('planner_start_date', input.plannerStartDate);
  if (input.plannerEndDate !== undefined)   col('planner_end_date', input.plannerEndDate);

  if (fields.length === 0) return (await getProject(id))!;

  fields.push(`updated_at = datetime('now')`);
  values.push(id);

  await db.execute(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = $${i}`,
    values,
  );
  return (await getProject(id))!;
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM projects WHERE id = $1', [id]);
}

// ── Yarn links ────────────────────────────────────────────────────────────────

export async function getProjectYarns(projectId: string): Promise<ProjectYarn[]> {
  const db = await getDb();
  return db.select<ProjectYarn[]>(
    'SELECT * FROM project_yarns WHERE project_id = $1',
    [projectId],
  );
}

export async function addYarnToProject(
  projectId: string,
  yarnId: string,
  opts?: { skeinsUsed?: number; yardageUsed?: number; heldWithYarnId?: string; notes?: string },
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO project_yarns
       (id, project_id, yarn_id, skeins_used, yardage_used, held_with_yarn_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      newId(), projectId, yarnId,
      opts?.skeinsUsed ?? 0, opts?.yardageUsed ?? 0,
      opts?.heldWithYarnId ?? null, opts?.notes ?? null,
    ],
  );
}

export async function removeYarnFromProject(projectId: string, yarnId: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    'DELETE FROM project_yarns WHERE project_id = $1 AND yarn_id = $2',
    [projectId, yarnId],
  );
}

// ── Yarn → Projects (all projects that use a given yarn) ─────────────────────

export interface YarnProjectLink {
  project_id: string;
  project_title: string;
  project_status: string;
  yardage_used: number;
  skeins_used: number;
}

export async function getProjectsForYarn(yarnId: string): Promise<YarnProjectLink[]> {
  const db = await getDb();
  return db.select<YarnProjectLink[]>(
    `SELECT
       py.project_id,
       p.title  AS project_title,
       p.status AS project_status,
       py.yardage_used,
       py.skeins_used
     FROM project_yarns py
     JOIN projects p ON p.id = py.project_id
     WHERE py.yarn_id = $1
     ORDER BY p.created_at DESC`,
    [yarnId],
  );
}

// ── Time entries ──────────────────────────────────────────────────────────────

export async function listTimeEntries(projectId: string): Promise<TimeEntry[]> {
  const db = await getDb();
  return db.select<TimeEntry[]>(
    'SELECT * FROM time_entries WHERE project_id = $1 ORDER BY session_date DESC',
    [projectId],
  );
}

export async function addTimeEntry(input: CreateTimeEntryInput): Promise<TimeEntry> {
  const db = await getDb();
  const id = newId();
  await db.execute(
    `INSERT INTO time_entries (id, project_id, duration_minutes, rounds_knitted, session_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      id, input.projectId, input.durationMinutes, input.roundsKnitted ?? 0,
      input.sessionDate ?? new Date().toISOString().slice(0, 10), input.notes ?? null,
    ],
  );
  const rows = await db.select<TimeEntry[]>(
    'SELECT * FROM time_entries WHERE id = $1', [id],
  );
  return rows[0];
}

export async function getTotalMinutes(projectId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ total: number }[]>(
    'SELECT COALESCE(SUM(duration_minutes), 0) AS total FROM time_entries WHERE project_id = $1',
    [projectId],
  );
  return rows[0]?.total ?? 0;
}
