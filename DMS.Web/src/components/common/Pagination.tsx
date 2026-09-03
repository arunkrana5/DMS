import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  pageIndex,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100]
}) => {
  const startItem = totalCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
  const endItem = Math.min(pageIndex * pageSize, totalCount);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-medium">
      {/* Left info & Page Size selector */}
      <div className="flex items-center gap-3">
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          Showing <span className="font-bold text-slate-800 dark:text-slate-200">{startItem}</span> to{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">{endItem}</span> of{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">{totalCount}</span> results
        </div>

        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-400">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Page Navigation buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={pageIndex <= 1}
          className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={pageIndex <= 1}
          className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          Page {pageIndex} of {Math.max(1, totalPages)}
        </div>

        <button
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={pageIndex >= totalPages}
          className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={pageIndex >= totalPages}
          className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
