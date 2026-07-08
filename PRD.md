# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Vision

Dream Weaver is a knitting project tracker and planning tool for a beginner-to-intermediate knitter who practices slow fashion. The app may expand to cover other crafts (pottery) and support gifting workflows and Etsy/web listing generation.

The core problem: managing a growing collection of patterns (Etsy PDFs, free downloads, physical books), sourcing suitable yarn substitutions, and tracking projects from inspiration through finished garment — including time spent, measurements, care instructions, and samples.

## Domain Model

Phase 1 entities: **Project, Pattern, Garment, Yarn.**
Phase 2 entity: **Inspiration** (moodboard — not in initial build).

### Relationships (from system diagram)

```
Project  ──has 1-m──▶  Yarn
Project  ──has 0-1──▶  Garment
Project  ◀──has 0-m──  Pattern   (a pattern can have 0 or more projects)

Garment  ──has 1 ───▶  Project   (a garment belongs to exactly 1 project)
Garment  ──has 1-m──▶  Yarn
Garment  ──has 1-m──▶  Pattern

Yarn     ──has 0-m──▶  Pattern
Yarn     ──has 0-m──▶  Garment

Pattern  ──has 1-m──▶  Yarn
Pattern  ──has 0-m──▶  Garment
```

### Entity details

**Project** — the unit of active work. Users can CRUD a Project and link Yarn(s) to it. Has:
- Status (ordered): **Planned → In Progress → Completed → Ready to Wear**
- Transitioning to "Ready to Wear" promotes the Project into a Garment
- Priority influenced by seasonality (e.g. sweater needed by end of summer)
- Time tracking (hours logged per session)
- Process notes (e.g. held two yarns together, adjusted needle size)
- Produces 0 or 1 Garment (a Sample project produces no Garment)

**Pattern** — users can CRUD a Pattern by uploading a PDF; the PDF is converted to editable text so the user can annotate and modify it. Source: Etsy, free PDF, physical book. Records required skills (cable, lace, brioche, etc.) and called-for yarn specs.
- Users can add Yarn(s) to a Pattern
- Users can substitute a Pattern's called-for yarn with an existing Yarn in their stash — adjusting and modifying the pattern instructions accordingly
- Contains **Samples**

- **Sample** — a 10×10cm swatch, a subset of Project. Records needle size, yarn, tension/gauge, and photo. Validates yarn+pattern fit before committing. Never becomes a Garment.

**Garment** — a finished Project that becomes a wearable product. Records:
- Pre- and post-blocking/wash measurements
- Care instructions (derived from fiber content: handwash/flat dry vs. machine gentle)
- Process notes
- Photos
- Can be designated as a gift (recipient color/fit preferences) or listed for sale (Etsy/web copy, measurements, care instructions)

**Yarn** — users can CRUD Yarn and add it to one or more Projects. Tracks:
- Fiber content (wool, cotton, linen, modal — user avoids acrylic and mohair near skin)
- Weight/gauge, yardage per skein, availability/price
- Usage tracking: yardage consumed per Project (total used vs. total purchased)
- Two yarns can be held together in a Project to adjust gauge or add texture

**Inspiration** *(Phase 2)* — moodboard entries: fashion brand reference images, color palette ideas, potential yarn options. Supports "I want to make something like this but in a different color/material."

## Planner

A calendar or Gantt view for visualizing project timelines.

- **In Progress** projects always appear on the Planner
- **Planned** projects appear on the Planner only if they have a date assigned
- Supports two views: calendar and Gantt

## Timer & Time Tracking

A built-in timer records knitting sessions and attributes them to a Project.

- Start/stop timer; time is recorded in minute increments
- Stopping the timer saves the session duration as a time entry linked to a Project
- A Project accumulates all its time entries so the user can see total hours spent
- Informs future project planning (e.g. "this sweater took 40 hours over 6 months")

While the timer is active, a **round counter** is available:
- Increment (+) or decrement (−) to track each round knitted
- Round count is attributed to a Project and accumulates across sessions
- Counter only resets when the user explicitly chooses to reset it (not on timer stop)

## Key User Workflows

1. **Pattern discovery → project planning**: browse saved patterns, assess skill requirements and yarn needs, create a project with sourced yarn
2. **Yarn substitution**: given a pattern's yarn spec, find a suitable substitute considering gauge, yardage, fiber, texture, and personal preference (no mohair near skin, prefer natural fibers)
3. **Swatch → commit**: knit a sample, document it, decide whether to proceed with the pattern+yarn combo
4. **Active project tracking**: log time, track progress (rounds/rows), note decisions
5. **Finishing**: record measurements before and after blocking/washing, add care label info
6. **Gift or sell**: attach recipient preferences or generate a listing

## Technical Decisions

**Stack:** Tauri v2 (Rust backend) + React + TypeScript frontend + SQLite via `tauri-plugin-sql`.

**Database:** Single SQLite file at `dreamweaver.db` in the Tauri app data directory. Schema migrations live in `src-tauri/migrations/`. The DB layer is in `src/db/` — one file per entity (`yarns.ts`, `patterns.ts`, `projects.ts`, `garments.ts`, `samples.ts`) plus shared `types.ts`, `client.ts`, `id.ts`.

**Prerequisite to run:** Rust must be installed (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`), then `npm install` and `npm run tauri dev`.

**Tables:** `yarns`, `patterns`, `projects`, `project_yarns`, `pattern_yarns`, `time_entries`, `garments`, `samples`.

---

## Backlog

### [P2] Home Dashboard — Summary & Insights

A top-level **Home** tab that surfaces a snapshot of the user's crafting activity with opinionated nudges.

**Summary section** (example copy):
> "You have 5 projects scheduled this month. Consider doing less or rescheduling."

**Proposed metrics:**
- Projects scheduled this month (planner dates overlap current month)
- Projects by status breakdown (planned / in progress / paused / completed)
- Hours logged this month (sum of `time_entries.duration_minutes`)
- Overdue projects (planner_end_date < today and status not completed/ready_to_wear)
- Yarn stash size (skein count)

**Insight rules (examples):**
- ≥ 4 projects scheduled in a month → suggest reducing or rescheduling
- Any project with `planner_end_date` passed and status still `in_progress` → flag as overdue
- No time logged in the last 14 days → "You haven't logged a session recently"

**Implementation notes (no schema changes needed):**
- All required data is already in the DB
- Add `getDashboardStats()` to `src/db/projects.ts` — aggregates in SQL rather than loading all rows into JS:
  - projects this month, hours this month, overdue count
- New `HomeView` component consumes `getDashboardStats()` and renders stat cards + insight banners
- Add `home` to `NavSection` in `nav.ts` and wire into `App.tsx`
- Home should be the first nav item / default active tab
