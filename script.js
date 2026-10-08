/* =========================================================
   CONFIGURA AQUÍ LA URL DE TU WEB APP DE APPS SCRIPT
   (Deploy > New deployment > Web app > copiar "URL de la app")
   ========================================================= */
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw4s7CZuVpqR8uParyg1avtKb2z5nvFNBiGHchIDjXaCGIcuXXUMcrDejRX46a2iUY/exec";

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

// ---------- WhatsApp (enlaces wa.me, no requiere API ni credenciales) ----------

// Limpia el número y le agrega código de país MX (52) si viene a 10 dígitos.
// Si tus clientes son de otro país, ajusta aquí.
function cleanPhone_(raw) {
  let digits = (raw || "").toString().replace(/\D/g, "");
  if (digits.length === 10) digits = "52" + digits;
  return digits;
}

function waLink_(celular, message) {
  const phone = cleanPhone_(celular);
  // Usamos api.whatsapp.com/send directo (en vez de wa.me) porque el
  // redireccionamiento de wa.me corrompe emojis en algunos navegadores/dispositivos.
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

function waIconSVG_() {
  return `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2Zm0 18.2a8.1 8.1 0 0 1-4.2-1.2l-.3-.2-3 .9.9-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.5.1-.5.7-.7.8-.3.1-.5 0a6.6 6.6 0 0 1-2-1.2 7.3 7.3 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4a1.9 1.9 0 0 0 .3-.5.5.5 0 0 0 0-.5c-.1-.1-.5-1.3-.7-1.7s-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.5 4c.6.2 1.1.4 1.5.5a3.6 3.6 0 0 0 1.7.1 2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;
}

// ---------- Emojis como escapes Unicode (a prueba de problemas de codificacion) ----------
const EMOJI = {
  party: "\u{1F389}", // party popper
  card: "\u{1F4B3}", // credit card
  handshake: "\u{1F91D}", // handshake
  clipboard: "\u{1F4CB}", // clipboard
  idCard: "\u{1FAAA}", // id card
  house: "\u{1F3E0}", // house
  briefcase: "\u{1F4BC}", // briefcase
  memo: "\u{1F4DD}", // memo
  warning: "\u{26A0}\u{FE0F}", // warning
  envelope: "\u{1F4E9}", // envelope
  pin: "\u{1F4CD}", // pin
  check: "\u{2705}", // check mark
  mobile: "\u{1F4F2}", // mobile phone
  smile: "\u{1F60A}", // smiling face
};

function productoNombre_(c) {
  const raw =
    c.producto ||
    c.productoNombre ||
    c.nombreProducto ||
    c.tdc ||
    "Tarjeta de Crédito JOY";
  return (
    String(raw || "Tarjeta de Crédito JOY").trim() || "Tarjeta de Crédito JOY"
  );
}

// Primer mensaje - variante "Sr."
function waMsgPrimerSr_(c) {
  const producto = productoNombre_(c);
  return `¡Felicidades y bienvenido a Banamex! ${EMOJI.party}

Sr. ${c.nombre}

Nos complace informarle que ya puede recoger su tarjeta ${producto} de Entrega Inmediata ${EMOJI.card} en cualquiera de nuestras sucursales Banamex.

Será un gusto darle la bienvenida y atenderle. Si tiene alguna duda o requiere información adicional, con gusto estamos para apoyarle. ${EMOJI.handshake}

${EMOJI.clipboard} Documentación requerida:

${EMOJI.idCard} INE vigente
${EMOJI.house} Comprobante de domicilio (con una antigüedad no mayor a 3 meses)
${EMOJI.briefcase} Comprobante de ingresos (3 estados de cuenta de nómina o débito)
${EMOJI.memo} Número de folio

${EMOJI.warning} Importante: Todos los documentos deberán presentarse en físico.`;
}

// Primer mensaje - variante "Srta."
function waMsgPrimerSrta_(c) {
  const producto = productoNombre_(c);
  return `¡Felicidades y bienvenida a Banamex! ${EMOJI.party}

Srta. ${c.nombre}

Nos complace informarle que ya puede recoger su tarjeta ${producto} de Entrega Inmediata ${EMOJI.card} en cualquiera de nuestras sucursales Banamex.

Será un gusto darle la bienvenida y atenderle. Si tiene alguna duda o requiere información adicional, con gusto estamos para apoyarle. ${EMOJI.handshake}

${EMOJI.clipboard} Documentación requerida:

${EMOJI.idCard} INE vigente
${EMOJI.house} Comprobante de domicilio (con una antigüedad no mayor a 3 meses)
${EMOJI.briefcase} Comprobante de ingresos (3 estados de cuenta de nómina o débito)
${EMOJI.memo} Número de folio

${EMOJI.warning} Importante: Todos los documentos deberán presentarse en físico.`;
}

// Segundo mensaje - recordatorio de entrega (neutro, sin género)
function waMsgSegundo_(c) {
  return `${EMOJI.envelope} Estimado cliente:

Le recordamos que el día de hoy está programada la entrega de su Tarjeta de Crédito Banamex. ${EMOJI.card}

${EMOJI.pin} Para recibirla, es necesario que acuda a la sucursal de su preferencia dentro del horario de atención.

${EMOJI.check} Le agradeceríamos nos pudiera confirmar si le será posible acudir el día de hoy, respondiendo a este mensaje. En caso de que no le sea posible asistir, por favor indíquenos para brindarle el apoyo correspondiente.

${EMOJI.mobile} Quedamos atentos a su amable confirmación.

¡Gracias por su atención! ${EMOJI.smile}`;
}

function waMsgFolio_(c) {
  return `Buen día, le compartimos su numero de folio con el cual podrá recoger su tarjeta de crédito: ${c.folio || "—"}`;
}

// Genera el/los botones de WhatsApp según la tabla ('t1' = primer mensaje, con opción Sr./Srta.; 't2' = segundo mensaje)
function waAccionHTML_(c, kind) {
  if (kind === "t1") {
    return `<div class="wa-actions">
      <a class="wa-btn" href="${waLink_(c.celular, waMsgPrimerSr_(c))}" target="_blank" rel="noopener">${waIconSVG_()} Sr.</a>
      <a class="wa-btn" href="${waLink_(c.celular, waMsgPrimerSrta_(c))}" target="_blank" rel="noopener">${waIconSVG_()} Srta.</a>
    </div>`;
  }
  return `<a class="wa-btn" href="${waLink_(c.celular, waMsgSegundo_(c))}" target="_blank" rel="noopener">${waIconSVG_()} WhatsApp</a>`;
}

function waFolioAccionHTML_(c) {
  return `<a class="wa-btn" href="${waLink_(c.celular, waMsgFolio_(c))}" target="_blank" rel="noopener" aria-label="Enviar folio por WhatsApp a ${c.nombre}">${waIconSVG_()} WhatsApp</a>`;
}

// ---------- utilidades ----------
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

function statusClass(status) {
  if (status === "1er Mensaje") return "st-1";
  if (status === "2do Mensaje") return "st-2";
  return "st-0";
}

function statusSelectHTML(row, status, options) {
  const cls = statusClass(status);
  const label = options.find((o) => o.value === status)?.label || "Sin enviar";
  const items = options
    .map(
      (o) =>
        `<li class="custom-select__option ${status === o.value ? "selected" : ""}" data-value="${o.value}" role="option">${o.label}</li>`,
    )
    .join("");
  return `<div class="custom-select ${cls.replace("st-0", "")}" data-kind="status" data-row="${row}">
    <button type="button" class="custom-select__trigger" aria-haspopup="listbox" aria-expanded="false">${label} <span class="custom-select__arrow">▾</span></button>
    <ul class="custom-select__options" role="listbox">${items}</ul>
  </div>`;
}

// Dropdown genérico (mismo look & feel que statusSelectHTML) para los filtros de Clientes.
function filterSelectHTML(filterName, value, options) {
  const label =
    options.find((o) => String(o.value) === String(value))?.label || "";
  const items = options
    .map(
      (o) =>
        `<li class="custom-select__option ${String(value) === String(o.value) ? "selected" : ""}" data-value="${o.value}" role="option">${o.label}</li>`,
    )
    .join("");
  return `<div class="custom-select" data-kind="filter" data-filter="${filterName}">
    <button type="button" class="custom-select__trigger" aria-haspopup="listbox" aria-expanded="false">${label} <span class="custom-select__arrow">▾</span></button>
    <ul class="custom-select__options" role="listbox">${items}</ul>
  </div>`;
}

/**
 * ACTUALIZACIÓN OPTIMISTA:
 * Antes: se esperaba la respuesta del fetch antes de tocar CLIENTES/UI,
 * lo que hacía sentir la app lenta (1-3s+ de espera de Apps Script).
 * Ahora: actualizamos el estado local y re-renderizamos de inmediato;
 * el fetch corre en segundo plano y solo revertimos si falla.
 */
async function updateStatusCustom(custom, value) {
  const row = custom.dataset.row;
  const c = CLIENTES.find((x) => x.row == row);
  const previousStatus = c ? c.status : null;

  // 1. Actualiza UI de inmediato (optimista)
  if (c) c.status = value;
  renderRecordatorios();
  toast("Guardando...");

  // 2. Envía el cambio al servidor en segundo plano
  try {
    const res = await fetch(
      `${APPS_SCRIPT_URL}?action=updateStatus&row=${row}&status=${encodeURIComponent(value)}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json().catch(() => ({}));
    if (data.error) throw new Error(data.error);
    toast("Status actualizado ✓");
  } catch (err) {
    // 3. Si falla, revierte el estado local y notifica
    console.error("updateStatus error", err);
    if (c) c.status = previousStatus;
    renderRecordatorios();
    toast("Error al guardar, se revirtió el cambio");
  }
}

