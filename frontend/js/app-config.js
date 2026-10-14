/* =========================================================
   CONFIGURA AQUÍ LA URL DE TU WEB APP DE APPS SCRIPT
   (Deploy > New deployment > Web app > copiar "URL de la app")
   ========================================================= */
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby9q3nFOXoJVzUjMgGaiRRrkmVMCqYY5qW9ZmLplca47Cn6H6Q5YrOLFp3Z9ficJNzh/exec";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// Debug helpers: confirm script load and capture global errors
console.log("script.js loaded");
window.addEventListener("error", (e) => {
  console.error("Uncaught error:", e.message || e);
  try {
    toast("Error inesperado: " + (e.message || "ver consola"));
  } catch (_) {}
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason);
  try {
    toast("Error en promesa: ver consola");
  } catch (_) {}
});

// Tabla 1 ("Clientes de hoy"): solo puede estar sin enviar o marcarse el 1er mensaje.
// En cuanto se marca "1er Mensaje", el cliente ya no cumple el filtro y desaparece de esta tabla.
const STATUS_OPTIONS_T1 = [
  { value: "", label: "Sin enviar" },
  { value: "1er Mensaje", label: "1er Mensaje" },
];

// Tabla 2 ("Recordatorios"): solo aparecen los que ya tienen 1er Mensaje y falta el 2do.
// En cuanto se marca "2do Mensaje", el cliente ya no cumple el filtro y desaparece de esta tabla.
const STATUS_OPTIONS_T2 = [
  { value: "1er Mensaje", label: "1er Mensaje" },
  { value: "2do Mensaje", label: "2do Mensaje" },
];

let CLIENTES = [];
let HOY = "";
// If true, when fetch fails we'll use sample data so UI can be tested offline
const USE_LOCAL_FALLBACK = true;

