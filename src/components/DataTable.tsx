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
    <div className="bg-white border shadow-sm rounded-3xl border-slate-200">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
          <p className="text-xs text-slate-500">
            {isLoading ? 'Cargando…' : `${sorted.length} resultados`}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-3 py-2 text-sm border shadow-sm outline-none rounded-xl border-slate-200 bg-white/90 text-slate-700 ring-0 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 sm:w-64"
            />
            <span className="absolute text-xs -translate-y-1/2 pointer-events-none right-2 top-1/2 text-slate-400">
              ⌘K
            </span>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
            Mostrar
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 text-xs bg-white border rounded-lg border-slate-200"
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
            <tr className="text-left text-slate-600">
              {columns.map((c, idx) => {
                const isSorted = sort?.idx === idx;
                const dir = isSorted ? sort?.dir : null;
                return (
                  <th
                    key={idx}
                    onClick={() => toggleSort(idx)}
                    className={clsx(
                      'sticky top-0 z-10 bg-white/95 px-4 py-3 text-xs font-semibold uppercase tracking-wide',
                      c.headerClassName,
                      c.hideBelow === 'sm' && 'hidden sm:table-cell',
                      c.hideBelow === 'md' && 'hidden md:table-cell',
                      c.hideBelow === 'lg' && 'hidden lg:table-cell',
                      c.hideBelow === 'xl' && 'hidden xl:table-cell',
                      c.sortable && 'cursor-pointer select-none'
                    )}
                    style={c.width ? { width: c.width } : undefined}
                  >
                    <div
                      className={clsx(
                        'flex items-center gap-1',
                        (c.align === 'right' && 'justify-end') ||
                          (c.align === 'center' && 'justify-center') ||
                          'justify-start'
                      )}
                    >
                      <span>{c.header}</span>
                      {c.sortable && (
                        <span className="text-slate-400">
                          {dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : '▵'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {error && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-sm text-center text-red-600">
                  {error}
                </td>
              </tr>
            )}

            {isLoading &&
              !error &&
              Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-t border-slate-100">
                  {columns.map((c, j) => (
                    <td
                      key={j}
                      className={clsx(
                        'px-4 py-3',
                        c.hideBelow === 'sm' && 'hidden sm:table-cell',
                        c.hideBelow === 'md' && 'hidden md:table-cell',
                        c.hideBelow === 'lg' && 'hidden lg:table-cell',
                        c.hideBelow === 'xl' && 'hidden xl:table-cell'
                      )}
                    >
                      <div className="w-full h-4 rounded animate-pulse bg-slate-100"></div>
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && !error && paged.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">
                  {emptyHint}
                </td>
              </tr>
            )}

            {!isLoading &&
              !error &&
              paged.map((row) => (
                <tr
                  key={String(row[keyField] ?? Math.random())}
                  className="border-t border-slate-100 hover:bg-slate-50/60"
                >
                  {columns.map((c, idx) => (
                    <td
                      key={idx}
                      className={clsx(
                        'px-4 py-3 text-slate-700',
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
      <div className="flex items-center justify-between gap-3 p-4 text-xs border-t border-slate-100 text-slate-600">
        <span>
          Página {currentPage} de {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            disabled={currentPage <= 1}
          >
            Anterior
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            disabled={currentPage >= totalPages}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
