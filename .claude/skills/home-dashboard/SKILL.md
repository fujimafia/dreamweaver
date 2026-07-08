---
description: Build the Home dashboard tab with summary stats and insight nudges (P2)
---

# Home Dashboard — Summary & Insights [P2]

See PRD.md § "Backlog → [P2] Home Dashboard" for product requirements.

## What to build

A `HomeView` tab shown by default when the app opens. Two sections:

1. **Stats row** — 4–5 metric cards (projects this month, hours this month, overdue, stash size)
2. **Insights** — 1–3 plain-language nudge banners generated from rule checks on the stats

## Step-by-step

### 1. Add `getDashboardStats()` to `src/db/projects.ts`

```ts
export interface DashboardStats {
  projectsThisMonth: number;
  statusBreakdown: Record<string, number>;
  minutesThisMonth: number;
  overdueCount: number;
  totalSkeins: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();
  // projects whose planner range overlaps the current month
  const [{ count: projectsThisMonth }] = await db.select<{count:number}[]>(`
    SELECT COUNT(*) AS count FROM projects
    WHERE planner_start_date <= date('now','start of month','+1 month','-1 day')
      AND planner_end_date   >= date('now','start of month')
  `);
  // status breakdown
  const statusRows = await db.select<{status:string;count:number}[]>(
    `SELECT status, COUNT(*) AS count FROM projects GROUP BY status`
  );
  // hours this month
  const [{ total: minutesThisMonth }] = await db.select<{total:number}[]>(`
    SELECT COALESCE(SUM(duration_minutes),0) AS total FROM time_entries
    WHERE strftime('%Y-%m', session_date) = strftime('%Y-%m', 'now')
  `);
  // overdue: end date passed, not done
  const [{ count: overdueCount }] = await db.select<{count:number}[]>(`
    SELECT COUNT(*) AS count FROM projects
    WHERE planner_end_date < date('now')
      AND status NOT IN ('completed','ready_to_wear')
  `);
  // total skeins in stash
  const [{ total: totalSkeins }] = await db.select<{total:number}[]>(
    `SELECT COALESCE(SUM(skeins_owned),0) AS total FROM yarns`
  );
  return {
    projectsThisMonth,
    statusBreakdown: Object.fromEntries(statusRows.map(r => [r.status, r.count])),
    minutesThisMonth,
    overdueCount,
    totalSkeins,
  };
}
```

### 2. Create `src/views/HomeView.tsx`

- Call `getDashboardStats()` on mount
- Render 4–5 stat cards in a flex row using the app's existing purple palette (`#1a1a2e`, `#7c5cbf`, `#f7f5fb`)
- Below the cards, derive insight strings from the stats:
  - `projectsThisMonth >= 4` → "You have {n} projects scheduled this month. Consider doing less or rescheduling."
  - `overdueCount > 0` → "{n} project(s) are past their planned end date."
  - `minutesThisMonth === 0` → "No sessions logged this month yet — time to cast on!"
- Render each insight as a soft amber banner (`#e8a020` left border, `#fffbf0` background)

### 3. Wire into nav

In `src/nav.ts`:
```ts
export type NavSection = 'home' | 'yarn' | 'project' | ...;
// Add { id: 'home', label: 'Home' } as the FIRST item in NAV_ITEMS
```

In `src/App.tsx`:
- Import `HomeView`
- Add `case 'home': return <HomeView />;`
- Change `useState<NavSection>('yarn')` initial value to `'home'`

## Design notes

- Cards: white background, subtle shadow, coloured top border per metric type
- No charts needed for P2 — plain numbers and text are enough
- Insight banners should feel like gentle suggestions, not warnings
- Keep it fast: `getDashboardStats()` is a single mount fetch, no polling
