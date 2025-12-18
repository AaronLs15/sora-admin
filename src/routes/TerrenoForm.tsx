import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Uploader from "../components/Uploader";
import CardTerrenos, { type Terrenos } from "@/components/CardTerrenos";

type Imagen = { url: string; alt?: string; orden: number };

const baseInput =
  "block w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-sm ring-slate-200 transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 placeholder:text-slate-400";

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export default function TerrenoForm() {
  // ===== URL param: id (modo edición si existe) =====
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id"); // ej. /terrenos/nuevo?id=123
  const isEditing = Boolean(editId);

  // ===== Carga inicial del registro cuando editas =====
  const [isLoadingRecord, setIsLoadingRecord] = useState<boolean>(!!isEditing);

  // ===== Preview State (alimenta la Card) =====
  const [previewData, setPreviewData] = useState<Terrenos>(() => ({
    titulo: "",
    descripcion: "",
    link_maps: "#",
    precio_cents: 0,
    moneda: "MXN",
    superficie_m2: 0,
    lat: 0,
    lng: 0,
    direccion_corta: "",
    servicios: { agua: false, luz: false, canales: false },
    etiquetas: [],
    es_destacado: false,
    fecha_publicacion: new Date().toISOString(),
    imagenes: [],
  }));

  // ===== Resto de estados =====
  const [imgs, setImgs] = useState<Imagen[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Valores por defecto para inputs (cuando editas)
  const [defaults, setDefaults] = useState<null | {
    slug: string;
    titulo: string;
    precio_cents: number | string;
    superficie_m2: number | string | null;
    lat: number | string | null;
    lng: number | string | null;
    direccion_corta: string | null;
    descripcion: string | null;
    link_maps: string | null;
    estado: "borrador" | "publicado" | "archivado";
    es_destacado: boolean;
    etiquetas: string[];
    servicios: Record<string, boolean> | null;
    fecha_publicacion: string | null;
  }>(null);

  const totalAssets = useMemo(() => imgs.length, [imgs]);

  // Refs para quick-fill
  const direccionRef = useRef<HTMLInputElement | null>(null);
  const mapsRef = useRef<HTMLInputElement | null>(null);

  // ===== Utils =====
  function parseEtiquetas(raw: string | FormDataEntryValue | null): string[] {
    if (!raw) return [];
    const s = String(raw);
    return s
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
  }

  // Valida y limita lat/lng a rangos geográficos válidos
  function parseCoord(
    value: FormDataEntryValue | null,
    min: number,
    max: number
  ): number | null {
    if (value === null || value === "") return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    if (num < min || num > max) return null; // fuera de rango válido
    return num;
  }

  function etiquetasToInputValue(arr?: string[] | null) {
    return Array.isArray(arr) && arr.length ? arr.join(", ") : "";
  }

  // Construye el preview a partir del FormData (uncontrolled inputs)
  function buildPreviewFromForm(fd: FormData): Terrenos {
    // Campos directos
    const titulo = String(fd.get("titulo") || "").trim();
    const descripcion = String(fd.get("descripcion") || "").trim();
    const direccion_corta = String(fd.get("direccion_corta") || "").trim();
    const precio_cents = Number(fd.get("precio_cents") || 0);
    const superficie_m2 = Number(fd.get("superficie_m2") || 0) || 0;
    const es_destacado = fd.get("es_destacado") === "on";
    const etiquetas = parseEtiquetas(fd.get("etiquetas"));

    // Ubicación
    const link_maps_raw = String(fd.get("link_maps") || "").trim();
    const link_maps = link_maps_raw
      ? link_maps_raw
      : direccion_corta
        ? `https://www.google.com/maps/search/${encodeURIComponent(
          direccion_corta
        )}`
        : "#";

    const lat = Number(fd.get("lat") || 0);
    const lng = Number(fd.get("lng") || 0);

    // Servicios desde checkboxes servicios.*
    const servicios: Record<string, boolean> = {
      agua: false,
      luz: false,
      canales: false,
    };
    for (const [key, value] of fd.entries()) {
      if (key.startsWith("servicios.")) {
        const nombre = key.split(".")[1];
        servicios[nombre] = value === "on" || value === "true" || value === "1";
      }
    }

    return {
      titulo,
      descripcion,
      direccion_corta,
      precio_cents,
      superficie_m2,
      es_destacado,
      etiquetas,
      moneda: "MXN",
      link_maps,
      lat: isFinite(lat) ? lat : 0,
      lng: isFinite(lng) ? lng : 0,
      servicios,
      fecha_publicacion:
        previewData.fecha_publicacion ||
        defaults?.fecha_publicacion ||
        new Date().toISOString(),
      imagenes: imgs.sort((a, b) => a.orden - b.orden).map((i) => i.url),
    };
  }

  // Actualiza preview en cada cambio del form
  function onFormChange(e: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    setPreviewData(buildPreviewFromForm(fd));
  }

  // Sincroniza imágenes al preview
  useEffect(() => {
    setPreviewData((prev) => ({
      ...prev,
      imagenes: imgs
        .slice()
        .sort((a, b) => a.orden - b.orden)
        .map((i) => i.url),
    }));
  }, [imgs]);

  // ===== Carga del terreno + imágenes en modo edición =====
  useEffect(() => {
    if (!isEditing) return;

    async function loadRecord(id: string) {
      setIsLoadingRecord(true);
      setError(null);

      // 1) Terreno
      const { data: terreno, error: terrErr } = await supabase
        .from("terrenos")
        .select("*")
        .eq("id", id)
        .single();

      if (terrErr || !terreno) {
        setError(terrErr?.message || "No se pudo cargar el terreno.");
        setIsLoadingRecord(false);
        return;
      }

      // 2) Imágenes
      let loadedImgs: Imagen[] = [];
      const { data: imgsRows, error: imgErr } = await supabase
        .from("terreno_imagen")
        .select("url, alt, orden")
        .eq("terreno_id", id)
        .order("orden", { ascending: true });

      if (!imgErr && Array.isArray(imgsRows)) {
        loadedImgs = imgsRows.map((r, idx) => ({
          url: r.url,
          alt: r.alt ?? undefined,
          orden: typeof r.orden === "number" ? r.orden : idx,
        }));
      }

      setDefaults({
        slug: terreno.slug ?? "",
        titulo: terreno.titulo ?? "",
        precio_cents: terreno.precio_cents ?? 0,
        superficie_m2: terreno.superficie_m2 ?? null,
        lat: terreno.lat ?? null,
        lng: terreno.lng ?? null,
        direccion_corta: terreno.direccion_corta ?? "",
        descripcion: terreno.descripcion ?? "",
        link_maps: terreno.link_maps ?? "",
        estado: terreno.estado ?? "borrador",
        es_destacado: Boolean(terreno.es_destacado),
        etiquetas: Array.isArray(terreno.etiquetas) ? terreno.etiquetas : [],
        servicios: terreno.servicios ?? {
          agua: false,
          luz: false,
          canales: false,
        },
        fecha_publicacion: terreno.fecha_publicacion ?? null,
      });

      setImgs(loadedImgs);
      setPreviewData({
        titulo: terreno.titulo ?? "",
        descripcion: terreno.descripcion ?? "",
        link_maps:
          terreno.link_maps ??
          (terreno.direccion_corta
            ? `https://www.google.com/maps/search/${encodeURIComponent(
              terreno.direccion_corta
            )}`
            : "#"),
        precio_cents: toNumber(terreno.precio_cents ?? 0),
        moneda: terreno.moneda ?? "MXN",
        superficie_m2: toNumber(terreno.superficie_m2 ?? 0),
        lat: toNumber(terreno.lat ?? 0),
        lng: toNumber(terreno.lng ?? 0),
        direccion_corta: terreno.direccion_corta ?? "",
        servicios: terreno.servicios ?? {
          agua: false,
          luz: false,
          canales: false,
        },
        etiquetas: Array.isArray(terreno.etiquetas) ? terreno.etiquetas : [],
        es_destacado: Boolean(terreno.es_destacado),
        fecha_publicacion:
          terreno.fecha_publicacion ?? new Date().toISOString(),
        imagenes: loadedImgs.map((i) => i.url),
      });

      setIsLoadingRecord(false);
    }

    loadRecord(editId as string);
  }, [isEditing, editId]);

  // ===== Imagenes helpers (UI mejorada) =====
  // function reorder(next: Imagen[]) {
  //   // normaliza orden incremental
  //   const sorted = next.map((img, idx) => ({ ...img, orden: idx }));
  //   setImgs(sorted);
  // }
  function moveImage(index: number, dir: -1 | 1) {
    setImgs((prev) => {
      const next = prev.slice().sort((a, b) => a.orden - b.orden);
      const targetIdx = Math.min(Math.max(index + dir, 0), next.length - 1);
      const [item] = next.splice(index, 1);
      next.splice(targetIdx, 0, item);
      return next.map((img, idx) => ({ ...img, orden: idx }));
    });
  }
  function makeCover(index: number) {
    setImgs((prev) => {
      const next = prev.slice().sort((a, b) => a.orden - b.orden);
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next.map((img, idx) => ({ ...img, orden: idx }));
    });
  }
  function removeImage(index: number) {
    setImgs((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((img, idx) => ({ ...img, orden: idx }))
    );
  }

  // ===== SUBMIT (insert vs update) =====
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);

    const payload: Record<string, unknown> = {
      slug: String(fd.get("slug")).trim(),
      titulo: String(fd.get("titulo")).trim(),
      precio_cents: Number(fd.get("precio_cents") || 0),
      moneda: "MXN",
      superficie_m2: Number(fd.get("superficie_m2") || 0) || null,
      direccion_corta: String(fd.get("direccion_corta") || "").trim(),
      estado: String(fd.get("estado") || "borrador"),
      es_destacado: fd.get("es_destacado") === "on",
      descripcion: String(fd.get("descripcion") || "").trim(),
      link_maps: String(fd.get("link_maps") || "").trim() || null,
      lat: parseCoord(fd.get("lat"), -90, 90),
      lng: parseCoord(fd.get("lng"), -180, 180),
      etiquetas: parseEtiquetas(fd.get("etiquetas")),
      servicios: {
        agua: fd.get("servicios.agua") === "on",
        luz: fd.get("servicios.luz") === "on",
        canales: fd.get("servicios.canales") === "on",
      },
      actualizado: new Date().toISOString(),
    };

    try {
      let terrenoId: string | number | null = null;

      if (isEditing) {
        const { data, error: updateError } = await supabase
          .from("terrenos")
          .update(payload)
          .eq("id", editId)
          .select("id")
          .single();

        if (updateError) throw updateError;
        terrenoId = data?.id ?? editId;

        await supabase
          .from("terreno_imagen")
          .delete()
          .eq("terreno_id", terrenoId);
        if (imgs.length) {
          const { error: imageError } = await supabase
            .from("terreno_imagen")
            .insert(
              imgs
                .slice()
                .sort((a, b) => a.orden - b.orden)
                .map((img, idx) => ({
                  terreno_id: terrenoId,
                  url: img.url,
                  alt: img.alt?.trim() || null,
                  orden: idx,
                }))
            );
          if (imageError) throw imageError;
        }
      } else {
        const { data, error: insertError } = await supabase
          .from("terrenos")
          .insert(payload)
          .select("id")
          .single();
        if (insertError) throw insertError;

        terrenoId = data?.id;
        if (!terrenoId)
          throw new Error("No pudimos obtener el identificador del terreno.");

        if (imgs.length) {
          const { error: imageError } = await supabase
            .from("terreno_imagen")
            .insert(
              imgs
                .slice()
                .sort((a, b) => a.orden - b.orden)
                .map((img, idx) => ({
                  terreno_id: terrenoId,
                  url: img.url,
                  alt: img.alt?.trim() || null,
                  orden: idx,
                }))
            );
          if (imageError) throw imageError;
        }
      }

      location.href = "/terrenos";
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Algo salió mal al guardar el terreno. Intenta de nuevo en unos minutos.";
      setError(message);
      setIsSubmitting(false);
    }
  }

  // Quick-fill de Maps a partir de la dirección
  function fillMapsFromAddress() {
    const dir = direccionRef.current?.value?.trim();
    if (!dir) return;
    const url = `https://www.google.com/maps/search/${encodeURIComponent(dir)}`;
    if (mapsRef.current) {
      mapsRef.current.value = url;
      // Dispara cambio para refrescar preview
      const form = mapsRef.current.closest("form");
      if (form) {
        const fd = new FormData(form as HTMLFormElement);
        setPreviewData(buildPreviewFromForm(fd));
      }
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6 p-6 text-white shadow-xl rounded-3xl bg-linear-to-br from-slate-900 via-slate-900 to-slate-950 shadow-slate-950/50 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Terrenos
          </p>
          <h1 className="text-2xl font-semibold md:text-3xl">
            {isEditing ? "Editar Terreno" : "Nuevo Terreno"}
          </h1>
          <p className="text-sm text-slate-300">
            {isEditing
              ? "Actualiza la información de la propiedad."
              : "Captura información clara y completa para destacar la propiedad dentro del catálogo digital de Saro."}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm text-slate-300 sm:grid-cols-3 md:w-auto">
          <div className="p-4 border rounded-2xl border-slate-700/70 bg-slate-900/40">
            <dt className="text-xs tracking-wider uppercase text-slate-400">
              Estado {isEditing ? "actual" : "inicial"}
            </dt>
            <dd className="mt-1 text-lg font-semibold text-white">
              {defaults?.estado
                ? defaults.estado.charAt(0).toUpperCase() +
                defaults.estado.slice(1)
                : "Borrador"}
            </dd>
          </div>
          <div className="p-4 border rounded-2xl border-slate-700/70 bg-slate-900/40">
            <dt className="text-xs tracking-wider uppercase text-slate-400">
              Imágenes
            </dt>
            <dd className="mt-1 text-lg font-semibold text-white">
              {totalAssets}
            </dd>
          </div>
          <div className="p-4 border rounded-2xl border-slate-700/70 bg-slate-900/40">
            <dt className="text-xs tracking-wider uppercase text-slate-400">
              Último guardado
            </dt>
            <dd className="mt-1 text-lg font-semibold text-white">
              {isSubmitting ? "Guardando…" : "Pendiente"}
            </dd>
          </div>
        </dl>
      </header>

      {error && (
        <div className="px-6 py-4 text-sm font-medium text-red-700 border shadow-sm rounded-2xl border-red-400/40 bg-red-100/80">
          {error}
        </div>
      )}

      {isEditing && isLoadingRecord ? (
        <div className="flex items-center justify-center py-24 text-sm text-slate-500">
          Cargando terreno…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Formulario */}
          <div className="lg:col-span-2">
            <form
              key={isEditing ? `edit-${editId}` : "new"}
              onChange={onFormChange}
              onSubmit={onSubmit}
              className="space-y-6"
            >
              {/* Información principal */}
              <section className="p-6 border shadow-lg rounded-3xl border-slate-200 bg-white/90 shadow-slate-900/5">
                <header className="space-y-1">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Información principal
                  </h2>
                  <p className="text-sm text-slate-500">
                    Usa títulos descriptivos y un slug corto orientado a SEO.
                  </p>
                </header>

                <div className="grid gap-6 mt-6 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-600">
                      Slug*
                    </span>
                    <input
                      name="slug"
                      required
                      placeholder="ej. terreno-bosque-sur"
                      className={baseInput}
                      defaultValue={defaults?.slug ?? ""}
                    />
                    <span className="text-xs text-slate-400">
                      Único en la URL pública.
                    </span>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-600">
                      Título comercial*
                    </span>
                    <input
                      name="titulo"
                      required
                      placeholder="Terreno residencial cerca del lago"
                      className={baseInput}
                      defaultValue={defaults?.titulo ?? ""}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-600">
                      Precio (centavos)*
                    </span>
                    <input
                      name="precio_cents"
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="Ej. 125000000"
                      className={baseInput}
                      defaultValue={defaults?.precio_cents ?? ""}
                    />
                    <span className="text-xs text-slate-400">
                      Valor en centavos (MXN).
                    </span>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-600">
                      Superficie (m²)
                    </span>
                    <input
                      name="superficie_m2"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Ej. 250.50"
                      className={baseInput}
                      defaultValue={
                        defaults?.superficie_m2 != null
                          ? String(defaults.superficie_m2)
                          : ""
                      }
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-600">
                      Lat
                    </span>
                    <input
                      name="lat"
                      type="number"
                      step="0.000001"
                      placeholder="Ej. 25.686614"
                      className={baseInput}
                      defaultValue={
                        defaults?.lat != null ? String(defaults.lat) : ""
                      }
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-600">
                      Lng
                    </span>
                    <input
                      name="lng"
                      type="number"
                      step="0.000001"
                      placeholder="Ej. -100.316113"
                      className={baseInput}
                      defaultValue={
                        defaults?.lng != null ? String(defaults.lng) : ""
                      }
                    />
                  </label>

                  <label className="space-y-2 sm:col-span-2">
                    <span className="text-sm font-medium text-slate-600">
                      Dirección corta
                    </span>
                    <input
                      ref={direccionRef}
                      name="direccion_corta"
                      placeholder="Colonia, municipio, estado"
                      className={baseInput}
                      defaultValue={defaults?.direccion_corta ?? ""}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        Referencia rápida visible.
                      </span>
                      <button
                        type="button"
                        onClick={fillMapsFromAddress}
                        className="text-xs font-medium text-sky-600 hover:text-sky-700"
                        title="Generar enlace de Maps con la dirección"
                      >
                        Generar enlace de Maps
                      </button>
                    </div>
                  </label>

                  <label className="space-y-2 sm:col-span-2">
                    <span className="text-sm font-medium text-slate-600">
                      Descripción
                    </span>
                    <textarea
                      name="descripcion"
                      rows={6}
                      className={`${baseInput} resize-none`}
                      placeholder="Describe atributos, amenidades, estatus legal y puntos de venta del terreno."
                      defaultValue={defaults?.descripcion ?? ""}
                    />
                  </label>
                </div>
              </section>

              {/* Servicios & Etiquetas */}
              <section className="p-6 border shadow-lg rounded-3xl border-slate-200 bg-white/90 shadow-slate-900/5">
                <header className="space-y-1">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Servicios & Etiquetas
                  </h2>
                  <p className="text-sm text-slate-500">
                    Selecciona servicios y añade etiquetas separadas por comas.
                  </p>
                </header>

                <div className="grid gap-6 mt-6 md:grid-cols-2">
                  <fieldset className="space-y-3">
                    <legend className="mb-1 text-sm font-medium text-slate-600">
                      Servicios
                    </legend>

                    <label className="flex items-start gap-3 p-3 border rounded-2xl border-slate-200 bg-white/50 hover:border-sky-200">
                      <input
                        type="checkbox"
                        name="servicios.agua"
                        className="transition rounded size-5 border-slate-300 text-sky-500 focus:ring-sky-400"
                        defaultChecked={!!defaults?.servicios?.agua}
                      />
                      <span className="text-sm text-slate-700">Agua</span>
                    </label>

                    <label className="flex items-start gap-3 p-3 border rounded-2xl border-slate-200 bg-white/50 hover:border-sky-200">
                      <input
                        type="checkbox"
                        name="servicios.luz"
                        className="transition rounded size-5 border-slate-300 text-sky-500 focus:ring-sky-400"
                        defaultChecked={!!defaults?.servicios?.luz}
                      />
                      <span className="text-sm text-slate-700">Luz</span>
                    </label>

                    <label className="flex items-start gap-3 p-3 border rounded-2xl border-slate-200 bg-white/50 hover:border-sky-200">
                      <input
                        type="checkbox"
                        name="servicios.canales"
                        className="transition rounded size-5 border-slate-300 text-sky-500 focus:ring-sky-400"
                        defaultChecked={!!defaults?.servicios?.canales}
                      />
                      <span className="text-sm text-slate-700">Canales</span>
                    </label>
                  </fieldset>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-600">
                      Etiquetas
                    </span>
                    <input
                      name="etiquetas"
                      placeholder="venta, terreno, esquina"
                      className={baseInput}
                      defaultValue={etiquetasToInputValue(defaults?.etiquetas)}
                    />
                    {previewData.etiquetas?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {previewData.etiquetas.map((e) => (
                          <span
                            key={e}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded-full border-slate-200 bg-white/60"
                          >
                            #{e}
                          </span>
                        ))}
                      </div>
                    )}
                  </label>
                </div>
              </section>

              {/* Ubicación */}
              <section className="p-6 border shadow-lg rounded-3xl border-slate-200 bg-white/90 shadow-slate-900/5">
                <header className="space-y-1">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Ubicación
                  </h2>
                  <p className="text-sm text-slate-500">
                    Proporciona el enlace a Maps.
                  </p>
                </header>

                <div className="grid gap-6 mt-6 lg:grid-cols-2">
                  <label className="space-y-2 lg:col-span-2">
                    <span className="text-sm font-medium text-slate-600">
                      Enlace de Google Maps
                    </span>
                    <input
                      ref={mapsRef}
                      name="link_maps"
                      type="url"
                      placeholder="https://maps.google.com/..."
                      className={baseInput}
                      defaultValue={defaults?.link_maps ?? ""}
                    />
                    <span className="text-xs text-slate-400">
                      Si lo dejas vacío, se generará con la dirección corta.
                    </span>
                  </label>
                </div>
              </section>

              {/* Publicación */}
              <section className="p-6 border shadow-lg rounded-3xl border-slate-200 bg-white/90 shadow-slate-900/5">
                <header className="space-y-1">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Publicación
                  </h2>
                  <p className="text-sm text-slate-500">
                    Define el estado y marca si es destacado.
                  </p>
                </header>

                <div className="grid gap-6 mt-6 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-600">
                      Estado
                    </span>
                    <select
                      name="estado"
                      className={baseInput}
                      defaultValue={defaults?.estado ?? "borrador"}
                    >
                      <option value="borrador">Borrador</option>
                      <option value="publicado">Publicado</option>
                      <option value="archivado">Archivado</option>
                    </select>
                  </label>

                  <label className="flex items-start gap-3 p-4 border rounded-2xl border-slate-200 bg-white/50 hover:border-sky-200">
                    <input
                      type="checkbox"
                      name="es_destacado"
                      className="mt-1 transition rounded size-5 border-slate-300 text-sky-500 focus:ring-sky-400"
                      defaultChecked={!!defaults?.es_destacado}
                    />
                    <span className="space-y-1 text-sm text-slate-600">
                      <span className="block font-semibold text-slate-700">
                        Marcar como destacado
                      </span>
                      <span className="block text-xs text-slate-500">
                        Aparece en carruseles y campañas especiales.
                      </span>
                    </span>
                  </label>
                </div>
              </section>

              {/* Material visual - UI mejorada */}
              <section className="p-6 border shadow-lg rounded-3xl border-slate-200 bg-white/90 shadow-slate-900/5">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Material visual
                    </h2>
                    <p className="text-sm text-slate-500">
                      Sube imágenes (ideal 1600×900). Puedes reordenarlas,
                      elegir portada y editar el texto alternativo.
                    </p>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    {totalAssets} archivos
                  </span>
                </header>

                {/* Drop area que envuelve al Uploader */}
                <div className="mt-6">
                  <div className="p-6 text-center border-2 border-dashed rounded-3xl border-slate-300 bg-white/70">
                    <div className="max-w-sm mx-auto">
                      <p className="text-sm text-slate-600">
                        Arrastra y suelta aquí o usa el botón para seleccionar.
                      </p>
                      <div className="inline-flex items-center gap-2 mt-4">
                        <Uploader
                          onUploaded={(url) =>
                            setImgs((prev) => [
                              ...prev,
                              { url, orden: prev.length },
                            ])
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Galería responsiva con controles (sin ALT, con botón Eliminar) */}
                {imgs.length > 0 && (
                  <div className="grid gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-3">
                    {imgs
                      .slice()
                      .sort((a, b) => a.orden - b.orden)
                      .map((img, idx) => (
                        <figure
                          key={`${img.url}-${idx}`}
                          className="relative overflow-hidden border shadow-sm group rounded-3xl border-slate-200 bg-slate-50"
                        >
                          <div className="relative w-full overflow-hidden h-44">
                            <img
                              src={img.url}
                              alt={`Imagen ${idx + 1}`}
                              className="object-cover w-full h-full"
                            />

                            {/* Barra superior: Portada + orden + controles de reorden */}
                            <div className="absolute top-0 left-0 flex items-center justify-between w-full p-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${idx === 0
                                  ? "bg-amber-500/90 text-white"
                                  : "bg-white/90 text-slate-700"
                                  }`}
                              >
                                {idx === 0 ? "Portada" : `#${idx + 1}`}
                              </span>

                              <div className="flex gap-1 p-1 rounded-full shadow-sm bg-white/90">
                                <button
                                  type="button"
                                  onClick={() => moveImage(idx, -1)}
                                  className="px-2 py-1 text-xs rounded-full hover:bg-slate-100"
                                  title="Subir"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveImage(idx, +1)}
                                  className="px-2 py-1 text-xs rounded-full hover:bg-slate-100"
                                  title="Bajar"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => makeCover(idx)}
                                  className="px-2 py-1 text-xs rounded-full hover:bg-slate-100"
                                  title="Hacer portada"
                                >
                                  Portada
                                </button>
                              </div>
                            </div>

                            {/* Botón Eliminar visible en cada imagen */}
                            <div className="absolute bottom-0 left-0 w-full p-2">
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="w-full px-3 py-2 text-xs font-semibold text-center text-white shadow rounded-xl bg-rose-600/90 hover:bg-rose-600"
                                title="Eliminar imagen"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </figure>
                      ))}
                  </div>
                )}
              </section>

              <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  {isEditing
                    ? "Al guardar, se actualizarán tanto los campos como el material visual."
                    : "Al guardar, el terreno aparecerá en la administración y podrás editarlo más tarde."}
                </p>
                <div className="flex gap-3">
                  <a
                    href="/terrenos"
                    className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold transition bg-white border rounded-2xl border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-700"
                  >
                    Cancelar
                  </a>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white transition border shadow-lg rounded-2xl border-sky-500 bg-linear-to-r from-sky-500 to-cyan-400 shadow-cyan-500/30 hover:from-sky-400 hover:to-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-75"
                  >
                    {isSubmitting
                      ? "Guardando…"
                      : isEditing
                        ? "Guardar cambios"
                        : "Guardar terreno"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Preview en vivo */}
          <div className="lg:sticky lg:top-4">
            <CardTerrenos data={previewData} />
          </div>
        </div>
      )}
    </div>
  );
}
