import type { Contest } from "@/app/actions/get-contests-data";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useMemo } from "react";
import EventPill from "./event-pill";
import { Skeleton } from "./ui/skeleton";

type Props = {
  currentDate: Date;
  contestsByDay: Map<string, Contest[]>;
  loading: boolean;
};

function DaysGrid({ currentDate, contestsByDay, loading }: Props) {
  const calendarDays = useMemo(() => {
    if (!currentDate) return [];
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentDate)),
      end: endOfWeek(endOfMonth(currentDate)),
    });
  }, [currentDate]);

  return (
    <div className="grid grid-cols-7 flex-1 min-h-0 divide-x divide-y divide-neutral-800 bg-neutral-950">
      {calendarDays.map((day) => {
        const dayKey = format(day, "yyyy-MM-dd");
        const dayContests = contestsByDay.get(dayKey) || [];
        const isCurrentMonth = isSameMonth(day, currentDate);
        const isToday = isSameDay(day, new Date());

        return (
          <div
            key={day.toString()}
            className={cn(
              "relative flex flex-col p-2 min-h-0 h-full overflow-hidden",
              !isCurrentMonth && "bg-neutral-900/30 text-neutral-600",
              isToday &&
                "bg-green-900/30 inset-ring-border ring-2 ring-green-700"
            )}
          >
            <span
              className={cn(
                "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-2 transition-all shrink-0",
                isToday
                  ? "bg-white text-black shadow-lg shadow-white/20"
                  : "text-neutral-500"
              )}
            >
              {format(day, "d")}
            </span>

            <div className="flex-1 min-h-0 w-full relative">
              <ScrollArea className="h-full w-full pr-3">
                <div className="space-y-1.5 pb-2">
                  {loading && isCurrentMonth && dayContests.length === 0 ? (
                    <div className="space-y-2 px-1 opacity-50">
                      <Skeleton className="h-5 w-full bg-neutral-800 rounded-md" />
                    </div>
                  ) : isToday && dayContests.length === 0 ? (
                    <div className="text-neutral-300 text-sm italic pl-1 pt-2">
                      No contest today!
                    </div>
                  ) : (
                    dayContests.map((contest) => (
                      <EventPill
                        key={`${contest.site}-${contest.name}-${contest.start_time}`}
                        contest={contest}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default DaysGrid;
