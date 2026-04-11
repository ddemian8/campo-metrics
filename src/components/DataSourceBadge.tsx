import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DataSourceBadgeProps {
  inputMethod: string | null | undefined;
  size?: "sm" | "md";
}

const config: Record<string, { label: string; color: string; dot: string; tooltip: string }> = {
  pdf_upload: {
    label: "PDF Verified",
    color: "text-[#1D9E75] border-[#1D9E75]/30 bg-[#1D9E75]/10",
    dot: "bg-[#1D9E75]",
    tooltip: "Data extracted from an official GPS platform PDF (STATSports, Catapult, gpexe, etc.)",
  },
  screenshot: {
    label: "Screenshot",
    color: "text-amber-400 border-amber-400/30 bg-amber-400/10",
    dot: "bg-amber-400",
    tooltip: "Data extracted from a screenshot of GPS results",
  },
  manual: {
    label: "Manual entry",
    color: "text-muted-foreground border-border bg-secondary",
    dot: "bg-muted-foreground",
    tooltip: "Data entered manually by the player",
  },
};

export const DataSourceBadge = ({ inputMethod, size = "sm" }: DataSourceBadgeProps) => {
  const method = inputMethod || "manual";
  const c = config[method] || config.manual;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border font-medium",
              c.color,
              size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
            )}
          >
            <span className={cn("rounded-full shrink-0", c.dot, size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2")} />
            {c.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px] text-xs">
          {c.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
