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

**Project** — the unit of active work. Links a Pattern + Yarn(s). Has:
- Status: planned / in progress / finished / frogged (unraveled)
- Priority influenced by seasonality (e.g. sweater needed by end of summer)
- Time tracking (hours logged per session)
- Process notes (e.g. held two yarns together, adjusted needle size)
- Produces 0 or 1 Garment (a Sample project produces no Garment)

**Pattern** — a knitting instruction set. Source: Etsy, free PDF, physical book. Records required skills (cable, lace, brioche, etc.) and called-for yarn specs. Contains **Samples**.

- **Sample** — a 10×10cm swatch, a subset of Project. Records needle size, yarn, tension/gauge, and photo. Validates yarn+pattern fit before committing. Never becomes a Garment.

**Garment** — a finished Project that becomes a wearable product. Records:
- Pre- and post-blocking/wash measurements
- Care instructions (derived from fiber content: handwash/flat dry vs. machine gentle)
- Process notes
- Photos
- Can be designated as a gift (recipient color/fit preferences) or listed for sale (Etsy/web copy, measurements, care instructions)

**Yarn** — fiber content (wool, cotton, linen, modal — user avoids acrylic and mohair near skin), weight/gauge, yardage per skein, availability/price. Two yarns can be held together to adjust gauge or add texture.

**Inspiration** *(Phase 2)* — moodboard entries: fashion brand reference images, color palette ideas, potential yarn options. Supports "I want to make something like this but in a different color/material."

## Key User Workflows

1. **Pattern discovery → project planning**: browse saved patterns, assess skill requirements and yarn needs, create a project with sourced yarn
2. **Yarn substitution**: given a pattern's yarn spec, find a suitable substitute considering gauge, yardage, fiber, texture, and personal preference (no mohair near skin, prefer natural fibers)
3. **Swatch → commit**: knit a sample, document it, decide whether to proceed with the pattern+yarn combo
4. **Active project tracking**: log time, track progress (rounds/rows), note decisions
5. **Finishing**: record measurements before and after blocking/washing, add care label info
6. **Gift or sell**: attach recipient preferences or generate a listing

## Technical Decisions

_To be filled in as the stack is chosen._
