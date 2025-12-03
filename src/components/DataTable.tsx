import * as React from 'react';

export type Column<T> = {
  /** Texto del encabezado */
  header: string;
  /** Clave de la fila a mostrar; si usas cell no es obligatorio */
  accessor?: keyof T;
  /** Render custom de la celda (recibe la fila completa) */
  cell?: (row: T) => React.ReactNode;
  /** Permitir ordenar por esta columna (usa accessor para comparar) */
  sortable?: boolean;
  /** Clases para la columna */
  className?: string;
  headerClassName?: string;
  /** Ancho sugerido (ej. '1%') */
  width?: string;
  /** Ocultar debajo de cierto breakpoint */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  /** Alineación */
  align?: 'left' | 'center' | 'right';
};

export type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  title?: string;
  isLoading?: boolean;
  error?: string | null;
  emptyHint?: string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  searchPlaceholder?: string;
};

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

function toComparable(v: unknown): string | number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : v.toLowerCase();
  }
  if (v == null) return '';
  return String(v).toLowerCase();
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  title,
  isLoading,
  error,
  emptyHint = 'No hay registros para mostrar.',
  initialPageSize = 10,
  pageSizeOptions = [10, 25, 50],
  searchPlaceholder = 'Buscar…',
}: DataTableProps<T>) {
  const [q, setQ] = React.useState('');
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState<{ idx: number; dir: 'asc' | 'desc' } | null>(null);

  const colsForSearch = React.useMemo(
    () => columns.filter((c) => !!c.accessor),
    [columns]
  );

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data;
    return data.filter((row) =>
      colsForSearch.some((c) => {
        const val = row[c.accessor as keyof T];
        return String(val ?? '').toLowerCase().includes(query);
      })
    );
  }, [data, q, colsForSearch]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const c = columns[sort.idx];
    if (!c.accessor) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = toComparable(a[c.accessor as keyof T]);
      const bv = toComparable(b[c.accessor as keyof T]);
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  React.useEffect(() => {
    setPage(1); // reset paginación al cambiar búsqueda o pageSize
  }, [q, pageSize]);

  function toggleSort(idx: number) {
    const col = columns[idx];
    if (!col.sortable || !col.accessor) return;
    setSort((prev) => {
      if (!prev || prev.idx !== idx) return { idx, dir: 'asc' };
      if (prev.dir === 'asc') return { idx, dir: 'desc' };
      return null; // tercera pulsación: limpiar orden
    });
  }

  return (
    <div className="overflow-hidden border shadow-sm bg-card rounded-3xl border-border">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between bg-muted/30">
        <div className="space-y-1">
          {title && <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>}
          <p className="text-xs font-medium text-muted-foreground">
            {isLoading ? 'Cargando…' : `${sorted.length} resultados`}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="relative group">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-4 py-2 text-sm transition-all border outline-none shadow-xs rounded-xl border-input bg-background/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 sm:w-64 group-hover:bg-background"
            />
            <span className="absolute text-xs font-medium -translate-y-1/2 pointer-events-none right-3 top-1/2 text-muted-foreground/50">
              ⌘K
            </span>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            Mostrar
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1.5 text-xs font-medium border rounded-lg border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            filas
          </label>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-left border-b border-border/50">
              {columns.map((c, idx) => {
                const isSorted = sort?.idx === idx;
                const dir = isSorted ? sort?.dir : null;
                return (
                  <th
                    key={idx}
                    onClick={() => toggleSort(idx)}
                    className={clsx(
                      'sticky top-0 z-10 bg-muted/50 backdrop-blur-sm px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border',
                      c.headerClassName,
                      c.hideBelow === 'sm' && 'hidden sm:table-cell',
                      c.hideBelow === 'md' && 'hidden md:table-cell',
                      c.hideBelow === 'lg' && 'hidden lg:table-cell',
                      c.hideBelow === 'xl' && 'hidden xl:table-cell',
                      c.sortable && 'cursor-pointer select-none hover:text-foreground hover:bg-muted/80 transition-colors'
                    )}
                    style={c.width ? { width: c.width } : undefined}
                  >
                    <div
                      className={clsx(
                        'flex items-center gap-2',
                        (c.align === 'right' && 'justify-end') ||
                        (c.align === 'center' && 'justify-center') ||
                        'justify-start'
                      )}
                    >
                      <span>{c.header}</span>
                      {c.sortable && (
                        <span className={clsx("text-[10px]", isSorted ? "text-primary" : "text-muted-foreground/30")}>
                          {dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : '▲▼'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-border/40 bg-card">
            {error && (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-sm font-medium text-center text-destructive bg-destructive/5">
                  {error}
                </td>
              </tr>
            )}

            {isLoading &&
              !error &&
              Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  {columns.map((c, j) => (
                    <td
                      key={j}
                      className={clsx(
                        'px-6 py-4',
                        c.hideBelow === 'sm' && 'hidden sm:table-cell',
                        c.hideBelow === 'md' && 'hidden md:table-cell',
                        c.hideBelow === 'lg' && 'hidden lg:table-cell',
                        c.hideBelow === 'xl' && 'hidden xl:table-cell'
                      )}
                    >
                      <div className="w-full h-5 rounded-md animate-pulse bg-muted"></div>
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && !error && paged.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <div className="p-3 rounded-full bg-muted/50">
                      <svg className="w-6 h-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium">{emptyHint}</p>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading &&
              !error &&
              paged.map((row) => (
                <tr
                  key={String(row[keyField] ?? Math.random())}
                  className="transition-colors group hover:bg-muted/30"
                >
                  {columns.map((c, idx) => (
                    <td
                      key={idx}
                      className={clsx(
                        'px-6 py-4 text-sm text-foreground/80 group-hover:text-foreground transition-colors',
                        c.className,
                        c.hideBelow === 'sm' && 'hidden sm:table-cell',
                        c.hideBelow === 'md' && 'hidden md:table-cell',
                        c.hideBelow === 'lg' && 'hidden lg:table-cell',
                        c.hideBelow === 'xl' && 'hidden xl:table-cell',
                        (c.align === 'right' && 'text-right') ||
                        (c.align === 'center' && 'text-center') ||
                        ''
                      )}
                    >
                      {c.cell ? c.cell(row) : String(row[c.accessor as keyof T] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between gap-4 p-4 text-xs font-medium border-t border-border bg-muted/10 text-muted-foreground">
        <span>
          Página <span className="text-foreground">{currentPage}</span> de <span className="text-foreground">{totalPages}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 transition-colors border rounded-lg border-input hover:bg-background hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            disabled={currentPage <= 1}
          >
            Anterior
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 transition-colors border rounded-lg border-input hover:bg-background hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            disabled={currentPage >= totalPages}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
