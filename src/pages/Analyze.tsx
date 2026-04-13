import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image, Keyboard, Shield, Crosshair, Swords, Goal, ChevronLeft, Check, Loader2, FileText, Info, AlertTriangle, Sparkles, HelpCircle, Lock } from "lucide-react";
import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, differenceInYears } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import FootballDropdowns from "@/components/FootballDropdowns";
import OpponentSearch from "@/components/OpponentSearch";

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
  date_of_birth: string;
  age_calculated: number | null;
  height_cm: string;
  weight_kg: string;
  position: PositionZone | null;
  positionSpecific: PositionSpecific | null;
  teamName: string;
  league: string;
  country: string;
  countryId: number | null;
  leagueId: number | null;
  teamId: number | null;
  sessionType: SessionType | null;
  mdDay: MDDay;
  opponent: string;
  session_day: string;
  session_month: string;
  session_year: string;
  sessionDate: string;
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

// Fuzzy matching utilities
function removeDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeNameParts(name: string): string[] {
  return removeDiacritics(name.trim().toLowerCase()).split(/\s+/).filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return dp[m][n];
}

function fuzzyMatchPlayer(targetName: string, candidates: string[]): { index: number; score: number; name: string } | null {
  if (!candidates.length) return null;
  const targetParts = normalizeNameParts(targetName);
  const targetFull = targetParts.join(" ");

  let bestIndex = -1;
  let bestScore = Infinity;

  candidates.forEach((candidate, idx) => {
    const candParts = normalizeNameParts(candidate);
    const candFull = candParts.join(" ");

    if (candFull === targetFull) { bestIndex = idx; bestScore = 0; return; }

    const targetReversed = [...targetParts].reverse().join(" ");
    const dist1 = levenshtein(targetFull, candFull);
    const dist2 = levenshtein(targetReversed, candFull);
    let dist = Math.min(dist1, dist2);

    if (dist > 2) {
      for (const tp of targetParts) {
        for (const cp of candParts) {
          const partDist = levenshtein(tp, cp);
          if (partDist <= 1) { dist = Math.min(dist, partDist + 1); break; }
        }
      }
    }

    if (dist < bestScore) { bestScore = dist; bestIndex = idx; }
  });

  if (bestIndex === -1) return null;
  return { index: bestIndex, score: bestScore, name: candidates[bestIndex] };
}

interface ExtractedPlayer {
  athlete_name: string;
  duration?: string | null;
  distance?: number | null;
  max_sp?: number | null;
  av_sp?: number | null;
  sp_ev?: number | null;
  hmld?: number | null;
  dist_sp_z4?: number | null;
  dist_sp_z4plus?: number | null;
  dist_sp_z5?: number | null;
  acc_ev?: number | null;
  dec_ev?: number | null;
  minutes_played?: number | null;
}

type PlayerMatchPhase = null | "confirm" | "select";

// Determine which profile fields are missing
function getMissingProfileSteps(profile: any): string[] {
  const missing: string[] = [];
  if (!profile?.full_name?.trim() || profile.full_name.trim().split(/\s+/).length < 2) missing.push("name");
  if (!profile?.date_of_birth || !profile?.height_cm) missing.push("bio");
  if (!profile?.position || !profile?.position_specific) missing.push("position");
  if (!profile?.current_club || !profile?.current_league) missing.push("team");
  return missing;
}

