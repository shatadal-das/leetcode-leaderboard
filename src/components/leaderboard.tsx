"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import LeaderboardRow from "./leaderboard-row";
import { leetCodeUsernames } from "@/lib/leetcode-usernames";

export type User = {
  id: string;
  rank: number;
  username: string;
  rating: number;
  solved: number;
  contests: number;
};

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "rank",
    header: "Rank",
    size: 10,
    cell: ({ row }) => <span>#{row.getValue("rank")}</span>,
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
    size: 20,
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4 hover:bg-muted"
      >
        Contest Rating
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div>{row.getValue("rating")}</div>,
  },
  // MOVED UP: Total Contests is now before Total Solved
  {
    accessorKey: "contests",
    size: 20,
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4 hover:bg-muted"
      >
        Total Contests
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div>{row.getValue("contests")}</div>,
  },
  {
    accessorKey: "solved",
    size: 20,
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4 hover:bg-muted"
      >
        Total Solved
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div>{row.getValue("solved")}</div>,
  },
];

function Leaderboard() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const promises = leetCodeUsernames.map(async (user) => {
          try {
            const [contestResponse, solvedResponse] = await Promise.all([
              fetch(
                `https://alfa-leetcode-api.onrender.com/${user.username}/contest`
              ),
              fetch(
                `https://alfa-leetcode-api.onrender.com/${user.username}/solved`
              ),
            ]);

            const contestResult = await contestResponse.json();
            const solvedResult = await solvedResponse.json();

            return {
              id: user.username,
              username: user.name,
              rating: Math.round(contestResult.contestRating || 0),
              solved: solvedResult.solvedProblem || 0,
              contests: contestResult.contestAttend || 0,
            };
          } catch (error) {
            return {
              id: user.username,
              username: user.name,
              rating: 0,
              solved: 0,
              contests: 0,
            };
          }
        });

        const results = await Promise.all(promises);

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
          onChange={(event) =>
            table.getColumn("username")?.setFilterValue(event.target.value)
          }
          className="max-w-sm bg-muted/50 border-muted-foreground/20 focus-visible:ring-primary"
        />
      </div>
      <div className="rounded-md border border-border overflow-hidden">
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
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p>Fetching data...</p>
                  </div>
                </TableCell>
              </TableRow>
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
          className="border-muted-foreground/20 hover:bg-muted hover:text-foreground"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="border-muted-foreground/20 hover:bg-muted hover:text-foreground"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default Leaderboard;
