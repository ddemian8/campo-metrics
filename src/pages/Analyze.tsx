import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image, Keyboard, Shield, Crosshair, Swords, Goal, ChevronLeft, Check, Loader2, FileText, Info, AlertTriangle, Sparkles, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, differenceInYears } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type EntryMethod = "pdf" | "screenshot" | "manual";
type PositionZone = "GK" | "DEF" | "MID" | "FWD";
type PositionSpecific = "GK" | "CB" | "RB" | "LB" | "RWB" | "LWB" | "CDM" | "CM" | "CAM" | "RM" | "LM" | "ST" | "SS" | "RW" | "LW" | "CF";
type SessionType = "match" | "training";
type MDDay = "MD-3" | "MD-2" | "MD-1" | "MD0" | "MD+1" | "MD+2" | "MD+3";

const SUB_POSITIONS: Record<PositionZone, { id: PositionSpecific; label: string }[]> = {
  GK: [{ id: "GK", label: "Goalkeeper" }],
  DEF: [
    { id: "CB", label: "Central Back" },
    { id: "RB", label: "Right Back" },
    { id: "LB", label: "Left Back" },
    { id: "RWB", label: "Right Wing-back" },
    { id: "LWB", label: "Left Wing-back" },
  ],
  MID: [
    { id: "CDM", label: "Defensive Mid" },
    { id: "CM", label: "Central Mid" },
    { id: "CAM", label: "Attacking Mid" },
    { id: "RM", label: "Right Mid" },
    { id: "LM", label: "Left Mid" },
  ],
  FWD: [
    { id: "ST", label: "Striker" },
    { id: "SS", label: "Second Striker" },
    { id: "RW", label: "Right Winger" },
    { id: "LW", label: "Left Winger" },
    { id: "CF", label: "Centre Forward" },
  ],
};

interface TransfermarktData {
  club: string | null;
  league: string | null;
  nationality: string | null;
  market_value: string | null;
  fetched: boolean;
}

interface FormState {
  entryMethod: EntryMethod | null;
  fullName: string;
  transfermarkt_url: string;
  transfermarkt_data: TransfermarktData;
  transfermarkt_status: "idle" | "loading" | "success" | "error";
  dob_day: string;
  dob_month: string;
  dob_year: string;
  date_of_birth: string; // YYYY-MM-DD
  age_calculated: number | null;
  height_cm: string;
  weight_kg: string;
  position: PositionZone | null;
  positionSpecific: PositionSpecific | null;
  teamName: string;
  league: string;
  country: string;
  sessionType: SessionType | null;
  mdDay: MDDay;
  opponent: string;
  session_day: string;
  session_month: string;
  session_year: string;
  sessionDate: string; // YYYY-MM-DD
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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const now = new Date();
const currentYear = now.getFullYear();

function getDaysInMonth(month: number, year: number): number {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

function isValidTransfermarkt(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("transfermarkt");
  } catch {
    return false;
  }
}

const Analyze = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const sessionIdRef = useRef<string>("");

  const todayDay = String(now.getDate()).padStart(2, "0");
  const todayMonth = String(now.getMonth() + 1);
  const todayYear = String(currentYear);

  const [form, setForm] = useState<FormState>({
    entryMethod: null,
    fullName: "",
    transfermarkt_url: "",
    transfermarkt_data: { club: null, league: null, nationality: null, market_value: null, fetched: false },
    transfermarkt_status: "idle",
    dob_day: "",
    dob_month: "",
    dob_year: "",
    date_of_birth: "",
    age_calculated: null,
    height_cm: "",
    weight_kg: "",
    position: null,
    positionSpecific: null,
    teamName: "",
    league: "",
    country: "",
    sessionType: null,
    mdDay: "MD0",
    opponent: "",
    session_day: todayDay,
    session_month: todayMonth,
    session_year: todayYear,
    sessionDate: format(now, "yyyy-MM-dd"),
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
    for (let i = 1; i <= 7; i++) {
      timers.push(setTimeout(() => setLoadingStep(i), i * 1200));
    }
    timers.push(
      setTimeout(() => {
        navigate(`/report/${sessionIdRef.current}`);
      }, 8700)
    );
    return () => timers.forEach(clearTimeout);
  }, [isLoading, navigate]);

