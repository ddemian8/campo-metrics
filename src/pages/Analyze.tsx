import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image, Keyboard, Shield, Crosshair, Swords, Goal, ChevronLeft, Check, Loader2, FileText, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type EntryMethod = "pdf" | "screenshot" | "manual";
type Position = "GK" | "DEF" | "MID" | "FWD";
type SessionType = "match" | "training";
type MDDay = "MD-2" | "MD-1" | "MD0" | "MD+1" | "MD+2" | "other";

interface FormState {
  entryMethod: EntryMethod | null;
  firstName: string;
  lastName: string;
  age: string;
  weight: string;
  position: Position | null;
  teamName: string;
  league: string;
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
    age: "",
    weight: "",
    position: null,
    teamName: "",
    league: "",
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
  });

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

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 2) {
      if (!form.firstName.trim() || !form.lastName.trim())
        e.name = "Please enter your full name";
    }
    if (s === 3) {
      if (!form.age) e.age = "Required";
      if (!form.weight) e.weight = "Required";
    }
    if (s === 5) {
      if (!form.teamName.trim()) e.team = "Required";
      if (!form.league.trim()) e.league = "Required";
    }
    if (s === 7 && form.entryMethod === "manual") {
      if (!form.manualData.duration) e.duration = "Required";
      else if (!/^\d{1,3}:\d{2}$/.test(form.manualData.duration)) e.duration = "Please use mm:ss format (e.g. 08:24)";
      if (!form.manualData.distance) e.distance = "Required";
      if (!form.manualData.max_sp) e.max_sp = "Required";
      if (!form.manualData.sp_ev) e.sp_ev = "Required";
      if (!form.manualData.hmld) e.hmld = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = useCallback(() => {
    if (validateStep(step)) goNext();
  }, [step, form]);

  const handleSubmit = () => {
    if (!validateStep(7)) return;
    setIsLoading(true);
  };

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

            {/* STEP 2 */}
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
                <Button onClick={handleContinue} className="mt-8 h-12 px-8 text-base">Continue →</Button>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-10">
                  How old are you and what is your weight?
                </h1>
                <div className="flex gap-4 max-w-sm mx-auto">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Age (years)"
                      min={14}
                      max={50}
                      value={form.age}
                      onChange={(e) => updateForm({ age: e.target.value })}
                      className="text-center text-lg h-12 bg-secondary border-border"
                    />
                    {errors.age && <p className="text-destructive text-xs mt-1">{errors.age}</p>}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Weight (kg)"
                      min={40}
                      max={130}
                      value={form.weight}
                      onChange={(e) => updateForm({ weight: e.target.value })}
                      className="text-center text-lg h-12 bg-secondary border-border"
                    />
                    {errors.weight && <p className="text-destructive text-xs mt-1">{errors.weight}</p>}
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

            {/* STEP 5 */}
            {step === 5 && (
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-10">
                  What team and league do you play in?
                </h1>
                <div className="flex flex-col gap-4 max-w-md mx-auto">
                  <div>
                    <Input
                      placeholder="e.g. FC Petrocub, Dacia Buiucani, FC Porto..."
                      value={form.teamName}
                      onChange={(e) => updateForm({ teamName: e.target.value })}
                      className="text-center text-lg h-12 bg-secondary border-border"
                    />
                    {errors.team && <p className="text-destructive text-xs mt-1">{errors.team}</p>}
                  </div>
                  <div>
                    <Input
                      placeholder="e.g. Divizia Națională, Liga 1, Primeira Liga..."
                      value={form.league}
                      onChange={(e) => updateForm({ league: e.target.value })}
                      className="text-center text-lg h-12 bg-secondary border-border"
                    />
                    {errors.league && <p className="text-destructive text-xs mt-1">{errors.league}</p>}
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
                    <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-8">Enter your GPS data</h1>
                    <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto text-left">
                      {[
                        { key: "distance", label: "Total Distance (km)", ph: "11.4" },
                        { key: "maxSpeed", label: "Max Speed (km/h)", ph: "32.1" },
                        { key: "sprints", label: "Sprint Count", ph: "24" },
                        { key: "hmld", label: "HMLD (m)", ph: "1920" },
                        { key: "sprintDistance", label: "Sprint Distance (m)", ph: "Optional" },
                        { key: "distanceInPossession", label: "Distance in Poss. (m)", ph: "Optional" },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                          <Input
                            type="number"
                            placeholder={f.ph}
                            value={(form.manualData as any)[f.key]}
                            onChange={(e) => updateManual(f.key, e.target.value)}
                            className="h-11 bg-secondary border-border"
                          />
                          {(errors as any)[f.key] && (
                            <p className="text-destructive text-xs mt-1">{(errors as any)[f.key]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button onClick={handleSubmit} className="mt-8 h-12 px-8 text-base">
                      Generate my report →
                    </Button>
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
                    <Button
                      onClick={handleSubmit}
                      disabled={!form.gpsFile}
                      className="mt-8 h-12 px-8 text-base"
                    >
                      Analyse my session →
                    </Button>
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
