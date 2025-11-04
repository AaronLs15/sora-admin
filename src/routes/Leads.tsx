import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DataTable, type Column } from "@/components/DataTable";

type LeadRow = {
  id: number | string;
  tipo: string;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  mensaje: string | null;
  origen_slug: string | null;
  creado: string; // ISO
};

const DEFAULT_WHATSAPP_CC = "52"; // MX

// ---------------- helpers ----------------
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

function normalizePhone(raw: string | null | undefined, cc = DEFAULT_WHATSAPP_CC): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length > 10) return digits;
  if (digits.length === 10) return `${cc}${digits}`;
  return digits;
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function buildWhatsAppText(lead: LeadRow) {
  const nombre = lead.nombre?.trim() || "¡Hola!";
  const tipo = lead.tipo ? ` sobre "${lead.tipo}"` : "";
  const origen = lead.origen_slug ? ` (ref: ${lead.origen_slug})` : "";
  return `Hola ${nombre}, te contacto de Sora ByR${tipo}${origen}. ¿Podemos continuar por aquí?`;
}

function buildWhatsAppHref(lead?: LeadRow | null): string | null {
  if (!lead) return null;
  const phone = normalizePhone(lead.telefono);
  if (!phone) return null;
  const text = buildWhatsAppText(lead);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function buildMailtoHref(lead?: LeadRow | null): string | null {
  if (!lead) return null;
  const to = (lead.email || "").trim();
  if (!to) return null;
  const subject = `Seguimiento a tu consulta${lead.origen_slug ? ` (${lead.origen_slug})` : ""}`;
  const saludo = lead.nombre ? `Hola ${lead.nombre},` : "Hola,";
  const body =
    `${saludo}%0D%0A%0D%0A` +
    `Gracias por contactarnos${lead.tipo ? ` por "${lead.tipo}"` : ""}. ` +
    `${lead.origen_slug ? `Referencia: ${lead.origen_slug}. ` : ""}` +
    `¿Podrías contarnos un poco más para apoyarte mejor?%0D%0A%0D%0A` +
    `Saludos,%0D%0AEquipo Sora ByR`;
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${body}`;
}

function TipoBadge({ tipo }: { tipo: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    comprar: { bg: "bg-emerald-100", fg: "text-emerald-700", label: "Comprar" },
    vender: { bg: "bg-sky-100", fg: "text-sky-700", label: "Vender" },
    informacion: { bg: "bg-amber-100", fg: "text-amber-800", label: "Información" },
  };
  const s = map[tipo?.toLowerCase?.() || ""] || { bg: "bg-slate-100", fg: "text-slate-700", label: tipo || "—" };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.fg}`}>
      {s.label}
    </span>
  );
}

