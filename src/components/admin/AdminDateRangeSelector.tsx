import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DateRange = { from: Date; to: Date; label: string };

const PRESETS: { label: string; getRange: () => { from: Date; to: Date } }[] = [
  { label: "Today", getRange: () => { const d = new Date(); d.setHours(0,0,0,0); return { from: d, to: new Date() }; }},
  { label: "Yesterday", getRange: () => { const d = subDays(new Date(), 1); d.setHours(0,0,0,0); const e = new Date(d); e.setHours(23,59,59,999); return { from: d, to: e }; }},
  { label: "Last 7 days", getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Last 30 days", getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "Last 90 days", getRange: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { label: "This month", getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Last month", getRange: () => { const last = subMonths(new Date(), 1); return { from: startOfMonth(last), to: endOfMonth(last) }; }},
  { label: "This year", getRange: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function AdminDateRangeSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [showCustom, setShowCustom] = useState(false);

  const handlePreset = (preset: typeof PRESETS[0]) => {
    const range = preset.getRange();
    onChange({ ...range, label: preset.label });
    setShowCustom(false);
    setOpen(false);
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onChange({ from: customFrom, to: customTo, label: `${format(customFrom, "MMM d")} – ${format(customTo, "MMM d")}` });
      setOpen(false);
      setShowCustom(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarIcon size={14} />
          <span className="text-xs">{value.label}</span>
          <ChevronDown size={12} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          <div className="border-r border-border p-2 min-w-[140px]">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p)}
                className={cn(
                  "w-full text-left text-xs px-3 py-1.5 rounded hover:bg-muted/50 transition-colors",
                  value.label === p.label && "bg-primary/10 text-primary font-medium"
                )}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setShowCustom(true)}
              className={cn(
                "w-full text-left text-xs px-3 py-1.5 rounded hover:bg-muted/50 transition-colors",
                showCustom && "bg-primary/10 text-primary font-medium"
              )}
            >
              Custom range
            </button>
          </div>
          {showCustom && (
            <div className="p-3 space-y-3">
              <div className="flex gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">From</p>
                  <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-2 pointer-events-auto" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">To</p>
                  <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className="p-2 pointer-events-auto" />
                </div>
              </div>
              <Button size="sm" className="w-full" onClick={handleCustomApply} disabled={!customFrom || !customTo}>
                Apply
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function getDefaultDateRange(): DateRange {
  return { from: subDays(new Date(), 30), to: new Date(), label: "Last 30 days" };
}

export function getPreviousPeriod(range: DateRange): { from: Date; to: Date } {
  const diff = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - diff), to: new Date(range.from.getTime()) };
}

export function calcChange(current: number, previous: number): { pct: number; direction: "up" | "down" | "flat" } {
  if (previous === 0) return { pct: current > 0 ? 100 : 0, direction: current > 0 ? "up" : "flat" };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
}
