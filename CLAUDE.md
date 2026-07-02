# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Vision

Dream Weaver is a knitting project tracker and planning tool for a beginner-to-intermediate knitter who practices slow fashion. The app may expand to cover other crafts (pottery) and support gifting workflows and Etsy/web listing generation.

The core problem: managing a growing collection of patterns (Etsy PDFs, free downloads, physical books), sourcing suitable yarn substitutions, and tracking projects from inspiration through finished garment — including time spent, measurements, care instructions, and samples.

## Domain Model

**Pattern** — a knitting instruction set. Has source (Etsy, free PDF, physical book), required skills (cable, lace, brioche, etc.), and calls for a specific yarn with gauge and yardage. Patterns may be unstarted due to skill gap or yarn sourcing difficulty.

**Yarn** — has fiber content (wool, cotton, linen, modal, acrylic — user avoids acrylic and mohair), weight/gauge, yardage per skein, and availability/price. Yarn substitution is a core workflow: matching gauge, yardage, and texture. Two yarns can be held together to adjust gauge or add texture.

**Yarn Sample (Swatch)** — a 10×10cm knitted test piece. Records needle size, yarn used, pattern used, yardage consumed, and a photo. Swatches validate gauge and fabric feel before committing to a full project. Should be linkable to the finished garment that resulted from it.

**Project** — links a Pattern + Yarn(s) + intent. Has:
- Status: inspiration / planned / in progress / finished / frogged (unraveled)
- Priority influenced by seasonality (e.g. sweater needed by end of summer to wear in winter)
- Time tracking (hours logged per session) — useful for future project planning
- Notes on process decisions (e.g. held two yarns together, adjusted needle size)

**Finished Garment** — a completed project becomes a product. Records:
- Pre- and post-blocking/wash measurements
- Care instructions derived from fiber content (handwash flat dry vs. machine gentle)
- Process notes (e.g. intentionally machine washed to shrink)
- Photos

**Moodboard / Inspiration** — fashion brand images, color palette ideas, potential yarn options gathered before a project is committed. Supports "I want to make something like this but in a different color/material."

**Gift / Listing** — a finished garment can be designated as a gift (with recipient preferences: color, fit) or listed for sale (Etsy listing copy, measurements, care instructions, photos).

## Key User Workflows

1. **Pattern discovery → project planning**: browse saved patterns, assess skill requirements and yarn needs, create a project with sourced yarn
2. **Yarn substitution**: given a pattern's yarn spec, find a suitable substitute considering gauge, yardage, fiber, texture, and personal preference (no mohair near skin, prefer natural fibers)
3. **Swatch → commit**: knit a sample, document it, decide whether to proceed with the pattern+yarn combo
4. **Active project tracking**: log time, track progress (rounds/rows), note decisions
5. **Finishing**: record measurements before and after blocking/washing, add care label info
6. **Gift or sell**: attach recipient preferences or generate a listing

## Technical Decisions

_To be filled in as the stack is chosen._
