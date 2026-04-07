import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image, Keyboard, Shield, Crosshair, Swords, Goal, ChevronLeft, Check, Loader2, FileText, Calendar as CalendarIcon, Info, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, differenceInYears, subYears } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type EntryMethod = "pdf" | "screenshot" | "manual";
type Position = "GK" | "DEF" | "MID" | "FWD";
type SessionType = "match" | "training";
type MDDay = "MD-2" | "MD-1" | "MD0" | "MD+1" | "MD+2" | "other";

interface TransfermarktData {
  club: string | null;
  league: string | null;
  nationality: string | null;
  market_value: string | null;
  fetched: boolean;
}

interface FormState {
  entryMethod: EntryMethod | null;
  firstName: string;
  lastName: string;
  transfermarkt_url: string;
  transfermarkt_data: TransfermarktData;
  transfermarkt_status: "idle" | "loading" | "success" | "error";
  date_of_birth: Date | undefined;
  age_calculated: number | null;
  height_cm: string;
  weight_kg: string;
  position: Position | null;
  teamName: string;
  league: string;
  country: string;
  sessionType: SessionType | null;
  mdDay: MDDay;
  opponent: string;
  sessionDate: Date;
  gpsFile: File | null;
  manualData: {
    duration: string;
    distance: string;
    acc_ev: string;
    dec_ev: string;
    dist_sp_z4: string;
    dist_sp_z4plus: string;
    dist_sp_z5: string;
    max_sp: string;
    av_sp: string;
    sp_ev: string;
    hmld: string;
    athlete_name: string;
  };
  consent: {
    public_profile: boolean;
    leaderboard: boolean;
    terms: boolean;
  };
}

