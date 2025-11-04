import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { Chart } from "chart.js";
import "chart.js/auto";

type Stats = {
  terrenos: number;
  casas: number;
  leads: number;
};

type MetricConfig = {
  key: keyof Stats;
  label: string;
  description: string;
  icon?: ReactNode;
};

type Period = "week" | "month" | "year";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  // Semana inicia Lunes (MX). getDay(): 0=Dom...6=Sab
  const x = startOfDay(d);
  const dow = x.getDay(); // 0..6
  const offset = (dow + 6) % 7; // Lunes=0
  x.setDate(x.getDate() - offset);
  return x;
}
function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}
function startOfYear(d: Date) {
  const x = startOfDay(d);
  x.setMonth(0, 1);
  return x;
}

// Genera los buckets (fechas clave) para cada periodo
function buildBuckets(period: Period) {
  if (period === "week") {
    // 12 semanas (incluyendo la actual)
    const buckets: Date[] = [];
    const today = startOfWeek(new Date());
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i * 7);
      buckets.push(d);
    }
    return buckets;
  }
  if (period === "month") {
    // 12 meses (incluyendo el actual)
    const buckets: Date[] = [];
    const today = startOfMonth(new Date());
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today);
      d.setMonth(today.getMonth() - i, 1);
      buckets.push(d);
    }
    return buckets;
  }
  // year: 5 años (incluyendo el actual)
  const buckets: Date[] = [];
  const today = startOfYear(new Date());
  for (let i = 4; i >= 0; i--) {
    const d = new Date(today);
    d.setFullYear(today.getFullYear() - i, 0, 1);
    buckets.push(d);
  }
  return buckets;
}

function bucketLabel(d: Date, period: Period, locale = "es-MX") {
  if (period === "week") {
    // Etiquetamos con el inicio de la semana (p.ej. "03 nov")
    return d.toLocaleDateString(locale, { month: "short", day: "2-digit" });
  }
  if (period === "month") {
    // "nov 2025"
    return d.toLocaleDateString(locale, { year: "numeric", month: "short" });
  }
  // year
  return d.getFullYear().toString();
}

