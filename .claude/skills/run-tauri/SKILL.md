---
description: Launch the Dreamweaver Tauri dev app
---

# Run Dreamweaver (Tauri Dev)

## Steps

1. **Kill any leftover processes** — a stale Vite or Cargo process on port 1420 will cause an immediate failure:

   ```bash
   lsof -ti :1420 | xargs kill -9 2>/dev/null
   pkill -f "tauri dev" 2>/dev/null
   pkill -f "vite" 2>/dev/null
   pkill -f "cargo run" 2>/dev/null
   sleep 2
   ```

2. **Check for stale Rust build cache** — if `src-tauri/target/` exists but contains paths referencing an old project directory (e.g. `coding experiment` instead of `code-experiment`), run `cargo clean` first:

   ```bash
   grep -r "coding experiment" src-tauri/target/debug/build/ --include="*.toml" -l 2>/dev/null | head -1
   ```

   If any hits: `cd src-tauri && cargo clean` (removes ~3 GB, takes ~10 seconds).

3. **Launch Tauri dev in the background:**

   ```bash
   cd /Users/vcyu/Documents/code-experiment/dreamweaver
   npm run tauri dev > /tmp/tauri-dev.log 2>&1 &
   echo "PID: $!"
   ```

4. **Wait for the window to appear** — on a clean build, Rust compilation takes ~3–4 minutes. On incremental builds, ~10–30 seconds. Poll the log:

   ```bash
   # Wait until "Running `target/debug/dreamweaver`" appears
   tail -f /tmp/tauri-dev.log
   ```

   The app window opens automatically once that line appears.

5. **Verify** — check the log for `Finished` and `Running`:

   ```bash
   grep -E "Finished|Running|error" /tmp/tauri-dev.log | tail -5
   ```

## Known issues

- **Port 1420 already in use** → step 1 above clears it.
- **`failed to read plugin permissions` with wrong path** → stale `target/` from a previous project location; `cargo clean` fixes it (step 2).
- The Tauri window opens as a native macOS app — no browser URL needed.
