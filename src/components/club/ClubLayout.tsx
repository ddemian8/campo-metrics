import { ReactNode } from "react";
import ClubSidebar from "./ClubSidebar";
import { useClub, trialDaysRemaining } from "@/hooks/useClub";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
}

const ClubLayout = ({ children }: Props) => {
  const { club, loading } = useClub();

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
    <div className="min-h-screen bg-background flex">
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
  );
};

export default ClubLayout;
