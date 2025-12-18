import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DataTable, type Column } from "@/components/DataTable";

type EstadoPropiedad = "borrador" | "publicado" | "archivado";

type CasaRow = {
  id: number | string;
  slug: string;
  titulo: string;
  precio_cents: number | string;
  moneda: string;
  recamaras: number | null;
  banos: number | string | null;
  estacionamientos: number | null;
  terreno_m2: number | string | null;
  construccion_m2: number | string | null;
  estado: EstadoPropiedad;
  es_destacado: boolean;
  fecha_publicacion: string | null;
  direccion_corta: string | null;
  link_maps: string | null;
  actualizado: string;
};

// --- helpers ---
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

function formatAreaM2(m2: number | string | null) {
  if (m2 == null) return "—";
  const n = toNumber(m2);
  return `${n.toLocaleString("es-MX")} m²`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
}

function EstadoBadge({ estado, destacado }: { estado: EstadoPropiedad; destacado: boolean }) {
  const map: Record<EstadoPropiedad, { text: string; dot: string; bg: string; fg: string }> = {
    borrador: { text: "Borrador", dot: "bg-slate-400", bg: "bg-slate-100", fg: "text-slate-700" },
    publicado: { text: "Publicado", dot: "bg-emerald-500", bg: "bg-emerald-100", fg: "text-emerald-700" },
    archivado: { text: "Archivado", dot: "bg-amber-500", bg: "bg-amber-100", fg: "text-amber-800" },
  };
  const s = map[estado] ?? map["borrador"];
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.fg}`}>
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

// --- Card móvil ---
function CasaMobileItem({
  r,
  onDelete,
  deleting,
}: {
  r: CasaRow;
  onDelete: (id: string | number, titulo: string) => void;
  deleting: string | number | null;
}) {
  const isDeleting = deleting === r.id;
  return (
    <li className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs truncate text-slate-500">/{r.slug}</div>
          <h3 className="text-base font-semibold truncate text-slate-900">{r.titulo}</h3>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold tabular-nums text-slate-900">
            {formatCurrencyFromCents(r.precio_cents, r.moneda || "MXN")}
          </div>
        </div>
      </div>

      {r.direccion_corta && <p className="mt-2 text-sm line-clamp-2 text-slate-600">{r.direccion_corta}</p>}

      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-700">
        <span>🛏 {r.recamaras ?? "—"}</span>
        <span>🛁 {r.banos ?? "—"}</span>
        <span>🚗 {r.estacionamientos ?? "—"}</span>
        <span className="hidden min-[380px]:inline">• Terreno {formatAreaM2(r.terreno_m2)}</span>
        <span className="hidden min-[520px]:inline">• Const. {formatAreaM2(r.construccion_m2)}</span>
      </div>

      <div className="flex items-center justify-between mt-3">
        <EstadoBadge estado={r.estado} destacado={!!r.es_destacado} />
        <span className="text-xs text-slate-500">Publicado: {formatDate(r.fecha_publicacion)}</span>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <a
          href={`/casas/nueva?id=${encodeURIComponent(String(r.id))}`}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          title="Editar casa"
        >
          ✏️ Editar
        </a>
        <button
          onClick={() => onDelete(r.id, r.titulo)}
          disabled={isDeleting}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-50"
          title="Eliminar casa"
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

export default function Casas() {
  const [rows, setRows] = useState<CasaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | number | null>(null);
  const isSmall = useMediaQuery("(max-width: 767px)"); // < md

  async function handleDelete(id: string | number, titulo: string) {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar la casa "${titulo}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeleting(id);
    try {
      // Primero eliminamos las imágenes asociadas
      await supabase.from("casa_imagen").delete().eq("casa_id", id);
      // Luego la casa
      const { error: delError } = await supabase.from("casas").delete().eq("id", id);
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
      .from("casas")
      .select(
        [
          "id",
          "slug",
          "titulo",
          "precio_cents",
          "moneda",
          "recamaras",
          "banos",
          "estacionamientos",
          "terreno_m2",
          "construccion_m2",
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
      setError(error.message ?? "No se pudieron cargar las casas.");
      setRows([]);
    } else {
      // Asegura formato de array de objetos con 'id'
      if (Array.isArray(data) && data.every((it) => it && typeof it === "object" && "id" in it)) {
        setRows(data as CasaRow[]);
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

  const columns: Column<CasaRow>[] = useMemo(
    () => [
      {
        header: "Título",
        accessor: "titulo",
        sortable: true,
        className: "min-w-[240px] max-w-[420px]",
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
        header: "Specs",
        hideBelow: "md",
        className: "whitespace-nowrap",
        cell: (r) => (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            <span>🛏 {r.recamaras ?? "—"}</span>
            <span>🛁 {r.banos ?? "—"}</span>
            <span>🚗 {r.estacionamientos ?? "—"}</span>
          </div>
        ),
      },
      {
        header: "Área",
        hideBelow: "lg",
        className: "whitespace-nowrap",
        cell: (r) => (
          <div className="flex flex-col text-xs text-slate-700">
            <span>Terreno: {formatAreaM2(r.terreno_m2)}</span>
            <span>Construcción: {formatAreaM2(r.construccion_m2)}</span>
          </div>
        ),
      },
      {
        header: "Estado",
        accessor: "estado",
        sortable: true,
        cell: (r) => <EstadoBadge estado={r.estado} destacado={!!r.es_destacado} />,
      },
      {
        header: "Publicado",
        accessor: "fecha_publicacion",
        sortable: true,
        hideBelow: "md",
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
                href={`/casas/nueva?id=${encodeURIComponent(String(r.id))}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                title="Editar casa"
              >
                ✏️ Editar
              </a>
              <button
                onClick={() => handleDelete(r.id, r.titulo)}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-50"
                title="Eliminar casa"
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
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Casas</p>
          <h1 className="text-xl font-semibold md:text-2xl">Listado</h1>
          <p className="text-sm text-slate-300">Consulta y edita las casas registradas.</p>
        </div>
        <div className="flex items-center w-full gap-3 md:w-auto">
          <a
            href="/casas/nueva"
            className="inline-flex items-center justify-center flex-1 px-4 py-2 text-sm font-semibold text-white transition border shadow-lg rounded-2xl border-sky-500 bg-linear-to-r from-sky-500 to-cyan-400 shadow-cyan-500/30 hover:from-sky-400 hover:to-cyan-300 md:flex-none"
          >
            + Nueva casa
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

      {/* Vista móvil (< md): cards */}
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
              No hay casas agregadas aún.
            </div>
          )}
          <ul className="grid grid-cols-1 gap-3">
            {rows.map((r) => (
              <CasaMobileItem
                key={String(r.id)}
                r={r}
                onDelete={handleDelete}
                deleting={deleting}
              />
            ))}
          </ul>
        </section>
      ) : (
        // Vista escritorio (≥ md): DataTable con scroll horizontal seguro
        <section className="p-2 bg-white border shadow-sm rounded-3xl border-slate-200">
          <div className="-mx-2 overflow-x-auto">
            <div className="min-w-[800px] px-2">
              <DataTable<CasaRow>
                title="Todas las casas"
                data={rows}
                columns={columns}
                keyField="id"
                isLoading={loading}
                error={error}
                emptyHint="No hay casas agregadas aún."
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
