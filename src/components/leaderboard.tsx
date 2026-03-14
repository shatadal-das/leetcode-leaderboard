"use client";

import {
  getLeaderboardData,
  type LeaderboardData as User,
} from "@/app/actions/get-leaderboard-data";
import guardianGif from "@/assets/guardian.gif";
import knightGif from "@/assets/knight.gif";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
import { ArrowUpDown, ChevronDown, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import LeaderboardRow from "./leaderboard-row";
import OverlayLoader from "./overlay-loader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Skeleton } from "./ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

export type BatchKey = "1st Year" | "2nd Year";
// | "3rd Year";

const BATCHES: BatchKey[] = [
  "1st Year",
  "2nd Year",
  // "3rd Year",
];

const STORAGE_KEY = "leetcode_leaderboard_batch_preference";
const CLIENT_TIMEOUT_MS = 30000;

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
    cell: ({ row }) => {
      const profileLink = row.original.profileLink;
      const username = row.getValue("username") as string;

      const UserName = () => (
        <div className="flex gap-2 items-center font-medium">
          {username}
          {row.original.hasKnightBadge && (
            <Image
              src={knightGif}
              alt="knight badge"
              width={100}
              height={100}
              className="size-4"
            />
          )}
          {row.original.hasGuardianBadge && (
            <Image
              src={guardianGif}
              alt="guardian badge"
              width={100}
              height={100}
              className="size-4"
            />
          )}
        </div>
      );

      if (profileLink) {
        return (
          <Link
            href={profileLink}
            rel="noreferrer"
            className="font-medium hover:underline underline-offset-4 decoration-primary"
            target="_blank"
          >
            <UserName />
          </Link>
        );
      }

      return <UserName />;
    },
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
        const todaySolved = row.original.todaySolved;

        return (
          <div className="flex gap-1.5 items-baseline">
            <div className="font-medium flex gap-1">
              <div>{totalSolved}</div>
            </div>
            <div className="text-[0.9em] text-neutral-200">
              <span>&#91;</span>
              <span className="text-easy-q">{solved.easy}</span>
              <span className="mr-0.5">,</span>
              <span className="text-medium-q">{solved.medium}</span>
              <span className="mr-0.5">,</span>
              <span className="text-hard-q">{solved.hard}</span>
              <span>&#93;</span>
            </div>
            <div className="text-[0.9em] text-neutral-200">
              <span>&#91;</span>
              <span className="text-blue-300">{todaySolved}</span>
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
  const [selectedBatch, setSelectedBatch] = useState<BatchKey | undefined>();

  useEffect(() => {
    const savedBatch = localStorage.getItem(STORAGE_KEY);
    if (savedBatch && BATCHES.includes(savedBatch as BatchKey)) {
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
    let isMounted = true;

    const fetchData = async () => {
      if (!selectedBatch) return;

      try {
        setLoading(true);
        setData([]);

        const timeoutPromise = new Promise<User[]>((_, reject) =>
          setTimeout(
            () => reject(new Error("Client request timeout")),
            CLIENT_TIMEOUT_MS,
          ),
        );
        try {
          const rankedUsers = await Promise.race([
            getLeaderboardData(selectedBatch),
            timeoutPromise,
          ]);

          if (isMounted) {
            setData(rankedUsers);
          }
        } catch (error) {
          setData([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
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
            {BATCHES.map((batchKey) => (
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
          loading && "min-h-100",
        )}
      >
        {loading && <OverlayLoader />}

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
                          header.getContext(),
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
