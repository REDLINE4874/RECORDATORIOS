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
    const ownerId = optionsList
      ? optionsList.getAttribute("data-owner-id")
      : null;
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
      trigger.setAttribute("aria-expanded", "false");
    }

    // Restaurar opciones si estaban flotando
    custom.classList.remove("open");
    if (optionsList.getAttribute("data-moved") === "1") {
      custom.appendChild(optionsList);
      optionsList.classList.remove("floating-open");
      optionsList.removeAttribute("data-moved");
      optionsList.removeAttribute("data-owner-id");
    }

    if (custom.dataset.kind === "action") {
      if (trigger) {
        trigger.innerHTML = `Seleccionar acción... <span class="custom-select__arrow">▾</span>`;
      }
      option.classList.remove("selected");
      handleClientActionSelect(custom.dataset.clientIndex, option.dataset.value);
    } else if (custom.dataset.kind === "filter") {
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
      custom.setAttribute(
        "data-cs-id",
        "cs-" + Math.random().toString(36).slice(2, 9),
      );
    }
    const ownerId = custom.getAttribute("data-cs-id");

    // Revisar estado exacto actual
    const isCurrentlyOpen = custom.classList.contains("open");

    // Cerrar otros selects y restaurar sus opciones
    document.querySelectorAll(".custom-select.open").forEach((el) => {
      if (el !== custom) {
        el.classList.remove("open");
        const elId = el.getAttribute("data-cs-id");
        const opt =
          el.querySelector(".custom-select__options") ||
          document.querySelector(
            `.custom-select__options[data-owner-id="${elId}"]`,
          );
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

      const options = document.querySelector(
        `.custom-select__options[data-owner-id="${ownerId}"]`,
      );
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
      const owner = document.querySelector(
        `.custom-select[data-cs-id="${elId}"]`,
      );
      if (owner) owner.appendChild(opt);
      opt.classList.remove("floating-open");
      opt.removeAttribute("data-moved");
      opt.removeAttribute("data-owner-id");
    }
  });
});
