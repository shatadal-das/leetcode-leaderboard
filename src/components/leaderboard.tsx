"use client";

import {
  getLeaderboardData,
  syncLeaderboardData,
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
import { ArrowUpDown, ChevronDown, Trophy, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
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
import { type BatchKey } from "@/lib/types";

export type { BatchKey };

const BATCHES: BatchKey[] = [
  "1st Year",
  "2nd Year",
  "3rd Year",
];

const STORAGE_KEY = "leetcode_leaderboard_batch_preference";
const CLIENT_TIMEOUT_MS = 120000;

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
              unoptimized
              src={knightGif}
              alt="knight badge"
              width={100}
              height={100}
              className="size-4"
            />
          )}
          {row.original.hasGuardianBadge && (
            <Image
              unoptimized
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
    sortingFn: (rowA, rowB) => {
      const a = rowA.original;
      const b = rowB.original;
      if (a.rating !== b.rating) return a.rating - b.rating;
      if (a.contests !== b.contests) return a.contests - b.contests;
      const aTotal = a.solved.easy + a.solved.medium + a.solved.hard;
      const bTotal = b.solved.easy + b.solved.medium + b.solved.hard;
      if (aTotal !== bTotal) return aTotal - bTotal;
      return a.todaySolved - b.todaySolved;
    },
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
    cell: ({ row }) => (
      <Link
        href={`https://entranthub.com/contests/leetcode/users/US/${row.original.profileLink?.split("/u/")[1]}`}
        rel="noreferrer"
        className="font-medium hover:underline underline-offset-4 decoration-primary"
        target="_blank"
      >
        {row.original.rating}
      </Link>
    ),
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

interface LeaderboardProps {
  initialData?: Record<BatchKey, User[]>;
}

function Leaderboard({ initialData }: LeaderboardProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "rating", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [batchCache, setBatchCache] = useState<Record<BatchKey, User[]>>(
    initialData || ({} as Record<BatchKey, User[]>)
  );
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<BatchKey | undefined>();
  const [timeAgo, setTimeAgo] = useState<string>("");
  const [cooldown, setCooldown] = useState(0);
  const fetchId = useRef(0);

  const MANUAL_SYNC_COOLDOWN_SEC = 30;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

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

  const triggerSync = async (batch: BatchKey, force = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncError(null);
    fetchId.current += 1;
    const currentFetchId = fetchId.current;

    const timeoutPromise = new Promise<User[]>((_, reject) =>
      setTimeout(
        () => reject(new Error("Client request timeout")),
        CLIENT_TIMEOUT_MS,
      ),
    );

    try {
      const freshData = await Promise.race([
        syncLeaderboardData(batch),
        timeoutPromise,
      ]);

      if (currentFetchId === fetchId.current && freshData.length > 0) {
        setData(freshData);
        setBatchCache((prev) => ({ ...prev, [batch]: freshData }));
      }
    } catch (error) {
      console.error("Failed to sync fresh data:", error);
      setSyncError("Sync failed");
    } finally {
      if (currentFetchId === fetchId.current) {
        setIsSyncing(false);
      }
    }
  };

  const handleManualRefresh = () => {
    if (!selectedBatch || isSyncing || cooldown > 0) return;
    setCooldown(MANUAL_SYNC_COOLDOWN_SEC);
    triggerSync(selectedBatch, true);
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!selectedBatch) return;
      setSyncError(null);

      let currentData: User[] = [];
      if (batchCache[selectedBatch] && batchCache[selectedBatch].length > 0) {
        currentData = batchCache[selectedBatch];
        setData(currentData);
        setLoading(false);
      } else {
        setLoading(true);
        try {
          const staleData = await getLeaderboardData(selectedBatch);
          if (isMounted && staleData.length > 0) {
            currentData = staleData;
            setData(staleData);
            setBatchCache((prev) => ({ ...prev, [selectedBatch]: staleData }));
          }
        } catch (dbError) {
          console.error("Failed to load initial data:", dbError);
        } finally {
          if (isMounted) setLoading(false);
        }
      }

      // Check if sync is needed:
      // 1. If any user has never been synced (new user added or username updated)
      // 2. Or if data is older than 2 minutes
      const TWO_MINUTES_MS = 2 * 60 * 1000;
      let needsSync = true;
      if (currentData.length > 0) {
        const hasUnsyncedUser = currentData.some((u) => !u.lastUpdated);
        if (hasUnsyncedUser) {
          needsSync = true;
        } else {
          const firstUserWithUpdate = currentData.find((u) => u.lastUpdated);
          if (firstUserWithUpdate?.lastUpdated) {
            const age = Date.now() - new Date(firstUserWithUpdate.lastUpdated).getTime();
            if (age < TWO_MINUTES_MS) {
              needsSync = false;
            }
          }
        }
      }

      if (needsSync && isMounted) {
        triggerSync(selectedBatch, false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedBatch]);

  const latestUpdate = data.find((u) => u.lastUpdated)?.lastUpdated;

  useEffect(() => {
    const updateTimeAgo = () => {
      if (!latestUpdate) {
        setTimeAgo("");
        return;
      }
      const d = new Date(latestUpdate);
      if (isNaN(d.getTime())) {
        setTimeAgo("");
        return;
      }
      const sec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (sec < 60) setTimeAgo("just now");
      else if (sec < 3600) setTimeAgo(`${Math.floor(sec / 60)}m ago`);
      else if (sec < 86400) setTimeAgo(`${Math.floor(sec / 3600)}h ago`);
      else setTimeAgo(`${Math.floor(sec / 86400)}d ago`);
    };

    updateTimeAgo();
    const timer = setInterval(updateTimeAgo, 30000);
    return () => clearInterval(timer);
  }, [latestUpdate]);

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
      sorting: [{ id: "rating", desc: true }],
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

        <div className="flex items-center gap-3">
          {isSyncing ? (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground animate-pulse">
              <Loader2 className="size-3.5 sm:size-4 animate-spin" />
              <span className="hidden sm:inline">Syncing...</span>
            </div>
          ) : timeAgo ? (
            <span className="text-xs text-muted-foreground hidden md:inline">
              Updated {timeAgo}
            </span>
          ) : null}

          {syncError && (
            <button
              onClick={handleManualRefresh}
              className="text-xs text-destructive hover:underline cursor-pointer"
              title="Click to retry"
            >
              Sync failed (retry)
            </button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={handleManualRefresh}
            disabled={isSyncing || loading || cooldown > 0}
            title={
              cooldown > 0
                ? `Please wait ${cooldown}s before refreshing again`
                : "Refresh Leaderboard"
            }
            className="size-9 cursor-pointer hover:bg-muted relative"
          >
            <RefreshCw
              className={cn("size-4", isSyncing && "animate-spin text-primary")}
            />
            {cooldown > 0 && !isSyncing && (
              <span className="absolute -top-1 -right-1 bg-muted-foreground/30 text-foreground text-[10px] font-mono px-1 rounded-full leading-tight border border-border">
                {cooldown}
              </span>
            )}
          </Button>

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
