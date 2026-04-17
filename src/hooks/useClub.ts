import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type Club = {
  id: string;
  name: string;
  sport: string;
  logo_url: string | null;
  max_players: number;
  subscription_plan: string;
  subscription_status: string;
  trial_ends_at: string | null;
  paddle_subscription_id: string | null;
  country_id: number | null;
  league_id: number | null;
  team_id: number | null;
  country_name: string | null;
  league_name: string | null;
  team_name: string | null;
  admin_id: string;
  slug: string;
  created_at: string;
};

export type ClubProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  account_type: string;
};

/**
 * Loads the active club for the currently logged-in user (the one they own).
 * Redirects to /login if not authenticated. Redirects to /club/signup if no club exists.
 */
export function useClub(redirectIfMissing = true) {
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [profile, setProfile] = useState<ClubProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (redirectIfMissing) navigate("/login");
        setLoading(false);
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, account_type")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (!prof) {
        if (redirectIfMissing) navigate("/login");
        setLoading(false);
        return;
      }
      setProfile(prof as ClubProfile);

      const { data: clubData } = await supabase
        .from("clubs")
        .select("*")
        .eq("admin_id", prof.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (!clubData && redirectIfMissing) {
        navigate("/club/signup");
        setLoading(false);
        return;
      }
      setClub(clubData as Club | null);
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [navigate, redirectIfMissing]);

  return { club, profile, loading };
}

export function trialDaysRemaining(trial_ends_at: string | null): number | null {
  if (!trial_ends_at) return null;
  const ms = new Date(trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
