// Position-based GPS benchmarks for semi-professional level
// Used for metric comparison on report pages

export interface PositionBenchmark {
  distance: number;    // km/90
  hsr: number;         // m/90
  sprintDist: number;  // m/90
  topSpeed: number;    // km/h
  accelerations: number; // /90
  decelerations: number; // /90
}

export const BENCHMARKS: Record<string, PositionBenchmark> = {
  // Goalkeepers
  GK: { distance: 5.5, hsr: 120, sprintDist: 50, topSpeed: 24.0, accelerations: 20, decelerations: 18 },
  // Defenders
  CB: { distance: 9.8, hsr: 520, sprintDist: 180, topSpeed: 30.5, accelerations: 45, decelerations: 42 },
  RB: { distance: 9.8, hsr: 520, sprintDist: 180, topSpeed: 30.5, accelerations: 45, decelerations: 42 },
  LB: { distance: 9.8, hsr: 520, sprintDist: 180, topSpeed: 30.5, accelerations: 45, decelerations: 42 },
  RWB: { distance: 9.8, hsr: 520, sprintDist: 180, topSpeed: 30.5, accelerations: 45, decelerations: 42 },
  LWB: { distance: 9.8, hsr: 520, sprintDist: 180, topSpeed: 30.5, accelerations: 45, decelerations: 42 },
  // Midfielders
  CDM: { distance: 10.5, hsr: 620, sprintDist: 210, topSpeed: 30.0, accelerations: 52, decelerations: 48 },
  CM: { distance: 10.5, hsr: 620, sprintDist: 210, topSpeed: 30.0, accelerations: 52, decelerations: 48 },
  CAM: { distance: 10.5, hsr: 620, sprintDist: 210, topSpeed: 30.0, accelerations: 52, decelerations: 48 },
  RM: { distance: 10.5, hsr: 620, sprintDist: 210, topSpeed: 30.0, accelerations: 52, decelerations: 48 },
  LM: { distance: 10.5, hsr: 620, sprintDist: 210, topSpeed: 30.0, accelerations: 52, decelerations: 48 },
  // Forwards
  ST: { distance: 9.5, hsr: 680, sprintDist: 280, topSpeed: 31.5, accelerations: 48, decelerations: 44 },
  CF: { distance: 9.5, hsr: 680, sprintDist: 280, topSpeed: 31.5, accelerations: 48, decelerations: 44 },
  SS: { distance: 9.5, hsr: 680, sprintDist: 280, topSpeed: 31.5, accelerations: 48, decelerations: 44 },
  RW: { distance: 9.5, hsr: 680, sprintDist: 280, topSpeed: 31.5, accelerations: 48, decelerations: 44 },
  LW: { distance: 9.5, hsr: 680, sprintDist: 280, topSpeed: 31.5, accelerations: 48, decelerations: 44 },
};

// Fallback for unknown positions
const DEFAULT_BENCHMARK: PositionBenchmark = {
  distance: 9.8, hsr: 520, sprintDist: 210, topSpeed: 30.0, accelerations: 45, decelerations: 42,
};

export function getBenchmark(position?: string | null): PositionBenchmark {
  if (!position) return DEFAULT_BENCHMARK;
  return BENCHMARKS[position.toUpperCase()] || DEFAULT_BENCHMARK;
}

// CPI thresholds per position zone for "How good am I" display
export const CPI_THRESHOLDS: Record<string, { elite: number; excellent: number; good: number; average: number }> = {
  GK: { elite: 85, excellent: 70, good: 55, average: 40 },
  CB: { elite: 88, excellent: 73, good: 58, average: 43 },
  RB: { elite: 88, excellent: 73, good: 58, average: 43 },
  LB: { elite: 88, excellent: 73, good: 58, average: 43 },
  RWB: { elite: 88, excellent: 73, good: 58, average: 43 },
  LWB: { elite: 88, excellent: 73, good: 58, average: 43 },
  CDM: { elite: 86, excellent: 72, good: 57, average: 42 },
  CM: { elite: 86, excellent: 72, good: 57, average: 42 },
  CAM: { elite: 86, excellent: 72, good: 57, average: 42 },
  RM: { elite: 87, excellent: 74, good: 59, average: 44 },
  LM: { elite: 87, excellent: 74, good: 59, average: 44 },
  ST: { elite: 85, excellent: 71, good: 56, average: 41 },
  CF: { elite: 85, excellent: 71, good: 56, average: 41 },
  SS: { elite: 85, excellent: 71, good: 56, average: 41 },
  RW: { elite: 87, excellent: 74, good: 59, average: 44 },
  LW: { elite: 87, excellent: 74, good: 59, average: 44 },
};

export type RatingLevel = "elite" | "above_average" | "average" | "below_average" | "needs_improvement";

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
  below_average: { label: "BELOW AVERAGE", color: "text-white", bg: "bg-orange-500", description: "Keep pushing — targeted training will help you improve" },
  needs_work: { label: "NEEDS WORK", color: "text-white", bg: "bg-red-500", description: "Every champion starts somewhere — let's build your game" },
};

export function getCpiRatingKey(score: number): string {
  if (score >= 90) return "elite";
  if (score >= 75) return "excellent";
  if (score >= 60) return "good";
  if (score >= 45) return "average";
  if (score >= 30) return "below_average";
  return "needs_work";
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
