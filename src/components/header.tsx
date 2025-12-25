import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Button } from "./ui/button";

type Props = {
  currentDate: Date;
  prevMonth: () => void;
  nextMonth: () => void;
  resetToday: () => void;
};
function Header({ currentDate, prevMonth, nextMonth, resetToday }: Props) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-neutral-800 pb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarIcon className="size-6 text-purple-400" />
          <span className="tracking-normal bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-white">
            Contest Calendar
          </span>
        </h1>
      </div>

      <div className="flex items-center gap-3 bg-neutral-900/50 p-1.5 rounded-lg border border-neutral-800">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevMonth}
          className="hover:bg-neutral-800 text-neutral-400 hover:text-white"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="text-base font-semibold w-36 text-center tabular-nums">
          {format(currentDate, "MMMM yyyy")}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextMonth}
          className="hover:bg-neutral-800 text-neutral-400 hover:text-white"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={resetToday}
          className="bg-neutral-800 hover:bg-neutral-700 text-white"
        >
          Today
        </Button>
      </div>
    </div>
  );
}
export default Header;
