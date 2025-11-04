import { motion } from "framer-motion";
import {
  StarIcon,
  Ruler,
  MapPin,
  ArrowRight,
  ArrowUp,
  ExternalLink,
  Tag,
} from "lucide-react";
import type { MouseEvent } from "react";

export type Servicios = {
  agua?: boolean;
  luz?: boolean;
  canales?: boolean;
  [key: string]: boolean | undefined;
};

export type Terrenos = {
  titulo: string;
  descripcion: string;
  link_maps: string;
  precio_cents: number;
  moneda: string; // ISO 4217, ej. MXN, USD, ARS
  superficie_m2: number;
  lat: number; // coordenada
  lng: number; // coordenada
  direccion_corta: string;
  servicios: Servicios;
  etiquetas: string[];
  es_destacado: boolean;
  fecha_publicacion: string; // ISO
  imagenes?: string | string[];
};

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    // fallback simple
    return `${(cents / 100).toLocaleString()} ${currency}`;
  }
}

function ServiciosChips({ servicios }: { servicios: Servicios }) {
  const activos = Object.entries(servicios)
    .filter(([, v]) => Boolean(v))
    .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));

  if (activos.length === 0) {
    return <span className="text-xs opacity-60">Sin servicios</span>;
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {activos.map((nombre) => (
        <li
          key={nombre}
          className="px-2 py-0.5 text-[10px] rounded-full border border-border/60 bg-background/40 backdrop-blur-sm"
        >
          {nombre}
        </li>
      ))}
    </ul>
  );
}

function Etiquetas({ etiquetas }: { etiquetas: string[] }) {
  if (!etiquetas?.length) return null;
  return (
    <div className="flex gap-1.5 flex-wrap">
      {etiquetas.map((e) => (
        <span
          key={e}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border border-border/60"
        >
          <Tag className="w-3 h-3" /> {e}
        </span>
      ))}
    </div>
  );
}
export default function CardTerrenos(props: { data: Terrenos; actionOnDetails?: (event?: MouseEvent<HTMLButtonElement>) => void }) {
  const { data, actionOnDetails } = props;
  const imgSrc = Array.isArray(data.imagenes) ? data.imagenes[0] : data.imagenes;
  const precio = formatMoney(data.precio_cents, data.moneda);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 250, damping: 22 }}
      className="relative w-full max-w-sm overflow-hidden transition-shadow duration-200 border shadow-sm group rounded-2xl border-border/60 bg-card hover:shadow-lg"
    >
      {/* Badge destacado */}
      {data.es_destacado && (
        <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-foreground/90 text-background px-2 py-1 text-[10px] shadow-sm">
          <StarIcon className="w-3.5 h-3.5" /> Destacado
        </div>
      )}

      {/* Imagen */}
      <div className="relative w-full overflow-hidden aspect-16/10 bg-muted">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={data.titulo}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-xs opacity-60">
            Sin imagen
          </div>
        )}
        {/* borde sutil on hover */}
        <div className="absolute inset-0 transition-all pointer-events-none ring-0 ring-inset group-hover:ring-1 group-hover:ring-foreground/10" />
      </div>

      {/* Contenido */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold leading-tight tracking-tight">
            {data.titulo}
          </h3>
          <div className="text-right">
            <div className="text-sm font-semibold">{precio}</div>
            <div className="text-sm text-semibold">{data.superficie_m2} m²</div>
          </div>
        </div>

        {/* Dirección */}
        <div className="flex items-center gap-1.5 text-xs opacity-80">
          <MapPin className="w-3.5 h-3.5" /> {data.direccion_corta}
        </div>

        {/* Descripción corta */}
        <p className="text-sm leading-snug line-clamp-3 opacity-85">
          {data.descripcion}
        </p>

        {/* Métricas breves */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 px-2 py-1">
            <Ruler className="w-3.5 h-3.5" />
            <span className="font-medium">{data.superficie_m2}</span>
            <span>m²</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 px-2 py-1">
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="font-medium">Lat</span>
            <span >{data.lat} m</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 px-2 py-1">
            <ArrowUp className="w-3.5 h-3.5" />
            <span className="font-medium">Lng</span>
            <span >{data.lng} m</span>
          </div>
        </div>

        {/* Servicios & Etiquetas */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide opacity-80">Servicios</span>
            <span className="text-[10px] opacity-60">
              Publicado {new Date(data.fecha_publicacion).toLocaleDateString()}
            </span>
          </div>
          <ServiciosChips servicios={data.servicios} />
          <Etiquetas etiquetas={data.etiquetas} />
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between mt-1">
          <a
            href={data.link_maps}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 rounded-lg border border-border/70 px-3 py-1.5 text-xs hover:bg-accent/50 hover:border-border transition-colors"
          >
            Ver en Maps <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={(e) => actionOnDetails?.(e)}
            className="text-xs underline-offset-4 hover:underline opacity-80 hover:opacity-100"
            
          >
            Ver detalles
          </button>
        </div>
      </div>
    </motion.article>
  );
}
