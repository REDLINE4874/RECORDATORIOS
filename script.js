/* =========================================================
   CONFIGURA AQUÍ LA URL DE TU WEB APP DE APPS SCRIPT
   (Deploy > New deployment > Web app > copiar "URL de la app")
   ========================================================= */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyfjnepyMrXCbjlbqADlFiTDPeOyuIEArJAjrRdJF2HjHNxJ4aSbzlnrIIVw96k31kB/exec';
 
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Debug helpers: confirm script load and capture global errors
console.log('script.js loaded');
window.addEventListener('error', e => {
  console.error('Uncaught error:', e.message || e);
  try{ toast('Error inesperado: ' + (e.message || 'ver consola')); }catch(_){}
});
window.addEventListener('unhandledrejection', e => {
  console.error('Unhandled promise rejection:', e.reason);
  try{ toast('Error en promesa: ver consola'); }catch(_){}
});
 
// Tabla 1 ("Clientes de hoy"): solo puede estar sin enviar o marcarse el 1er mensaje.
// En cuanto se marca "1er Mensaje", el cliente ya no cumple el filtro y desaparece de esta tabla.
const STATUS_OPTIONS_T1 = [
  { value:'', label:'Sin enviar' },
  { value:'1er Mensaje', label:'1er Mensaje' }
];
 
// Tabla 2 ("Recordatorios"): solo aparecen los que ya tienen 1er Mensaje y falta el 2do.
// En cuanto se marca "2do Mensaje", el cliente ya no cumple el filtro y desaparece de esta tabla.
const STATUS_OPTIONS_T2 = [
  { value:'1er Mensaje', label:'1er Mensaje' },
  { value:'2do Mensaje', label:'2do Mensaje' }
];
 
let CLIENTES = [];
let HOY = '';
// If true, when fetch fails we'll use sample data so UI can be tested offline
const USE_LOCAL_FALLBACK = true;
 
// ---------- utilidades ----------
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2200);
}
 
function statusClass(status){
  if (status === '1er Mensaje') return 'st-1';
  if (status === '2do Mensaje') return 'st-2';
  return 'st-0';
}
 
function statusSelectHTML(row, status, options){
  const cls = statusClass(status);
  const label = options.find(o => o.value === status)?.label || 'Sin enviar';
  const items = options.map(o =>
    `<li class="custom-select__option ${status===o.value?'selected':''}" data-value="${o.value}" role="option">${o.label}</li>`
  ).join('');
  return `<div class="custom-select ${cls.replace('st-0','')}" data-row="${row}">
    <button type="button" class="custom-select__trigger" aria-haspopup="listbox" aria-expanded="false">${label} <span class="custom-select__arrow">▾</span></button>
    <ul class="custom-select__options" role="listbox">${items}</ul>
  </div>`;
}
 
async function updateStatusCustom(custom, value){
  const row = custom.dataset.row;
  try{
    await fetch(`${APPS_SCRIPT_URL}?action=updateStatus&row=${row}&status=${encodeURIComponent(value)}`);
    const c = CLIENTES.find(x=>x.row == row);
    if (c) c.status = value;
    toast('Status actualizado ✓');
    renderRecordatorios();
  }catch(err){
    toast('Error al guardar');
  }
}