// Aplica el valor elegido en un filtro de Clientes (Año/Mes/Semana) y refresca lo que dependa de él.
function handleFilterSelect(filterName, value) {
  if (filterName === "anio") {
    clientesFiltro.anio = value === "todos" ? "todos" : Number(value);
    clientesFiltro.mes = "todos";
    clientesFiltro.semana = "todos";
    fillMesesFiltro();
  } else if (filterName === "mes") {
    clientesFiltro.mes = value === "todos" ? "todos" : Number(value);
    clientesFiltro.semana = "todos";
    fillSemanasFiltro();
  } else if (filterName === "semana") {
    clientesFiltro.semana = value === "todos" ? "todos" : Number(value);
    renderTablaClientes();
  }
}
///// SELECTS CUSTOMIZADOS (dropdowns) /////
document.addEventListener("click", (event) => {
  // 1. CLIC EN UNA OPCIÓN
  const option = event.target.closest(".custom-select__option");
  if (option) {
    const optionsList = option.closest(".custom-select__options");
    const ownerId = optionsList ? optionsList.getAttribute("data-owner-id") : null;
    const custom = ownerId
      ? document.querySelector(`.custom-select[data-cs-id="${ownerId}"]`)
      : option.closest(".custom-select");

    if (!custom) return;

    // Marcar selección
    optionsList
      .querySelectorAll(".custom-select__option")
      .forEach((el) => el.classList.remove("selected"));
    option.classList.add("selected");

    const trigger = custom.querySelector(".custom-select__trigger");
    if (trigger) {
      trigger.innerHTML = `${option.textContent} <span class="custom-select__arrow">▾</span>`;
    }

    // Restaurar opciones si estaban flotando
    custom.classList.remove("open");
    if (optionsList.getAttribute("data-moved") === "1") {
      custom.appendChild(optionsList);
      optionsList.classList.remove("floating-open");
      optionsList.removeAttribute("data-moved");
      optionsList.removeAttribute("data-owner-id");
    }

    if (custom.dataset.kind === "filter") {
      handleFilterSelect(custom.dataset.filter, option.dataset.value);
    } else {
      updateStatusCustom(custom, option.dataset.value);
    }
    return;
  }

  // 2. CLIC EN EL TRIGGER (ABRIR / CERRAR)
  const trigger = event.target.closest(".custom-select__trigger");
  if (trigger) {
    const custom = trigger.closest(".custom-select");

    // Asegurar un ID estable con setAttribute (más seguro que dataset para búsquedas DOM)
    if (!custom.getAttribute("data-cs-id")) {
      custom.setAttribute("data-cs-id", "cs-" + Math.random().toString(36).slice(2, 9));
    }
    const ownerId = custom.getAttribute("data-cs-id");

    // Revisar estado exacto actual
    const isCurrentlyOpen = custom.classList.contains("open");

    // Cerrar otros selects y restaurar sus opciones
    document.querySelectorAll(".custom-select.open").forEach((el) => {
      if (el !== custom) {
        el.classList.remove("open");
        const elId = el.getAttribute("data-cs-id");
        const opt = el.querySelector(".custom-select__options") || document.querySelector(`.custom-select__options[data-owner-id="${elId}"]`);
        if (opt && opt.getAttribute("data-moved") === "1") {
          el.appendChild(opt);
          opt.classList.remove("floating-open");
          opt.removeAttribute("data-moved");
          opt.removeAttribute("data-owner-id");
        }
      }
    });

    if (isCurrentlyOpen) {
      // SE ESTÁ CERRANDO: Regresamos las opciones a su caja original
      custom.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");

      const options = document.querySelector(`.custom-select__options[data-owner-id="${ownerId}"]`);
      if (options && options.getAttribute("data-moved") === "1") {
        custom.appendChild(options);
        options.classList.remove("floating-open");
        options.removeAttribute("data-moved");
        options.removeAttribute("data-owner-id");
      }
    } else {
      // SE ESTÁ ABRIENDO: Movemos las opciones al body para evitar recortes
      custom.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");

      const options = custom.querySelector(".custom-select__options");
      if (options) {
        options.setAttribute("data-owner-id", ownerId);
        options.setAttribute("data-moved", "1");
        document.body.appendChild(options);
        options.classList.add("floating-open");

        const rect = trigger.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = Math.min(options.scrollHeight || 220, 220);
        const openBelow = rect.bottom + 12 + dropdownHeight < viewportHeight;

        const maxWidth = Math.max(0, window.innerWidth - 16);
        options.style.minWidth = `${Math.min(rect.width, maxWidth)}px`;
        options.style.maxWidth = `${maxWidth}px`;
        const dropdownWidth = options.getBoundingClientRect().width;
        const left = Math.min(
          Math.max(8, rect.left),
          window.innerWidth - dropdownWidth - 8,
        );
        options.style.left = `${left}px`;
        if (openBelow) {
          options.style.top = `${rect.bottom + 8}px`;
          options.style.bottom = "auto";
        } else {
          options.style.top = "auto";
          options.style.bottom = `${viewportHeight - rect.top + 8}px`;
        }
      }
    }
    return;
  }

  // 3. CLIC FUERA DE CUALQUIER SELECT
  document.querySelectorAll(".custom-select.open").forEach((el) => {
    el.classList.remove("open");
  });
  document.querySelectorAll(".custom-select__options").forEach((opt) => {
    if (opt.getAttribute("data-moved") === "1") {
      const elId = opt.getAttribute("data-owner-id");
      const owner = document.querySelector(`.custom-select[data-cs-id="${elId}"]`);
      if (owner) owner.appendChild(opt);
      opt.classList.remove("floating-open");
      opt.removeAttribute("data-moved");
      opt.removeAttribute("data-owner-id");
    }
  });
});

