
-- Set all existing profiles to public
UPDATE profiles SET is_public = true WHERE is_public = false;

-- Change default for is_public to true
ALTER TABLE profiles ALTER COLUMN is_public SET DEFAULT true;

-- Create trigger to recalculate stats on report insert/update
CREATE TRIGGER recalculate_stats_on_report_insert
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_player_stats();

CREATE TRIGGER recalculate_stats_on_report_update
  AFTER UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_player_stats();
