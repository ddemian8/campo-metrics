
-- Function to recalculate player_stats_aggregate for a given player
CREATE OR REPLACE FUNCTION public.recalculate_player_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_player_id := NEW.player_id;

  -- Session counters (all sessions)
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
  SELECT
    AVG((gps_data->>'distance')::numeric),
    AVG((gps_data->>'dist_sp_z5')::numeric),
    AVG((gps_data->>'hmld')::numeric),
    AVG((gps_data->>'max_sp')::numeric),
    AVG((gps_data->>'acc_ev')::numeric),
    AVG((gps_data->>'dec_ev')::numeric),
    AVG((gps_data->>'sp_ev')::numeric)
  INTO v_avg_distance, v_avg_sprint_distance, v_avg_hsr, v_avg_top_speed, v_avg_accel, v_avg_decel, v_avg_sprints
  FROM sessions
  WHERE player_id = v_player_id AND status = 'completed' AND input_method = 'pdf_upload';

  -- Average performance score from PDF reports only
  SELECT AVG((r.ai_report->>'cpi')::numeric)
  INTO v_avg_perf
  FROM reports r
  JOIN sessions s ON s.id = r.session_id
  WHERE r.player_id = v_player_id AND s.input_method = 'pdf_upload';

  -- Personal records from ALL sessions
  SELECT
    MAX((gps_data->>'max_sp')::numeric),
    MAX((gps_data->>'distance')::numeric),
    MAX((gps_data->>'dist_sp_z5')::numeric)
  INTO v_best_top_speed, v_best_distance, v_best_sprint
  FROM sessions
  WHERE player_id = v_player_id AND status = 'completed';

  -- Best performance score from ALL reports
  SELECT MAX((ai_report->>'cpi')::numeric)
  INTO v_best_perf
  FROM reports
  WHERE player_id = v_player_id;

  -- Trust score calculation
  SELECT
    (transfermarkt_url IS NOT NULL AND transfermarkt_url != ''),
    (current_club IS NOT NULL AND current_club != '')
  INTO v_has_transfermarkt, v_has_club
  FROM profiles
  WHERE id = v_player_id;

  v_trust := 0;
  -- PDF ratio contributes up to 40 points
  IF v_total_sessions > 0 THEN
    v_trust := v_trust + LEAST(40, (v_pdf_count::numeric / v_total_sessions * 40)::int);
  END IF;
  -- Session volume: up to 20 points (1 point per session, max 20)
  v_trust := v_trust + LEAST(20, v_total_sessions);
  -- Transfermarkt verification: 20 points
  IF v_has_transfermarkt THEN
    v_trust := v_trust + 20;
  END IF;
  -- Club membership: 20 points
  IF v_has_club THEN
    v_trust := v_trust + 20;
  END IF;

  -- Upsert into player_stats_aggregate
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

  RETURN NEW;
END;
$$;

-- Create trigger on sessions table
DROP TRIGGER IF EXISTS trigger_recalculate_player_stats ON sessions;
CREATE TRIGGER trigger_recalculate_player_stats
  AFTER INSERT OR UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_player_stats();

-- Also trigger when reports are inserted (to update CPI averages)
DROP TRIGGER IF EXISTS trigger_recalculate_stats_on_report ON reports;
CREATE TRIGGER trigger_recalculate_stats_on_report
  AFTER INSERT OR UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_player_stats();

-- Enable realtime on player_stats_aggregate for live leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_stats_aggregate;
