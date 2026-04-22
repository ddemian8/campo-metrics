import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { isAdminEmail } from "@/hooks/useAdmin";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If already logged in as admin, jump straight in.
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) return;
      const ok = await isAdminEmail(session.user.email);
      if (ok) navigate("/admin", { replace: true });
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (authError || !data.user) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }
    const allowed = await isAdminEmail(data.user.email || "");
    if (!allowed) {
      await supabase.auth.signOut();
      setError("Access denied. This area is for administrators only.");
      setLoading(false);
      return;
    }
    navigate("/admin", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Campometric Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Restricted area — administrators only.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8">
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Admin email</label>
              <Input
                type="email"
                placeholder="admin@campometric.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
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
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              {loading ? "Signing in…" : "Sign in to Admin"}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Not an administrator? <a href="/login" className="text-primary hover:underline">Go to club login</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