  // Calculate DOB and age when dropdowns change
  useEffect(() => {
    const { dob_day, dob_month, dob_year } = form;
    if (dob_day && dob_month && dob_year) {
      const y = parseInt(dob_year);
      const m = parseInt(dob_month);
      const d = parseInt(dob_day);
      const maxD = getDaysInMonth(m, y);
      if (d > maxD) {
        setErrors(prev => ({ ...prev, dob: "This date doesn't exist — please check the day" }));
        return;
      }
      const dateStr = `${dob_year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dateObj = new Date(y, m - 1, d);
      const age = differenceInYears(new Date(), dateObj);
      setForm(prev => ({ ...prev, date_of_birth: dateStr, age_calculated: age }));
    }
  }, [form.dob_day, form.dob_month, form.dob_year]);

  // Calculate session date from dropdowns
  useEffect(() => {
    const { session_day, session_month, session_year } = form;
    if (session_day && session_month && session_year) {
      const dateStr = `${session_year}-${String(parseInt(session_month)).padStart(2, "0")}-${String(parseInt(session_day)).padStart(2, "0")}`;
      setForm(prev => ({ ...prev, sessionDate: dateStr }));
    }
  }, [form.session_day, form.session_month, form.session_year]);

  const fetchTransfermarkt = useCallback(async (url: string) => {
    if (!url || !isValidTransfermarkt(url)) return;

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

  const splitName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    return { firstName, lastName };
  };

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 2) {
      if (!form.fullName.trim()) e.name = "Please enter your full name";
      else if (form.fullName.trim().split(/\s+/).length < 2) e.name = "Please enter both your first and last name";
      else if (!/^[\p{L}\s'-]+$/u.test(form.fullName.trim())) e.name = "Name can only contain letters";
      if (form.transfermarkt_url && !isValidTransfermarkt(form.transfermarkt_url))
        e.transfermarkt = "Please paste a valid Transfermarkt profile link (any country domain is accepted)";
    }
    if (s === 3) {
      if (!form.dob_day || !form.dob_month || !form.dob_year) e.dob = "Required";
      else {
        const m = parseInt(form.dob_month);
        const d = parseInt(form.dob_day);
        const y = parseInt(form.dob_year);
        const maxD = getDaysInMonth(m, y);
        if (d > maxD) e.dob = "This date doesn't exist — please check the day";
        else if (form.age_calculated !== null) {
          if (form.age_calculated < 14) e.dob = "You must be at least 14 years old to use Campometric";
          else if (form.age_calculated > 50) e.dob = "Please check your date of birth";
        }
      }
      if (!form.height_cm) e.height = "Please enter your height";
      else {
        const h = parseFloat(form.height_cm);
        if (isNaN(h)) e.height = "Please enter a valid number in cm";
        else if (h < 150) e.height = "Minimum height is 150 cm — please check your entry";
        else if (h > 210) e.height = "Maximum height is 210 cm — please check your entry";
      }
      if (form.weight_kg) {
        const w = parseFloat(form.weight_kg);
        if (isNaN(w)) e.weight = "Please enter a valid number in kg";
        else if (w < 50) e.weight = "Minimum weight is 50 kg — please check your entry";
        else if (w > 120) e.weight = "Maximum weight is 120 kg — please check your entry";
      }
    }
    if (s === 5) {
      if (!form.teamName.trim()) e.team = "Required";
      if (!form.league.trim()) e.league = "Required";
    }
    if (s === 6) {
      if (!form.sessionType) e.sessionType = "Required";
      if (form.sessionType === "training" && form.mdDay === "MD0") e.mdDay = "Please select an MD day";
      if (!form.session_day || !form.session_month || !form.session_year) e.sessionDate = "Required";
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

  const [extractionError, setExtractionError] = useState<string | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:...;base64, prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    if (!validateStep(7)) return;
    setIsLoading(true);
    setExtractionError(null);

    try {
      const sessionId = crypto.randomUUID();
      sessionIdRef.current = sessionId;
      const { firstName, lastName } = splitName(form.fullName);

      let gpsMetrics: Record<string, any> = {};

      // For PDF or screenshot, extract GPS data from the file first
      if ((form.entryMethod === "pdf" || form.entryMethod === "screenshot") && form.gpsFile) {
        try {
          const base64 = await fileToBase64(form.gpsFile);
          const { data: extractResult, error: extractError } = await supabase.functions.invoke("extract-gps-data", {
            body: {
              fileBase64: base64,
              fileType: form.entryMethod,
              mimeType: form.gpsFile.type,
            },
          });

          if (extractError || !extractResult?.success) {
            // Extraction failed — redirect to manual entry with data preserved
            setIsLoading(false);
            setExtractionError(
              "We couldn't read your file automatically. Please enter your data manually instead."
            );
            updateForm({ entryMethod: "manual" });
            return;
          }

          // Map extracted data to our GPS metrics format
          const ext = extractResult.data;
          gpsMetrics = {
            duration: ext.duration || null,
            distance: ext.distance || null,
            acc_ev: ext.acc_ev || null,
            dec_ev: ext.dec_ev || null,
            dist_sp_z4: ext.dist_sp_z4 || null,
            dist_sp_z4plus: ext.dist_sp_z4plus || null,
            dist_sp_z5: ext.dist_sp_z5 || null,
            max_sp: ext.max_sp || null,
            av_sp: ext.av_sp || null,
            sp_ev: ext.sp_ev || null,
            hmld: ext.hmld || null,
            athlete_name: ext.athlete_name || null,
            platform_detected: ext.platform_detected || null,
            extraction_method: form.entryMethod,
            metrics_found: extractResult.metricsFound,
          };
        } catch (err) {
          console.error("File extraction error:", err);
          setIsLoading(false);
          setExtractionError(
            "We couldn't read your file automatically. Please enter your data manually instead."
          );
          updateForm({ entryMethod: "manual" });
          return;
        }
      } else {
        // Manual entry
        gpsMetrics = {
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
          extraction_method: "manual",
        };
      }

      const anonymousToken = crypto.randomUUID();
      await supabase.from('anonymous_sessions').insert({
        id: sessionId,
        anonymous_token: anonymousToken,
        session_type: form.sessionType || 'match',
        session_date: form.sessionDate || null,
        training_day: form.mdDay || null,
        input_method: form.entryMethod || 'manual',
        player_name: form.fullName,
        position: form.position || null,
        position_specific: form.positionSpecific || null,
        opponent: form.opponent || null,
        gps_data: {
          position_zone: form.position || null,
          position_specific: form.positionSpecific || null,
          first_name: firstName,
          last_name: lastName,
          date_of_birth: form.date_of_birth || null,
          age_calculated: form.age_calculated,
          height_cm: form.height_cm ? parseInt(form.height_cm) : null,
          weight_kg: form.weight_kg ? parseInt(form.weight_kg) : null,
          team_name: form.teamName || null,
          league: form.league || null,
          country: form.country || null,
          transfermarkt_url: form.transfermarkt_url || null,
          transfermarkt_club: form.transfermarkt_data.club,
          transfermarkt_league: form.transfermarkt_data.league,
          ...gpsMetrics,
          consent_public_profile: form.consent.public_profile,
          consent_leaderboard: form.consent.leaderboard,
          consent_terms: form.consent.terms,
          consent_timestamp: new Date().toISOString(),
        },
        status: 'processing',
      } as any);
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

  // Render 3-part date picker
  const renderDateDropdowns = (
    dayKey: "dob_day" | "session_day",
    monthKey: "dob_month" | "session_month",
    yearKey: "dob_year" | "session_year",
    yearRange: [number, number],
    label: string,
    hint?: string
  ) => {
    const dayVal = form[dayKey];
    const monthVal = form[monthKey];
    const yearVal = form[yearKey];

    const maxDays = getDaysInMonth(
      monthVal ? parseInt(monthVal) : 0,
      yearVal ? parseInt(yearVal) : currentYear
    );

    return (
      <div>
        <label className="text-[13px] font-medium text-foreground block mb-1.5">{label}</label>
        <div className="grid grid-cols-3 gap-2">
          <Select value={dayVal} onValueChange={(v) => updateForm({ [dayKey]: v } as any)}>
            <SelectTrigger className="h-11 bg-[#0d1f35] border-border text-foreground">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
                <SelectItem key={d} value={String(d).padStart(2, "0")}>
                  {String(d).padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={monthVal} onValueChange={(v) => updateForm({ [monthKey]: v } as any)}>
            <SelectTrigger className="h-11 bg-[#0d1f35] border-border text-foreground">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearVal} onValueChange={(v) => updateForm({ [yearKey]: v } as any)}>
            <SelectTrigger className="h-11 bg-[#0d1f35] border-border text-foreground">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: yearRange[1] - yearRange[0] + 1 }, (_, i) => yearRange[1] - i).map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
      </div>
    );
  };

  // Loading screen
  if (isLoading) {
    const lines = [
      "Reading your GPS data...",
      "Identifying your session metrics...",
      "Normalising to 90 minutes...",
      "Comparing with position benchmarks...",
      "Building your player profile...",
      "Writing your AI performance narrative...",
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
                  isLast && isDone ? "text-[#1db954] font-bold" : isDone ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {isDone ? (
                  <Check className="h-5 w-5 text-[#1db954] shrink-0" />
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

  const mdPills: { value: MDDay; label: string }[] = [
    { value: "MD-3", label: "MD-3" },
    { value: "MD-2", label: "MD-2" },
    { value: "MD-1", label: "MD-1" },
    { value: "MD+1", label: "MD+1" },
    { value: "MD+2", label: "MD+2" },
    { value: "MD+3", label: "MD+3" },
  ];

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
                <div className="max-w-md mx-auto">
                  <Input
                    ref={nameRef}
                    placeholder="e.g. Alexandru Popescu"
                    value={form.fullName}
                    onChange={(e) => updateForm({ fullName: e.target.value })}
                    maxLength={60}
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
                      if (form.transfermarkt_url && isValidTransfermarkt(form.transfermarkt_url)) {
                        fetchTransfermarkt(form.transfermarkt_url);
                      }
                    }}
                    className="text-sm h-11 bg-secondary border-border"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Works with all Transfermarkt domains: .com, .de, .it, .ro, .es, .fr, .co.uk and more
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

            {/* STEP 3 — DOB (3 dropdowns), Height, Weight */}
            {step === 3 && (
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-10">
                  Tell us a bit more about you
                </h1>
                <div className="max-w-xl mx-auto space-y-5 text-left">
                  {/* DOB dropdowns */}
                  <div className="rounded-lg border border-border/50 bg-[#0d1f35] p-4">
                    {renderDateDropdowns(
                      "dob_day", "dob_month", "dob_year",
                      [currentYear - 50, currentYear - 14],
                      "Date of birth",
                      "Used to calculate your age for position benchmarks"
                    )}
                    {form.dob_day && form.dob_month && form.dob_year && form.age_calculated !== null && form.age_calculated >= 14 && form.age_calculated <= 50 && (
                      <p className="text-[13px] text-[#1db954] font-medium mt-2">
                        Age: {form.age_calculated} years old
                      </p>
                    )}
                    {errors.dob && <p className="text-[11px] text-destructive mt-1">{errors.dob}</p>}
                  </div>

                  {/* Height + Weight row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border/50 bg-[#0d1f35] p-3.5 focus-within:border-primary transition-all">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <label className="text-[13px] font-medium text-foreground">Height</label>
                        <span className="text-red-500 text-xs">•</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-2">cm</p>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={150}
                        max={210}
                        placeholder="e.g. 181"
                        value={form.height_cm}
                        onChange={(e) => updateForm({ height_cm: e.target.value })}
                        className="w-full bg-transparent text-foreground text-base outline-none placeholder:text-muted-foreground/40"
                      />
                      {errors.height && <p className="text-[11px] text-destructive mt-1">{errors.height}</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">Between 150 cm and 210 cm</p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-[#0d1f35] p-3.5 focus-within:border-primary transition-all">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <label className="text-[13px] font-medium text-foreground">Weight</label>
                        <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded-full">Optional</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-2">kg</p>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={50}
                        max={120}
                        step={0.5}
                        placeholder="e.g. 75"
                        value={form.weight_kg}
                        onChange={(e) => updateForm({ weight_kg: e.target.value })}
                        className="w-full bg-transparent text-foreground text-base outline-none placeholder:text-muted-foreground/40"
                      />
                      {errors.weight && <p className="text-[11px] text-destructive mt-1">{errors.weight}</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">Between 50 kg and 120 kg — used only for AI intensity calculations, never shown publicly</p>
                    </div>
                  </div>
                </div>
                <Button onClick={handleContinue} className="mt-8 h-12 px-8 text-base">Continue →</Button>
              </div>
            )}

            {/* STEP 4 — Position Zone + Sub-position */}
            {step === 4 && (
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-10">What position do you play?</h1>
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  {([
                    { id: "GK" as PositionZone, label: "Goalkeeper", icon: Goal },
                    { id: "DEF" as PositionZone, label: "Defence", icon: Shield },
                    { id: "MID" as PositionZone, label: "Midfield", icon: Crosshair },
                    { id: "FWD" as PositionZone, label: "Attack", icon: Swords },
                  ]).map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => {
                        updateForm({ position: pos.id, positionSpecific: null });
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all hover:border-primary hover:bg-primary/5",
                        form.position === pos.id ? "border-[#1D9E75] bg-[#1D9E75]/10" : "border-border"
                      )}
                    >
                      <pos.icon className="h-8 w-8 text-primary" />
                      <span className="font-semibold text-foreground">{pos.label}</span>
                      <span className="text-xs text-muted-foreground">{pos.id}</span>
                    </button>
                  ))}
                </div>

                {/* Sub-position row */}
                <AnimatePresence>
                  {form.position && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden mt-8"
                    >
                      <p className="text-sm text-muted-foreground mb-4">Choose your specific position</p>
                      <div className="flex flex-wrap justify-center gap-3">
                        {SUB_POSITIONS[form.position].map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => {
                              updateForm({ positionSpecific: sub.id });
                              setTimeout(goNext, 500);
                            }}
                            className={cn(
                              "flex flex-col items-center gap-1 px-5 py-3 rounded-lg border-2 transition-all hover:border-[#1D9E75] hover:bg-[#1D9E75]/5 min-w-[90px]",
                              form.positionSpecific === sub.id ? "border-[#1D9E75] bg-[#1D9E75]/10" : "border-border"
                            )}
                          >
                            <span className="text-lg font-bold text-foreground">{sub.id}</span>
                            <span className="text-[10px] text-muted-foreground leading-tight">{sub.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

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

            {/* STEP 6 — Session type with Match/Training logic */}
            {step === 6 && (
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-10">
                  What type of session is this?
                </h1>
                <div className="flex gap-4 justify-center mb-6">
                  {([
                    { id: "match" as SessionType, icon: "⚽", title: "Match", sub: "Official or friendly game" },
                    { id: "training" as SessionType, icon: "🏋️", title: "Training", sub: "Practice session" },
                  ]).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (s.id === "match") {
                          updateForm({ sessionType: s.id, mdDay: "MD0" });
                        } else {
                          updateForm({ sessionType: s.id, mdDay: "MD0" }); // reset, user must pick
                        }
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-6 px-8 rounded-xl border-2 transition-all hover:border-primary hover:bg-primary/5 min-w-[140px]",
                        form.sessionType === s.id ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <span className="text-3xl">{s.icon}</span>
                      <span className="font-semibold text-foreground">{s.title}</span>
                      <span className="text-xs text-muted-foreground">{s.sub}</span>
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {form.sessionType && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      {form.sessionType === "match" && (
                        <div className="space-y-4 max-w-md mx-auto mt-4 text-left">
                          {renderDateDropdowns(
                            "session_day", "session_month", "session_year",
                            [currentYear - 2, currentYear],
                            "When was the match?"
                          )}
                          <div>
                            <label className="text-[13px] font-medium text-foreground block mb-1.5">Opponent (optional)</label>
                            <Input
                              placeholder="e.g. FC Milsami"
                              value={form.opponent}
                              onChange={(e) => updateForm({ opponent: e.target.value })}
                              className="h-11 bg-[#0d1f35] border-border"
                            />
                          </div>
                          {errors.sessionDate && <p className="text-[11px] text-destructive">{errors.sessionDate}</p>}
                        </div>
                      )}

                      {form.sessionType === "training" && (
                        <div className="space-y-5 max-w-lg mx-auto mt-4 text-left">
                          {/* MD day selector */}
                          <div>
                            <label className="text-[13px] font-medium text-foreground block mb-2">What type of training session was this?</label>
                            <div className="flex flex-wrap gap-2 justify-center">
                              {mdPills.map((md) => (
                                <button
                                  key={md.value}
                                  onClick={() => updateForm({ mdDay: md.value })}
                                  className={cn(
                                    "px-4 py-2 rounded-full text-sm font-medium border transition-all",
                                    form.mdDay === md.value
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                                  )}
                                >
                                  {md.label}
                                </button>
                              ))}
                            </div>
                            {errors.mdDay && <p className="text-[11px] text-destructive mt-1 text-center">{errors.mdDay}</p>}
                          </div>

                          {/* MD explanation */}
                          <div className="relative rounded-lg border-l-[3px] border-primary bg-[#0d2a4a] p-4">
                            <HelpCircle className="absolute top-3 right-3 h-4 w-4 text-muted-foreground/40" />
                            <p className="text-[12px] font-semibold text-foreground mb-2">What is MD (Match Day)?</p>
                            <div className="text-[11px] text-[#a8c0e0] leading-[1.8] space-y-0.5">
                              <p>MD stands for "Match Day" — the day of the official match. Training sessions are classified by how many days before or after the match they take place:</p>
                              <ul className="mt-2 space-y-0.5">
                                <li><span className="font-bold text-[#7eb8f7]">MD-3</span> — 3 days before the match → high intensity, tactical work</li>
                                <li><span className="font-bold text-[#7eb8f7]">MD-2</span> — 2 days before the match → moderate intensity, shape work</li>
                                <li><span className="font-bold text-[#7eb8f7]">MD-1</span> — 1 day before the match → light session, activation only</li>
                                <li><span className="font-bold text-[#7eb8f7]">MD+1</span> — 1 day after the match → recovery session, very low load</li>
                                <li><span className="font-bold text-[#7eb8f7]">MD+2</span> — 2 days after the match → return to training, medium load</li>
                                <li><span className="font-bold text-[#7eb8f7]">MD+3</span> — 3 days after the match → normal training, full intensity</li>
                              </ul>
                            </div>
                          </div>

                          {/* Session date */}
                          {renderDateDropdowns(
                            "session_day", "session_month", "session_year",
                            [currentYear - 1, currentYear],
                            "Date of this session"
                          )}
                          {errors.sessionDate && <p className="text-[11px] text-destructive">{errors.sessionDate}</p>}
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
                        form.gpsFile && "border-[#1db954] bg-[#1db954]/5"
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
                          <Check className="h-6 w-6 text-[#1db954]" />
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
