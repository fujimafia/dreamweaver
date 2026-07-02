# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Vision

Dream Weaver is a knitting project tracker and planning tool for a beginner-to-intermediate knitter who practices slow fashion. The app may expand to cover other crafts (pottery) and support gifting workflows and Etsy/web listing generation.

The core problem: managing a growing collection of patterns (Etsy PDFs, free downloads, physical books), sourcing suitable yarn substitutions, and tracking projects from inspiration through finished garment — including time spent, measurements, care instructions, and samples.

## Domain Model

The five core entities are: **Inspiration, Project, Pattern, Garment, Yarn.**

**Inspiration** — a moodboard entry. Fashion brand images, color palette ideas, potential yarn options gathered before a project is committed. Supports "I want to make something like this but in a different color/material."

**Pattern** — a knitting instruction set. Has source (Etsy, free PDF, physical book), required skills (cable, lace, brioche, etc.), and calls for a specific yarn with gauge and yardage. Patterns may be unstarted due to skill gap or yarn sourcing difficulty. A Pattern contains **Samples**.

- **Sample** — a subset of Project (not a Garment). A 10×10cm knitted swatch that records needle size, yarn used, tension/gauge, and a photo. Used to validate yarn+pattern compatibility before committing to a full project. A Sample terminates here — it never becomes a Garment.

**Project** — links a Pattern + Yarn(s) + intent. Has:
- Status: inspiration / planned / in progress / finished / frogged (unraveled)
- Priority influenced by seasonality (e.g. sweater needed by end of summer to wear in winter)
- Time tracking (hours logged per session) — useful for future project planning
- Notes on process decisions (e.g. held two yarns together, adjusted needle size)
- A Project may produce either a **Garment** or a **Sample**, not both

**Garment** — a finished Project that becomes a wearable product. Records:
- Pre- and post-blocking/wash measurements
- Care instructions derived from fiber content (handwash flat dry vs. machine gentle)
- Process notes (e.g. intentionally machine washed to shrink)
- Photos
- Can be designated as a gift (recipient preferences: color, fit) or listed for sale (Etsy/web listing copy, measurements, care instructions)

**Yarn** — has fiber content (wool, cotton, linen, modal — user avoids acrylic and mohair), weight/gauge, yardage per skein, and availability/price. Yarn substitution is a core workflow: matching gauge, yardage, and texture. Two yarns can be held together to adjust gauge or add texture.

## Key User Workflows

1. **Pattern discovery → project planning**: browse saved patterns, assess skill requirements and yarn needs, create a project with sourced yarn
2. **Yarn substitution**: given a pattern's yarn spec, find a suitable substitute considering gauge, yardage, fiber, texture, and personal preference (no mohair near skin, prefer natural fibers)
3. **Swatch → commit**: knit a sample, document it, decide whether to proceed with the pattern+yarn combo
4. **Active project tracking**: log time, track progress (rounds/rows), note decisions
5. **Finishing**: record measurements before and after blocking/washing, add care label info
6. **Gift or sell**: attach recipient preferences or generate a listing

## Technical Decisions

_To be filled in as the stack is chosen._
