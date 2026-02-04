import type { Contest } from "@/app/actions/get-contests-data";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@radix-ui/react-hover-card";
import { parseISO, format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import icons from "@/assets/icons";

const formatDuration = (seconds: number) => {
  const hours = seconds / 3600;
  const days = hours / 24;

  // Less than an hour (rare, but possible)
  if (hours < 1) return `${Math.floor(seconds / 60)}m`;

  // Less than 24 hours -> Show e.g. "1.5h" or "2h"
  if (hours < 24) {
    // Remove .0 if it's a whole number (2.0h -> 2h)
    return `${Number(hours.toFixed(1))}h`;
  }

  // 24 hours or more -> Show e.g. "16d" or "2.5d"
  return `${Number(days.toFixed(1))}d`;
};

export const PLATFORM_CONFIG: Record<
  string,
  { color: string; label: keyof typeof icons }
> = {
  LeetCode: {
    color:
      "bg-neutral-500/20 text-neutral-200 border-neutral-500/30 hover:bg-neutral-500/30",
    label: "LeetCode",
  },
  CodeForces: {
    color:
      "bg-neutral-500/20 text-neutral-200 border-neutral-500/30 hover:bg-neutral-500/30",
    label: "CodeForces",
  },
  CodeChef: {
    color:
      "bg-neutral-700/30 text-neutral-200 border-neutral-500/30 hover:bg-neutral-700/40",
    label: "CodeChef",
  },
};


function EventPill({ contest }: { contest: Contest }) {
  const config = PLATFORM_CONFIG[contest.site] || {
    color: "bg-neutral-800 text-neutral-300",
    label: contest.site,
  };

  const SiteLogo = icons[contest.site];

  const contestName =
    !(contest.site === "CodeForces" && contest.name.includes("Div."))
      ? contest.name
      : contest.name.split("(")[1].split(")")[0];

  console.table({ contestName });
  
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <a
          href={contest.url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "block text-[11px] font-medium px-2 py-1.5 rounded-md border truncate transition-all hover:scale-100 scale-95 cursor-pointer shadow-sm relative z-10",
            config.color
          )}
        >
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[1.15em] font-bold font-mono tracking-tight whitespace-nowrap">
                {format(parseISO(contest.start_time), "h:mm a")}
              </span>
              <SiteLogo className="size-5" />
            </div>
            <span className="truncate opacity-90">{contestName}</span>
          </div>
        </a>
      </HoverCardTrigger>

      <HoverCardContent
        className="w-80 p-0 border-neutral-800 bg-neutral-900 shadow-2xl z-50"
        align="start"
        sideOffset={5}
      >
        <div className="bg-neutral-950 p-4 border-b border-neutral-800 flex justify-between items-start">
          <div>
            <h4 className="font-bold text-sm text-white flex gap-2 items-center">
              <SiteLogo className="size-4" />
              {config.label}
            </h4>
            <span className="text-xs text-neutral-500">Contest Details</span>
          </div>
          <ExternalLink className="w-4 h-4 text-neutral-600" />
        </div>

        <div className="p-4 space-y-4">
          <p className="font-medium text-neutral-200 text-sm leading-snug wrap-break-word">
            {contest.name}
          </p>

          <div className="grid grid-cols-2 gap-3 text-neutral-400">
            <div className="space-y-1">
              <div className="uppercase tracking-wider text-xs font-semibold">
                Start Time
              </div>
              <div className="font-mono font-bold text-[0.8em] bg-neutral-800 text-neutral-200 px-2 py-1 rounded block border border-neutral-700">
                {/* e.g.,  25 Dec, 2:30 PM */}
                {format(parseISO(contest.start_time), "d MMM, h:mm a")}
              </div>
            </div>

            <div className="space-y-1">
              <div className="uppercase tracking-wider text-xs font-semibold">
                Duration
              </div>
              <div className="font-mono font-bold text-[0.8em] bg-neutral-800 text-neutral-200 px-2 py-1 rounded block border border-neutral-700">
                {formatDuration(contest.duration)}
              </div>
            </div>
          </div>

          <Button
            asChild
            className="w-full bg-white text-black hover:bg-neutral-200 font-bold transition-colors"
            size="sm"
          >
            <a href={contest.url} target="_blank" rel="noreferrer">
              Register Now
            </a>
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export default EventPill;
