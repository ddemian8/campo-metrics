// Position-based GPS benchmarks for ELITE professional level
// Used for metric comparison on report pages

export interface PositionBenchmark {
  distance: number;    // km/90
  hsr: number;         // m/90
  sprintDist: number;  // m/90
  topSpeed: number;    // km/h
  accelerations: number; // /90
  decelerations: number; // /90
  hmld: number;        // m/90
}

export const BENCHMARKS: Record<string, PositionBenchmark> = {
  // Goalkeepers
  GK: { distance: 6.0, hsr: 150, sprintDist: 60, topSpeed: 28.0, accelerations: 28, decelerations: 25, hmld: 400 },
  // Centre Backs
  CB: { distance: 10.0, hsr: 735, sprintDist: 220, topSpeed: 33.0, accelerations: 55, decelerations: 50, hmld: 950 },
  // Full Backs / Wing Backs
  RB: { distance: 11.0, hsr: 1050, sprintDist: 350, topSpeed: 34.0, accelerations: 62, decelerations: 58, hmld: 1250 },
  LB: { distance: 11.0, hsr: 1050, sprintDist: 350, topSpeed: 34.0, accelerations: 62, decelerations: 58, hmld: 1250 },
  RWB: { distance: 11.0, hsr: 1050, sprintDist: 350, topSpeed: 34.0, accelerations: 62, decelerations: 58, hmld: 1250 },
  LWB: { distance: 11.0, hsr: 1050, sprintDist: 350, topSpeed: 34.0, accelerations: 62, decelerations: 58, hmld: 1250 },
  // Central Midfielders
  CDM: { distance: 11.5, hsr: 850, sprintDist: 280, topSpeed: 33.0, accelerations: 65, decelerations: 60, hmld: 1150 },
  CM: { distance: 11.5, hsr: 850, sprintDist: 280, topSpeed: 33.0, accelerations: 65, decelerations: 60, hmld: 1150 },
  CAM: { distance: 11.5, hsr: 850, sprintDist: 280, topSpeed: 33.0, accelerations: 65, decelerations: 60, hmld: 1150 },
  // Wingers / Wide Midfielders
  RM: { distance: 10.8, hsr: 1100, sprintDist: 400, topSpeed: 35.0, accelerations: 58, decelerations: 55, hmld: 1350 },
  LM: { distance: 10.8, hsr: 1100, sprintDist: 400, topSpeed: 35.0, accelerations: 58, decelerations: 55, hmld: 1350 },
  RW: { distance: 10.8, hsr: 1100, sprintDist: 400, topSpeed: 35.0, accelerations: 58, decelerations: 55, hmld: 1350 },
  LW: { distance: 10.8, hsr: 1100, sprintDist: 400, topSpeed: 35.0, accelerations: 58, decelerations: 55, hmld: 1350 },
  // Forwards
  ST: { distance: 10.2, hsr: 1050, sprintDist: 380, topSpeed: 35.5, accelerations: 55, decelerations: 52, hmld: 1250 },
  CF: { distance: 10.2, hsr: 1050, sprintDist: 380, topSpeed: 35.5, accelerations: 55, decelerations: 52, hmld: 1250 },
  SS: { distance: 10.2, hsr: 1050, sprintDist: 380, topSpeed: 35.5, accelerations: 55, decelerations: 52, hmld: 1250 },
};

// Fallback for unknown positions
const DEFAULT_BENCHMARK: PositionBenchmark = {
  distance: 10.5, hsr: 850, sprintDist: 280, topSpeed: 33.0, accelerations: 55, decelerations: 50, hmld: 1100,
};

export function getBenchmark(position?: string | null): PositionBenchmark {
  if (!position) return DEFAULT_BENCHMARK;
  return BENCHMARKS[position.toUpperCase()] || DEFAULT_BENCHMARK;
}

// Rating system: compare player's per-90 value against elite benchmark
// ≥100% of elite → "Elite"
// 75-99% of elite → "Excellent"
// 50-74% of elite → "Good"
// 35-49% of elite → "Average"
// <35% of elite → "Developing"
export function getMetricRating(playerValue: number, eliteBenchmark: number): string {
  if (eliteBenchmark <= 0) return "average";
  const pct = (playerValue / eliteBenchmark) * 100;
  if (pct >= 100) return "elite";
  if (pct >= 75) return "excellent";
  if (pct >= 50) return "good";
  if (pct >= 35) return "average";
  return "developing";
}

export function getElitePercentage(playerValue: number, eliteBenchmark: number): number {
  if (eliteBenchmark <= 0) return 0;
  return Math.min(150, Math.max(0, (playerValue / eliteBenchmark) * 100));
}

export type RatingLevel = "elite" | "excellent" | "good" | "average" | "developing";

export interface RatingConfig {
  label: string;
  color: string;
  bg: string;
  description: string;
}

export const CPI_RATING_MAP: Record<string, RatingConfig> = {
  elite: { label: "ELITE", color: "text-purple-200", bg: "bg-purple-600", description: "You perform at a professional top-tier level" },
  excellent: { label: "EXCELLENT", color: "text-white", bg: "bg-[#1D9E75]", description: "You're among the best performers at your level" },
  good: { label: "GOOD", color: "text-white", bg: "bg-primary", description: "Strong performance with room to reach the next level" },
  average: { label: "AVERAGE", color: "text-yellow-900", bg: "bg-yellow-400", description: "Solid foundation — focus on key areas to improve" },
  developing: { label: "DEVELOPING", color: "text-white", bg: "bg-orange-500", description: "Keep pushing — targeted training will help you improve" },
};

export function getCpiRatingKey(score: number): string {
  if (score >= 90) return "elite";
  if (score >= 75) return "excellent";
  if (score >= 60) return "good";
  if (score >= 45) return "average";
  return "developing";
}

export const METRIC_EXPLANATIONS: Record<string, { icon: string; description: string }> = {
  "Total Distance": { icon: "🏃", description: "Total distance shows how much ground you covered during the session. Higher values indicate better endurance and work rate." },
  "High-Speed Running": { icon: "💨", description: "High-speed running (HSR) measures distance covered at high intensity. It reflects your ability to sustain efforts above jogging pace." },
  "Sprint Distance": { icon: "⚡", description: "Sprint distance is the total distance covered at near-maximum speed. It shows your explosive capacity and willingness to sprint." },
  "Top Speed": { icon: "🚀", description: "Top speed is the maximum velocity you reached during the session. It reflects your raw speed potential." },
  "Accelerations": { icon: "🔥", description: "Accelerations count how many times you rapidly increased speed. Important for pressing, counter-attacks, and getting past defenders." },
  "Decelerations": { icon: "🛑", description: "Decelerations count how many times you rapidly slowed down. Critical for defensive actions, direction changes, and injury prevention." },
  "HMLD": { icon: "💪", description: "High Metabolic Load Distance measures total distance at high physical cost. It combines speed and acceleration efforts into one metric." },
  "Average Speed": { icon: "📊", description: "Average speed shows your typical movement pace throughout the session. It reflects overall activity level." },
};
