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
