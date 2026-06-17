import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  totalCount?: number;
  pageSizeOptions?: number[];
}

export function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalCount,
  pageSizeOptions = [10, 25, 50, 100]
}: TablePaginationProps) {
  if (totalPages <= 1 && !totalCount) return null;

  // Calculate items range (e.g. 1-10 of 25)
  const showRange = typeof currentPage === 'number' && typeof pageSize === 'number' && typeof totalCount === 'number';
  const startItem = showRange ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = showRange ? Math.min(currentPage * pageSize, totalCount) : 0;

  // Dynamic pagination range helpers
  const getPageNumbers = () => {
    const range: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  };

  return (
    <div className="p-4 border-t border-border bg-muted/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs select-none">
      
      {/* RANGE / COUNTER */}
      <div className="text-muted-foreground text-left">
        {showRange && totalCount > 0 ? (
          <span>
            Exibindo <strong className="text-foreground">{startItem}</strong> a{' '}
            <strong className="text-foreground">{endItem}</strong> de{' '}
            <strong className="text-foreground">{totalCount}</strong> registros
          </span>
        ) : (
          totalCount && <span>Total: <strong className="text-foreground">{totalCount}</strong> registros</span>
        )}
      </div>

      {/* CONTROLS */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* PAGE SIZE SELECTOR */}
        {pageSize && onPageSizeChange && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-muted-foreground">Itens por página:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-background border border-border rounded-lg px-2 py-1 focus:outline-none focus:border-primary text-xs"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* PAGINATION BUTTONS */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {/* First Page */}
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="p-1.5 border border-border rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-40 disabled:pointer-events-none transition"
              title="Primeira página"
            >
              <ChevronsLeft size={14} />
            </button>

            {/* Prev Page */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 border border-border rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-40 disabled:pointer-events-none transition"
              title="Página anterior"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Page Numbers */}
            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
                  currentPage === pageNum
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {pageNum}
              </button>
            ))}

            {/* Next Page */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-border rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-40 disabled:pointer-events-none transition"
              title="Próxima página"
            >
              <ChevronRight size={14} />
            </button>

            {/* Last Page */}
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-border rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-40 disabled:pointer-events-none transition"
              title="Última página"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
