


---
name: project-stack
description: Tech stack chosen for Dreamweaver — Tauri v2, React, TypeScript, SQLite
metadata:
  type: project
---

Stack chosen on 2026-07-06: **Tauri v2 + React + TypeScript + SQLite** (`tauri-plugin-sql`).

Database is a single SQLite file (`dreamweaver.db`) in the Tauri app data dir. Schema migrations in `src-tauri/migrations/`.

**Why:** User wanted a desktop app (Mac). Tauri was preferred over Electron for smaller bundle and lower memory use. SQLite fits the relational domain model (Projects/Yarns/Patterns/Garments with FK relationships).

**How to apply:** All DB queries go through `src/db/` — never raw fetch or localStorage. When adding new entities, follow the pattern: new migration SQL + new `src/db/<entity>.ts` file.

**Blocker:** Rust is not installed yet. User must run `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh` before `npm run tauri dev` will work.
