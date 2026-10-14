/**
 * ============================================================
 *  BACKEND - Google Apps Script
 *  Expone la hoja "Clientes" como una API JSON (solo GET, para
 *  evitar problemas de CORS con peticiones POST/preflight).
 *
 *  ESTRUCTURA REQUERIDA DE LA HOJA (nombre de pestaña: "Clientes")
 *  Fila 1 (encabezados), EXACTAMENTE en este orden:
 *   A: Nombre
 *   B: Celular
 *   C: Folio
 *   D: Fecha
 *   E: TDC
 *   F: Fecha Cita
 *   G: Status
 *   H: Folio Seguimiento
 *   I: Folio Fecha
 *   J: Recordatorio Seguimiento
 *   K: Recordatorio Fecha
 *
 *  En las columnas H y J se guardan: "Pendiente", "WhatsApp abierto"
 *  o "Enviado". Las columnas I y K guardan la fecha y hora del último cambio.
 *
 *  - Columnas D y F deben tener formato de FECHA real (no texto).
 *  - Columna G (Status) puede quedar vacía o tener: "1er Mensaje" / "2do Mensaje"
 *
 *  CAMBIOS DE OPTIMIZACIÓN:
 *  - CacheService: getData_ cachea 25s para no releer toda la hoja
 *    en cada llamada (importante si varios usuarios refrescan seguido).
 *  - updateStatus_ invalida el caché al escribir, para que el
 *    siguiente getData_ refleje el cambio de inmediato.
 *  - LockService: evita que dos actualizaciones simultáneas pisen
 *    la misma fila si varios agentes usan la app a la vez.
 * ============================================================
 */

const SHEET_NAME = 'Clientes';
const CACHE_KEY = 'clientesData';
const CACHE_SECONDS = 25;
const TRACKING_HEADERS = [
  'Folio Seguimiento',
  'Folio Fecha',
  'Recordatorio Seguimiento',
  'Recordatorio Fecha'
];
const TRACKING_STATUSES = ['Pendiente', 'WhatsApp abierto', 'Enviado'];

function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === 'getData') {
      return getData_();
    }
    if (action === 'updateStatus') {
      return updateStatus_(e.parameter.row, e.parameter.status);
    }
    if (action === 'updateTracking') {
      return updateTracking_(e.parameter.row, e.parameter.kind, e.parameter.status);
    }

    return jsonOutput_({ error: 'Acción no válida. Revisa las acciones getData, updateStatus y updateTracking' });
  } catch (err) {
    return jsonOutput_({ error: err.message });
  }
}

function getSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('No se encontró la hoja "' + SHEET_NAME + '"');
  return sheet;
}

function setupTrackingColumns_() {
  ensureTrackingColumns_(getSheet_());
  CacheService.getScriptCache().remove(CACHE_KEY);
}

function ensureTrackingColumns_(sheet) {
  const headers = sheet.getRange(1, 8, 1, TRACKING_HEADERS.length).getValues()[0];
  const alreadyConfigured = TRACKING_HEADERS.every(
    (header, index) => headers[index] === header
  );
  if (alreadyConfigured) return;

  if (sheet.getLastColumn() > 7) {
    throw new Error(
      'Las columnas H:K ya contienen datos. Verifica que sus encabezados sean: ' +
        TRACKING_HEADERS.join(', ')
    );
  }

  sheet.getRange(1, 8, 1, TRACKING_HEADERS.length).setValues([TRACKING_HEADERS]);
}

/**
 * Devuelve todos los clientes como JSON.
 * "row" es el número real de fila en la hoja (útil para luego actualizar el status).
 * Usa CacheService para evitar releer la hoja completa en cada request.
 */
function getData_() {
  const sheet = getSheet_();
  ensureTrackingColumns_(sheet);

  const cache = CacheService.getScriptCache();
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    return jsonOutput_(JSON.parse(cached));
  }

  const values = sheet.getDataRange().getValues();
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!r[0]) continue; // salta filas vacías

    rows.push({
      row: i + 1, // fila real en la hoja (1-indexed)
      nombre: r[0] || '',
      celular: r[1] || '',
      folio: r[2] || '',
      fecha: formatDate_(r[3]),
      tdc: r[4] || '',
      fechaCita: formatDate_(r[5]),
      status: r[6] || '',
      folioTracking: r[7] || 'Pendiente',
      folioTrackingAt: formatDateTime_(r[8]),
      recordatorioTracking: r[9] || 'Pendiente',
      recordatorioTrackingAt: formatDateTime_(r[10])
    });
  }

  const payload = { clientes: rows, hoy: todayStr_() };

  try {
    cache.put(CACHE_KEY, JSON.stringify(payload), CACHE_SECONDS);
  } catch (cacheErr) {
    // Si el payload excede el límite de CacheService (~100KB), seguimos
    // sirviendo los datos sin cachear en vez de romper la respuesta.
  }

  return jsonOutput_(payload);
}

/**
 * Actualiza la columna Status (G) de una fila específica.
 * Usa LockService para evitar condiciones de carrera y limpia el
 * caché para que el próximo getData_ refleje el cambio.
 */
function updateStatus_(row, status) {
  if (!row) throw new Error('Falta el parámetro "row"');

  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(5000);
  if (!gotLock) {
    throw new Error('No se pudo obtener el lock, intenta de nuevo');
  }

  try {
    const sheet = getSheet_();
    sheet.getRange(parseInt(row, 10), 7).setValue(status || '');
    CacheService.getScriptCache().remove(CACHE_KEY);
  } finally {
    lock.releaseLock();
  }

  return jsonOutput_({ success: true });
}

function updateTracking_(rowValue, kind, status) {
  const row = Number(rowValue);
  if (!Number.isInteger(row) || row < 2) {
    throw new Error('El número de fila no es válido');
  }
  if (kind !== 'folio' && kind !== 'recordatorio') {
    throw new Error('El tipo de seguimiento debe ser "folio" o "recordatorio"');
  }
  if (!TRACKING_STATUSES.includes(status)) {
    throw new Error('El estado de seguimiento no es válido');
  }

  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(5000);
  if (!gotLock) {
    throw new Error('No se pudo obtener el lock, intenta de nuevo');
  }

  let updatedAt = '';
  try {
    const sheet = getSheet_();
    ensureTrackingColumns_(sheet);
    if (row > sheet.getLastRow()) {
      throw new Error('No se encontró el cliente indicado');
    }

    const statusColumn = kind === 'folio' ? 8 : 10;
    const timestampColumn = statusColumn + 1;
    updatedAt = status === 'Pendiente' ? '' : new Date();
    sheet.getRange(row, statusColumn).setValue(status);
    sheet.getRange(row, timestampColumn).setValue(updatedAt);
    CacheService.getScriptCache().remove(CACHE_KEY);
  } finally {
    lock.releaseLock();
  }

  return jsonOutput_({
    success: true,
    updatedAt: updatedAt ? formatDateTime_(updatedAt) : ''
  });
}

function formatDate_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  // si por alguna razón la celda es texto, se devuelve tal cual
  return String(value);
}

function formatDateTime_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    );
  }
  return String(value);
}

function todayStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}