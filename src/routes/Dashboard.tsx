import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { Chart } from "chart.js";
import "chart.js/auto";
import { Users, MousePointerClick, Globe } from "lucide-react";

type Stats = {
  terrenos: number;
  casas: number;
  leads: number;
};

type PageView = {
  created_at: string;
  path: string | null;
  referrer: string | null;
  ua: string | null;
  anonymous_id: string | null;
};

type MetricConfig = {
  key: keyof Stats;
  label: string;
  description: string;
  icon?: ReactNode;
};

type Period = "week" | "month" | "year";

// --- Date Helpers ---

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const dow = x.getDay();
  const offset = (dow + 6) % 7;
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

function buildBuckets(period: Period) {
  if (period === "week") {
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
    const buckets: Date[] = [];
    const today = startOfMonth(new Date());
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today);
      d.setMonth(today.getMonth() - i, 1);
      buckets.push(d);
    }
    return buckets;
  }
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
    return d.toLocaleDateString(locale, { month: "short", day: "2-digit" });
  }
  if (period === "month") {
    return d.toLocaleDateString(locale, { year: "numeric", month: "short" });
  }
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

// --- Device Detection Helper ---
function getDeviceType(ua: string | null): "Mobile" | "Tablet" | "Desktop" {
  if (!ua) return "Desktop";
  const lower = ua.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(lower)) {
    return "Tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)os|Opera M(obi|ini)/.test(ua)) {
    return "Mobile";
  }
  return "Desktop";
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("week");

  // Data states
  const [visitsSeries, setVisitsSeries] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
  const [totalVisits, setTotalVisits] = useState(0);
  const [topPages, setTopPages] = useState<{ path: string; count: number }[]>([]);
  const [deviceStats, setDeviceStats] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });

  // Refs for charts
  const visitsChartRef = useRef<HTMLCanvasElement | null>(null);
  const pagesChartRef = useRef<HTMLCanvasElement | null>(null);
  const devicesChartRef = useRef<HTMLCanvasElement | null>(null);

  const chartInstances = useRef<{ [key: string]: Chart | null }>({
    visits: null,
    pages: null,
    devices: null
  });

  // 1. Load basic stats (cards)
  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      const [
        { count: terrenos },
        { count: casas },
        { count: leads },
      ] = await Promise.all([
        supabase.from("terrenos").select("*", { count: "exact", head: true }).eq("estado", "publicado"),
        supabase.from("casas").select("*", { count: "exact", head: true }).eq("estado", "publicado"),
        supabase.from("leads").select("*", { count: "exact", head: true }),
      ]);

      if (cancelled) return;
      setStats({
        terrenos: terrenos ?? 0,
        casas: casas ?? 0,
        leads: leads ?? 0,
      });
    }
    loadStats();
    return () => { cancelled = true; };
  }, []);

  // 2. Load Page Views Data
  useEffect(() => {
    let cancelled = false;

    async function loadVisits() {
      setError(null);
      const buckets = buildBuckets(period);
      const earliest = buckets[0];
      const startISO = new Date(earliest).toISOString();

      const { data, error: pvErr } = await supabase
        .from("page_views")
        .select("created_at, path, referrer, ua, anonymous_id")
        .gte("created_at", startISO)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (pvErr) {
        setError("No pudimos cargar los datos de visitas.");
        return;
      }

      const rows = (data as PageView[]) ?? [];

      // --- Process: Visits over time ---
      const counts = buckets.map(() => 0);
      rows.forEach((row) => {
        const d = new Date(row.created_at);
        const idx = buckets.findIndex((b) => sameBucket(d, b, period));
        if (idx >= 0) {
          counts[idx] += 1;
        }
      });

      setVisitsSeries({
        labels: buckets.map((b) => bucketLabel(b, period)),
        data: counts,
      });

      // --- Process: Total & Unique ---
      setTotalVisits(rows.length);

      // --- Process: Top Pages ---
      const pageMap = new Map<string, number>();
      rows.forEach(r => {
        const p = r.path || "/";
        pageMap.set(p, (pageMap.get(p) || 0) + 1);
      });
      const sortedPages = Array.from(pageMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([path, count]) => ({ path, count }));
      setTopPages(sortedPages);

      // --- Process: Top Referrers ---
      const refMap = new Map<string, number>();
      rows.forEach(r => {
        let ref = r.referrer;
        if (!ref || ref.includes(window.location.host)) return; // Filter internal or empty
        try {
          const url = new URL(ref);
          ref = url.hostname;
        } catch { /* ignore */ }
        refMap.set(ref, (refMap.get(ref) || 0) + 1);
      });

      // --- Process: Device Stats ---
      const deviceMap = { Desktop: 0, Mobile: 0, Tablet: 0 };
      rows.forEach(r => {
        const type = getDeviceType(r.ua);
        deviceMap[type]++;
      });
      setDeviceStats({
        labels: Object.keys(deviceMap),
        data: Object.values(deviceMap),
      });
    }

    loadVisits();
    return () => { cancelled = true; };
  }, [period]);

  // 3. Render Charts
  useEffect(() => {
    // --- Visits Chart (Line) ---
    if (visitsChartRef.current) {
      chartInstances.current.visits?.destroy();
      const ctx = visitsChartRef.current.getContext("2d");
      if (ctx) {
        const stroke = "rgba(79, 70, 229, 1)"; // Indigo 600
        const fill = "rgba(79, 70, 229, 0.1)";

        chartInstances.current.visits = new Chart(ctx, {
          type: "line",
          data: {
            labels: visitsSeries.labels,
            datasets: [{
              label: "Visitas",
              data: visitsSeries.data,
              borderColor: stroke,
              backgroundColor: fill,
              borderWidth: 2,
              pointRadius: 3,
              fill: true,
              tension: 0.3,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false } },
              y: { beginAtZero: true, ticks: { precision: 0 } },
            },
          },
        });
      }
    }

    // --- Top Pages Chart (Bar) ---
    if (pagesChartRef.current) {
      chartInstances.current.pages?.destroy();
      const ctx = pagesChartRef.current.getContext("2d");
      if (ctx) {
        chartInstances.current.pages = new Chart(ctx, {
          type: "bar",
          data: {
            labels: topPages.map(p => p.path),
            datasets: [{
              label: "Vistas",
              data: topPages.map(p => p.count),
              backgroundColor: "rgba(16, 185, 129, 0.7)", // Emerald 500
              borderRadius: 4,
            }],
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { beginAtZero: true, ticks: { precision: 0 } },
              y: { grid: { display: false } },
            },
          },
        });
      }
    }

    // --- Devices Chart (Doughnut) ---
    if (devicesChartRef.current) {
      chartInstances.current.devices?.destroy();
      const ctx = devicesChartRef.current.getContext("2d");
      if (ctx) {
        chartInstances.current.devices = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: deviceStats.labels,
            datasets: [{
              data: deviceStats.data,
              backgroundColor: [
                "rgba(59, 130, 246, 0.7)", // Blue 500
                "rgba(249, 115, 22, 0.7)", // Orange 500
                "rgba(168, 85, 247, 0.7)", // Purple 500
              ],
              borderWidth: 0,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'right' }
            },
            cutout: '70%',
          },
        });
      }
    }

    return () => {
      Object.values(chartInstances.current).forEach(c => c?.destroy());
    };
  }, [visitsSeries, topPages, deviceStats]);

  const metrics: MetricConfig[] = useMemo(() => [
    { key: "terrenos", label: "Terrenos", description: "Publicados", icon: <Globe className="w-4 h-4" /> },
    { key: "casas", label: "Casas", description: "Publicadas", icon: <Globe className="w-4 h-4" /> },
    { key: "leads", label: "Leads", description: "Recibidos", icon: <Users className="w-4 h-4" /> },
  ], []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de actividad y rendimiento.</p>
        </div>

        {/* Period Selector */}
        <div className="inline-flex p-1 text-sm border rounded-xl border-border bg-muted/50 self-start md:self-auto">
          {(["week", "month", "year"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${period === p
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
            >
              {p === "week" ? "Semana" : p === "month" ? "Mes" : "Año"}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50">
          {error}
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Custom Cards for Visits */}
        <div className="p-6 border shadow-sm rounded-3xl bg-card border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <MousePointerClick className="w-4 h-4" />
            <span className="text-sm font-medium">Visitas Totales</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{totalVisits.toLocaleString()}</p>
        </div>

        {/* Database Metrics */}
        {metrics.map(({ key, label, description, icon }) => (
          <div key={key} className="p-6 border shadow-sm rounded-3xl bg-card border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              {icon}
              <span className="text-sm font-medium">{label}</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {stats ? stats[key].toLocaleString() : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Line Chart */}
        <section className="lg:col-span-2 p-6 border shadow-sm rounded-3xl bg-card border-border">
          <h3 className="text-lg font-semibold mb-6">Tendencia de Visitas</h3>
          <div className="h-72 w-full">
            <canvas ref={visitsChartRef} />
          </div>
        </section>

        {/* Device Stats */}
        <section className="p-6 border shadow-sm rounded-3xl bg-card border-border flex flex-col">
          <h3 className="text-lg font-semibold mb-6">Dispositivos</h3>
          <div className="flex-1 min-h-[200px] relative">
            <canvas ref={devicesChartRef} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
            {deviceStats.labels.map((label, i) => (
              <div key={label}>
                <span className="block font-bold text-foreground">{deviceStats.data[i]}</span>
                {label}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom Section: Top Pages & Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <section className="p-6 border shadow-sm rounded-3xl bg-card border-border">
          <h3 className="text-lg font-semibold mb-6">Páginas Más Visitadas</h3>
          <div className="h-64 w-full">
            <canvas ref={pagesChartRef} />
          </div>
        </section>
      </div>
    </div>
  );
}