// ---------- carga de datos ----------
async function loadData() {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("PEGA_AQUI")) {
    document.getElementById("configBanner").style.display = "block";
    return;
  }
  const refreshButtons = document.querySelectorAll("#btn-refrescar");
  refreshButtons.forEach((button) => {
    button.disabled = true;
  });
  try {
    const url = `${APPS_SCRIPT_URL}?action=getData`;
    console.log("loadData: fetching", url);
    // small helper to timeout fetch if it hangs
    const timeoutFetch = (ms, promise) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("fetch timeout")), ms);
        promise.then(
          (res) => {
            clearTimeout(timer);
            resolve(res);
          },
          (err) => {
            clearTimeout(timer);
            reject(err);
          },
        );
      });
    const res = await timeoutFetch(10000, fetch(url));
    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText || "error");
      throw new Error(`HTTP ${res.status} - ${txt}`);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    CLIENTES = data.clientes || [];
    HOY = data.hoy;
    document
      .querySelectorAll(".today-label")
      .forEach((el) => (el.textContent = HOY));
    const last = document.getElementById("lastSync");
    if (last)
      last.textContent = "sincronizado " + new Date().toLocaleTimeString();
    renderRecordatorios();
    initClientesFiltros();
  } catch (err) {
    console.error("loadData error", err);
    const last = document.getElementById("lastSync");
    if (last) last.textContent = "error: " + (err.message || "conexión");
    toast("No se pudo conectar: " + (err.message || "error"));
    // If enabled, populate with example data so the UI remains usable
    if (USE_LOCAL_FALLBACK) {
      console.warn("Using local fallback data for testing");
      const today = new Date().toISOString().slice(0, 10);
      HOY = today;
      CLIENTES = [
        {
          row: 1,
          nombre: "María López",
          celular: "555-123-4567",
          folio: "A001",
          fecha: today,
          tdc: "VISA",
          fechaCita: today,
          status: "",
        },
        {
          row: 2,
          nombre: "Juan Pérez",
          celular: "555-987-6543",
          folio: "A002",
          fecha: today,
          tdc: "MASTERCARD",
          fechaCita: today,
          status: "1er Mensaje",
        },
        {
          row: 3,
          nombre: "Ana Gómez",
          celular: "555-222-3333",
          folio: "A003",
          fecha: today,
          tdc: "AMEX",
          fechaCita: today,
          status: "",
        },
      ];
      document
        .querySelectorAll(".today-label")
        .forEach((el) => (el.textContent = HOY));
      if (last) last.textContent = "datos de ejemplo";
      toast("Mostrando datos de ejemplo (modo local)");
      renderRecordatorios();
      initClientesFiltros();
    }
  } finally {
    refreshButtons.forEach((button) => {
      button.disabled = false;
    });
  }
}

