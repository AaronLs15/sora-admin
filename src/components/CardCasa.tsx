
export type Casa = {
  titulo: string;
  descripcion?: string | null;
  link_maps?: string | null;
  precio_cents: number;
  moneda: string; // 'MXN'
  recamaras?: number | null;
  banos?: number | null; // 1.5, 2.0
  estacionamientos?: number | null;
  pisos?: number | null;
  terreno_m2?: number | null;
  construccion_m2?: number | null;
  ano_construccion?: number | null;
  lat?: number | null;
  lng?: number | null;
  direccion_corta?: string | null;
  servicios?: Record<string, boolean>;
  amenidades?: string[];  // ["alberca","jardín",...]
  etiquetas?: string[];
  es_destacado?: boolean;
  fecha_publicacion?: string; // ISO
  imagenes: string[];
};

function formatCurrencyFromCents(cents: number, currency = "MXN") {
  const n = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(n);
  } catch {
    return `${n.toLocaleString("es-MX")} ${currency}`;
  }
}

function fmtNum(n?: number | null, unit?: string) {
  if (n == null || !isFinite(Number(n))) return "—";
  const v = Number(n);
  return unit ? `${v.toLocaleString("es-MX")} ${unit}` : v.toLocaleString("es-MX");
}

export default function CardCasa({ data }: { data: Casa }) {
  const cover = data.imagenes?.[0];

  return (
    <article className="overflow-hidden border shadow-sm rounded-3xl border-slate-200 bg-white/90">
      {/* Cover */}
      {cover ? (
        <img
          src={cover}
          alt={data.titulo || "Casa"}
          className="object-cover w-full h-44"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-44 bg-slate-100 text-slate-400">
          Sin imagen
        </div>
      )}

      <div className="p-5 space-y-4">
        <header className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">{data.titulo || "Casa"}</h3>
          <p className="text-sm text-slate-500">{data.direccion_corta || "—"}</p>
        </header>

        <div className="text-xl font-bold text-slate-900">
          {formatCurrencyFromCents(Number(data.precio_cents || 0), data.moneda || "MXN")}
        </div>

        {/* Specs */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1">
            🛏 {fmtNum(data.recamaras)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1">
            🛁 {fmtNum(data.banos)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1">
            🚗 {fmtNum(data.estacionamientos)}
          </span>
          {data.pisos != null && (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1">
              ⬆️ {fmtNum(data.pisos)} pisos
            </span>
          )}
        </div>

        {/* Áreas */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1">
            📐 Terreno: {fmtNum(data.terreno_m2, "m²")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1">
            🧱 Construcción: {fmtNum(data.construccion_m2, "m²")}
          </span>
        </div>

        {/* Amenidades / etiquetas */}
        {(data.amenidades?.length || data.etiquetas?.length) ? (
          <div className="flex flex-wrap gap-2">
            {data.amenidades?.map((a) => (
              <span key={`am-${a}`} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700">
                {a}
              </span>
            ))}
            {data.etiquetas?.map((e) => (
              <span key={`et-${e}`} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700">
                #{e}
              </span>
            ))}
          </div>
        ) : null}

        {/* Enlace a mapas */}
        {data.link_maps && data.link_maps !== "#" && (
          <a
            href={data.link_maps}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700"
          >
            🗺️ Ver en Google Maps
          </a>
        )}
      </div>
    </article>
  );
}
