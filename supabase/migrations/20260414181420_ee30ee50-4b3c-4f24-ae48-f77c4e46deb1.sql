
-- Step 1: Fix existing sessions stuck in processing
UPDATE sessions s SET status = 'completed' 
WHERE EXISTS (SELECT 1 FROM reports r WHERE r.session_id = s.id)
  AND s.status != 'completed';

-- Step 2: Recreate trigger function with DELETE support + correct key mappings
CREATE OR REPLACE FUNCTION public.recalculate_player_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_player_id uuid;
  v_pdf_count int;
  v_screenshot_count int;
  v_manual_count int;
  v_total_sessions int;
  v_total_matches int;
  v_total_trainings int;
  v_avg_distance numeric;
  v_avg_sprint_distance numeric;
  v_avg_hsr numeric;
  v_avg_top_speed numeric;
  v_avg_accel numeric;
  v_avg_decel numeric;
  v_avg_sprints numeric;
  v_avg_perf numeric;
  v_best_top_speed numeric;
  v_best_distance numeric;
  v_best_sprint numeric;
  v_best_perf numeric;
  v_last_date date;
  v_trust int;
  v_has_transfermarkt boolean;
  v_has_club boolean;
BEGIN
  -- Handle all trigger operations (INSERT/UPDATE use NEW, DELETE uses OLD)
  v_player_id := COALESCE(NEW.player_id, OLD.player_id);

  -- Session counters (all completed sessions)
  SELECT
    COUNT(*) FILTER (WHERE input_method = 'pdf_upload'),
    COUNT(*) FILTER (WHERE input_method = 'screenshot'),
    COUNT(*) FILTER (WHERE input_method = 'manual'),
    COUNT(*),
    COUNT(*) FILTER (WHERE session_type = 'match'),
    COUNT(*) FILTER (WHERE session_type = 'training'),
    MAX(session_date)
  INTO v_pdf_count, v_screenshot_count, v_manual_count, v_total_sessions, v_total_matches, v_total_trainings, v_last_date
  FROM sessions
  WHERE player_id = v_player_id AND status = 'completed';

  -- Leaderboard averages from PDF sessions ONLY
  -- HSR = dist_sp_z4plus (NOT hmld), Sprint = dist_sp_z5, Distance = distance, Speed = max_sp
  SELECT
    AVG((gps_data->>'distance')::numeric),
    AVG((gps_data->>'dist_sp_z5')::numeric),
    AVG((gps_data->>'dist_sp_z4plus')::numeric),
    AVG((gps_data->>'max_sp')::numeric),
    AVG((gps_data->>'acc_ev')::numeric),
    AVG((gps_data->>'dec_ev')::numeric),
    AVG((gps_data->>'sp_ev')::numeric)
  INTO v_avg_distance, v_avg_sprint_distance, v_avg_hsr, v_avg_top_speed, v_avg_accel, v_avg_decel, v_avg_sprints
  FROM sessions
  WHERE player_id = v_player_id AND status = 'completed' AND input_method = 'pdf_upload';

  -- Average CPI from PDF reports only
  SELECT AVG((r.ai_report->>'cpi')::numeric)
  INTO v_avg_perf
  FROM reports r
  JOIN sessions s ON s.id = r.session_id
  WHERE r.player_id = v_player_id AND s.input_method = 'pdf_upload';

  -- Personal records from ALL completed sessions
  SELECT
    MAX((gps_data->>'max_sp')::numeric),
    MAX((gps_data->>'distance')::numeric),
    MAX((gps_data->>'dist_sp_z5')::numeric)
  INTO v_best_top_speed, v_best_distance, v_best_sprint
  FROM sessions
  WHERE player_id = v_player_id AND status = 'completed';

  -- Best CPI from ALL reports
  SELECT MAX((ai_report->>'cpi')::numeric)
  INTO v_best_perf
  FROM reports
  WHERE player_id = v_player_id;

  -- Trust score
  SELECT
    (transfermarkt_url IS NOT NULL AND transfermarkt_url != ''),
    (current_club IS NOT NULL AND current_club != '')
  INTO v_has_transfermarkt, v_has_club
  FROM profiles
  WHERE id = v_player_id;

  v_trust := 0;
  IF v_total_sessions > 0 THEN
    v_trust := v_trust + LEAST(40, (v_pdf_count::numeric / v_total_sessions * 40)::int);
  END IF;
  v_trust := v_trust + LEAST(20, v_total_sessions);
  IF v_has_transfermarkt THEN v_trust := v_trust + 20; END IF;
  IF v_has_club THEN v_trust := v_trust + 20; END IF;

  -- Upsert
  INSERT INTO player_stats_aggregate (
    player_id, avg_distance_per90, avg_sprint_distance_per90, avg_hsr_per90,
    avg_top_speed, avg_accelerations_per90, avg_decelerations_per90, avg_sprints_per90,
    avg_performance_score, best_top_speed, best_distance_single_match, best_sprint_distance_single,
    best_performance_score, total_sessions, total_matches, total_trainings,
    pdf_session_count, screenshot_session_count, manual_session_count,
    trust_score, last_session_date, updated_at
  ) VALUES (
    v_player_id, v_avg_distance, v_avg_sprint_distance, v_avg_hsr,
    v_avg_top_speed, v_avg_accel, v_avg_decel, v_avg_sprints,
    v_avg_perf, v_best_top_speed, v_best_distance, v_best_sprint,
    v_best_perf, v_total_sessions, v_total_matches, v_total_trainings,
    v_pdf_count, v_screenshot_count, v_manual_count,
    v_trust, v_last_date, now()
  )
  ON CONFLICT (player_id) DO UPDATE SET
    avg_distance_per90 = EXCLUDED.avg_distance_per90,
    avg_sprint_distance_per90 = EXCLUDED.avg_sprint_distance_per90,
    avg_hsr_per90 = EXCLUDED.avg_hsr_per90,
    avg_top_speed = EXCLUDED.avg_top_speed,
    avg_accelerations_per90 = EXCLUDED.avg_accelerations_per90,
    avg_decelerations_per90 = EXCLUDED.avg_decelerations_per90,
    avg_sprints_per90 = EXCLUDED.avg_sprints_per90,
    avg_performance_score = EXCLUDED.avg_performance_score,
    best_top_speed = EXCLUDED.best_top_speed,
    best_distance_single_match = EXCLUDED.best_distance_single_match,
    best_sprint_distance_single = EXCLUDED.best_sprint_distance_single,
    best_performance_score = EXCLUDED.best_performance_score,
    total_sessions = EXCLUDED.total_sessions,
    total_matches = EXCLUDED.total_matches,
    total_trainings = EXCLUDED.total_trainings,
    pdf_session_count = EXCLUDED.pdf_session_count,
    screenshot_session_count = EXCLUDED.screenshot_session_count,
    manual_session_count = EXCLUDED.manual_session_count,
    trust_score = EXCLUDED.trust_score,
    last_session_date = EXCLUDED.last_session_date,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 3: Recreate triggers on reports table
DROP TRIGGER IF EXISTS recalculate_stats_on_report_insert ON reports;
DROP TRIGGER IF EXISTS recalculate_stats_on_report_update ON reports;
DROP TRIGGER IF EXISTS recalculate_stats_on_report_delete ON reports;
DROP TRIGGER IF EXISTS recalculate_player_stats_trigger ON reports;

CREATE TRIGGER recalculate_stats_on_report_change
  AFTER INSERT OR UPDATE OR DELETE ON reports
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_player_stats();