document.addEventListener('click', event => {
  // click on an option inside moved options list
  const option = event.target.closest('.custom-select__option');
  if (option){
    const optionsList = option.closest('.custom-select__options');
    const ownerId = optionsList && optionsList.dataset.ownerId;
    const custom = ownerId ? document.querySelector(`.custom-select[data-cs-id="${ownerId}"]`) : option.closest('.custom-select');
    if (!custom) return;
    // mark selection
    optionsList.querySelectorAll('.custom-select__option').forEach(el => el.classList.remove('selected'));
    option.classList.add('selected');
    const trigger = custom.querySelector('.custom-select__trigger');
    if (trigger) trigger.innerHTML = `${option.textContent} <span class="custom-select__arrow">▾</span>`;
    custom.classList.remove('open');
    // restore options into the custom element if moved
    if (optionsList.dataset.moved === '1'){
      custom.appendChild(optionsList);
      optionsList.classList.remove('floating-open');
      delete optionsList.dataset.moved;
      delete optionsList.dataset.ownerId;
    }
    updateStatusCustom(custom, option.dataset.value);
    return;
  }

  // click on trigger
  const trigger = event.target.closest('.custom-select__trigger');
  if (trigger){
    const custom = trigger.closest('.custom-select');
    // ensure a stable id to link options when moved
    if (!custom.dataset.csId) custom.dataset.csId = 'cs-' + Math.random().toString(36).slice(2,9);
    const ownerId = custom.dataset.csId;
    const isOpen = custom.classList.toggle('open');
    // close other selects and restore their options if they were moved
    document.querySelectorAll('.custom-select.open').forEach(el => {
      if (el !== custom) {
        el.classList.remove('open');
        const opt = el.querySelector('.custom-select__options');
        if (opt && opt.dataset.moved === '1'){
          el.appendChild(opt);
          opt.classList.remove('floating-open');
          delete opt.dataset.moved;
          delete opt.dataset.ownerId;
        }
      }
    });
    trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    const options = custom.querySelector('.custom-select__options');
    if (options){
      // if opening, move options to body to avoid clipping
      if (isOpen){
        options.dataset.ownerId = ownerId;
        document.body.appendChild(options);
        options.dataset.moved = '1';
        options.classList.add('floating-open');
      }
      const rect = trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = Math.min(options.scrollHeight || 220, 220);
      const openBelow = rect.bottom + 12 + dropdownHeight < viewportHeight;
      options.style.width = `${rect.width}px`;
      options.style.left = `${rect.left}px`;
      if (openBelow){
        options.style.top = `${rect.bottom + 8}px`;
        options.style.bottom = 'auto';
      } else {
        options.style.top = 'auto';
        options.style.bottom = `${viewportHeight - rect.top + 8}px`;
      }
    }
    return;
  }

  // click elsewhere: close all opens and restore moved option lists
  document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
  document.querySelectorAll('.custom-select__options').forEach(opt => {
    if (opt.dataset.moved === '1'){
      const owner = document.querySelector(`.custom-select[data-cs-id="${opt.dataset.ownerId}"]`);
      if (owner) owner.appendChild(opt);
      opt.classList.remove('floating-open');
      delete opt.dataset.moved;
      delete opt.dataset.ownerId;
    }
  });
});
 
// ---------- carga de datos ----------
async function loadData(){
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('PEGA_AQUI')){
    document.getElementById('configBanner').style.display = 'block';
    return;
  }
  try{
    const url = `${APPS_SCRIPT_URL}?action=getData`;
    console.log('loadData: fetching', url);
    // small helper to timeout fetch if it hangs
    const timeoutFetch = (ms, promise) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('fetch timeout')) , ms);
      promise.then(res => { clearTimeout(timer); resolve(res); }, err => { clearTimeout(timer); reject(err); });
    });
    const res = await timeoutFetch(10000, fetch(url));
    if (!res.ok){
      const txt = await res.text().catch(()=>res.statusText || 'error');
      throw new Error(`HTTP ${res.status} - ${txt}`);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    CLIENTES = data.clientes || [];
    HOY = data.hoy;
    document.querySelectorAll('.today-label').forEach(el => el.textContent = HOY);
    const last = document.getElementById('lastSync');
    if (last) last.textContent = 'sincronizado ' + new Date().toLocaleTimeString();
    renderRecordatorios();
    renderAnios();
  }catch(err){
    console.error('loadData error', err);
    const last = document.getElementById('lastSync');
    if (last) last.textContent = 'error: ' + (err.message || 'conexión');
    toast('No se pudo conectar: ' + (err.message || 'error'));
    // If enabled, populate with example data so the UI remains usable
    if (USE_LOCAL_FALLBACK){
      console.warn('Using local fallback data for testing');
      const today = new Date().toISOString().slice(0,10);
      HOY = today;
      CLIENTES = [
        { row:1, nombre:'María López', celular:'555-123-4567', folio:'A001', fecha:today, tdc:'VISA', fechaCita:today, status:'' },
        { row:2, nombre:'Juan Pérez', celular:'555-987-6543', folio:'A002', fecha:today, tdc:'MASTERCARD', fechaCita:today, status:'1er Mensaje' },
        { row:3, nombre:'Ana Gómez', celular:'555-222-3333', folio:'A003', fecha:today, tdc:'AMEX', fechaCita:today, status:'' }
      ];
      document.querySelectorAll('.today-label').forEach(el => el.textContent = HOY);
      if (last) last.textContent = 'datos de ejemplo';
      toast('Mostrando datos de ejemplo (modo local)');
      renderRecordatorios();
      renderAnios();
    }
  }
}
 
