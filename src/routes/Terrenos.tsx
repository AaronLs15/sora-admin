import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DataTable, type Column } from "@/components/DataTable";

type EstadoPropiedad = "borrador" | "publicado" | "archivado";

type TerrenoRow = {
  id: number | string;
  slug: string;
  titulo: string;
  descripcion: string | null;
  link_maps: string | null;
  precio_cents: number | string;
  moneda: string;
  superficie_m2: number | string | null;
  lat: number | string | null;
  lng: number | string | null;
  direccion_corta: string | null;
  servicios: Record<string, boolean> | null;
  etiquetas: string[];
  es_destacado: boolean;
  estado: EstadoPropiedad;
  fecha_publicacion: string | null;
  creado: string;
  actualizado: string;
};

// --- utils ---
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatCurrencyFromCents(cents: number | string, currency = "MXN") {
  const n = toNumber(cents) / 100;
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(n);
  } catch {
    return `${n.toLocaleString("es-MX")} ${currency}`;
  }
}

function formatAreaM2(m2: number | string | null | undefined) {
  const n = m2 == null ? null : toNumber(m2);
  return n == null ? "—" : `${n.toLocaleString("es-MX")} m²`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
}

function EstadoBadge({ estado, destacado }: { estado: EstadoPropiedad; destacado: boolean }) {
  const map: Record<
    EstadoPropiedad,
    { text: string; dot: string; bg: string; fg: string }
  > = {
    borrador: { text: "Borrador", dot: "bg-slate-400", bg: "bg-slate-100", fg: "text-slate-700" },
    publicado: {
      text: "Publicado",
      dot: "bg-emerald-500",
      bg: "bg-emerald-100",
      fg: "text-emerald-700",
    },
    archivado: {
      text: "Archivado",
      dot: "bg-amber-500",
      bg: "bg-amber-100",
      fg: "text-amber-800",
    },
  };
  const s = map[estado] ?? map["borrador"];
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.fg}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        {s.text}
      </span>
      {destacado && (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-yellow-800">
          ★ Destacado
        </span>
      )}
    </div>
  );
}

