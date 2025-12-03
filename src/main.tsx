// main.tsx
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Navigate,
  Link,
} from "react-router-dom";
import Guard from "./components/Guard";
import { supabase } from "./lib/supabase";
import "./index.css";

// Sidebar
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "./components/ui/sidebar";
import { AppSidebar } from "./components/appSideBar";

// THEME
import { ThemeProvider, useTheme } from "next-themes";
import {
  ThemeToggler as ThemeTogglerPrimitive,
  type ThemeSelection,
  type Resolved,
} from "@/components/animate-ui/primitives/effects/theme-toggler";
import { buttonVariants } from "@/components/animate-ui/components/buttons/icon";
import { cn } from "@/lib/utils";
import { Monitor, Moon, Sun } from "lucide-react";
import Casas from "./routes/Casas";
import CasaForm from "./routes/CasaForm";
import Leads from "./routes/Leads";

// Lazy pages
const Login = lazy(() => import("./routes/Login"));
const Dashboard = lazy(() => import("./routes/Dashboard"));
const Terrenos = lazy(() => import("./routes/Terrenos"));
const TerrenoForm = lazy(() => import("./routes/TerrenoForm"));

// === helpers del botón (reutilizados) ===
const getIcon = (
  effective: ThemeSelection,
  resolved: Resolved,
  modes: ThemeSelection[]
) => {
  const theme = modes.includes("system") ? effective : resolved;
  return theme === "system" ? (
    <Monitor />
  ) : theme === "dark" ? (
    <Moon />
  ) : (
    <Sun />
  );
};
const getNextTheme = (
  effective: ThemeSelection,
  modes: ThemeSelection[]
): ThemeSelection => {
  const i = modes.indexOf(effective);
  if (i === -1) return modes[0];
  return modes[(i + 1) % modes.length];
};

function Layout() {
  //  next-themes para estado real del tema
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <Guard>
      {/* PRIMITIVE GLOBAL: envuelve TODO el layout protegido */}
      <ThemeTogglerPrimitive
        theme={theme as ThemeSelection}
        resolvedTheme={resolvedTheme as Resolved}
        setTheme={setTheme}
        direction="ltr"
      >
        {({ effective, resolved, toggleTheme }) => (
          <SidebarProvider>

            <AppSidebar />
            <SidebarInset className="mx-auto">

              {/* Header en todo el layout */}
              <header className="sticky top-0 z-10 flex items-center h-16 gap-4 px-4 border-b  shrink-0 md:px-6">
                <SidebarTrigger className="-ml-2" />
                <div className="flex items-center gap-2 mr-auto">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                    <span className="text-lg font-bold">S</span>
                  </div>
                  <Link to="/" className="text-lg font-semibold tracking-tight">
                    Saro ByR
                  </Link>
                </div>

                {/* Botón que dispara el toggle del PRIMITIVE GLOBAL */}
                <button
                  data-slot="theme-toggler-button"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "default" }),
                    "rounded-full hover:bg-muted transition-colors"
                  )}
                  onClick={() =>
                    toggleTheme(getNextTheme(effective, ["light", "dark"]))
                  }
                  aria-label="Cambiar tema"
                >
                  {getIcon(effective, resolved, ["light", "dark", "system"])}
                </button>
              </header>

              {/* Contenido de rutas */}
              <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
                <Outlet />
              </main>
            </SidebarInset>
          </SidebarProvider>
        )}
      </ThemeTogglerPrimitive>
    </Guard>
  );
}

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-sm text-gray-500 animate-pulse">Cargando…</div>
    </div>
  );
}

async function doLogout() {
  await supabase.auth.signOut();
  location.href = "/login";
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <Suspense fallback={<Loader />}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Loader />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: "terrenos",
        element: (
          <Suspense fallback={<Loader />}>
            <Terrenos />
          </Suspense>
        ),
      },
      {
        path: "terrenos/nuevo",
        element: (
          <Suspense fallback={<Loader />}>
            <TerrenoForm />
          </Suspense>
        ),
      },
      {
        path: "casas",
        element: (
          <Suspense fallback={<Loader />}>
            <Casas />
          </Suspense>
        ),
      },
      {
        path: "casas/nueva",
        element: (
          <Suspense fallback={<Loader />}>
            <CasaForm />
          </Suspense>
        ),
      },
      {
        path: "leads",
        element: (
          <Suspense fallback={<Loader />}>
            <Leads />
          </Suspense>
        ),
      },
      {
        path: "logout",
        loader: async () => {
          await doLogout();
          return null;
        },
        element: <Navigate to="/login" replace />,
      },
      { path: "*", element: <div className="p-8">Página no encontrada</div> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* THEME PROVIDER: attribute="class" para usar dark mode por clase */}
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="sora-theme"
      disableTransitionOnChange
    >
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>
);
