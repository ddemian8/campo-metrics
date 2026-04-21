import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.svg";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const routeAfterLogin = async (userId: string) => {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, account_type")
      .eq("user_id", userId)
      .maybeSingle();
    if (prof) {
      const { data: club } = await supabase
        .from("clubs")
        .select("id")
        .eq("admin_id", prof.id)
        .limit(1)
        .maybeSingle();
      if (club || prof.account_type === "club_owner") {
        navigate("/club/dashboard");
        return;
      }
      // Club player → player dashboard
      const { data: cp } = await supabase
        .from("club_players")
        .select("id")
        .eq("user_id", prof.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (cp || prof.account_type === "club_player") {
        navigate("/player/dashboard");
        return;
      }
    }
    navigate(redirectTo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !authData.user) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    await routeAfterLogin(authData.user.id);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Enter your email address first, then click 'Forgot your password?'");
      return;
    }
    setResetLoading(true);
    setError("");
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetSent(true);
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-8">
          <img src={logo} alt="Campometric" className="h-[54px] mx-auto" />
        </Link>

        <div className="rounded-xl border border-border bg-card p-8">
          <h1 className="text-2xl font-bold text-foreground mb-1 font-sans">Welcome back</h1>
          <p className="text-muted-foreground text-sm mb-6">Log in to your Campometric account.</p>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {resetSent && (
            <div className="mb-4 rounded-lg bg-success/10 border border-success/20 px-4 py-3 text-sm text-success">
              Password reset link sent! Check your email.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[hsl(157,68%,37%)] hover:bg-[hsl(157,68%,30%)] text-white font-medium h-11"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>

          <button
            onClick={handleForgotPassword}
            disabled={resetLoading}
            className="block w-full text-center text-sm text-muted-foreground hover:text-foreground mt-4 transition-colors"
          >
            {resetLoading ? "Sending..." : "Forgot your password?"}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">or</span></div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 font-medium"
            onClick={async () => {
              setError("");
              const result = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (result.error) {
                setError("Google sign-in failed. Please try again.");
                return;
              }
              if (result.redirected) return;
              navigate(redirectTo);
            }}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <p className="text-sm text-center text-muted-foreground mt-4">
            Don't have an account?{" "}
            <Link to="/club/signup" className="text-primary hover:underline font-medium">Start your free club trial</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
