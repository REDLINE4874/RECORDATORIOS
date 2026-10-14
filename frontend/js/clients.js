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

// Construye los filtros de periodo. Por defecto se muestra la semana actual.
function initClientesFiltros() {
  const conFecha = CLIENTES.filter((c) => c.fecha);
  let anios = [...new Set(conFecha.map((c) => parseYMD(c.fecha).y))];
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const fechaActual = `${anioActual}-${String(mesActual).padStart(2, "0")}-${String(
    hoy.getDate(),
  ).padStart(2, "0")}`;
  anios = [...new Set([...anios, anioActual])];
  anios.sort((a, b) => b - a);

  clientesFiltro = {
    anio: anioActual,
    mes: mesActual,
    semana: weekIndexInMonth(fechaActual),
  };
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
  let meses = [
    ...new Set([
      ...rowsAnio.map((c) => parseYMD(c.fecha).m),
      ...(clientesFiltro.mes === "todos" ? [] : [clientesFiltro.mes]),
    ]),
  ];
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
      (clientesFiltro.anio === "todos" || fecha.y === clientesFiltro.anio) &&
      (clientesFiltro.mes === "todos" || fecha.m === clientesFiltro.mes)
    );
  });
  let semanas = [
    ...new Set([
      ...rowsMes.map((c) => weekIndexInMonth(c.fecha)),
      ...(clientesFiltro.semana === "todos" ? [] : [clientesFiltro.semana]),
    ]),
  ];
  semanas.sort((a, b) => a - b);

  const opcionesSemana = [
    { value: "todos", label: "Todas" },
    ...semanas.map((s) => ({
      value: s,
      label:
        clientesFiltro.anio !== "todos" && clientesFiltro.mes !== "todos"
          ? weekRangeLabelByIndex(clientesFiltro.anio, clientesFiltro.mes, s)
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
  const rows = CLIENTES.filter((c) => {
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
  });

  const tbody = document.getElementById("tabla-clientes");
  if (rows.length === 0) {
    const mensaje = busqueda
      ? "Sin clientes que coincidan con la búsqueda"
      : "Sin clientes en este periodo";
    tbody.innerHTML = `<tr class="empty-row"><td colspan="11">${mensaje}</td></tr>`;
  } else {
    tbody.innerHTML = rows
      .map((c) => {
        const clientIndex = CLIENTES.indexOf(c);
        return `
      <tr>
        <td>${c.nombre}</td>
        <td>${c.celular}</td>
        <td>${c.folio || "—"}</td>
        <td>${c.fecha || "—"}</td>
        <td>${c.tdc || "—"}</td>
        <td>${c.fechaCita || "—"}</td>
        <td><span class="badge ${statusClass(c.status)}">${c.status || "Sin enviar"}</span></td>
        <td>${waFolioAccionHTML_(clientIndex)}</td>
        <td>${waRecordatorioAccionHTML_(c)}</td>
        <td>${trackingCellHTML_(c, "folio")}</td>
        <td>${trackingCellHTML_(c, "recordatorio")}</td>
      </tr>
    `;
      })
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
  .getElementById("tabla-clientes")
  ?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const trackingButton = target.closest(".tracking-update-button");
    if (trackingButton) {
      const client = CLIENTES[Number(trackingButton.dataset.clientIndex)];
      updateTracking(
        client,
        trackingButton.dataset.trackingKind,
        trackingButton.dataset.trackingStatus,
      );
      return;
    }

    const trackedLink = target.closest(".wa-track-open");
    if (trackedLink) {
      const client = CLIENTES[Number(trackedLink.dataset.clientIndex)];
      updateTracking(client, trackedLink.dataset.trackingKind, "WhatsApp abierto");
      return;
    }

    const button = target.closest(".wa-folio-btn");
    if (!button) return;

    const client = CLIENTES[Number(button.dataset.clientIndex)];
    if (!client) {
      console.error("No se encontró el cliente para enviar su folio");
      toast("No se encontró el cliente");
      return;
    }

    const dialog = document.getElementById("folio-dialog");
    const input = document.getElementById("folio-input");
    dialog.dataset.clientIndex = button.dataset.clientIndex;
    input.value = client.folio || "";
    dialog.showModal();
    input.focus();
    input.select();
  });

document.getElementById("folio-form")?.addEventListener("submit", (event) => {
  event.preventDefault();

  const dialog = document.getElementById("folio-dialog");
  const input = document.getElementById("folio-input");
  const client = CLIENTES[Number(dialog.dataset.clientIndex)];
  const folio = input.value.trim();
  if (!client || !folio) {
    input.setCustomValidity(folio ? "" : "Ingresa el número de folio.");
    input.reportValidity();
    return;
  }

  input.setCustomValidity("");
  window.open(
    waLink_(client.celular, waMsgFolio_(folio)),
    "_blank",
    "noopener,noreferrer",
  );
  updateTracking(client, "folio", "WhatsApp abierto");
  dialog.close();
});

document.getElementById("folio-cancel")?.addEventListener("click", () => {
  document.getElementById("folio-dialog").close();
});

document.getElementById("btn-refrescar")?.addEventListener("click", () => {
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