// ----------- Vista móvil: card ----------
function LeadMobileItem({
  r,
  selected,
  onToggle,
}: {
  r: LeadRow;
  selected: boolean;
  onToggle: () => void;
}) {
  const waHref = buildWhatsAppHref(r);
  const mailHref = buildMailtoHref(r);
  return (
    <li className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="w-5 h-5 mt-1 cursor-pointer accent-sky-500"
          aria-label={`Seleccionar lead #${r.id}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold truncate text-slate-900">{r.nombre || "—"}</h3>
            <TipoBadge tipo={r.tipo} />
          </div>
          <div className="mt-1 text-xs text-slate-600">
            {r.email || "Sin email"} · {r.telefono || "Sin teléfono"}
          </div>
          {r.origen_slug && <div className="mt-1 text-xs text-slate-500">Origen: {r.origen_slug}</div>}
          {r.mensaje && <p className="mt-2 text-sm line-clamp-2 text-slate-700">{r.mensaje}</p>}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-500">{formatDateTime(r.creado)}</span>
            <div className="flex gap-2">
              <a
                href={waHref || "#"}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!waHref}
                className={`inline-flex items-center justify-center rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                  waHref
                    ? "border-green-500 text-white bg-linear-to-r from-green-500 to-emerald-400 hover:from-green-400 hover:to-emerald-300"
                    : "pointer-events-none border-slate-300 text-slate-400 bg-slate-100"
                }`}
              >
                WhatsApp
              </a>
              <a
                href={mailHref || "#"}
                aria-disabled={!mailHref}
                className={`inline-flex items-center justify-center rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                  mailHref
                    ? "border-sky-500 text-white bg-linear-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300"
                    : "pointer-events-none border-slate-300 text-slate-400 bg-slate-100"
                }`}
              >
                Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

// --------------- Componente principal ---------------
export default function Leads() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

  const isSmall = useMediaQuery("(max-width: 767px)"); // < md

  const selectedLead = useMemo(
    () => rows.find((r) => String(r.id) === String(selectedId)) || null,
    [rows, selectedId]
  );

  const waHref = buildWhatsAppHref(selectedLead);
  const mailHref = buildMailtoHref(selectedLead);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("leads")
      .select("id,tipo,nombre,email,telefono,mensaje,origen_slug,creado")
      .order("creado", { ascending: false });

    if (error) {
      setError(error.message ?? "No se pudieron cargar los leads.");
      setRows([]);
    } else {
      setRows((data ?? []) as LeadRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // ---- columns (escritorio) ----
  const columns: Column<LeadRow>[] = useMemo(
    () => [
      {
        header: "",
        width: "1%",
        cell: (r) => {
          const checked = String(selectedId) === String(r.id);
          return (
            <input
              type="radio"
              name="lead-select"
              aria-label={`Seleccionar lead #${r.id}`}
              checked={checked}
              // Al hacer click sobre el ya seleccionado, quitamos la selección
              onClick={(e) => {
                if (checked) {
                  e.preventDefault(); // evita que lo vuelva a marcar antes del re-render
                  setSelectedId(null);
                }
              }}
              onChange={() => {
                if (!checked) setSelectedId(r.id);
              }}
              className="w-4 h-4 cursor-pointer accent-sky-500"
            />
          );
        },
      },
      {
        header: "Contacto",
        accessor: "nombre",
        sortable: true,
        className: "min-w-[220px] max-w-[420px]",
        cell: (r) => (
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate text-slate-900">{r.nombre || "—"}</span>
            <div className="text-xs truncate text-slate-500">
              {r.email || "Sin email"} · {r.telefono || "Sin teléfono"}
            </div>
          </div>
        ),
      },
      {
        header: "Tipo",
        accessor: "tipo",
        sortable: true,
        hideBelow: "md",
        className: "whitespace-nowrap",
        cell: (r) => <TipoBadge tipo={r.tipo} />,
      },
      {
        header: "Origen",
        accessor: "origen_slug",
        sortable: true,
        hideBelow: "lg",
        cell: (r) => <span className="text-slate-700">{r.origen_slug || "—"}</span>,
      },
      {
        header: "Mensaje",
        accessor: "mensaje",
        className: "max-w-[36ch]",
        cell: (r) => (
          <div className="truncate text-slate-600" title={r.mensaje || ""}>
            {r.mensaje || "—"}
          </div>
        ),
      },
      {
        header: "Creado",
        accessor: "creado",
        sortable: true,
        align: "right",
        className: "text-slate-600",
        cell: (r) => <span>{formatDateTime(r.creado)}</span>,
      },
    ],
    [selectedId]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 p-4 text-white shadow-xl rounded-3xl bg-linear-to-br from-slate-900 via-slate-900 to-slate-950 shadow-slate-950/40 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Leads</p>
          <h1 className="text-xl font-semibold md:text-2xl">Tablero de Leads</h1>
          <p className="text-sm text-slate-300">Selecciona un lead para contactar por WhatsApp o Email.</p>
        </div>

        <div className="flex flex-wrap items-center w-full gap-3 md:w-auto">
          <a
            href={waHref || "#"}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!waHref}
            className={`inline-flex flex-1 items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold shadow-lg transition md:flex-none
              ${
                waHref
                  ? "border-green-500 bg-linear-to-r from-green-500 to-emerald-400 text-white shadow-emerald-500/30 hover:from-green-400 hover:to-emerald-300"
                  : "pointer-events-none border-slate-400/40 bg-white/10 text-white/60 opacity-60"
              }`}
            title={waHref ? "Enviar WhatsApp" : "Selecciona un lead con teléfono válido"}
          >
            💬 WhatsApp
          </a>

          <a
            href={mailHref || "#"}
            aria-disabled={!mailHref}
            className={`inline-flex flex-1 items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold shadow-lg transition md:flex-none
              ${
                mailHref
                  ? "border-sky-500 bg-linear-to-r from-sky-500 to-cyan-400 text-white shadow-cyan-500/30 hover:from-sky-400 hover:to-cyan-300"
                  : "pointer-events-none border-slate-400/40 bg-white/10 text-white/60 opacity-60"
              }`}
            title={mailHref ? "Mandar Email" : "Selecciona un lead con email válido"}
          >
            ✉️ Email
          </a>

          <button
            onClick={load}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold transition border rounded-2xl border-slate-300 bg-white/10 text-white/90 backdrop-blur hover:bg-white/20"
            title="Recargar"
          >
            ↻ Actualizar
          </button>
        </div>
      </header>

      {/* Vista móvil (< md): cards) */}
      {isSmall ? (
        <section>
          {loading && (
            <div className="p-4 text-sm bg-white border rounded-2xl border-slate-200 text-slate-600">Cargando…</div>
          )}
          {error && (
            <div className="p-4 text-sm border rounded-2xl border-rose-200 bg-rose-50 text-rose-700">{error}</div>
          )}
          {!loading && !error && rows.length === 0 && (
            <div className="p-6 text-sm text-center bg-white border rounded-2xl border-slate-200 text-slate-600">
              Aún no hay leads.
            </div>
          )}
          <ul className="grid grid-cols-1 gap-3">
            {rows.map((r) => {
              const selected = String(selectedId) === String(r.id);
              return (
                <LeadMobileItem
                  key={String(r.id)}
                  r={r}
                  selected={selected}
                  onToggle={() => setSelectedId(selected ? null : r.id)}
                />
              );
            })}
          </ul>
        </section>
      ) : (
        // Vista escritorio (≥ md): DataTable con scroll horizontal seguro
        <section className="p-2 bg-white border shadow-sm rounded-3xl border-slate-200">
          <div className="-mx-2 overflow-x-auto">
            <div className="min-w-[860px] px-2">
              <DataTable<LeadRow>
                title="Leads"
                data={rows}
                columns={columns}
                keyField="id"
                isLoading={loading}
                error={error}
                emptyHint="Aún no hay leads."
                searchPlaceholder="Buscar por nombre, email, teléfono, tipo u origen…"
                initialPageSize={12}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