// --- Mobile Card item ---
function TerrenoMobileItem({
  r,
  onDelete,
  deleting,
}: {
  r: TerrenoRow;
  onDelete: (id: string | number, titulo: string) => void;
  deleting: string | number | null;
}) {
  const isDeleting = deleting === r.id;
  return (
    <li className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm truncate text-slate-500">/{r.slug}</div>
          <h3 className="text-base font-semibold truncate text-slate-900">{r.titulo}</h3>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold tabular-nums text-slate-900">
            {formatCurrencyFromCents(r.precio_cents, r.moneda || "MXN")}
          </div>
          <div className="text-xs text-slate-500">{formatAreaM2(r.superficie_m2)}</div>
        </div>
      </div>

      {r.direccion_corta && (
        <p className="mt-2 text-sm line-clamp-2 text-slate-600">{r.direccion_corta}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
        <EstadoBadge estado={r.estado} destacado={!!r.es_destacado} />
        <span className="text-xs text-slate-500">Publicado: {formatDate(r.fecha_publicacion)}</span>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <a
          href={`/terrenos/nuevo?id=${encodeURIComponent(String(r.id))}`}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          title="Editar terreno"
        >
          ✏️ Editar
        </a>
        <button
          onClick={() => onDelete(r.id, r.titulo)}
          disabled={isDeleting}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-50"
          title="Eliminar terreno"
        >
          {isDeleting ? "…" : "🗑️ Eliminar"}
        </button>
        {r.link_maps && (
          <a
            href={r.link_maps}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-50"
            title="Abrir en Google Maps"
          >
            🗺️
          </a>
        )}
      </div>
    </li>
  );
}

export default function Terrenos() {
  const [rows, setRows] = useState<TerrenoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | number | null>(null);
  const isSmall = useMediaQuery("(max-width: 767px)"); // Tailwind md breakpoint

  async function handleDelete(id: string | number, titulo: string) {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el terreno "${titulo}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeleting(id);
    try {
      // Primero eliminamos las imágenes asociadas
      await supabase.from("terreno_imagen").delete().eq("terreno_id", id);
      // Luego el terreno
      const { error: delError } = await supabase.from("terrenos").delete().eq("id", id);
      if (delError) throw delError;
      // Actualizamos la lista local
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al eliminar";
      alert(msg);
    } finally {
      setDeleting(null);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("terrenos")
      .select(
        [
          "id",
          "slug",
          "titulo",
          "precio_cents",
          "moneda",
          "superficie_m2",
          "estado",
          "es_destacado",
          "fecha_publicacion",
          "direccion_corta",
          "link_maps",
          "actualizado",
        ].join(",")
      )
      .order("actualizado", { ascending: false });

    if (error) {
      setError(error.message ?? "No se pudieron cargar los terrenos.");
      setRows([]);
    } else {
      if (Array.isArray(data) && data.every((item) => typeof item === "object" && item && "id" in item)) {
        setRows(data as unknown as TerrenoRow[]);
      } else {
        setRows([]);
        setError("Los datos recibidos no tienen el formato esperado.");
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Columnas para DataTable (≥ md)
  const columns: Column<TerrenoRow>[] = useMemo(
    () => [
      {
        header: "Título",
        accessor: "titulo",
        sortable: true,
        className: "min-w-[220px] max-w-[360px]",
        cell: (r) => (
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate text-slate-900">{r.titulo}</span>
            <span className="text-xs truncate text-slate-500">/{r.slug}</span>
            {r.direccion_corta && (
              <span className="mt-0.5 truncate text-xs text-slate-500">{r.direccion_corta}</span>
            )}
          </div>
        ),
      },
      {
        header: "Precio",
        accessor: "precio_cents",
        sortable: true,
        align: "right",
        className: "tabular-nums",
        cell: (r) => (
          <span className="font-medium text-slate-900">
            {formatCurrencyFromCents(r.precio_cents, r.moneda || "MXN")}
          </span>
        ),
      },
      {
        header: "Superficie",
        accessor: "superficie_m2",
        sortable: true,
        align: "right",
        className: "tabular-nums text-slate-700",
        hideBelow: "lg",
        cell: (r) => <span>{formatAreaM2(r.superficie_m2)}</span>,
      },
      {
        header: "Estado",
        accessor: "estado",
        sortable: true,
        className: "whitespace-nowrap",
        cell: (r) => <EstadoBadge estado={r.estado} destacado={!!r.es_destacado} />,
      },
      {
        header: "Publicado",
        accessor: "fecha_publicacion",
        sortable: true,
        hideBelow: "lg",
        cell: (r) => <span className="text-slate-600">{formatDate(r.fecha_publicacion)}</span>,
      },
      {
        header: "Acciones",
        width: "1%",
        align: "right",
        className: "whitespace-nowrap",
        cell: (r) => {
          const isDeleting = deleting === r.id;
          return (
            <div className="flex items-center justify-end gap-2">
              <a
                href={`/terrenos/nuevo?id=${encodeURIComponent(String(r.id))}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                title="Editar terreno"
              >
                ✏️ Editar
              </a>
              <button
                onClick={() => handleDelete(r.id, r.titulo)}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-50"
                title="Eliminar terreno"
              >
                {isDeleting ? "…" : "🗑️"}
              </button>
              {r.link_maps && (
                <a
                  href={r.link_maps}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50"
                  title="Abrir en Google Maps"
                >
                  🗺️
                </a>
              )}
            </div>
          );
        },
      },
    ],
    [deleting, handleDelete]
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 p-4 text-white shadow-xl rounded-3xl bg-linear-to-br from-slate-900 via-slate-900 to-slate-950 shadow-slate-950/40 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Terrenos</p>
          <h1 className="text-xl font-semibold md:text-2xl">Listado</h1>
          <p className="text-sm text-slate-300">
            Consulta y edita propiedades registradas en tu base de datos.
          </p>
        </div>
        <div className="flex items-center w-full gap-3 md:w-auto">
          <a
            href="/terrenos/nuevo"
            className="inline-flex items-center justify-center flex-1 px-4 py-2 text-sm font-semibold text-white transition border shadow-lg rounded-2xl border-sky-500 bg-linear-to-r from-sky-500 to-cyan-400 shadow-cyan-500/30 hover:from-sky-400 hover:to-cyan-300 md:flex-none"
          >
            + Nuevo terreno
          </a>
          <button
            onClick={load}
            className="inline-flex items-center justify-center flex-1 px-4 py-2 text-sm font-semibold transition border rounded-2xl border-slate-300 bg-white/10 text-white/90 backdrop-blur hover:bg-white/20 md:flex-none"
            title="Recargar"
          >
            ↻ Actualizar
          </button>
        </div>
      </header>

      {/* Mobile list (<md) */}
      {isSmall ? (
        <section>
          {loading && (
            <div className="p-4 text-sm bg-white border rounded-2xl border-slate-200 text-slate-600">
              Cargando…
            </div>
          )}
          {error && (
            <div className="p-4 text-sm border rounded-2xl border-rose-200 bg-rose-50 text-rose-700">
              {error}
            </div>
          )}
          {!loading && !error && rows.length === 0 && (
            <div className="p-6 text-sm text-center bg-white border rounded-2xl border-slate-200 text-slate-600">
              No hay terrenos agregados aún.
            </div>
          )}
          <ul className="grid grid-cols-1 gap-3">
            {rows.map((r) => (
              <TerrenoMobileItem
                key={String(r.id)}
                r={r}
                onDelete={handleDelete}
                deleting={deleting}
              />
            ))}
          </ul>
        </section>
      ) : (
        // Desktop table (>= md)
        <section className="p-2 bg-white border shadow-sm rounded-3xl border-slate-200">
          <div className="-mx-2 overflow-x-auto">
            <div className="min-w-[720px] px-2">
              <DataTable<TerrenoRow>
                title="Todos los terrenos"
                data={rows}
                columns={columns}
                keyField="id"
                isLoading={loading}
                error={error}
                emptyHint="No hay terrenos agregados aún."
                searchPlaceholder="Buscar por título, slug o dirección…"
                initialPageSize={12}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