// ---------- RECORDATORIOS ----------
function renderRecordatorios() {
  // Tabla 1: clientes de hoy que aún NO se les envía nada (status vacío)
  const hoyRows = CLIENTES.filter((c) => c.fecha === HOY && c.status === "");
  // Tabla 2: clientes con cita HOY a quienes ya se les mandó el 1er mensaje y falta el 2do
  const citaRows = CLIENTES.filter(
    (c) => c.fechaCita === HOY && c.status === "1er Mensaje",
  );
  fillTable("tabla-hoy", hoyRows, STATUS_OPTIONS_T1, "t1");
  fillTable("tabla-citas", citaRows, STATUS_OPTIONS_T2, "t2");
}

function fillTable(tbodyId, rows, statusOptions, kind) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) {
    console.warn("fillTable: tbody not found", tbodyId);
    return;
  }
  if (rows.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">Sin clientes pendientes</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map(
      (c) => `
    <tr>
      <td>${c.nombre}</td>
      <td>${c.celular}</td>
      <td>${c.folio || "—"}</td>
      <td>${c.fecha || "—"}</td>
      <td>${c.tdc || "—"}</td>
      <td>${c.fechaCita || "—"}</td>
      <td>${statusSelectHTML(c.row, c.status, statusOptions)}</td>
      <td>${waAccionHTML_(c, kind)}</td>
    </tr>
  `,
    )
    .join("");
}