const Analyze = () => {
  const navigate = useNavigate();
  const [authChecking, setAuthChecking] = useState(true);
  const [authUser, setAuthUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [step, setStep] = useState(1);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [extractionStep, setExtractionStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const sessionIdRef = useRef<string>("");
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Player matching state
  const [playerMatchPhase, setPlayerMatchPhase] = useState<PlayerMatchPhase>(null);
  const [extractedPlayers, setExtractedPlayers] = useState<ExtractedPlayer[]>([]);
  const [matchedPlayerIndex, setMatchedPlayerIndex] = useState<number>(-1);
  const [platformDetected, setPlatformDetected] = useState<string>("unknown");

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
    countryId: null,
    leagueId: null,
    teamId: null,
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

  // Auth gate
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/signup?redirectTo=/analyze", { replace: true });
        return;
      }
      setAuthUser(session.user);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setProfile(profileData);

      // Pre-fill form from profile
      if (profileData) {
        const isPaid = profileData.subscription_plan !== "free" || profileData.account_type !== "free";
        if (!isPaid && (profileData.reports_used_this_month || 0) >= 3) {
          setLimitReached(true);
        }

        // Pre-fill profile data into form
        setForm(prev => ({
          ...prev,
          fullName: profileData.full_name || prev.fullName,
          transfermarkt_url: profileData.transfermarkt_url || prev.transfermarkt_url,
          height_cm: profileData.height_cm ? String(profileData.height_cm) : prev.height_cm,
          weight_kg: profileData.weight_kg ? String(profileData.weight_kg) : prev.weight_kg,
          position: (profileData.position as PositionZone) || prev.position,
          positionSpecific: (profileData.position_specific as PositionSpecific) || prev.positionSpecific,
          teamName: profileData.current_club || prev.teamName,
          league: profileData.current_league || prev.league,
          country: profileData.country || prev.country,
          countryId: (profileData as any).country_id || prev.countryId,
          leagueId: (profileData as any).league_id || prev.leagueId,
          teamId: (profileData as any).team_id || prev.teamId,
          ...(profileData.date_of_birth ? (() => {
            const [y, m, d] = profileData.date_of_birth.split("-");
            const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            return {
              dob_day: d,
              dob_month: String(parseInt(m)),
              dob_year: y,
              date_of_birth: profileData.date_of_birth,
              age_calculated: differenceInYears(new Date(), dateObj),
            };
          })() : {}),
        }));
      }
      setAuthChecking(false);
    };
    checkAuth();
  }, [navigate]);

  // Compute dynamic steps based on profile completeness
  const missingProfileSteps = useMemo(() => {
    if (!profile) return ["name", "bio", "position", "team"];
    return getMissingProfileSteps(profile);
  }, [profile]);

  // Build the actual step sequence
  // Always: input_method, session_info, gps_data, consent
  // Conditionally: name, bio, position, team (only if missing from profile)
  const stepSequence = useMemo(() => {
    const steps: string[] = ["input_method"];
    if (missingProfileSteps.includes("name")) steps.push("name");
    if (missingProfileSteps.includes("bio")) steps.push("bio");
    if (missingProfileSteps.includes("position")) steps.push("position");
    if (missingProfileSteps.includes("team")) steps.push("team");
    steps.push("session_info", "gps_data");
    return steps;
  }, [missingProfileSteps]);

  const totalSteps = stepSequence.length;
  const currentStepId = stepSequence[step - 1] || "input_method";

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

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, totalSteps)), [totalSteps]);
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  // Auto-focus name input
  useEffect(() => {
    if (currentStepId === "name") setTimeout(() => nameRef.current?.focus(), 300);
  }, [currentStepId]);

  // Extraction loading animation (3 steps for PDF parsing only)
  useEffect(() => {
    if (!isExtracting) return;
    setExtractionStep(0);
    const timers = [
      setTimeout(() => setExtractionStep(1), 100),
      setTimeout(() => setExtractionStep(2), 2000),
      setTimeout(() => setExtractionStep(3), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isExtracting]);

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
        setForm(prev => ({ ...prev, transfermarkt_status: "error", transfermarkt_data: { ...prev.transfermarkt_data, fetched: false } }));
        return;
      }
      setForm(prev => ({
        ...prev,
        transfermarkt_status: "success",
        transfermarkt_data: { club: data.club, league: data.league, nationality: data.nationality, market_value: data.market_value, fetched: true },
        teamName: data.club || prev.teamName,
        league: data.league || prev.league,
      }));
    } catch {
      setForm(prev => ({ ...prev, transfermarkt_status: "error" }));
    }
  }, []);

  const splitName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "" };
  };

  const validateStep = (stepId: string): boolean => {
    const e: Record<string, string> = {};
    if (stepId === "name") {
      if (!form.fullName.trim()) e.name = "Please enter your full name";
      else if (form.fullName.trim().split(/\s+/).length < 2) e.name = "Please enter both your first and last name";
      else if (!/^[\p{L}\s'-]+$/u.test(form.fullName.trim())) e.name = "Name can only contain letters";
      if (form.transfermarkt_url && !isValidTransfermarkt(form.transfermarkt_url))
        e.transfermarkt = "Please paste a valid Transfermarkt profile link";
    }
    if (stepId === "bio") {
      if (!form.dob_day || !form.dob_month || !form.dob_year) e.dob = "Required";
      else {
        const m = parseInt(form.dob_month), d = parseInt(form.dob_day), y = parseInt(form.dob_year);
        const maxD = getDaysInMonth(m, y);
        if (d > maxD) e.dob = "This date doesn't exist";
        else if (form.age_calculated !== null) {
          if (form.age_calculated < 14) e.dob = "You must be at least 14 years old";
          else if (form.age_calculated > 50) e.dob = "Please check your date of birth";
        }
      }
      if (!form.height_cm) e.height = "Please enter your height";
      else {
        const h = parseFloat(form.height_cm);
        if (isNaN(h)) e.height = "Please enter a valid number in cm";
        else if (h < 150) e.height = "Minimum height is 150 cm";
        else if (h > 210) e.height = "Maximum height is 210 cm";
      }
      if (form.weight_kg) {
        const w = parseFloat(form.weight_kg);
        if (isNaN(w)) e.weight = "Please enter a valid number in kg";
        else if (w < 50) e.weight = "Minimum weight is 50 kg";
        else if (w > 120) e.weight = "Maximum weight is 120 kg";
      }
    }
    if (stepId === "team") {
      if (!form.teamName.trim()) e.team = "Required";
      if (!form.league.trim()) e.league = "Required";
    }
    if (stepId === "session_info") {
      if (!form.sessionType) e.sessionType = "Required";
      if (form.sessionType === "training" && form.mdDay === "MD0") e.mdDay = "Please select an MD day";
      if (!form.session_day || !form.session_month || !form.session_year) e.sessionDate = "Required";
    }
    if (stepId === "gps_data") {
      if (form.entryMethod === "manual") {
        if (!form.manualData.duration) e.duration = "Required";
        else if (!/^\d{1,3}:\d{2}$/.test(form.manualData.duration)) e.duration = "Please use mm:ss format";
        else {
          const [mm] = form.manualData.duration.split(":").map(Number);
          if (mm < 1) e.duration = "Duration must be at least 1 minute";
          else if (mm > 150) e.duration = "This value exceeds known human limits. Please check your data.";
        }
        if (!form.manualData.distance) e.distance = "Required";
        else { const v = parseFloat(form.manualData.distance); if (v < 100 || v > 16000) e.distance = "This value exceeds known human limits. Please check your data."; }
        if (!form.manualData.max_sp) e.max_sp = "Required";
        else { const v = parseFloat(form.manualData.max_sp); if (v < 8 || v > 38) e.max_sp = "This value exceeds known human limits. Please check your data."; }
        if (!form.manualData.sp_ev) e.sp_ev = "Required";
        else { const v = parseFloat(form.manualData.sp_ev); if (v < 0 || v > 200) e.sp_ev = "This value exceeds known human limits. Please check your data."; }
        if (!form.manualData.hmld) e.hmld = "Required";
        else { const v = parseFloat(form.manualData.hmld); if (v < 0 || v > 5000) e.hmld = "This value exceeds known human limits. Please check your data."; }

        // Optional field limits
        if (form.manualData.av_sp) { const v = parseFloat(form.manualData.av_sp); if (v < 3 || v > 20) e.av_sp = "This value exceeds known human limits. Please check your data."; }
        if (form.manualData.acc_ev) { const v = parseFloat(form.manualData.acc_ev); if (v < 0 || v > 150) e.acc_ev = "This value exceeds known human limits. Please check your data."; }
        if (form.manualData.dec_ev) { const v = parseFloat(form.manualData.dec_ev); if (v < 0 || v > 150) e.dec_ev = "This value exceeds known human limits. Please check your data."; }
        if (form.manualData.dist_sp_z4) { const v = parseFloat(form.manualData.dist_sp_z4); if (v < 0 || v > 3000) e.dist_sp_z4 = "This value exceeds known human limits. Please check your data."; }
        if (form.manualData.dist_sp_z4plus) { const v = parseFloat(form.manualData.dist_sp_z4plus); if (v < 0 || v > 3000) e.dist_sp_z4plus = "This value exceeds known human limits. Please check your data."; }
        if (form.manualData.dist_sp_z5) { const v = parseFloat(form.manualData.dist_sp_z5); if (v < 0 || v > 2000) e.dist_sp_z5 = "This value exceeds known human limits. Please check your data."; }

        // Cross-validation
        const dist = parseFloat(form.manualData.distance);
        const sprintDist = parseFloat(form.manualData.dist_sp_z5);
        const hsrDist = parseFloat(form.manualData.dist_sp_z4);
        const avgSp = parseFloat(form.manualData.av_sp);
        const maxSp = parseFloat(form.manualData.max_sp);

        if (!isNaN(sprintDist) && !isNaN(dist) && sprintDist > dist) e.dist_sp_z5 = "Sprint distance cannot exceed total distance";
        if (!isNaN(hsrDist) && !isNaN(dist) && hsrDist > dist) e.dist_sp_z4 = "HSR distance cannot exceed total distance";
        if (!isNaN(avgSp) && !isNaN(maxSp) && avgSp > maxSp) e.av_sp = "Average speed cannot exceed top speed";

        // Warnings (stored separately, don't block submit)
        if (!isNaN(dist) && form.manualData.duration) {
          const [mm] = form.manualData.duration.split(":").map(Number);
          if (mm > 0 && dist > mm * 250) {
            // This is a warning, not an error — don't add to `e`
            setForm(prev => ({ ...prev, _distanceWarning: true } as any));
          }
        }
      }
      if (!form.consent.terms) e.consent_terms = "Please accept the Terms of Service and Privacy Policy to continue.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = useCallback(() => {
    if (validateStep(currentStepId)) goNext();
  }, [currentStepId, form]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const buildGpsFromPlayer = (player: ExtractedPlayer, method: string): Record<string, any> => ({
    duration: player.duration || null,
    distance: player.distance || null,
    acc_ev: player.acc_ev || null,
    dec_ev: player.dec_ev || null,
    dist_sp_z4: player.dist_sp_z4 || null,
    dist_sp_z4plus: player.dist_sp_z4plus || null,
    dist_sp_z5: player.dist_sp_z5 || null,
    max_sp: player.max_sp || null,
    av_sp: player.av_sp || null,
    sp_ev: player.sp_ev || null,
    hmld: player.hmld || null,
    athlete_name: player.athlete_name || null,
    platform_detected: platformDetected,
    extraction_method: method,
  });

  // Single generation flow: submit → loading → auto-redirect
  const continueWithGps = async (gpsMetrics: Record<string, any>) => {
    setIsExtracting(false);
    setPlayerMatchPhase(null);
    setIsGenerating(true);
    setGenerationError(null);
    try {
      if (!authUser || !profile) {
        setGenerationError("You must be logged in.");
        setIsGenerating(false);
        return;
      }

      const sessionId = crypto.randomUUID();
      sessionIdRef.current = sessionId;
      const { firstName, lastName } = splitName(form.fullName);

      // Use profile data for fields not in form (already pre-filled)
      const fullName = form.fullName || profile.full_name || "";
      const position = form.position || profile.position;
      const positionSpecific = form.positionSpecific || profile.position_specific;

      const { error: sessErr } = await supabase.from('sessions').insert({
        id: sessionId,
        player_id: profile.id,
        session_type: form.sessionType || 'match',
        session_date: form.sessionDate || format(new Date(), 'yyyy-MM-dd'),
        training_day: form.mdDay || null,
        input_method: form.entryMethod === 'pdf' ? 'pdf_upload' : (form.entryMethod || 'manual'),
        opponent: form.opponent || null,
        position_specific: positionSpecific || null,
        gps_data: {
          position_zone: position || null,
          position_specific: positionSpecific || null,
          first_name: firstName || fullName.split(" ")[0],
          last_name: lastName || fullName.split(" ").slice(1).join(" "),
          date_of_birth: form.date_of_birth || profile.date_of_birth || null,
          age_calculated: form.age_calculated,
          height_cm: form.height_cm ? parseInt(form.height_cm) : profile.height_cm,
          weight_kg: form.weight_kg ? parseInt(form.weight_kg) : profile.weight_kg,
          team_name: form.teamName || profile.current_club || null,
          league: form.league || profile.current_league || null,
          country: form.country || profile.country || null,
          transfermarkt_url: form.transfermarkt_url || profile.transfermarkt_url || null,
          ...gpsMetrics,
        },
        status: 'processing',
      });

      if (sessErr) {
        console.error('Session insert error:', sessErr);
        setIsGenerating(false);
        setGenerationError('Failed to save session. Please try again.');
        return;
      }

      // Call generate-report — this is the ONLY generation call
      const { data: reportData, error: reportError } = await supabase.functions.invoke('generate-report', {
        body: {
          playerData: {
            fullName: fullName,
            position: position,
            positionSpecific: positionSpecific,
            sessionType: form.sessionType,
            mdDay: form.mdDay,
            opponent: form.opponent,
            minutesPlayed: gpsMetrics.duration || null,
            duration: gpsMetrics.duration || null,
            distance: gpsMetrics.distance || null,
            maxSpeed: gpsMetrics.max_sp || null,
            avSpeed: gpsMetrics.av_sp || null,
            spEv: gpsMetrics.sp_ev || null,
            hmld: gpsMetrics.hmld || null,
            distSpZ4: gpsMetrics.dist_sp_z4 || null,
            distSpZ4Plus: gpsMetrics.dist_sp_z4plus || null,
            distSpZ5: gpsMetrics.dist_sp_z5 || null,
            accEv: gpsMetrics.acc_ev || null,
            decEv: gpsMetrics.dec_ev || null,
          },
        },
      });

      if (reportError || !reportData?.success) {
        console.error('Report generation failed:', reportError, reportData);
        setIsGenerating(false);
        setGenerationError('Something went wrong generating your report. Please try again.');
        return;
      }

      const isPaid = profile.subscription_plan !== 'free' || profile.account_type !== 'free';

      await supabase.from('reports').insert({
        session_id: sessionId,
        player_id: profile.id,
        ai_report: reportData.report,
        is_public: isPaid,
        model_used: reportData.model || 'claude',
      });

      // Increment reports_used_this_month for free users
      if (!isPaid) {
        await supabase.from('profiles').update({
          reports_used_this_month: (profile.reports_used_this_month || 0) + 1,
        }).eq('id', profile.id);
      }

      // Update session source counters in player_stats_aggregate
      const inputMethodDb = form.entryMethod === 'pdf' ? 'pdf_upload' : (form.entryMethod || 'manual');
      const counterField = inputMethodDb === 'pdf_upload' ? 'pdf_session_count' 
        : inputMethodDb === 'screenshot' ? 'screenshot_session_count' : 'manual_session_count';
      
      // Fetch current stats to increment
      const { data: currentStats } = await supabase
        .from('player_stats_aggregate')
        .select('pdf_session_count, screenshot_session_count, manual_session_count, total_sessions')
        .eq('player_id', profile.id)
        .maybeSingle();

      if (currentStats) {
        const pdfCount = (currentStats.pdf_session_count || 0) + (counterField === 'pdf_session_count' ? 1 : 0);
        const ssCount = (currentStats.screenshot_session_count || 0) + (counterField === 'screenshot_session_count' ? 1 : 0);
        const manualCount = (currentStats.manual_session_count || 0) + (counterField === 'manual_session_count' ? 1 : 0);
        const totalSess = (currentStats.total_sessions || 0) + 1;

        // Calculate trust score
        let trustScore = 0;
        if (totalSess > 0) {
          const pdfPct = pdfCount / totalSess;
          const ssPct = ssCount / totalSess;
          if (pdfPct > 0.8) trustScore += 30;
          else if (pdfPct > 0.5) trustScore += 15;
          else if (ssPct > 0.5) trustScore += 5;
        }
        if (profile.transfermarkt_url) trustScore += 20;
        // Club membership bonus checked via club_members
        const { count: clubCount } = await supabase
          .from('club_members')
          .select('*', { count: 'exact', head: true })
          .eq('player_id', profile.id)
          .eq('is_active', true);
        if (clubCount && clubCount > 0) trustScore += 20;
        if (totalSess > 10) trustScore += 15;
        else if (totalSess >= 5) trustScore += 8;
        else if (totalSess >= 2) trustScore += 3;
        // Consistency check would require fetching all session top speeds - skip for now, add +8 default
        trustScore += 8;
        trustScore = Math.min(trustScore, 100);

        await supabase.from('player_stats_aggregate').update({
          [counterField]: (currentStats as any)[counterField] + 1,
          trust_score: trustScore,
        } as any).eq('player_id', profile.id);
      }

      // Save profile data if this was a first-time user with missing fields
      if (missingProfileSteps.length > 0) {
        const profileUpdates: {
          full_name?: string;
          date_of_birth?: string;
          height_cm?: number;
          weight_kg?: number;
          position?: string;
          position_specific?: string;
          current_club?: string;
          current_league?: string;
          country?: string;
          transfermarkt_url?: string;
        } = {};
        if (!profile.full_name && form.fullName) profileUpdates.full_name = form.fullName;
        if (!profile.date_of_birth && form.date_of_birth) profileUpdates.date_of_birth = form.date_of_birth;
        if (!profile.height_cm && form.height_cm) profileUpdates.height_cm = parseInt(form.height_cm);
        if (!profile.weight_kg && form.weight_kg) profileUpdates.weight_kg = parseFloat(form.weight_kg);
        if (!profile.position && form.position) profileUpdates.position = form.position;
        if (!profile.position_specific && form.positionSpecific) profileUpdates.position_specific = form.positionSpecific;
        if (!profile.current_club && form.teamName) profileUpdates.current_club = form.teamName;
        if (!profile.current_league && form.league) profileUpdates.current_league = form.league;
        if (!profile.country && form.country) profileUpdates.country = form.country;
        if (!profile.transfermarkt_url && form.transfermarkt_url) profileUpdates.transfermarkt_url = form.transfermarkt_url;
        if (Object.keys(profileUpdates).length > 0) {
          await supabase.from('profiles').update(profileUpdates).eq('id', profile.id);
        }
      }

      // IMMEDIATELY redirect to report page — no intermediate screen
      navigate(`/report/${sessionId}`, { replace: true });
    } catch (err) {
      console.error('Error in submission:', err);
      setIsGenerating(false);
      setGenerationError('Something went wrong. Please try again.');
    }
  };

  const handlePlayerConfirm = (playerIndex: number) => {
    const player = extractedPlayers[playerIndex];
    if (!player) return;
    continueWithGps(buildGpsFromPlayer(player, form.entryMethod || "pdf"));
  };

  const handleSubmit = async () => {
    if (!validateStep("gps_data")) return;
    setExtractionError(null);
    setGenerationError(null);

    if ((form.entryMethod === "pdf" || form.entryMethod === "screenshot") && form.gpsFile) {
      setIsExtracting(true);
      try {
        const base64 = await fileToBase64(form.gpsFile);
        const { data: extractResult, error: extractError } = await supabase.functions.invoke("extract-gps-data", {
          body: { fileBase64: base64, fileType: form.entryMethod, mimeType: form.gpsFile.type },
        });

        if (extractError || !extractResult?.success) {
          setIsExtracting(false);
          setExtractionError("We couldn't read your file automatically. Please enter your data manually instead.");
          updateForm({ entryMethod: "manual" });
          return;
        }

        const players: ExtractedPlayer[] = extractResult.players || [];
        setPlatformDetected(extractResult.platform_detected || "unknown");

        if (players.length === 0) {
          setIsExtracting(false);
          setExtractionError("No player data found in the file. Please enter your data manually.");
          updateForm({ entryMethod: "manual" });
          return;
        }

        if (players.length === 1) {
          await continueWithGps(buildGpsFromPlayer(players[0], form.entryMethod || "pdf"));
          return;
        }

        // Multi-player → fuzzy match
        setIsExtracting(false);
        setExtractedPlayers(players);
        const names = players.map(p => p.athlete_name || "Unknown");
        const match = fuzzyMatchPlayer(form.fullName, names);

        if (match && match.score <= 3) {
          setMatchedPlayerIndex(match.index);
          setPlayerMatchPhase("confirm");
        } else {
          setMatchedPlayerIndex(-1);
          setPlayerMatchPhase("select");
        }
      } catch (err) {
        console.error("File extraction error:", err);
        setIsExtracting(false);
        setExtractionError("We couldn't read your file automatically. Please enter your data manually instead.");
        updateForm({ entryMethod: "manual" });
      }
    } else {
      const gpsMetrics = {
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
      await continueWithGps(gpsMetrics);
    }
  };

  const retrySubmit = () => {
    setGenerationError(null);
    if (sessionIdRef.current) {
      // Re-attempt with same data
      handleSubmit();
    }
  };

  const consentCheckboxes = [
    {
      id: "terms" as const,
      label: "__terms__",
      description: "You must be at least 16 years old to use Campometric. If you are under 18, please ensure you have parental consent.",
      errorKey: "consent_terms",
      required: true,
    },
    {
      id: "public_profile" as const,
      label: "I agree to make my performance data visible to scouts, agents, and clubs on the Campometric platform and leaderboard.",
      description: "Your name, position, team and GPS metrics will be visible to verified scouts and agents. This is optional.",
      errorKey: "consent_public_profile",
      required: false,
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
          Your data is protected. Campometric stores your information securely and never sells your personal data to third parties.
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
      if (currentStepId === "gps_data") handleSubmit();
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
    const maxDays = getDaysInMonth(monthVal ? parseInt(monthVal) : 0, yearVal ? parseInt(yearVal) : currentYear);

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
                <SelectItem key={d} value={String(d).padStart(2, "0")}>{String(d).padStart(2, "0")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={monthVal} onValueChange={(v) => updateForm({ [monthKey]: v } as any)}>
            <SelectTrigger className="h-11 bg-[#0d1f35] border-border text-foreground">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearVal} onValueChange={(v) => updateForm({ [yearKey]: v } as any)}>
            <SelectTrigger className="h-11 bg-[#0d1f35] border-border text-foreground">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: yearRange[1] - yearRange[0] + 1 }, (_, i) => yearRange[1] - i).map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
      </div>
    );
  };

  const mdPills: { value: MDDay; label: string }[] = [
    { value: "MD-3", label: "MD-3" },
    { value: "MD-2", label: "MD-2" },
    { value: "MD-1", label: "MD-1" },
    { value: "MD+1", label: "MD+1" },
    { value: "MD+2", label: "MD+2" },
    { value: "MD+3", label: "MD+3" },
  ];

  // Auth checking screen
  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  // Report limit reached screen
  if (limitReached) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
        <div className="mb-8">
          <img src={logo} alt="Campometric" className="h-[54px]" />
        </div>
        <Lock className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">You've used all 3 free reports this month</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          Upgrade to Player Pro for unlimited reports — €9/month
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate("/#pricing")}
            className="bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold h-12 px-8"
          >
            Upgrade to Pro →
          </Button>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            View past reports →
          </Button>
        </div>
      </div>
    );
  }

  // Player confirmation screen
  if (playerMatchPhase === "confirm" && extractedPlayers.length > 0) {
    const player = extractedPlayers[matchedPlayerIndex];
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="mb-8">
          <img src={logo} alt="Campometric" className="h-[54px]" />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">We found your data</h2>
              <p className="text-sm text-muted-foreground mt-1">Confirm this is you</p>
            </div>
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-4 text-center">
              <p className="font-bold text-foreground text-lg">{player?.athlete_name || "Unknown"}</p>
              <div className="flex justify-center gap-4 mt-2 text-sm text-muted-foreground">
                {player?.distance && <span>{(player.distance / 1000).toFixed(1)} km</span>}
                {player?.max_sp && <span>{player.max_sp.toFixed(1)} km/h</span>}
                {player?.duration && <span>{player.duration}</span>}
              </div>
            </div>
            <Button onClick={() => handlePlayerConfirm(matchedPlayerIndex)} className="w-full h-12 bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold">
              Generate report →
            </Button>
            <button
              onClick={() => { setPlayerMatchPhase("select"); setMatchedPlayerIndex(-1); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              Not me — pick another player
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Player selection screen
  if (playerMatchPhase === "select" && extractedPlayers.length > 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
        <div className="mb-8">
          <img src={logo} alt="Campometric" className="h-[54px]" />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold text-foreground">We found these players in your PDF</h2>
              <p className="text-sm text-muted-foreground mt-1">Select your name to continue</p>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {extractedPlayers.map((player, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePlayerConfirm(idx)}
                  className="w-full text-left rounded-lg border border-border bg-background hover:border-primary hover:bg-primary/5 p-3 transition-colors"
                >
                  <p className="font-medium text-foreground text-sm">{player.athlete_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {player.distance ? `${(player.distance / 1000).toFixed(1)} km` : "—"}
                    {player.max_sp ? ` · ${player.max_sp.toFixed(1)} km/h` : ""}
                    {player.duration ? ` · ${player.duration}` : ""}
                  </p>
                </button>
              ))}
            </div>
            <div className="pt-2 border-t border-border">
              <button
                onClick={() => {
                  setPlayerMatchPhase(null);
                  setExtractedPlayers([]);
                  updateForm({ entryMethod: "manual" });
                  setExtractionError("Please enter your data manually instead.");
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center py-2"
              >
                Enter data manually instead
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // PDF extraction loading screen (step-by-step, 3 steps only)
  if (isExtracting) {
    const lines = [
      "Reading your GPS data...",
      "Finding your player data...",
      "Analyzing session metrics...",
    ];

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="mb-12">
          <img src={logo} alt="Campometric" className="h-[54px]" />
        </div>

        <div className="space-y-4 w-full max-w-md">
          {lines.map((line, i) => {
            const isActive = extractionStep === i + 1;
            const isDone = extractionStep > i + 1;
            const isVisible = extractionStep >= i + 1;
            if (!isVisible) return null;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex items-center gap-3 text-base",
                  isDone ? "text-muted-foreground" : "text-foreground"
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
            animate={{ width: `${Math.min((extractionStep / 3) * 100, 95)}%` }}
            transition={{ duration: 0.5, ease: "linear" }}
          />
        </div>
      </div>
    );
  }

  // AI report generation screen (simple spinner)
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="mb-12">
          <img src={logo} alt="Campometric" className="h-[54px]" />
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">Generating your AI report...</p>
            <p className="text-sm text-muted-foreground mt-2">This usually takes 10–15 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  // Generation error screen
  if (generationError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
        <div className="mb-8">
          <img src={logo} alt="Campometric" className="h-[54px]" />
        </div>
        <AlertTriangle className="h-12 w-12 text-amber-400 mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">{generationError}</h1>
        <Button onClick={retrySubmit} className="mt-4 bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold h-12 px-8">
          Try again →
        </Button>
      </div>
    );
  }

  const stepProgress = ((step) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col" onKeyDown={handleKeyDown}>
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${stepProgress}%` }} />
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
        <span className="text-xs text-muted-foreground">Step {step} of {totalSteps}</span>
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
            {/* INPUT METHOD */}
            {currentStepId === "input_method" && (
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
                <p className="text-xs text-muted-foreground text-center mt-4">
                  🏆 Only PDF uploads qualify for leaderboard ranking
                </p>
              </div>
            )}

            {/* NAME (only if missing from profile) */}
            {currentStepId === "name" && (
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

                <div className="max-w-md mx-auto mt-6 text-left">
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-[13px] font-medium text-foreground">Transfermarkt profile</label>
                    <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded-full">Optional</span>
                  </div>
                  <Input
                    placeholder="https://www.transfermarkt.com/your-name/profil/spieler/..."
                    value={form.transfermarkt_url}
                    onChange={(e) => updateForm({ transfermarkt_url: e.target.value })}
                    onBlur={() => {
                      if (form.transfermarkt_url && isValidTransfermarkt(form.transfermarkt_url)) fetchTransfermarkt(form.transfermarkt_url);
                    }}
                    className="text-sm h-11 bg-secondary border-border"
                  />
                  {errors.transfermarkt && <p className="text-[11px] text-destructive mt-1">{errors.transfermarkt}</p>}
                  {form.transfermarkt_status === "loading" && (
                    <div className="flex items-center gap-2 mt-2 text-[12px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Fetching your profile...
                    </div>
                  )}
                  {form.transfermarkt_status === "success" && (
                    <div className="flex items-start gap-2 rounded-lg bg-[#0d3320] border border-[#1db954]/30 p-3 mt-2">
                      <Check className="h-4 w-4 text-[#1db954] shrink-0 mt-0.5" />
                      <p className="text-[12px] text-[#1db954]">Profile found! Team and league have been filled in automatically.</p>
                    </div>
                  )}
                </div>

                <Button onClick={handleContinue} className="mt-8 h-12 px-8 text-base">Continue →</Button>
              </div>
            )}

            {/* BIO (only if missing from profile) */}
            {currentStepId === "bio" && (
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-10">Tell us a bit more about you</h1>
                <div className="max-w-xl mx-auto space-y-5 text-left">
                  <div className="rounded-lg border border-border/50 bg-[#0d1f35] p-4">
                    {renderDateDropdowns("dob_day", "dob_month", "dob_year", [currentYear - 50, currentYear - 14], "Date of birth", "Used to calculate your age for position benchmarks")}
                    {form.dob_day && form.dob_month && form.dob_year && form.age_calculated !== null && form.age_calculated >= 14 && form.age_calculated <= 50 && (
                      <p className="text-[13px] text-[#1db954] font-medium mt-2">Age: {form.age_calculated} years old</p>
                    )}
                    {errors.dob && <p className="text-[11px] text-destructive mt-1">{errors.dob}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border/50 bg-[#0d1f35] p-3.5 focus-within:border-primary transition-all">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <label className="text-[13px] font-medium text-foreground">Height</label>
                        <span className="text-red-500 text-xs">•</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-2">cm</p>
                      <input type="number" inputMode="numeric" min={150} max={210} placeholder="e.g. 181" value={form.height_cm} onChange={(e) => updateForm({ height_cm: e.target.value })} className="w-full bg-transparent text-foreground text-base outline-none placeholder:text-muted-foreground/40" />
                      {errors.height && <p className="text-[11px] text-destructive mt-1">{errors.height}</p>}
                    </div>
                    <div className="rounded-lg border border-border/50 bg-[#0d1f35] p-3.5 focus-within:border-primary transition-all">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <label className="text-[13px] font-medium text-foreground">Weight</label>
                        <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded-full">Optional</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-2">kg</p>
                      <input type="number" inputMode="decimal" min={50} max={120} step={0.5} placeholder="e.g. 75" value={form.weight_kg} onChange={(e) => updateForm({ weight_kg: e.target.value })} className="w-full bg-transparent text-foreground text-base outline-none placeholder:text-muted-foreground/40" />
                      {errors.weight && <p className="text-[11px] text-destructive mt-1">{errors.weight}</p>}
                    </div>
                  </div>
                </div>
                <Button onClick={handleContinue} className="mt-8 h-12 px-8 text-base">Continue →</Button>
              </div>
            )}

            {/* POSITION (only if missing from profile) */}
            {currentStepId === "position" && (
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-10">What position do you play?</h1>
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  {([
                    { id: "GK" as PositionZone, label: "Goalkeeper", icon: Goal },
                    { id: "DEF" as PositionZone, label: "Defence", icon: Shield },
                    { id: "MID" as PositionZone, label: "Midfield", icon: Crosshair },
                    { id: "FWD" as PositionZone, label: "Attack", icon: Swords },
                  ]).map((pos) => (
                    <button key={pos.id} onClick={() => updateForm({ position: pos.id, positionSpecific: null })} className={cn("flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all hover:border-primary hover:bg-primary/5", form.position === pos.id ? "border-[#1D9E75] bg-[#1D9E75]/10" : "border-border")}>
                      <pos.icon className="h-8 w-8 text-primary" />
                      <span className="font-semibold text-foreground">{pos.label}</span>
                      <span className="text-xs text-muted-foreground">{pos.id}</span>
                    </button>
                  ))}
                </div>
                <AnimatePresence>
                  {form.position && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden mt-8">
                      <p className="text-sm text-muted-foreground mb-4">Choose your specific position</p>
                      <div className="flex flex-wrap justify-center gap-3">
                        {SUB_POSITIONS[form.position].map((sub) => (
                          <button key={sub.id} onClick={() => { updateForm({ positionSpecific: sub.id }); setTimeout(goNext, 500); }} className={cn("flex flex-col items-center gap-1 px-5 py-3 rounded-lg border-2 transition-all hover:border-[#1D9E75] hover:bg-[#1D9E75]/5 min-w-[90px]", form.positionSpecific === sub.id ? "border-[#1D9E75] bg-[#1D9E75]/10" : "border-border")}>
                            <span className="text-lg font-bold text-foreground">{sub.id}</span>
                            <span className="text-[10px] text-muted-foreground leading-tight">{sub.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* TEAM (only if missing from profile) */}
            {currentStepId === "team" && (
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">What team and league do you play in?</h1>
                <div className="max-w-md mx-auto text-left">
                  <FootballDropdowns
                    countryId={form.countryId}
                    leagueId={form.leagueId}
                    teamId={form.teamId}
                    countryName={form.country}
                    leagueName={form.league}
                    teamName={form.teamName}
                    onCountryChange={(id, name) => updateForm({ countryId: id, country: name, leagueId: null, league: "", teamId: null, teamName: "" })}
                    onLeagueChange={(id, name) => updateForm({ leagueId: id, league: name, teamId: null, teamName: "" })}
                    onTeamChange={(id, name) => updateForm({ teamId: id, teamName: name })}
                  />
                </div>
                {errors.team && <p className="text-destructive text-xs mt-3 text-center">{errors.team}</p>}
                {errors.league && <p className="text-destructive text-xs mt-1 text-center">{errors.league}</p>}
                <Button onClick={handleContinue} className="mt-8 h-12 px-8 text-base">Continue →</Button>
              </div>
            )}

            {/* SESSION INFO */}
            {currentStepId === "session_info" && (
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-10">What type of session is this?</h1>
                <div className="flex gap-4 justify-center mb-6">
                  {([
                    { id: "match" as SessionType, icon: "⚽", title: "Match", sub: "Official or friendly game" },
                    { id: "training" as SessionType, icon: "🏋️", title: "Training", sub: "Practice session" },
                  ]).map((s) => (
                    <button key={s.id} onClick={() => updateForm({ sessionType: s.id, mdDay: "MD0" })} className={cn("flex flex-col items-center gap-2 p-6 px-8 rounded-xl border-2 transition-all hover:border-primary hover:bg-primary/5 min-w-[140px]", form.sessionType === s.id ? "border-primary bg-primary/5" : "border-border")}>
                      <span className="text-3xl">{s.icon}</span>
                      <span className="font-semibold text-foreground">{s.title}</span>
                      <span className="text-xs text-muted-foreground">{s.sub}</span>
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {form.sessionType && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      {form.sessionType === "match" && (
                        <div className="space-y-4 max-w-md mx-auto mt-4 text-left">
                          {renderDateDropdowns("session_day", "session_month", "session_year", [currentYear - 2, currentYear], "When was the match?")}
                          <div>
                            <label className="text-[13px] font-medium text-foreground block mb-1.5">Opponent (optional)</label>
                            <OpponentSearch value={form.opponent} onChange={(v) => updateForm({ opponent: v })} />
                          </div>
                          {errors.sessionDate && <p className="text-[11px] text-destructive">{errors.sessionDate}</p>}
                        </div>
                      )}
                      {form.sessionType === "training" && (
                        <div className="space-y-5 max-w-lg mx-auto mt-4 text-left">
                          <div>
                            <label className="text-[13px] font-medium text-foreground block mb-2">What type of training session was this?</label>
                            <div className="flex flex-wrap gap-2 justify-center">
                              {mdPills.map((md) => (
                                <button key={md.value} onClick={() => updateForm({ mdDay: md.value })} className={cn("px-4 py-2 rounded-full text-sm font-medium border transition-all", form.mdDay === md.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-foreground")}>
                                  {md.label}
                                </button>
                              ))}
                            </div>
                            {errors.mdDay && <p className="text-[11px] text-destructive mt-1 text-center">{errors.mdDay}</p>}
                          </div>
                          <div className="relative rounded-lg border-l-[3px] border-primary bg-[#0d2a4a] p-4">
                            <HelpCircle className="absolute top-3 right-3 h-4 w-4 text-muted-foreground/40" />
                            <p className="text-[12px] font-semibold text-foreground mb-2">What is MD (Match Day)?</p>
                            <div className="text-[11px] text-[#a8c0e0] leading-[1.8] space-y-0.5">
                              <p>MD stands for "Match Day." Training sessions are classified by proximity to the match.</p>
                              <ul className="mt-2 space-y-0.5">
                                <li><span className="font-bold text-[#7eb8f7]">MD-3</span> — high intensity, tactical</li>
                                <li><span className="font-bold text-[#7eb8f7]">MD-2</span> — moderate intensity</li>
                                <li><span className="font-bold text-[#7eb8f7]">MD-1</span> — light session, activation</li>
                                <li><span className="font-bold text-[#7eb8f7]">MD+1</span> — recovery session</li>
                                <li><span className="font-bold text-[#7eb8f7]">MD+2</span> — return to training</li>
                                <li><span className="font-bold text-[#7eb8f7]">MD+3</span> — full intensity</li>
                              </ul>
                            </div>
                          </div>
                          {renderDateDropdowns("session_day", "session_month", "session_year", [currentYear - 1, currentYear], "Date of this session")}
                          {errors.sessionDate && <p className="text-[11px] text-destructive">{errors.sessionDate}</p>}
                        </div>
                      )}
                      <Button onClick={handleContinue} className="mt-6 h-12 px-8 text-base">Continue →</Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* GPS DATA + CONSENT */}
            {currentStepId === "gps_data" && (
              <div>
                <div className="mb-8">
                  <img src={logo} alt="Campometric" className="h-[54px]" />
                </div>

                {extractionError && (
                  <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-[#2a1f00] p-4 max-w-2xl mx-auto mb-6 text-left">
                    <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-300 font-medium">{extractionError}</p>
                      <p className="text-[11px] text-amber-300/70 mt-1">Your other details have been preserved.</p>
                    </div>
                  </div>
                )}

                {form.entryMethod === "manual" ? (
                  <>
                    <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">Enter your GPS data</h1>

                    <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 max-w-2xl mx-auto mb-6 text-left">
                      <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        You can find these values in your GPS platform export (STATSports, Catapult, gpexe).
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
                        <div key={f.key} className="rounded-lg border border-border/50 bg-[#0d1f35] p-3.5 transition-all focus-within:border-primary">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <label className="text-[13px] font-medium text-foreground">{f.label}</label>
                            {f.required && <span className="text-red-500 text-xs">•</span>}
                            {!f.required && <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded-full">Optional</span>}
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
                          {errors[f.key] && <p className="text-[11px] text-red-500 mt-1.5">{errors[f.key]}</p>}
                        </div>
                      ))}
                    </div>

                    {/* Distance warning (non-blocking) */}
                    {form.manualData.distance && form.manualData.duration && (() => {
                      const [mm] = form.manualData.duration.split(":").map(Number);
                      const dist = parseFloat(form.manualData.distance);
                      return mm > 0 && dist > mm * 250;
                    })() && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 max-w-2xl mx-auto mt-3 text-left">
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300">This distance seems very high for the time played. Please verify.</p>
                      </div>
                    )}

                    {renderConsentSection()}

                    {(() => {
                      const m = form.manualData;
                      const allRequiredFilled = m.duration && m.distance && m.max_sp && m.sp_ev && m.hmld;
                      const canSubmit = allRequiredFilled && form.consent.terms;
                      return (
                        <>
                          <Button onClick={handleSubmit} disabled={!canSubmit} className={cn("mt-6 h-12 px-8 text-base w-full max-w-2xl", !canSubmit && "opacity-50 cursor-not-allowed")}>
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
                      <input id="file-input" type="file" accept={form.entryMethod === "pdf" ? ".pdf" : ".jpg,.jpeg,.png,.webp"} className="hidden" onChange={handleFileSelect} />
                      {form.gpsFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <Check className="h-6 w-6 text-[#1db954]" />
                          <span className="text-foreground font-medium">{form.gpsFile.name}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <FileText className="h-12 w-12 text-muted-foreground" />
                          <p className="text-foreground font-medium">{form.entryMethod === "pdf" ? "Drop your GPS PDF here" : "Drop your screenshot here"}</p>
                          <p className="text-sm text-muted-foreground">{form.entryMethod === "pdf" ? "Works with STATSports, Catapult, gpexe and more" : "Accepts JPG, PNG, WebP"}</p>
                          <p className="text-xs text-primary">click to browse files</p>
                        </div>
                      )}
                    </div>

                    {renderConsentSection()}

                    {(() => {
                      const canSubmit = form.gpsFile && form.consent.terms;
                      return (
                        <>
                          <Button onClick={handleSubmit} disabled={!canSubmit} className={cn("mt-6 h-12 px-8 text-base", !canSubmit && "opacity-50 cursor-not-allowed")}>
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
