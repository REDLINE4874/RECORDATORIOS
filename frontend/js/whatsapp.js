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
  return `<svg aria-hidden="true" viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2Zm0 18.2a8.1 8.1 0 0 1-4.2-1.2l-.3-.2-3 .9.9-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.5.1-.5.7-.7.8-.3.1-.5 0a6.6 6.6 0 0 1-2-1.2 7.3 7.3 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4a1.9 1.9 0 0 0 .3-.5.5.5 0 0 0 0-.5c-.1-.1-.5-1.3-.7-1.7s-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.5 4c.6.2 1.1.4 1.5.5a3.6 3.6 0 0 0 1.7.1 2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;
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

function waMsgFolio_(folio) {
  return `Buen día, le compartimos su numero de folio con el cual podrá recoger su tarjeta de crédito: ${folio}`;
}

function waMsgRecordatorio_(c) {
  return `👋 ¡Hola, estimado cliente!

💳 Le recordamos que tiene pendiente recoger su Tarjeta de Crédito (${productoNombre_(c)}) Banamex.

📍 Puede acudir a la sucursal de su preferencia dentro del horario de atención.

✅ ¿Ya recogió su tarjeta? Por favor, responda a este mensaje para actualizar el seguimiento.

¡Estamos para servirle! 😊`;
}

// Genera el/los botones de WhatsApp según la tabla ('t1' = primer mensaje, con opción Sr./Srta.; 't2' = segundo mensaje)
function waAccionHTML_(c, kind) {
  if (kind === "t1") {
    return `<div class="wa-actions">
      <a class="wa-btn" href="${waLink_(c.celular, waMsgPrimerSr_(c))}" target="_blank" rel="noopener">${waIconSVG_()} Sr.</a>
      <a class="wa-btn" href="${waLink_(c.celular, waMsgPrimerSrta_(c))}" target="_blank" rel="noopener">${waIconSVG_()} Srta.</a>
    </div>`;
  }
  return `<a class="wa-btn" href="${waLink_(c.celular, waMsgSegundo_(c))}" target="_blank" rel="noopener" aria-label="Enviar segundo recordatorio por WhatsApp">${waIconSVG_()}</a>`;
}

function waFolioAccionHTML_(clientIndex) {
  return `<button type="button" class="wa-btn wa-folio-btn" data-client-index="${clientIndex}" aria-label="Enviar folio por WhatsApp">${waIconSVG_()}</button>`;
}

function waRecordatorioAccionHTML_(c) {
  const clientIndex = CLIENTES.indexOf(c);
  return `<a class="wa-btn wa-track-open" data-tracking-kind="recordatorio" data-client-index="${clientIndex}" href="${waLink_(c.celular, waMsgRecordatorio_(c))}" target="_blank" rel="noopener" aria-label="Enviar recordatorio de tarjeta por WhatsApp">${waIconSVG_()}</a>`;
}

function trackingDateLabel_(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHTML_(value);
  return date.toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function escapeHTML_(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function trackingCellHTML_(client, kind) {
  const isFolio = kind === "folio";
  const status = client[isFolio ? "folioTracking" : "recordatorioTracking"] || "Pendiente";
  const timestamp = client[isFolio ? "folioTrackingAt" : "recordatorioTrackingAt"];
  const statusClassName =
    status === "Enviado"
      ? "tracking-sent"
      : status === "WhatsApp abierto"
        ? "tracking-opened"
        : "tracking-pending";
  const action =
    status === "Pendiente"
      ? `<button type="button" class="tracking-update-button" data-client-index="${CLIENTES.indexOf(client)}" data-tracking-kind="${kind}" data-tracking-status="Enviado">Marcar enviado</button>`
      : `<button type="button" class="tracking-update-button" data-client-index="${CLIENTES.indexOf(client)}" data-tracking-kind="${kind}" data-tracking-status="Pendiente">Restablecer</button>`;
  const dateLabel = timestamp
    ? `<span class="tracking-date">${trackingDateLabel_(timestamp)}</span>`
    : "";
  return `<div class="tracking-cell">
    <span class="tracking-state ${statusClassName}">${escapeHTML_(status)}</span>
    ${dateLabel}
    ${action}
  </div>`;
}

async function updateTracking(client, kind, status) {
  if (!client || !["folio", "recordatorio"].includes(kind)) return;

  const statusKey = kind === "folio" ? "folioTracking" : "recordatorioTracking";
  const timestampKey =
    kind === "folio" ? "folioTrackingAt" : "recordatorioTrackingAt";
  const previousStatus = client[statusKey];
  const previousTimestamp = client[timestampKey];

  client[statusKey] = status;
  client[timestampKey] =
    status === "Pendiente" ? "" : new Date().toISOString();
  if (status === "WhatsApp abierto") {
    setTimeout(renderTablaClientes, 0);
  } else {
    renderTablaClientes();
  }
  toast("Guardando seguimiento...");

  try {
    const params = new URLSearchParams({
      action: "updateTracking",
      row: String(client.row),
      kind,
      status,
    });
    const response = await fetch(`${APPS_SCRIPT_URL}?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.error || !data.success) {
      throw new Error(data.error || "No se confirmó el guardado");
    }
    if (status !== "Pendiente") {
      client[timestampKey] = data.updatedAt || client[timestampKey];
      renderTablaClientes();
    }
    toast(status === "Pendiente" ? "Seguimiento reiniciado ✓" : "Seguimiento guardado ✓");
  } catch (error) {
    console.error("updateTracking error", error);
    client[statusKey] = previousStatus;
    client[timestampKey] = previousTimestamp;
    renderTablaClientes();
    toast("Error al guardar el seguimiento");
  }
}

