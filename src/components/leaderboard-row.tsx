"use client";
import { flexRender, Row } from "@tanstack/react-table";
import { TableCell, TableRow } from "@/components/ui/table";
import { type LeaderboardData as User } from "@/app/actions/get-leaderboard-data";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Props = {
  row: Row<User>;
};

const LeaderboardRow = ({ row }: Props) => {
  const rank = row.getValue("rank") as number;

  let rowClassName =
    "hover:bg-muted/50 transition-colors border-border data-[state=selected]:bg-muted";
  let rankCellClassName = "font-medium text-muted-foreground";

  // Special styling for top 3
  if (rank === 1) {
    // Gold
    rowClassName = "bg-[#FFD700]/10 hover:bg-[#FFD700]/20 border-[#FFD700]/20";
    rankCellClassName = "font-bold text-[#FFD700]";
  } else if (rank === 2) {
    // Silver
    rowClassName = "bg-[#D1D1E0]/12 hover:bg-[#D1D1E0]/20 border-[#C0C0C0]/20";
    rankCellClassName = "font-bold text-[#D1D1E0]";
  } else if (rank === 3) {
    // Bronze
    rowClassName = "bg-[#CD7F32]/10 hover:bg-[#CD7F32]/20 border-[#CD7F32]/20";
    rankCellClassName = "font-bold text-[#CD7F32]";
  }

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      className={cn(rowClassName)}
    >
      {row.getVisibleCells().map((cell) => {
        const isRankCell = cell.column.id === "rank";
        const isUserName = cell.column.id === "username";
        return (
          <TableCell
            key={cell.id}
            className={cn("px-6 py-4", isRankCell ? rankCellClassName : "")}
          >
            {isUserName ? (
              <Link
                href={`https://leetcode.com/u/${row.original.id}`}
                className="font-medium hover:underline underline-offset-4 decoration-primary"
                target="_blank"
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </Link>
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
};

export default LeaderboardRow;