function sameBucket(a: Date, b: Date, period: Period) {
  if (period === "week") {
    return startOfWeek(a).getTime() === startOfWeek(b).getTime();
  }
  if (period === "month") {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }
  return a.getFullYear() === b.getFullYear();
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("week"); // "week" | "month" | "year"
  const [series, setSeries] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });

  // refs para Chart.js
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  // Cargar métricas de tarjetas
  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setError(null);

      const [
        { count: terrenos, error: terrenosErr },
        { count: casas, error: casasErr },
        { count: leads, error: leadsErr },
      ] = await Promise.all([
        supabase.from("terrenos").select("*", { count: "exact", head: true }).eq("estado", "publicado"),
        supabase.from("casas").select("*", { count: "exact", head: true }).eq("estado", "publicado"),
        supabase.from("leads").select("*", { count: "exact", head: true }),
      ]);

      if (cancelled) return;

      if (terrenosErr || casasErr || leadsErr) {
        setError("No pudimos cargar las métricas. Intenta refrescar la página.");
        return;
      }

      setStats({
        terrenos: terrenos ?? 0,
        casas: casas ?? 0,
        leads: leads ?? 0,
      });
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cargar visitas y agregarlas por periodo
  useEffect(() => {
    let cancelled = false;

    async function loadVisits() {
      setError(null);

      const buckets = buildBuckets(period);
      const earliest = buckets[0];
      const startISO = new Date(earliest).toISOString(); // desde inicio del primer bucket

      const { data, error: pvErr } = await supabase
        .from("page_views")
        .select("created_at")
        .gte("created_at", startISO)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (pvErr) {
        setError("No pudimos cargar la gráfica de visitas.");
        return;
      }

      // Inicializa conteos por bucket
      const counts = buckets.map(() => 0);

      (data ?? []).forEach((row: { created_at: string }) => {
        const d = new Date(row.created_at);
        // Encuentra el bucket al que pertenece
        const idx = buckets.findIndex((b) => sameBucket(d, b, period));
        if (idx >= 0) counts[idx] += 1;
      });

      setSeries({
        labels: buckets.map((b) => bucketLabel(b, period)),
        data: counts,
      });
    }

    loadVisits();
    return () => {
      cancelled = true;
    };
  }, [period]);

  // Renderizar/actualizar Chart.js
  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current?.destroy();
    chartRef.current = null;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Color neutro (slate ~600) con relleno sutil para diferenciar del fondo
    const stroke = "rgba(71,85,105,1)";   // #475569
    const fill = "rgba(71,85,105,0.15)";

    const periodLabel =
      period === "week" ? "últimas 12 semanas" : period === "month" ? "últimos 12 meses" : "últimos 5 años";

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: `Visitas (${periodLabel})`,
            data: series.data,
            borderColor: stroke,
            backgroundColor: fill,
            borderWidth: 2.5,
            pointRadius: 2,
            pointBackgroundColor: stroke,
            pointBorderColor: stroke,
            fill: true,
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: true },
          tooltip: { enabled: true },
        },
        scales: {
          x: { ticks: { autoSkip: true, maxTicksLimit: 10 }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [series, period]);

  // Config de las 3 métricas
  const metrics: MetricConfig[] = useMemo(
    () => [
      { key: "terrenos", label: "Terrenos publicados", description: "Inventario visible en el portal Sora." },
      { key: "casas", label: "Casas publicadas", description: "Propiedades disponibles para clientes." },
      { key: "leads", label: "Leads recibidos", description: "Solicitudes nuevas pendientes de seguimiento." },
    ],
    []
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500/80">Panel general</p>
        <h1 className="text-3xl font-semibold text-slate-500/70">Monitoreo rápido</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Revisa el desempeño de la web y la actividad de clientes en tiempo real.
        </p>
      </header>

      {error && (
        <div className="px-5 py-4 text-sm font-medium text-red-700 border dark:text-red-200 rounded-xl border-red-300/60 dark:border-red-500/40 bg-red-50 dark:bg-red-950/60">
          {error}
        </div>
      )}

      {/* Gráfica de visitas */}
      <section
        className="
          rounded-3xl bg-inherit
          ring-1 ring-black/10 dark:ring-white/10
          shadow-[0_1px_0_rgba(255,255,255,.6)_inset,0_10px_30px_rgba(0,0,0,.08)]
          dark:shadow-[0_1px_0_rgba(255,255,255,.06)_inset,0_20px_40px_rgba(0,0,0,.5)]
          p-4
        "
      >
        {/* Period selector */}
        <div className="flex items-center gap-2 mb-3">
          <div className="inline-flex p-1 text-sm border rounded-2xl border-slate-200 bg-white/70 backdrop-blur dark:border-slate-700 dark:bg-slate-900/40">
            <button
              type="button"
              onClick={() => setPeriod("week")}
              className={`px-3 py-1.5 rounded-xl transition ${
                period === "week" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-700 dark:text-slate-200"
              }`}
            >
              Semanal
            </button>
            <button
              type="button"
              onClick={() => setPeriod("month")}
              className={`px-3 py-1.5 rounded-xl transition ${
                period === "month" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-700 dark:text-slate-200"
              }`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setPeriod("year")}
              className={`px-3 py-1.5 rounded-xl transition ${
                period === "year" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-700 dark:text-slate-200"
              }`}
            >
              Anual
            </button>
          </div>
        </div>

        <div className="h-64 md:h-72">
          <canvas ref={canvasRef} />
        </div>
      </section>

      {/* Tarjetas de métricas */}
      <section
        className="
          rounded-3xl bg-inherit
          ring-1 ring-white/10
          shadow-[0_1px_0_rgba(255,255,255,.6)_inset,0_10px_30px_rgba(0,0,0,.08)]
          dark:shadow-[0_1px_0_rgba(255,255,255,.06)_inset,0_20px_40px_rgba(0,0,0,.5)]
          overflow-hidden
        "
      >
        <div className="grid grid-cols-1 divide-y md:grid-cols-3 md:divide-y-0 md:divide-x divide-black/10 dark:divide-white/10">
          {metrics.map(({ key, label, description }) => {
            const value = stats?.[key];
            const formatted = typeof value === "number" ? value.toLocaleString("es-MX") : "—";
            return (
              <div key={key} className="p-6 sm:p-8">
                <p className="text-xs font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
                  {stats ? "Actualizado" : "Sincronizando"}
                </p>

                <div className="mt-3">
                  <h3 className="text-sm font-medium text-slate-500/80">{label}</h3>
                  <p className="mt-2 text-4xl font-semibold text-slate-500">{formatted}</p>
                  <p className="mt-2 text-sm text-slate-500">{description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