// ---------- CLIENTES: filtros Año / Mes / Semana ----------
function parseYMD(str) {
  // str en formato yyyy-MM-dd
  const [y, m, d] = str.split("-").map(Number);
  return { y, m, d };
}

function toDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Lunes de la semana que contiene "date" (semana calendario Lun-Dom)
function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Dom..6=Sab
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Número de semana calendario (Lun-Dom) dentro del mes de la fecha
function weekIndexInMonth(dateStr) {
  const date = toDate(dateStr);
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const mondayFirst = mondayOf(firstOfMonth);
  const mondayThis = mondayOf(date);
  const diffWeeks = Math.round(
    (mondayThis - mondayFirst) / (7 * 24 * 3600 * 1000),
  );
  return diffWeeks + 1;
}

// Etiqueta "Semana N (29 jun – 5 jul)" a partir de año/mes/índice de semana
function weekRangeLabelByIndex(year, month, weekIdx) {
  const firstOfMonth = new Date(year, month - 1, 1);
  const mondayFirst = mondayOf(firstOfMonth);
  const monday = new Date(mondayFirst);
  monday.setDate(monday.getDate() + (weekIdx - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const fmt = (d) =>
    d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  return `Semana ${weekIdx} (${fmt(monday)} – ${fmt(sunday)})`;
}

let clientesFiltro = { anio: "todos", mes: "todos", semana: "todos" };

function normalizarTexto(texto) {
  return texto
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Construye los filtros de periodo. Por defecto se muestran todos los clientes.
function initClientesFiltros() {
  const conFecha = CLIENTES.filter((c) => c.fecha);
  let anios = [...new Set(conFecha.map((c) => parseYMD(c.fecha).y))];
  anios.sort((a, b) => b - a);

  clientesFiltro = { anio: "todos", mes: "todos", semana: "todos" };
  const opcionesAnio = [
    { value: "todos", label: "Todos" },
    ...anios.map((a) => ({ value: a, label: String(a) })),
  ];
  document.getElementById("filter-anio").innerHTML = filterSelectHTML(
    "anio",
    clientesFiltro.anio,
    opcionesAnio,
  );

  fillMesesFiltro();
}

// Construye el filtro de MES según el año seleccionado.
function fillMesesFiltro() {
  const rowsAnio = CLIENTES.filter((c) => {
    if (!c.fecha) return false;
    return (
      clientesFiltro.anio === "todos" ||
      parseYMD(c.fecha).y === clientesFiltro.anio
    );
  });
  let meses = [...new Set(rowsAnio.map((c) => parseYMD(c.fecha).m))];
  meses.sort((a, b) => a - b);

  const opcionesMes = [
    { value: "todos", label: "Todos" },
    ...meses.map((m) => ({ value: m, label: MESES[m - 1] })),
  ];
  document.getElementById("filter-mes").innerHTML = filterSelectHTML(
    "mes",
    clientesFiltro.mes,
    opcionesMes,
  );

  fillSemanasFiltro();
}

// Construye el filtro de SEMANA según el año y el mes seleccionados.
function fillSemanasFiltro() {
  const rowsMes = CLIENTES.filter((c) => {
    if (!c.fecha) return false;
    const fecha = parseYMD(c.fecha);
    return (
      (clientesFiltro.anio === "todos" ||
        fecha.y === clientesFiltro.anio) &&
      (clientesFiltro.mes === "todos" || fecha.m === clientesFiltro.mes)
    );
  });
  let semanas = [...new Set(rowsMes.map((c) => weekIndexInMonth(c.fecha)))];
  semanas.sort((a, b) => a - b);

  const opcionesSemana = [
    { value: "todos", label: "Todas" },
    ...semanas.map((s) => ({
      value: s,
      label:
        clientesFiltro.anio !== "todos" && clientesFiltro.mes !== "todos"
          ? weekRangeLabelByIndex(
              clientesFiltro.anio,
              clientesFiltro.mes,
              s,
            )
          : `Semana ${s}`,
    })),
  ];
  document.getElementById("filter-semana").innerHTML = filterSelectHTML(
    "semana",
    clientesFiltro.semana,
    opcionesSemana,
  );

  renderTablaClientes();
}

function renderTablaClientes() {
  const busqueda = normalizarTexto(
    document.getElementById("buscar-clientes")?.value.trim() || "",
  );
  const busquedaNumerica = busqueda.replace(/\D/g, "");
  const rows = CLIENTES.filter(
    (c) => {
      const periodoCompleto =
        clientesFiltro.anio === "todos" &&
        clientesFiltro.mes === "todos" &&
        clientesFiltro.semana === "todos";
      const coincidePeriodo = c.fecha
        ? (() => {
            const fecha = parseYMD(c.fecha);
            return (
              (clientesFiltro.anio === "todos" ||
                fecha.y === clientesFiltro.anio) &&
              (clientesFiltro.mes === "todos" ||
                fecha.m === clientesFiltro.mes) &&
              (clientesFiltro.semana === "todos" ||
                weekIndexInMonth(c.fecha) === clientesFiltro.semana)
            );
          })()
        : periodoCompleto;
      return (
        coincidePeriodo &&
        (!busqueda ||
        normalizarTexto(c.nombre || "").includes(busqueda) ||
        (busquedaNumerica &&
          (c.celular || "")
            .toString()
            .replace(/\D/g, "")
            .includes(busquedaNumerica)))
      );
    },
  );

  const tbody = document.getElementById("tabla-clientes");
  if (rows.length === 0) {
    const mensaje = busqueda
      ? "Sin clientes que coincidan con la búsqueda"
      : "Sin clientes en este periodo";
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">${mensaje}</td></tr>`;
  } else {
    tbody.innerHTML = rows
      .map(
        (c) => `
      <tr>
        <td>${c.nombre}</td>
        <td>${c.celular}</td>
        <td>${c.folio || "—"}</td>
        <td>${c.fecha || "—"}</td>
        <td>${c.tdc || "—"}</td>
        <td>${c.fechaCita || "—"}</td>
        <td><span class="badge ${statusClass(c.status)}">${c.status || "Sin enviar"}</span></td>
        <td>${waFolioAccionHTML_(c)}</td>
      </tr>
    `,
      )
      .join("");
  }

  const countLabel = document.getElementById("clientes-count-label");
  if (countLabel) {
    const cantidad = rows.length === 1 ? "cliente" : "clientes";
    const encontrados = rows.length === 1 ? "encontrado" : "encontrados";
    const todosLosPeriodos =
      clientesFiltro.anio === "todos" &&
      clientesFiltro.mes === "todos" &&
      clientesFiltro.semana === "todos";
    const periodo = todosLosPeriodos
      ? "en la base de clientes."
      : "en el periodo seleccionado.";
    countLabel.textContent = `${rows.length} ${cantidad}${busqueda ? ` ${encontrados}` : ""} ${periodo}`;
  }
}

document.getElementById("buscar-clientes")?.addEventListener("input", () => {
  renderTablaClientes();
});

document
  .getElementById("btn-refrescar")
  ?.addEventListener("click", () => {
    loadData();
  });

// ---------- tabs ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.view;
    document
      .querySelectorAll(".view")
      .forEach((v) => v.classList.remove("active"));
    document.getElementById("view-" + target).classList.add("active");
  });
});

// Start app when DOM is ready to avoid timing issues
function startApp() {
  try {
    console.log("startApp: calling loadData");
    loadData();
  } catch (e) {
    console.error("startApp error", e);
    toast("Error iniciando la app");
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp);
} else startApp();