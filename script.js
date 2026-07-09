/* =========================================================
   CONFIGURA AQUÍ LA URL DE TU WEB APP DE APPS SCRIPT
   (Deploy > New deployment > Web app > copiar "URL de la app")
   ========================================================= */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw0tbsJCl8z4JFjYupNvQS2o8yZmhxAQ7EFmf23g6av_4IoIP3skzricoOZgiqjKwMx/exec';
 
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
 
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
  const opts = options.map(o =>
    `<option value="${o.value}" ${status===o.value?'selected':''}>${o.label}</option>`
  ).join('');
  return `<select class="status-select ${cls.replace('st-0','')}" data-row="${row}" onchange="onStatusChange(this)">
    ${opts}
  </select>`;
}
 
async function onStatusChange(select){
  const row = select.dataset.row;
  const status = select.value;
  try{
    await fetch(`${APPS_SCRIPT_URL}?action=updateStatus&row=${row}&status=${encodeURIComponent(status)}`);
    const c = CLIENTES.find(x=>x.row == row);
    if (c) c.status = status;
    toast('Status actualizado ✓');
    renderRecordatorios(); // el cliente desaparece de la tabla si ya no cumple el filtro
  }catch(err){
    toast('Error al guardar');
  }
}
 
// ---------- carga de datos ----------
async function loadData(){
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('PEGA_AQUI')){
    document.getElementById('configBanner').style.display = 'block';
    return;
  }
  try{
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getData`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    CLIENTES = data.clientes || [];
    HOY = data.hoy;
    document.querySelectorAll('.today-label').forEach(el => el.textContent = HOY);
    document.getElementById('lastSync').textContent = 'sincronizado ' + new Date().toLocaleTimeString();
    renderRecordatorios();
    renderAnios();
  }catch(err){
    document.getElementById('lastSync').textContent = 'error de conexión';
    toast('No se pudo conectar con la hoja');
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
  if (rows.length === 0){
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">Sin clientes pendientes</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(c => `
    <tr>
      <td>${c.nombre}</td>
      <td>${c.celular}</td>
      <td>${c.fecha || '—'}</td>
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
      <td>${c.fecha || '—'}</td>
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
 
loadData();
// refresca cada 60s para mantener la vista al día
setInterval(loadData, 60000);