// ---------- RECORDATORIOS ----------
function renderRecordatorios(){
  // Tabla 1: clientes de hoy que aún NO se les envía nada (status vacío)
  const hoyRows = CLIENTES.filter(c => c.fecha === HOY && c.status === '');
  // Tabla 2: clientes con cita HOY a quienes ya se les mandó el 1er mensaje y falta el 2do
  const citaRows = CLIENTES.filter(c => c.fechaCita === HOY && c.status === '1er Mensaje');
  fillTable('tabla-hoy', hoyRows, STATUS_OPTIONS_T1);
  fillTable('tabla-citas', citaRows, STATUS_OPTIONS_T2);
}
 
function fillTable(tbodyId, rows, statusOptions){
  const tbody = document.getElementById(tbodyId);
  if (!tbody){
    console.warn('fillTable: tbody not found', tbodyId);
    return;
  }
  if (rows.length === 0){
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Sin clientes pendientes</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(c => `
    <tr>
      <td>${c.nombre}</td>
      <td>${c.celular}</td>
      <td>${c.folio || '—'}</td>
      <td>${c.fecha || '—'}</td>
      <td>${c.tdc || '—'}</td>
      <td>${c.fechaCita || '—'}</td>
      <td>${statusSelectHTML(c.row, c.status, statusOptions)}</td>
    </tr>
  `).join('');
}
 
// ---------- acordeón AÑO > MES > SEMANA ----------
const blockState = {
  anio:   { locked:false, open:true },
  mes:    { locked:true,  open:false },
  semana: { locked:true,  open:false }
};
 
function setHeaderLocked(name, locked){
  document.getElementById('hdr-' + name).classList.toggle('locked', locked);
  blockState[name].locked = locked;
}
 
function setOpen(name, open){
  document.getElementById('content-' + name).classList.toggle('open', open);
  document.getElementById('chev-' + name).classList.toggle('rot', open);
  blockState[name].open = open;
}
 
function toggleBlock(name){
  if (blockState[name].locked) return;
  setOpen(name, !blockState[name].open);
}
 
function resetFromMes(){
  setHeaderLocked('mes', true);
  setOpen('mes', false);
  document.getElementById('val-mes').textContent = '';
  document.getElementById('box-mes').innerHTML = '';
  resetFromSemana();
}
 
function resetFromSemana(){
  setHeaderLocked('semana', true);
  setOpen('semana', false);
  document.getElementById('val-semana').textContent = '';
  document.getElementById('box-semana').innerHTML = '';
  document.getElementById('tabla-clientes-wrap').style.display = 'none';
}
 
// ---------- CLIENTES: AÑO > MES > SEMANA ----------
function parseYMD(str){
  // str en formato yyyy-MM-dd
  const [y,m,d] = str.split('-').map(Number);
  return {y, m, d};
}
 
function toDate(str){
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}
 
// Lunes de la semana que contiene "date" (semana calendario Lun-Dom)
function mondayOf(date){
  const d = new Date(date);
  const day = d.getDay(); // 0=Dom..6=Sab
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}
 
// Número de semana calendario (Lun-Dom) dentro del mes de la fecha
function weekIndexInMonth(dateStr){
  const date = toDate(dateStr);
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const mondayFirst = mondayOf(firstOfMonth);
  const mondayThis = mondayOf(date);
  const diffWeeks = Math.round((mondayThis - mondayFirst) / (7*24*3600*1000));
  return diffWeeks + 1;
}
 
// Etiqueta "Semana N (29 jun – 5 jul)" para una fecha dada
function weekRangeLabel(dateStr, weekIdx){
  const date = toDate(dateStr);
  const monday = mondayOf(date);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const fmt = d => d.toLocaleDateString('es-MX', {day:'numeric', month:'short'});
  return `Semana ${weekIdx} (${fmt(monday)} – ${fmt(sunday)})`;
}
 
function renderAnios(){
  const conFecha = CLIENTES.filter(c => c.fecha);
  const anios = [...new Set(conFecha.map(c => parseYMD(c.fecha).y))].sort((a,b)=>b-a);
 
  resetFromMes();
  document.getElementById('val-anio').textContent = '';
  setOpen('anio', true);
 
  const box = document.getElementById('box-anio');
  if (anios.length === 0){
    box.classList.add('empty');
    box.innerHTML = '';
    return;
  }
  box.classList.remove('empty');
  box.innerHTML = anios.map(a => `<button class="chip" data-year="${a}" onclick="selectAnio(${a}, this)">${a} <span style="opacity:.6">(${conFecha.filter(c=>parseYMD(c.fecha).y===a).length})</span></button>`).join('');
}
 
function selectAnio(year, btn){
  document.querySelectorAll('#box-anio .chip').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
 
  resetFromMes(); // limpia mes y semana antes de repoblar
 
  const boxMes = document.getElementById('box-mes');
  const rows = CLIENTES.filter(c => c.fecha && parseYMD(c.fecha).y === year);
  const meses = [...new Set(rows.map(c => parseYMD(c.fecha).m))].sort((a,b)=>a-b);
 
  boxMes.innerHTML = meses.map(m => `<button class="chip" data-month="${m}" onclick="selectMes(${year}, ${m}, this)">${MESES[m-1]} <span style="opacity:.6">(${rows.filter(c=>parseYMD(c.fecha).m===m).length})</span></button>`).join('');
 
  document.getElementById('val-anio').textContent = '· ' + year;
  setHeaderLocked('mes', false);
  setOpen('anio', false);
  setOpen('mes', true);
}
 
function selectMes(year, month, btn){
  document.querySelectorAll('#box-mes .chip').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
 
  resetFromSemana();
 
  const boxSemana = document.getElementById('box-semana');
  const rows = CLIENTES.filter(c => c.fecha && parseYMD(c.fecha).y === year && parseYMD(c.fecha).m === month);
  const semanas = [...new Set(rows.map(c => weekIndexInMonth(c.fecha)))].sort((a,b)=>a-b);
 
  boxSemana.innerHTML = semanas.map(s => {
    const rowsInWeek = rows.filter(c => weekIndexInMonth(c.fecha) === s);
    const label = weekRangeLabel(rowsInWeek[0].fecha, s);
    return `<button class="chip" data-week="${s}" onclick="selectSemana(${year}, ${month}, ${s}, this)">${label} <span style="opacity:.6">(${rowsInWeek.length})</span></button>`;
  }).join('');
 
  document.getElementById('val-mes').textContent = '· ' + MESES[month-1];
  setHeaderLocked('semana', false);
  setOpen('mes', false);
  setOpen('semana', true);
}
 
function selectSemana(year, month, week, btn){
  document.querySelectorAll('#box-semana .chip').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
 
  const rows = CLIENTES.filter(c => c.fecha &&
    parseYMD(c.fecha).y === year &&
    parseYMD(c.fecha).m === month &&
    weekIndexInMonth(c.fecha) === week
  );
 
  const tbody = document.getElementById('tabla-clientes');
  tbody.innerHTML = rows.map(c => `
    <tr>
      <td>${c.nombre}</td>
      <td>${c.celular}</td>
      <td>${c.folio || '—'}</td>
      <td>${c.fecha || '—'}</td>
      <td>${c.tdc || '—'}</td>
      <td>${c.fechaCita || '—'}</td>
      <td><span class="badge ${statusClass(c.status)}">${c.status || 'Sin enviar'}</span></td>
    </tr>
  `).join('');
  document.getElementById('tabla-clientes-wrap').style.display = 'table';
  document.getElementById('val-semana').textContent = '· Semana ' + week;
  setOpen('semana', false);
}
 
// ---------- tabs ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.view;
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('view-' + target).classList.add('active');
  });
});

// Start app when DOM is ready to avoid timing issues
function startApp(){
  try{
    console.log('startApp: calling loadData');
    loadData();
    window._loadInterval = setInterval(loadData, 300000);
  }catch(e){
    console.error('startApp error', e);
    toast('Error iniciando la app');
  }
}
if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', startApp);
} else startApp();