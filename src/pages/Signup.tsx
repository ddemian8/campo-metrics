import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().split(/\s+/).length < 2) e.fullName = "Please enter your full name (first and last).";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Please enter a valid email address.";
    if (!password || password.length < 6) e.password = "Password must be at least 6 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already")) {
          setGeneralError("An account with this email already exists.");
        } else {
          setGeneralError(error.message);
        }
        setLoading(false);
        return;
      }

      // Update profile with referral code if provided
      if (data.user && referralCode.trim()) {
        await supabase
          .from("profiles")
          .update({ referred_by: referralCode.trim() })
          .eq("user_id", data.user.id);
      }

      navigate(redirectTo);
    } catch {
      setGeneralError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="block text-center mb-8">
          <span className="text-2xl font-bold tracking-tight">
            <span className="text-foreground">Campo</span>
            <span className="text-primary">metric</span>
          </span>
        </Link>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-8">
          {redirectTo !== "/dashboard" && (
            <div className="mb-4 rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-foreground">
              <p className="font-medium">Create your free account to start analyzing your GPS data.</p>
              <p className="text-xs text-muted-foreground mt-1">It takes 30 seconds. No credit card required.</p>
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground mb-1 font-sans">Create your free account</h1>
          <p className="text-muted-foreground text-sm mb-6">Start analyzing your GPS performance data today.</p>

          {generalError && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
              <Input
                placeholder="e.g. Alexandru Popescu"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={errors.fullName ? "border-destructive" : ""}
              />
              {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={errors.password ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Referral Code</label>
              <Input
                placeholder="Enter code (optional)"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Have a friend on Campometric? Enter their code.</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[hsl(157,68%,37%)] hover:bg-[hsl(157,68%,30%)] text-white font-medium h-11"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              {loading ? "Creating account..." : "Create free account"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            By creating an account, you agree to our{" "}
            <a href="/terms" className="underline hover:text-foreground">Terms of Service</a> and{" "}
            <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
          </p>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">or</span></div>
          </div>

          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
