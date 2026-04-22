import { ReactNode, useEffect, useState } from "react";
import ClubSidebar from "./ClubSidebar";
import ClubTopNav from "./ClubTopNav";
import { useClub, trialDaysRemaining } from "@/hooks/useClub";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
}

const ClubLayout = ({ children }: Props) => {
  const { club, loading } = useClub();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userName, setUserName] = useState<string | undefined>();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email || undefined);
        const meta = session.user.user_metadata;
        setUserName(meta?.full_name || meta?.name || session.user.email || undefined);
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading your club…</p>
      </div>
    );
  }

  if (!club) return null;

  const trialDays = trialDaysRemaining(club.trial_ends_at);
  const showTrialBanner = club.subscription_plan === "trial" && trialDays !== null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ClubTopNav userName={userName} userEmail={userEmail} />
      <div className="flex flex-1 min-h-0">
        <ClubSidebar clubName={club.name} clubLogo={club.logo_url} />
        <main className="flex-1 min-w-0">
        {showTrialBanner && (
          <div className="border-b border-primary/20 bg-primary/10 px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <AlertCircle size={16} className="text-primary" />
              <span>
                <strong>{trialDays} days</strong> remaining in your free trial. After that, €69/month for up to 25 players.
              </span>
            </div>
            <Button size="sm" asChild>
              <Link to="/club/dashboard/settings">Upgrade now</Link>
            </Button>
          </div>
        )}
        <div className="p-6 md:p-10">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default ClubLayout;
