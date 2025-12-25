"use client";

import {
  fetchContestsAction,
  type Contest,
} from "@/app/actions/get-contests-data";
import DaysGrid from "@/components/days-grid";
import Filters from "@/components/filters";
import Header from "@/components/header";
import { addMonths, format, parseISO, subMonths } from "date-fns";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const DAYS = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(2024, 0, 7);
  date.setDate(date.getDate() + i);

  // 'short' gives "Sun", "Mon"; use 'long' for "Sunday", "Monday"
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
});

function Calendar() {
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<Record<string, boolean>>({
    LeetCode: true,
    CodeForces: true,
    CodeChef: true,
  });

  useEffect(() => {
    setMounted(true);
    setCurrentDate(new Date());

    const loadData = async () => {
      try {
        const data = await fetchContestsAction();
        setContests(data);
      } catch (error) {
        console.error("Failed to load contests:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const contestsByDay = useMemo(() => {
    const map = new Map<string, Contest[]>();
    contests.forEach((c) => {
      // @ts-ignore
      if (filters[c.site] === false) return;
      const dayKey = format(parseISO(c.start_time), "yyyy-MM-dd");
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)?.push(c);
    });
    return map;
  }, [contests, filters]);

  const nextMonth = () =>
    currentDate && setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () =>
    currentDate && setCurrentDate(subMonths(currentDate, 1));
  const resetToday = () => setCurrentDate(new Date());

  if (!mounted || !currentDate) return null;

  return (
    <div className="min-h-screen min-w-280 bg-black text-white p-4 md:p-8 md:py-5 font-sans selection:bg-neutral-800">
      <Link href="/" className="flex w-max py-4 px-2 items-center gap-1.5 text-base group">
        <ChevronLeft className="size-5" />
        <span className="group-hover:underline">Leaderboard</span>
      </Link>
      <div className="max-w-400 mx-auto space-y-6">
        <Header
          currentDate={currentDate}
          prevMonth={prevMonth}
          nextMonth={nextMonth}
          resetToday={resetToday}
        />

        <Filters loading={loading} filters={filters} setFilters={setFilters} />

        <div className="bg-neutral-900 rounded-xl border border-neutral-800 flex flex-col h-212.5 shadow-2xl">
          <div className="grid grid-cols-7 border-b border-neutral-800 bg-neutral-900/80 flex-none">
            {DAYS.map((day) => (
              <div
                key={day}
                className="py-4 text-left pl-4 text-xs font-bold text-neutral-500 uppercase tracking-widest"
              >
                {day}
              </div>
            ))}
          </div>

          <DaysGrid
            currentDate={currentDate}
            contestsByDay={contestsByDay}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

export default Calendar;