const stepVariants = {
  enter: { opacity: 0, y: 30 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const STEP_PROGRESS = [14, 28, 42, 57, 71, 85, 100];

const Analyze = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const [form, setForm] = useState<FormState>({
    entryMethod: null,
    firstName: "",
    lastName: "",
    transfermarkt_url: "",
    transfermarkt_data: { club: null, league: null, nationality: null, market_value: null, fetched: false },
    transfermarkt_status: "idle",
    date_of_birth: undefined,
    age_calculated: null,
    height_cm: "",
    weight_kg: "",
    position: null,
    teamName: "",
    league: "",
    country: "",
    sessionType: null,
    mdDay: "MD0",
    opponent: "",
    sessionDate: new Date(),
    gpsFile: null,
    manualData: {
      duration: "",
      distance: "",
      acc_ev: "",
      dec_ev: "",
      dist_sp_z4: "",
      dist_sp_z4plus: "",
      dist_sp_z5: "",
      max_sp: "",
      av_sp: "",
      sp_ev: "",
      hmld: "",
      athlete_name: "",
    },
    consent: {
      public_profile: false,
      leaderboard: false,
      terms: false,
    },
  });

  const updateConsent = useCallback((field: keyof FormState['consent'], value: boolean) => {
    setForm((prev) => ({
      ...prev,
      consent: { ...prev.consent, [field]: value },
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`consent_${field}`];
      return next;
    });
  }, []);

  const updateForm = useCallback((updates: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    setErrors({});
  }, []);

  const updateManual = useCallback((field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      manualData: { ...prev.manualData, [field]: value },
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, 7)), []);
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  // Auto-focus name input on step 2
  useEffect(() => {
    if (step === 2) setTimeout(() => nameRef.current?.focus(), 300);
  }, [step]);

  // Loading sequence
  useEffect(() => {
    if (!isLoading) return;
    const timers: NodeJS.Timeout[] = [];
    for (let i = 1; i <= 6; i++) {
      timers.push(setTimeout(() => setLoadingStep(i), i * 1200));
    }
    timers.push(
      setTimeout(() => {
        const id = crypto.randomUUID();
        navigate(`/report/${id}`);
      }, 7500)
    );
    return () => timers.forEach(clearTimeout);
  }, [isLoading, navigate]);

  // Calculate age when DOB changes
  useEffect(() => {
    if (form.date_of_birth) {
      const age = differenceInYears(new Date(), form.date_of_birth);
      setForm(prev => ({ ...prev, age_calculated: age }));
    }
  }, [form.date_of_birth]);

  const fetchTransfermarkt = useCallback(async (url: string) => {
    if (!url || !url.includes('transfermarkt.com')) return;

    setForm(prev => ({ ...prev, transfermarkt_status: "loading" }));

    try {
      const { data, error } = await supabase.functions.invoke('fetch-transfermarkt', {
        body: { url },
      });

      if (error || !data?.success) {
        setForm(prev => ({
          ...prev,
          transfermarkt_status: "error",
          transfermarkt_data: { ...prev.transfermarkt_data, fetched: false },
        }));
        return;
      }

      setForm(prev => ({
        ...prev,
        transfermarkt_status: "success",
        transfermarkt_data: {
          club: data.club,
          league: data.league,
          nationality: data.nationality,
          market_value: data.market_value,
          fetched: true,
        },
        teamName: data.club || prev.teamName,
        league: data.league || prev.league,
      }));
    } catch {
      setForm(prev => ({ ...prev, transfermarkt_status: "error" }));
    }
  }, []);

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 2) {
      if (!form.firstName.trim() || !form.lastName.trim())
        e.name = "Please enter your full name";
      if (form.transfermarkt_url && !form.transfermarkt_url.includes('transfermarkt.com'))
        e.transfermarkt = "Please paste a valid Transfermarkt profile URL (transfermarkt.com)";
    }
    if (s === 3) {
      if (!form.date_of_birth) e.dob = "Required";
      else if (form.age_calculated !== null && form.age_calculated < 14)
        e.dob = "You must be at least 14 years old to use Campometric.";
      if (!form.height_cm) e.height = "Required";
      else {
        const h = parseInt(form.height_cm);
        if (h < 140 || h > 220) e.height = "Please enter a valid height in cm (140–220)";
      }
    }
    if (s === 5) {
      if (!form.teamName.trim()) e.team = "Required";
      if (!form.league.trim()) e.league = "Required";
    }
    if (s === 7) {
      if (form.entryMethod === "manual") {
        if (!form.manualData.duration) e.duration = "Required";
        else if (!/^\d{1,3}:\d{2}$/.test(form.manualData.duration)) e.duration = "Please use mm:ss format (e.g. 08:24)";
        if (!form.manualData.distance) e.distance = "Required";
        if (!form.manualData.max_sp) e.max_sp = "Required";
        if (!form.manualData.sp_ev) e.sp_ev = "Required";
        if (!form.manualData.hmld) e.hmld = "Required";
      }
      if (!form.consent.public_profile) e.consent_public_profile = "You must accept this to generate your report and be discoverable on Campometric.";
      if (!form.consent.leaderboard) e.consent_leaderboard = "Leaderboard participation is required to use the Campometric platform.";
      if (!form.consent.terms) e.consent_terms = "Please accept the Terms of Service and Privacy Policy to continue.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = useCallback(() => {
    if (validateStep(step)) goNext();
  }, [step, form]);

  const handleSubmit = async () => {
    if (!validateStep(7)) return;
    setIsLoading(true);

    try {
      const sessionId = crypto.randomUUID();

      // Insert into sessions table
      await supabase.from('sessions').insert({
        id: sessionId,
        first_name: form.firstName,
        last_name: form.lastName,
        date_of_birth: form.date_of_birth ? format(form.date_of_birth, 'yyyy-MM-dd') : null,
        age_calculated: form.age_calculated,
        height_cm: form.height_cm ? parseInt(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseInt(form.weight_kg) : null,
        position: form.position,
        team_name: form.teamName,
        league: form.league,
        country: form.country || null,
        transfermarkt_url: form.transfermarkt_url || null,
        transfermarkt_club: form.transfermarkt_data.club,
        transfermarkt_league: form.transfermarkt_data.league,
        session_type: form.sessionType,
        md_day: form.mdDay,
        opponent: form.opponent || null,
        session_date: format(form.sessionDate, 'yyyy-MM-dd'),
        entry_method: form.entryMethod,
        duration: form.manualData.duration || null,
        distance: form.manualData.distance ? parseFloat(form.manualData.distance) : null,
        acc_ev: form.manualData.acc_ev ? parseFloat(form.manualData.acc_ev) : null,
        dec_ev: form.manualData.dec_ev ? parseFloat(form.manualData.dec_ev) : null,
        dist_sp_z4: form.manualData.dist_sp_z4 ? parseFloat(form.manualData.dist_sp_z4) : null,
        dist_sp_z4plus: form.manualData.dist_sp_z4plus ? parseFloat(form.manualData.dist_sp_z4plus) : null,
        dist_sp_z5: form.manualData.dist_sp_z5 ? parseFloat(form.manualData.dist_sp_z5) : null,
        max_sp: form.manualData.max_sp ? parseFloat(form.manualData.max_sp) : null,
        av_sp: form.manualData.av_sp ? parseFloat(form.manualData.av_sp) : null,
        sp_ev: form.manualData.sp_ev ? parseFloat(form.manualData.sp_ev) : null,
        hmld: form.manualData.hmld ? parseFloat(form.manualData.hmld) : null,
        athlete_name: form.manualData.athlete_name || null,
        consent_public_profile: form.consent.public_profile,
        consent_leaderboard: form.consent.leaderboard,
        consent_terms: form.consent.terms,
        consent_timestamp: new Date().toISOString(),
        status: 'processing',
      } as any);

      // Insert into players table
      await supabase.from('players').insert({
        first_name: form.firstName,
        last_name: form.lastName,
        date_of_birth: form.date_of_birth ? format(form.date_of_birth, 'yyyy-MM-dd') : null,
        age_calculated: form.age_calculated,
        height_cm: form.height_cm ? parseInt(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseInt(form.weight_kg) : null,
        position: form.position,
        team_name: form.teamName,
        league: form.league,
        country: form.country || null,
        transfermarkt_url: form.transfermarkt_url || null,
        transfermarkt_club: form.transfermarkt_data.club,
        transfermarkt_league: form.transfermarkt_data.league,
      } as any);

      // Navigate happens via loading effect
    } catch (err) {
      console.error('Error saving session:', err);
    }
  };

  const consentCheckboxes = [
    {
      id: "public_profile" as const,
      label: "I agree to make my performance data visible to Agents, Clubs and Scouts on the Campometric platform.",
      description: "Your name, position, team and GPS metrics will be visible to verified scouts and agents searching the Campometric database.",
      errorKey: "consent_public_profile",
    },
    {
      id: "leaderboard" as const,
      label: "I agree to appear on the public Campometric Leaderboard ranked by physical performance metrics.",
      description: "Your name, position, league and key metrics (distance, max speed, sprints) will appear on the public leaderboard visible to anyone visiting campometric.com.",
      errorKey: "consent_leaderboard",
    },
    {
      id: "terms" as const,
      label: "__terms__",
      description: "You must be at least 16 years old to use Campometric. If you are under 18, please ensure you have parental consent.",
      errorKey: "consent_terms",
    },
  ];

  const renderConsentSection = () => (
    <div className="max-w-2xl mx-auto mt-8 text-left">
      <div className="h-px bg-muted-foreground/20 mb-6" />
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-4">
        Data Visibility & Consent
      </p>
      <div className="flex items-start gap-3 rounded-lg border-l-[3px] border-primary bg-[#0d2a4a] p-3 mb-5">
        <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#a8c0e0] leading-relaxed">
          Your data is protected. Campometric stores your information securely and never sells your personal data to third parties. You can withdraw consent and delete your data at any time from your account settings.
        </p>
      </div>
      <div className="space-y-3.5">
        {consentCheckboxes.map((cb) => (
          <div key={cb.id}>
            <button
              type="button"
              onClick={() => updateConsent(cb.id, !form.consent[cb.id])}
              className="flex items-start gap-3 w-full text-left group"
            >
              <div
                className={cn(
                  "mt-0.5 h-[18px] w-[18px] shrink-0 rounded border flex items-center justify-center transition-all",
                  form.consent[cb.id]
                    ? "bg-primary border-primary"
                    : errors[cb.errorKey]
                      ? "border-destructive bg-transparent"
                      : "border-[#2a3a52] bg-transparent"
                )}
              >
                {form.consent[cb.id] && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <div className="flex-1">
                {cb.id === "terms" ? (
                  <p className="text-[13px] text-foreground leading-relaxed">
                    I have read and agree to the Campometric{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary underline-offset-2 hover:underline">Terms of Service</a>{" "}
                    and{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary underline-offset-2 hover:underline">Privacy Policy</a>.
                  </p>
                ) : (
                  <p className="text-[13px] text-foreground leading-relaxed">{cb.label}</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{cb.description}</p>
              </div>
            </button>
            {errors[cb.errorKey] && (
              <p className="text-[11px] text-destructive mt-1 ml-[30px]">{errors[cb.errorKey]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (step === 7) handleSubmit();
      else handleContinue();
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) updateForm({ gpsFile: file });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) updateForm({ gpsFile: file });
  };

  // Loading screen
  if (isLoading) {
    const lines = [
      "Reading your GPS file...",
      "Identifying your session data...",
      "Normalising metrics to 90 minutes...",
      "Comparing with position benchmarks...",
      "Generating your AI narrative...",
      "Your report is ready.",
    ];
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="mb-12">
          <span className="text-2xl font-bold tracking-tight">
            <span className="text-foreground">Campo</span>
            <span className="text-primary">metric</span>
          </span>
        </div>
        <div className="space-y-4 w-full max-w-md">
          {lines.map((line, i) => {
            const isActive = loadingStep === i;
            const isDone = loadingStep > i;
            const isVisible = loadingStep >= i;
            const isLast = i === lines.length - 1;
            if (!isVisible) return null;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex items-center gap-3 text-base",
                  isLast && isDone ? "text-success font-bold" : isDone ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {isDone ? (
                  <Check className="h-5 w-5 text-success shrink-0" />
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                ) : null}
                <span>{line}</span>
              </motion.div>
            );
          })}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 7, ease: "linear" }}
          />
        </div>
      </div>
    );
  }

  const maxDob = subYears(new Date(), 14);
  const minDob = subYears(new Date(), 50);

  return (
    <div className="min-h-screen bg-background flex flex-col" onKeyDown={handleKeyDown}>
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${STEP_PROGRESS[step - 1]}%` }}
        />
      </div>

      {/* Back button + step counter */}
      <div className="fixed top-3 left-0 right-0 z-40 flex items-center justify-between px-4 sm:px-8">
        {step > 1 ? (
          <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        ) : (
          <div />
        )}
        <span className="text-xs text-muted-foreground">Step {step} of 7</span>
      </div>

      {/* Steps */}
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl mx-auto text-center"
          >
            {/* STEP 1 */}
            {step === 1 && (
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-10">
                  How would you like to add your GPS data?
                </h1>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
                  {([
                    { id: "pdf" as EntryMethod, icon: Upload, title: "Upload team PDF", sub: "AI finds your row automatically", badge: "Recommended" },
                    { id: "screenshot" as EntryMethod, icon: Image, title: "Send a screenshot", sub: "OCR reads your stats image" },
                    { id: "manual" as EntryMethod, icon: Keyboard, title: "Enter manually", sub: "Fill in your GPS fields directly" },
                  ]).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        updateForm({ entryMethod: opt.id });
                        setTimeout(goNext, 400);
                      }}
                      className={cn(
                        "relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:border-primary hover:bg-primary/5",
                        form.entryMethod === opt.id ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      {opt.badge && (
                        <Badge className="absolute -top-2.5 right-2 bg-primary text-primary-foreground text-[10px]">
                          {opt.badge}
                        </Badge>
                      )}
                      <opt.icon className="h-8 w-8 text-primary" />
                      <span className="font-semibold text-foreground text-sm">{opt.title}</span>
                      <span className="text-xs text-muted-foreground">{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2 — Name + Transfermarkt */}
            {step === 2 && (
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-10">What's your name?</h1>
                <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <Input
                    ref={nameRef}
                    placeholder="First name"
                    value={form.firstName}
                    onChange={(e) => updateForm({ firstName: e.target.value })}
                    className="text-center text-lg h-12 bg-secondary border-border"
                  />
                  <Input
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={(e) => updateForm({ lastName: e.target.value })}
                    className="text-center text-lg h-12 bg-secondary border-border"
                  />
                </div>
                {errors.name && <p className="text-destructive text-sm mt-3">{errors.name}</p>}

                {/* Transfermarkt field */}
                <div className="max-w-md mx-auto mt-6 text-left">
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-[13px] font-medium text-foreground">Transfermarkt profile</label>
                    <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded-full">Optional</span>
                    <span className="text-[10px] bg-[#0d3320] text-[#1db954] px-2 py-0.5 rounded-full font-medium">Auto-fill ✓</span>
                  </div>
                  <Input
                    placeholder="https://www.transfermarkt.com/your-name/profil/spieler/..."
                    value={form.transfermarkt_url}
                    onChange={(e) => updateForm({ transfermarkt_url: e.target.value })}
                    onBlur={() => {
                      if (form.transfermarkt_url && form.transfermarkt_url.includes('transfermarkt.com')) {
                        fetchTransfermarkt(form.transfermarkt_url);
                      }
                    }}
                    className="text-sm h-11 bg-secondary border-border"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    If you have a Transfermarkt profile, paste the link here. We'll automatically fill in your team and league.
                  </p>
                  {errors.transfermarkt && <p className="text-[11px] text-destructive mt-1">{errors.transfermarkt}</p>}

                  {form.transfermarkt_status === "loading" && (
                    <div className="flex items-center gap-2 mt-2 text-[12px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Fetching your profile...
                    </div>
                  )}
                  {form.transfermarkt_status === "success" && (
                    <div className="flex items-start gap-2 rounded-lg bg-[#0d3320] border border-[#1db954]/30 p-3 mt-2">
                      <Check className="h-4 w-4 text-[#1db954] shrink-0 mt-0.5" />
                      <p className="text-[12px] text-[#1db954]">
                        Profile found! Team and league have been filled in automatically.
                      </p>
                    </div>
                  )}
                  {form.transfermarkt_status === "error" && (
                    <div className="flex items-start gap-2 rounded-lg bg-[#2a1f00] border border-amber-500/30 p-3 mt-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[12px] text-amber-300">
                        We couldn't find this Transfermarkt profile. You can still continue and fill in your team manually.
                      </p>
                    </div>
                  )}
                </div>

                <Button onClick={handleContinue} className="mt-8 h-12 px-8 text-base">Continue →</Button>
              </div>
            )}

            {/* STEP 3 — DOB, Height, Weight */}
            {step === 3 && (
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-10">
                  Tell us a bit more about you
                </h1>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto text-left">
                  {/* Date of Birth */}
                  <div className="rounded-lg border border-border/50 bg-[#0d1f35] p-3.5 focus-within:border-primary transition-all">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <label className="text-[13px] font-medium text-foreground">Date of birth</label>
                      <span className="text-red-500 text-xs">•</span>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start text-left font-normal h-10 px-0 hover:bg-transparent",
                            !form.date_of_birth && "text-muted-foreground/40"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.date_of_birth ? format(form.date_of_birth, "dd / MM / yyyy") : "DD / MM / YYYY"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.date_of_birth}
                          onSelect={(d) => d && updateForm({ date_of_birth: d })}
                          disabled={(date) => date > maxDob || date < minDob}
                          defaultMonth={maxDob}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    {form.date_of_birth && form.age_calculated !== null && (
                      <p className="text-[13px] text-[#1db954] font-bold mt-1">
                        Age: {form.age_calculated} years old
                      </p>
                    )}
                    {errors.dob && <p className="text-[11px] text-destructive mt-1">{errors.dob}</p>}
                  </div>

                  {/* Height */}
                  <div className="rounded-lg border border-border/50 bg-[#0d1f35] p-3.5 focus-within:border-primary transition-all">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <label className="text-[13px] font-medium text-foreground">Height</label>
                      <span className="text-red-500 text-xs">•</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2">cm</p>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={140}
                      max={220}
                      placeholder="e.g. 181"
                      value={form.height_cm}
                      onChange={(e) => updateForm({ height_cm: e.target.value })}
                      className="w-full bg-transparent text-foreground text-base outline-none placeholder:text-muted-foreground/40"
                    />
                    {errors.height && <p className="text-[11px] text-destructive mt-1">{errors.height}</p>}
                  </div>

                  {/* Weight (optional) */}
                  <div className="rounded-lg border border-border/50 bg-[#0d1f35] p-3.5 focus-within:border-primary transition-all">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <label className="text-[13px] font-medium text-foreground">Weight</label>
                      <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded-full">Optional</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2">kg</p>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={40}
                      max={130}
                      placeholder="e.g. 75"
                      value={form.weight_kg}
                      onChange={(e) => updateForm({ weight_kg: e.target.value })}
                      className="w-full bg-transparent text-foreground text-base outline-none placeholder:text-muted-foreground/40"
                    />
                    <p className="text-[11px] text-muted-foreground mt-2">Used only for AI intensity normalisation. Not shown publicly.</p>
                  </div>
                </div>
                <Button onClick={handleContinue} className="mt-8 h-12 px-8 text-base">Continue →</Button>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-10">What position do you play?</h1>
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  {([
                    { id: "GK" as Position, label: "Goalkeeper", icon: Goal },
                    { id: "DEF" as Position, label: "Defender", icon: Shield },
                    { id: "MID" as Position, label: "Midfielder", icon: Crosshair },
                    { id: "FWD" as Position, label: "Forward", icon: Swords },
                  ]).map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => {
                        updateForm({ position: pos.id });
                        setTimeout(goNext, 400);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all hover:border-primary hover:bg-primary/5",
                        form.position === pos.id ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <pos.icon className="h-8 w-8 text-primary" />
                      <span className="font-semibold text-foreground">{pos.label}</span>
                      <span className="text-xs text-muted-foreground">{pos.id}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-6">
                  Your position changes the AI benchmarks used in your report
                </p>
              </div>
            )}

            {/* STEP 5 — Team, League, Country */}
            {step === 5 && (
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                  What team and league do you play in?
                </h1>

                {/* Transfermarkt auto-fill banner */}
                {form.transfermarkt_data.fetched && (
                  <div className="flex items-start gap-3 rounded-lg border-l-[3px] border-primary bg-[#0d2a4a] p-3 mb-6 max-w-md mx-auto text-left">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[12px] text-[#a8c0e0]">Auto-filled from your Transfermarkt profile</p>
                  </div>
                )}

                <div className="flex flex-col gap-4 max-w-md mx-auto">
                  <div>
                    {form.transfermarkt_data.fetched && form.teamName && (
                      <span className="text-[10px] text-[#1db954] bg-[#0d3320] px-2 py-0.5 rounded-full mb-1 inline-block">Auto-filled from Transfermarkt</span>
                    )}
                    <div className="relative">
                      <Input
                        placeholder="e.g. FC Petrocub, Dacia Buiucani, FC Porto..."
                        value={form.teamName}
                        onChange={(e) => updateForm({ teamName: e.target.value })}
                        className="text-center text-lg h-12 bg-secondary border-border"
                      />
                      {form.transfermarkt_data.fetched && form.teamName && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#1db954]" />
                      )}
                    </div>
                    {errors.team && <p className="text-destructive text-xs mt-1">{errors.team}</p>}
                  </div>
                  <div>
                    {form.transfermarkt_data.fetched && form.league && (
                      <span className="text-[10px] text-[#1db954] bg-[#0d3320] px-2 py-0.5 rounded-full mb-1 inline-block">Auto-filled from Transfermarkt</span>
                    )}
                    <div className="relative">
                      <Input
                        placeholder="e.g. Divizia Națională, Liga 1, Primeira Liga..."
                        value={form.league}
                        onChange={(e) => updateForm({ league: e.target.value })}
                        className="text-center text-lg h-12 bg-secondary border-border"
                      />
                      {form.transfermarkt_data.fetched && form.league && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#1db954]" />
                      )}
                    </div>
                    {errors.league && <p className="text-destructive text-xs mt-1">{errors.league}</p>}
                  </div>

                  {/* Country field */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-[13px] font-medium text-foreground text-left">Country</label>
                      <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded-full">Optional</span>
                    </div>
                    <Input
                      placeholder="e.g. Moldova, Romania, Portugal..."
                      value={form.country}
                      onChange={(e) => updateForm({ country: e.target.value })}
                      className="text-center text-lg h-12 bg-secondary border-border"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1 text-left">Helps scouts filter players by country on the leaderboard.</p>
                  </div>
                </div>
                <Button onClick={handleContinue} className="mt-8 h-12 px-8 text-base">Continue →</Button>
              </div>
            )}

            {/* STEP 6 */}
            {step === 6 && (
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-10">
                  What type of session is this?
                </h1>
                <div className="flex gap-4 justify-center mb-6">
                  {([
                    { id: "match" as SessionType, label: "Match", icon: "⚽" },
                    { id: "training" as SessionType, label: "Training", icon: "🏋️" },
                  ]).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => updateForm({ sessionType: s.id })}
                      className={cn(
                        "flex flex-col items-center gap-3 p-6 px-10 rounded-xl border-2 transition-all hover:border-primary hover:bg-primary/5",
                        form.sessionType === s.id ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <span className="text-3xl">{s.icon}</span>
                      <span className="font-semibold text-foreground">{s.label}</span>
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {form.sessionType && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      {form.sessionType === "match" && (
                        <div className="space-y-4 max-w-md mx-auto mt-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">When was the match?</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                              {(["MD-2", "MD-1", "MD0", "MD+1", "MD+2", "other"] as MDDay[]).map((md) => (
                                <button
                                  key={md}
                                  onClick={() => updateForm({ mdDay: md })}
                                  className={cn(
                                    "px-4 py-2 rounded-full text-sm font-medium border transition-all",
                                    form.mdDay === md
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                                  )}
                                >
                                  {md}
                                </button>
                              ))}
                            </div>
                          </div>
                          <Input
                            placeholder="Opponent (optional) e.g. FC Milsami"
                            value={form.opponent}
                            onChange={(e) => updateForm({ opponent: e.target.value })}
                            className="text-center h-12 bg-secondary border-border"
                          />
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full h-12 justify-center gap-2 bg-secondary border-border">
                                <CalendarIcon className="h-4 w-4" />
                                {format(form.sessionDate, "PPP")}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="center">
                              <Calendar
                                mode="single"
                                selected={form.sessionDate}
                                onSelect={(d) => d && updateForm({ sessionDate: d })}
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                      {form.sessionType === "training" && (
                        <div className="space-y-4 max-w-md mx-auto mt-4">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full h-12 justify-center gap-2 bg-secondary border-border">
                                <CalendarIcon className="h-4 w-4" />
                                {format(form.sessionDate, "PPP")}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="center">
                              <Calendar
                                mode="single"
                                selected={form.sessionDate}
                                onSelect={(d) => d && updateForm({ sessionDate: d })}
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                      <Button onClick={handleContinue} className="mt-6 h-12 px-8 text-base">Continue →</Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* STEP 7 */}
            {step === 7 && (
              <div>
                {/* Logo */}
                <div className="mb-8">
                  <span className="text-2xl font-bold tracking-tight">
                    <span className="text-foreground">Campo</span>
                    <span className="text-primary">metric</span>
                  </span>
                </div>

                {form.entryMethod === "manual" ? (
                  <>
                    <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">Enter your GPS data</h1>

                    <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 max-w-2xl mx-auto mb-6 text-left">
                      <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        You can find these values in your GPS platform export. Column names may vary slightly by platform (STATSports, Catapult, gpexe).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                      {([
                        { key: "duration", label: "Duration", unit: "mm:ss", type: "text", ph: "e.g. 08:24", required: true },
                        { key: "dist_sp_z5", label: "Dist / Speed Zone 5", unit: "m", type: "number", ph: "e.g. 0.0", required: false },
                        { key: "distance", label: "Distance", unit: "m", type: "number", ph: "e.g. 1045.9", required: true },
                        { key: "max_sp", label: "Max Speed", unit: "km/h", type: "number", ph: "e.g. 24.1", required: true },
                        { key: "acc_ev", label: "Acceleration events", unit: "count", type: "number", ph: "e.g. 12", required: false },
                        { key: "av_sp", label: "Average Speed", unit: "km/h", type: "number", ph: "e.g. 7.5", required: false },
                        { key: "dec_ev", label: "Deceleration events", unit: "count", type: "number", ph: "e.g. 8", required: false },
                        { key: "sp_ev", label: "Speed events", unit: "count", type: "number", ph: "e.g. 7", required: true },
                        { key: "dist_sp_z4", label: "Dist / Speed Zone 4", unit: "m", type: "number", ph: "e.g. 54.0", required: false },
                        { key: "hmld", label: "HMLD", unit: "m", type: "number", ph: "e.g. 173.0", required: true },
                        { key: "dist_sp_z4plus", label: "Dist / Speed Zone 4+", unit: "m", type: "number", ph: "e.g. 54.0", required: false },
                        { key: "athlete_name", label: "Athlete name", unit: "as shown in GPS file", type: "text", ph: "e.g. Rotaru N.", required: false },
                      ] as const).map((f) => (
                        <div
                          key={f.key}
                          className={cn(
                            "rounded-lg border border-border/50 bg-[#0d1f35] p-3.5 transition-all focus-within:border-primary"
                          )}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <label className="text-[13px] font-medium text-foreground">{f.label}</label>
                            {f.required && <span className="text-red-500 text-xs">•</span>}
                            {!f.required && (
                              <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded-full">Optional</span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mb-2">{f.unit}</p>
                          <input
                            type={f.type}
                            inputMode={f.type === "number" ? "decimal" : undefined}
                            min={f.type === "number" ? 0 : undefined}
                            step={f.type === "number" ? "any" : undefined}
                            placeholder={f.ph}
                            value={(form.manualData as any)[f.key]}
                            onChange={(e) => updateManual(f.key, e.target.value)}
                            className="w-full bg-transparent text-foreground text-base outline-none placeholder:text-muted-foreground/40"
                          />
                          {errors[f.key] && (
                            <p className="text-[11px] text-red-500 mt-1.5">{errors[f.key]}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {renderConsentSection()}

                    {(() => {
                      const m = form.manualData;
                      const allRequiredFilled = m.duration && m.distance && m.max_sp && m.sp_ev && m.hmld;
                      const allConsent = form.consent.public_profile && form.consent.leaderboard && form.consent.terms;
                      const canSubmit = allRequiredFilled && allConsent;
                      return (
                        <>
                          <Button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={cn(
                              "mt-6 h-12 px-8 text-base w-full max-w-2xl",
                              !canSubmit && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            Generate my report →
                          </Button>
                          {!canSubmit && (
                            <p className="text-[11px] text-muted-foreground mt-2 text-center">
                              Complete all required fields and accept the consents above to continue.
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-8">
                      {form.entryMethod === "pdf" ? "Upload your team PDF" : "Upload your screenshot"}
                    </h1>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleFileDrop}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-12 max-w-lg mx-auto transition-all cursor-pointer",
                        dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                        form.gpsFile && "border-success bg-success/5"
                      )}
                      onClick={() => document.getElementById("file-input")?.click()}
                    >
                      <input
                        id="file-input"
                        type="file"
                        accept={form.entryMethod === "pdf" ? ".pdf" : ".jpg,.jpeg,.png,.webp"}
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      {form.gpsFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <Check className="h-6 w-6 text-success" />
                          <span className="text-foreground font-medium">{form.gpsFile.name}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <FileText className="h-12 w-12 text-muted-foreground" />
                          <p className="text-foreground font-medium">
                            {form.entryMethod === "pdf" ? "Drop your GPS PDF here" : "Drop your screenshot here"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {form.entryMethod === "pdf"
                              ? "Works with STATSports, Catapult, gpexe and more"
                              : "Accepts JPG, PNG, WebP"}
                          </p>
                          <p className="text-xs text-primary">click to browse files</p>
                        </div>
                      )}
                    </div>
                    {renderConsentSection()}

                    {(() => {
                      const allConsent = form.consent.public_profile && form.consent.leaderboard && form.consent.terms;
                      const canSubmit = form.gpsFile && allConsent;
                      return (
                        <>
                          <Button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={cn(
                              "mt-6 h-12 px-8 text-base",
                              !canSubmit && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            Analyse my session →
                          </Button>
                          {!canSubmit && (
                            <p className="text-[11px] text-muted-foreground mt-2 text-center">
                              Complete all required fields and accept the consents above to continue.
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Analyze;
