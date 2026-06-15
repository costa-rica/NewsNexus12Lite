"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState
} from "@tanstack/react-table";
import { Info } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { ScoreBubble } from "@/components/ScoreBubble";
import { Badge } from "@/components/ui/badge/Badge";
import { Input } from "@/components/ui/form/Input";
import { apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { openDescriptionModal, openExplanationModal, setSelectedExplanation } from "@/store/uiSlice";
import type { Article, StageName, StageStatus } from "@/types";

const columnHelper = createColumnHelper<Article>();

function score(article: Article, stage: "locationScorer" | "semanticScorer") {
  const result = article.pipeline[stage];
  return result.score ?? result.locationScore ?? result.semanticScore;
}

function approvalColor(status: string) {
  if (status === "approved") {
    return "success";
  }
  if (status === "rejected" || status === "failed") {
    return "error";
  }
  if (status === "needs_review") {
    return "warning";
  }
  if (status === "running") {
    return "primary";
  }
  return "light";
}

function rowStatusColor(status: Article["rowStatus"]) {
  if (status === "complete") {
    return "success";
  }
  if (status === "failed" || status === "cancelled") {
    return "error";
  }
  if (status === "processing") {
    return "primary";
  }
  return "light";
}

function canOpenExplanation(status: StageStatus) {
  return status !== "pending" && status !== "running" && status !== "skipped";
}

function responsiveColumnClass(columnId: string) {
  const classes: Record<string, string> = {
    description: "hidden 2xl:table-cell",
    approvalStatus: "hidden xl:table-cell",
    semanticScore: "hidden lg:table-cell",
    assignedState: "hidden md:table-cell",
    locationScore: "hidden sm:table-cell"
  };

  return classes[columnId] ?? "";
}

export function ArticleTable() {
  const dispatch = useAppDispatch();
  const { items, lastSearchHadResults } = useAppSelector((state) => state.articles);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const openStageExplanation = useCallback(async (articleId: string, stage: StageName, status: StageStatus) => {
    if (!canOpenExplanation(status)) {
      return;
    }
    const data = await apiClient.getExplanation(articleId, stage);
    dispatch(setSelectedExplanation({ ...(data as object), articleId, stage }));
    dispatch(openExplanationModal());
  }, [dispatch]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Title",
        cell: ({ row, getValue }) => (
          <div className="flex min-w-0 items-start gap-2">
            <Badge color={rowStatusColor(row.original.rowStatus)} size="sm">
              {row.original.rowStatus}
            </Badge>
            <span className="min-w-0 font-medium text-gray-800 dark:text-white/90">{getValue()}</span>
          </div>
        )
      }),
      columnHelper.accessor("source", {
        header: "Source",
        cell: ({ getValue }) => <span className="text-gray-600 dark:text-gray-300">{getValue()}</span>
      }),
      columnHelper.accessor((article) => article.description ?? "", {
        id: "description",
        header: "Description",
        cell: ({ row, getValue }) => {
          const description = getValue();
          return (
            <button
              className="flex max-w-[320px] items-start gap-2 rounded-lg px-2 py-1 text-left text-theme-sm text-gray-600 transition hover:bg-brand-50 hover:text-brand-600 disabled:hover:bg-transparent disabled:hover:text-gray-600 dark:text-gray-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-300 dark:disabled:hover:text-gray-300"
              type="button"
              disabled={!description && !row.original.url}
              onClick={() => dispatch(openDescriptionModal(row.original.id))}
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="line-clamp-3">{description || "No description available."}</span>
            </button>
          );
        }
      }),
      columnHelper.accessor((article) => score(article, "locationScorer"), {
        id: "locationScore",
        header: "Location Score",
        sortUndefined: "last",
        cell: ({ row, getValue }) => (
          <ScoreBubble
            articleId={row.original.id}
            label="Location Score"
            stage="locationScorer"
            status={row.original.pipeline.locationScorer.status}
            score={getValue()}
          />
        )
      }),
      columnHelper.accessor((article) => article.pipeline.stateAssigner.assignedState ?? "", {
        id: "assignedState",
        header: "AI Assigned State",
        cell: ({ row, getValue }) => {
          const status = row.original.pipeline.stateAssigner.status;
          const value = getValue();
          return (
            <button
              className="rounded-full px-2.5 py-1 text-theme-xs font-medium text-brand-600 transition hover:bg-brand-50 disabled:text-gray-500 disabled:hover:bg-transparent dark:text-brand-300 dark:hover:bg-brand-500/10 dark:disabled:text-gray-400"
              type="button"
              disabled={!canOpenExplanation(status) || !value}
              onClick={() => void openStageExplanation(row.original.id, "stateAssigner", status)}
            >
              {value || status}
            </button>
          );
        }
      }),
      columnHelper.accessor((article) => score(article, "semanticScorer"), {
        id: "semanticScore",
        header: "Semantic Score",
        sortUndefined: "last",
        cell: ({ row, getValue }) => (
          <ScoreBubble
            articleId={row.original.id}
            label="Semantic Score"
            stage="semanticScorer"
            status={row.original.pipeline.semanticScorer.status}
            score={getValue()}
          />
        )
      }),
      columnHelper.accessor((article) => article.pipeline.aiApprover.finalStatus ?? article.pipeline.aiApprover.status, {
        id: "approvalStatus",
        header: "AI Approval Status",
        cell: ({ row, getValue }) => {
          const status = row.original.pipeline.aiApprover.status;
          const value = getValue();
          return (
            <button
              className="rounded-full disabled:opacity-80"
              type="button"
              disabled={!canOpenExplanation(status)}
              onClick={() => void openStageExplanation(row.original.id, "aiApprover", status)}
            >
              <Badge color={approvalColor(value)}>{value}</Badge>
            </button>
          );
        }
      })
    ],
    [dispatch, openStageExplanation]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-theme-sm text-gray-500 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
        {lastSearchHadResults === false ? "No articles found for this query." : "Run a search to load articles for processing."}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <Input
          aria-label="Filter articles"
          placeholder="Search loaded articles..."
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-md"
        />
      </div>
      <div className="custom-scrollbar overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200 dark:border-gray-800">
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-3 py-3 text-left text-theme-xs font-semibold uppercase text-gray-500 dark:text-gray-400 sm:px-4",
                        responsiveColumnClass(header.column.id)
                      )}
                    >
                      <button
                        className={cn("inline-flex items-center gap-1", header.column.getCanSort() && "hover:text-brand-500")}
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : null}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn("break-words px-3 py-4 align-top text-theme-sm sm:px-4", responsiveColumnClass(cell.column.id))}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.getRowModel().rows.length === 0 ? (
        <div className="border-t border-gray-200 p-6 text-theme-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          No articles found for the current filter.
        </div>
      ) : null}
    </section>
  );
}
