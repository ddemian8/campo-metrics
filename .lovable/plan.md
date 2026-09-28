

# Fix: Leaderboard Data Not Showing + Incorrect Stats

## Root Cause Analysis

Three interconnected bugs prevent leaderboard data from appearing:

1. **Sessions stuck in `processing` status**: When a report is generated, the session is created with `status: 'processing'` but is **never updated to `completed`**. Both the DB trigger function and the client-side `recalculatePlayerStats` filter on `status = 'completed'`, so they find zero sessions and compute all NULLs.

2. **DB triggers missing or broken**: The migration file created triggers, but they don't appear in the database. Additionally, the `recalculate_player_stats()` function only references `NEW.player_id` — this fails on DELETE operations (where only `OLD` exists).

3. **Wrong GPS data key mappings**: The DB function maps `avg_hsr_per90` to `gps_data->>'hmld'` (HMLD) instead of `gps_data->>'dist_sp_z4plus'` (actual HSR). Similar issue in client-side code.

## Plan

### Step 1: Fix session status after report generation
- In `Analyze.tsx` (or `generate-report` edge function response handling), update the session to `status = 'completed'` after the report is saved
- Also update all existing sessions that have a matching report to `completed` via a migration

### Step 2: Fix the DB trigger function
- Replace `recalculate_player_stats()` to handle both `NEW` and `OLD` (INSERT/UPDATE use NEW, DELETE uses OLD)
- Fix key mappings: HSR = `dist_sp_z4plus`, Sprint = `dist_sp_z5`, Distance = `distance`, Speed = `max_sp`
- Store **best** values (not just averages) for the leaderboard: `best_top_speed`, `best_distance_single_match`, `best_sprint_distance_single`, `best_performance_score`
- Ensure the trigger actually exists by recreating it in the migration

### Step 3: Fix client-side `recalculatePlayerStats`
- In `Report.tsx` and `Dashboard.tsx`: fix `avgHsr` to read from `dist_sp_z4plus` (not `hmld`)
- Add `avg_hmld` reading from `hmld` as a separate metric
- Ensure the function is called after report generation (in Analyze.tsx flow)

### Step 4: Update existing data
- SQL migration to set all sessions with a matching report to `status = 'completed'`
- Run recalculation for all existing players so their stats appear immediately

### Step 5: Leaderboard display — show best results + key stats
- Homepage `BrowsePlayers.tsx`: "Fastest players" sorted by `best_top_speed`, "Most distance" by `best_distance_single_match`, "Highest CPI" by `best_performance_score`
- Ensure `/explore` page uses the correct columns

## Technical Details

**Migration SQL:**
```sql
-- Fix existing sessions: mark completed if they have a report
UPDATE sessions s SET status = 'completed' 
WHERE EXISTS (SELECT 1 FROM reports r WHERE r.session_id = s.id);

-- Recreate trigger function with DELETE support + correct key mappings
CREATE OR REPLACE FUNCTION public.recalculate_player_stats() RETURNS trigger ...
  -- Use COALESCE(NEW.player_id, OLD.player_id) to handle all trigger events
  -- HSR = gps_data->>'dist_sp_z4plus' (not hmld)
  -- HMLD stays as gps_data->>'hmld'

-- Recreate triggers
DROP TRIGGER IF EXISTS ... ON reports;
CREATE TRIGGER ... AFTER INSERT/UPDATE/DELETE ON reports ...
```

**Client-side key fix in recalculatePlayerStats:**
```
avgHsr = getAvg(pdfList, "dist_sp_z4plus")  // was "hmld"
avgHmld = getAvg(pdfList, "hmld")           // new separate metric
```

**Analyze.tsx — mark session completed after report save:**
```typescript
await supabase.from("sessions").update({ status: "completed" }).eq("id", sessionId);
```

## Files to Change
1. **New SQL migration** — fix session statuses, recreate trigger with correct logic
2. **`src/pages/Analyze.tsx`** — set session status to `completed` after report generation
3. **`src/pages/Report.tsx`** — fix GPS key mappings in `recalculatePlayerStats`
4. **`src/pages/Dashboard.tsx`** — same key mapping fixes
5. **`src/components/BrowsePlayers.tsx`** — use `best_top_speed` for fastest, `best_distance_single_match` for distance board
