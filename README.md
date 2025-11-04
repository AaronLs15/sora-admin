⸻


# 🏡 Sora Admin

**Sora Admin** es el panel administrativo del ecosistema **Sora Company**, diseñado para gestionar terrenos, casas y leads de clientes interesados.  
Construido con **React + Vite + TailwindCSS**, ofrece una interfaz rápida, moderna y adaptable a cualquier dispositivo.

---

## 🚀 Características principales

- **Gestión de propiedades**
  - Alta, edición y eliminación de *terrenos* y *casas*.
  - Carga de imágenes mediante `Uploader`.
  - Vista previa tipo *card* con estilo minimalista.

- **Panel de Leads**
  - Visualización de mensajes recibidos desde la página pública.
  - Botones para contactar rápidamente por **WhatsApp** o **Correo electrónico**.

- **Dashboard principal**
  - Métricas de terrenos, casas y leads.
  - Gráficas con *Chart.js* para estadísticas diarias o mensuales.

- **Sistema de roles**
  - Administrador y Editor (definidos manualmente en base de datos).

- **Diseño responsive**
  - Compatible con escritorio, tablet y móvil.
  - Paleta de colores adaptada al tema claro/oscuro.

---

## 🧱 Estructura del proyecto

sora-admin/
│
├── public/
│   ├── favicon.svg
│   └── _redirects          # Redirección SPA para Netlify
│
├── src/
│   ├── components/         # Componentes reutilizables (Cards, Uploader, Inputs, etc.)
│   ├── pages/              # Páginas principales: Login, Dashboard, Terrenos, Casas, Leads
│   ├── lib/                # Configuraciones (ej. supabase client)
│   ├── hooks/              # Hooks personalizados (ej. useMobile, useStats)
│   ├── styles/             # Archivos de estilos o temas globales
│   ├── App.tsx             # Definición de rutas y layout principal
│   └── main.tsx            # Punto de entrada, renderiza la app
│
├── package.json            # Dependencias y scripts del proyecto
├── tsconfig.app.json       # Configuración TypeScript
├── tailwind.config.js      # Configuración de TailwindCSS
├── vite.config.ts          # Configuración de Vite
└── netlify.toml            # Configuración de despliegue (opcional)

---

## ⚙️ Tecnologías utilizadas

| Tecnología       | Uso principal                                  |
|------------------|------------------------------------------------|
| **React 18+**    | Framework base                                 |
| **Vite**         | Empaquetador ultrarrápido                      |
| **TypeScript**   | Tipado estático y seguridad en desarrollo      |
| **TailwindCSS**  | Estilos utilitarios y diseño responsive        |
| **Supabase**     | Base de datos y almacenamiento de imágenes     |
| **Chart.js**     | Visualización de estadísticas                  |
| **Lucide React** | Iconos minimalistas                            |
| **Netlify**      | Hosting y CI/CD                                |

---

## 🧰 Scripts disponibles

En la raíz del proyecto:

| Comando | Descripción |
|----------|-------------|
| `npm install` | Instala las dependencias |
| `npm run dev` | Inicia el servidor de desarrollo en `http://localhost:5173` |
| `npm run build` | Genera la versión optimizada de producción |
| `npm run preview` | Previsualiza el build localmente |

---

## 🧑‍💻 Desarrollo local

1. Clona el repositorio:
```bash
git clone https://github.com/AaronLs15/sora-admin.git
cd sora-admin

	2.	Instala las dependencias:

npm install


	3.	Ejecuta el entorno de desarrollo:

npm run dev


	4.	Abre en tu navegador:

http://localhost:5173



⸻

📂 Estructura lógica del panel

Módulo	Descripción
Dashboard	Muestra las métricas globales (terrenos, casas, leads).
Terrenos / Casas	CRUD completo, vista previa con imágenes y datos.
Leads	Contactos recibidos desde la web pública, con acciones rápidas.
Auth	Página de login (validación con Supabase).


⸻

🧩 Próximas mejoras (roadmap)
	•	📦 Paginación y filtros avanzados en tablas.
	•	🌙 Mejoras en tema oscuro y componentes visuales.

⸻

📝 Licencia

Este proyecto está bajo la licencia MIT.
Puedes usarlo y modificarlo libremente con atribución.

⸻

Desarrollado por Aaron Lujano￼ 💻
Proyecto parte del ecosistema Sora Company.

---

¿Quieres que te genere también el **README** para el proyecto público (la web de Sora Company) con su estructura y explicación? Así ambos repositorios quedarían documentados de forma consistente.