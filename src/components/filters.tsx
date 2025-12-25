import icons from "@/assets/icons";
import { Label } from "@radix-ui/react-label";
import { Loader2 } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { Switch } from "./ui/switch";

type Props = {
  loading: boolean;
  filters: Record<string, boolean>;
  setFilters: Dispatch<SetStateAction<Record<string, boolean>>>;
};

function Filters({ loading, setFilters, filters }: Props) {
  return (
    <div className="flex items-center gap-6 border-b border-neutral-800 pb-6">
      <span className="md:text-sm text-xs font-medium text-neutral-500 uppercase tracking-widest">
        Filter:
      </span>
      <div className="flex flex-wrap items-center gap-10">
        {Object.keys(icons).map((platform) => (
          <div key={platform} className="flex items-center gap-2">
            <Switch
              id={platform}
              checked={filters[platform]}
              onCheckedChange={(c) =>
                setFilters((p) => ({ ...p, [platform]: c }))
              }
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-500! cursor-pointer"
            />
            <Label
              htmlFor={platform}
              className="text-neutral-300 font-medium cursor-pointer md:text-[1em] text-[0.7em]"
            >
              {platform}
            </Label>
          </div>
        ))}
      </div>
      {loading && (
        <div className="ml-auto flex items-center text-xs text-neutral-500 gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          Updating...
        </div>
      )}
    </div>
  );
}
export default Filters;
