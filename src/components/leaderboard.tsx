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
import { ArrowUpDown, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { leetCodeUsernames } from "@/lib/leetcode-usernames";
import { getLeaderboardData } from "@/app/actions/get-leaderboard-data";
import { type LeaderboardData as User } from "@/app/actions/get-leaderboard-data";
import OverlayLoader from "./overlay-loader";
import { cn } from "@/lib/utils";

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
              <span className="text-[#1cbaba]">{solved.easy}</span>
              <span className="mr-0.5">,</span>
              <span className="text-[#ffb700]">{solved.medium}</span>
              <span className="mr-0.5">,</span>
              <span className="text-[#f63737]">{solved.hard}</span>
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

  // fetch data on load
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const results = await getLeaderboardData(leetCodeUsernames);
        const sortedResults = results.sort((a, b) => b.rating - a.rating);

        const rankedUsers: User[] = sortedResults.map((user, index) => ({
          ...user,
          rank: index + 1,
        }));

        setData(rankedUsers);
      } catch (error) {
        console.error("Failed to fetch leaderboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // change default sorting based on loading state
  useEffect(() => {
    if (loading) setSorting([]);
    else setSorting([{ id: "rating", desc: true }]);
  }, [loading]);

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
    <div className="w-full bg-background text-foreground p-4 md:p-8 lg:p-12 rounded-xl transition-colors">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter username..."
          value={
            (table.getColumn("username")?.getFilterValue() as string) ?? ""
          }
          onChange={(e) =>
            table.getColumn("username")?.setFilterValue(e.target.value)
          }
          className="max-w-sm bg-muted/50 border-muted-foreground/20 focus-visible:ring-primary"
        />
      </div>

      <div
        className={cn(
          "rounded-md border border-border overflow-hidden relative",
          loading && "min-h-100"
        )}
      >
        {loading && <OverlayLoader />}

        {/* Leaderboard Table */}
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

      {/* Table Footer */}
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
          className="border-muted-foreground/20 hover:bg-muted hover:text-foreground"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="border-muted-foreground/20 hover:bg-muted hover:text-foreground "
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default Leaderboard;
