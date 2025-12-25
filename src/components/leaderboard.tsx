"use client";

import { ColumnDef, flexRender } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Skeleton } from "./ui/skeleton";
import LeaderboardRow from "./leaderboard-row";
import {
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import {
  firstYearUsers,
  secondYearUsers,
  thirdYearUsers,
  type UserListData,
} from "@/lib/leetcode-usernames";
import { getLeaderboardData } from "@/app/actions/get-leaderboard-data";
import { type LeaderboardData as User } from "@/app/actions/get-leaderboard-data";
import OverlayLoader from "./overlay-loader";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type BatchKey = "1st Year" | "2nd Year" | "3rd Year";

const BATCH_CONFIG: Record<BatchKey, UserListData[]> = {
  "1st Year": firstYearUsers,
  "2nd Year": secondYearUsers,
  "3rd Year": thirdYearUsers,
};

const STORAGE_KEY = "leetcode_leaderboard_batch_preference";

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "rank",
    header: "Rank",
    size: 10,
    cell: ({ row }) =>
      (() => {
        const rank = row.getValue("rank") as number;
        if (rank == 1)
          return (
            <div className="flex items-center gap-0.5">
              <Trophy className="size-[0.9em]" />
              {rank}
            </div>
          );

        return <div>#{rank}</div>;
      })(),
  },
  {
    accessorKey: "username",
    header: "Username",
    size: 40,
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("username")}</div>
    ),
  },
  {
    accessorKey: "rating",
    size: 15,
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() !== "desc")}
        className={`-ml-4 hover:bg-muted cursor-pointer ${
          column.getIsSorted() ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        Rating
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div>{row.getValue("rating")}</div>,
  },
  {
    accessorKey: "contests",
    size: 10,
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() !== "desc")}
        className={`-ml-4 hover:bg-muted cursor-pointer ${
          column.getIsSorted() ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        Contests
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div>{row.getValue("contests")}</div>,
  },
  {
    id: "solved",
    accessorFn: (row) => row.solved.easy + row.solved.medium + row.solved.hard,
    size: 50,
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() !== "desc")}
        className={`-ml-4 hover:bg-muted cursor-pointer ${
          column.getIsSorted() ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        Questions Solved
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) =>
      (() => {
        const totalSolved = row.getValue("solved") as number;
        const solved = row.original.solved;

        return (
          <div className="flex gap-1.5 items-baseline">
            <span className="font-medium">{totalSolved}</span>
            <div className="text-[0.9em] text-neutral-200">
              <span>&#91;</span>
              <span className="text-easy-q">{solved.easy}</span>
              <span className="mr-0.5">,</span>
              <span className="text-medium-q">{solved.medium}</span>
              <span className="mr-0.5">,</span>
              <span className="text-hard-q">{solved.hard}</span>
              <span>&#93;</span>
            </div>
          </div>
        );
      })(),
  },
];

function Leaderboard() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [selectedBatch, setSelectedBatch] = useState<BatchKey | undefined>();

  useEffect(() => {
    const savedBatch = localStorage.getItem(STORAGE_KEY);
    if (savedBatch && Object.keys(BATCH_CONFIG).includes(savedBatch)) {
      setSelectedBatch(savedBatch as BatchKey);
    } else {
      setSelectedBatch("1st Year");
    }
  }, []);

  const handleBatchChange = (batch: BatchKey) => {
    setSelectedBatch(batch);
    localStorage.setItem(STORAGE_KEY, batch);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedBatch) return;

      try {
        setLoading(true);
        setProgress(0);
        setData([]);

        const currentUserList = BATCH_CONFIG[selectedBatch];
        const BATCH_SIZE = 10;
        const totalUsers = currentUserList.length;
        const allUsers: User[] = [];

        if (totalUsers === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        for (let i = 0; i < totalUsers; i += BATCH_SIZE) {
          const batch = currentUserList.slice(i, i + BATCH_SIZE);
          const batchResults = await getLeaderboardData(batch);

          allUsers.push(...batchResults);

          setProgress(Math.round(((i + batch.length) / totalUsers) * 100));
        }

        const rankedUsers = allUsers
          .sort((a, b) => {
            if (b.rating === a.rating) {
              return b.contests - a.contests;
            }
            
            return b.rating - a.rating;
          })
          .map((user, index) => ({ ...user, rank: index + 1 }));

        setData(rankedUsers);
      } catch (error) {
        console.error("Failed to fetch leaderboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedBatch]);

  useEffect(() => {
    if (!loading && data.length > 0) {
      setSorting([{ id: "rating", desc: true }]);
    }
  }, [loading, data.length]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="w-full bg-background text-foreground rounded-xl transition-colors">
      <div className="flex items-center justify-between py-4 gap-4">
        <Input
          placeholder="search user by name..."
          value={
            (table.getColumn("username")?.getFilterValue() as string) ?? ""
          }
          onChange={(e) =>
            table.getColumn("username")?.setFilterValue(e.target.value)
          }
          className="max-w-sm bg-muted/50 border-muted-foreground/20 focus-visible:ring-primary"
        />

        <DropdownMenu>
          <DropdownMenuTrigger disabled={loading} asChild>
            <Button
              variant="outline"
              className="min-w-[140px] justify-between cursor-pointer"
            >
              {selectedBatch}
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="shadow-2xl shadow-neutral-950"
          >
            {(Object.keys(BATCH_CONFIG) as BatchKey[]).map((batchKey) => (
              <DropdownMenuItem
                key={batchKey}
                onClick={() => handleBatchChange(batchKey)}
                className="cursor-pointer"
              >
                {batchKey}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        className={cn(
          "rounded-md border border-border overflow-hidden relative",
          loading && "min-h-100"
        )}
      >
        {loading && <OverlayLoader progress={progress} />}

        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="hover:bg-muted/50 border-border"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-6 h-12 text-muted-foreground font-semibold"
                    style={{ width: `${header.getSize()}%` }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-transparent">
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table
                .getRowModel()
                .rows.map((row) => <LeaderboardRow key={row.id} row={row} />)
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <span className="text-sm text-muted-foreground mr-2">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount() || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="border-muted-foreground/20 hover:bg-muted hover:text-foreground cursor-pointer"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="border-muted-foreground/20 hover:bg-muted hover:text-foreground cursor-pointer"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default Leaderboard;
