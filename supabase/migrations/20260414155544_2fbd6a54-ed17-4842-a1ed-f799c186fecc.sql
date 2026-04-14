
DROP TRIGGER IF EXISTS recalculate_stats_on_report_insert ON public.reports;
DROP TRIGGER IF EXISTS recalculate_stats_on_report_delete ON public.reports;
DROP TRIGGER IF EXISTS recalculate_stats_on_report_update ON public.reports;

CREATE TRIGGER recalculate_stats_on_report_insert
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_player_stats();

CREATE TRIGGER recalculate_stats_on_report_delete
  AFTER DELETE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_player_stats();

CREATE TRIGGER recalculate_stats_on_report_update
  AFTER UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_player_stats();
