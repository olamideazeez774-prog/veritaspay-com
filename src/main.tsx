import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

function renderBootstrapFailure(title: string, detail: string) {
  if (!rootElement) return;
  rootElement.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f8fafc;color:#0f172a;font-family:ui-sans-serif,system-ui,sans-serif">
      <section style="width:min(100%,560px);padding:32px;border:1px solid #cbd5e1;border-radius:16px;background:white;box-shadow:0 12px 40px rgba(15,23,42,.08)">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#0f766e">Mirvyn</p>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15">${title}</h1>
        <p style="margin:0;color:#475569;line-height:1.6">${detail}</p>
        <button type="button" style="margin-top:24px;padding:12px 16px;border:0;border-radius:10px;background:#0f766e;color:white;font-weight:700;cursor:pointer" onclick="location.reload()">Try again</button>
      </section>
    </main>
  `;
}

if (!rootElement) {
  throw new Error("Mirvyn root element is missing");
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Mirvyn startup blocked: missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
  renderBootstrapFailure(
    "Mirvyn is temporarily unavailable",
    "The application is missing a required public connection setting. Please contact the site administrator and ask them to verify the production deployment configuration."
  );
} else {
  import("./App.tsx")
    .then(({ default: App }) => {
      createRoot(rootElement).render(<App />);
    })
    .catch((error: unknown) => {
      console.error("Mirvyn startup failed", error);
      renderBootstrapFailure(
        "Mirvyn could not start",
        "The application encountered a startup problem. Please refresh once; if the problem continues, contact support."
      );
    });
}
