// De Seu · Fichas (v0.7.1). Todo se queda en la tablet; nada se envía a ningún servidor.
(() => {
'use strict';
const D = window.DATOS;
const $app = document.getElementById('app');
const BLOQUEO_MIN = 5;                     // minutos sin tocar la pantalla → se bloquea
const S = { centro: null, clienta: null, pestana: 'datos', seleccion: [], sesion: null, presu: null, modoClienta: false, tarifas: null };
let urls = [], urlsNuevas = [];            // object URLs: se liberan las de la pantalla anterior
const NIVEL = { verde: 0, aviso: 1, ambar: 2, rojo: 3 };
const ETQ = { verde: 'Apta', aviso: 'Apta con precaución', ambar: 'Esperar o autorización médica', rojo: 'No tratar' };

// ---------- utilidades ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoy = () => new Date().toISOString().slice(0, 10);
const fecha = iso => iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const masDias = (iso, d) => { const f = new Date(iso); f.setDate(f.getDate() + d); return f.toISOString(); };
const normal = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const centro = () => D.centros[S.centro];
const nomServ = id => D.servicios[id]?.nombre || id;
function avisar(t) { const a = document.getElementById('aviso'); a.textContent = t; a.classList.add('ver'); clearTimeout(avisar.t); avisar.t = setTimeout(() => a.classList.remove('ver'), 3200); }
function url(blob) { const u = URL.createObjectURL(blob); urlsNuevas.push(u); return u; }
function limpiarUrls() { urls.forEach(u => URL.revokeObjectURL(u)); urls = urlsNuevas; urlsNuevas = []; }
function pintar(html) { limpiarUrls(); $app.oninput = $app.onchange = null; $app.innerHTML = html; window.scrollTo(0, 0); }
async function sha(txt) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
function edad(nac) {
  if (!nac) return null;
  const n = new Date(nac), h = new Date(); let e = h.getFullYear() - n.getFullYear();
  if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) e--; return e;
}
function barra(titulo, atras) {
  return `<header class="barra">
    ${atras ? `<button class="icono" data-a="${atras}" aria-label="Volver">←</button>` : ''}
    <img class="logo-barra" src="icons/logo-negativo.png" alt="De Seu">
    <div class="titulo">${titulo}</div>
    <div class="centro">${esc(centro().nombre)}</div>
    <button data-a="mejora" aria-label="Apuntar una mejora de la app">💡</button>
    <button data-a="bloquear" aria-label="Bloquear">Bloquear</button>
  </header>`;
}
// «Globos» de servicio con el color de su familia (manual de marca).
const globo = (s, attrs = '', on = false, extra = '') => `<button type="button" class="globo fam-${D.servicios[s]?.fam || 'cara'} ${on ? 'on' : ''} ${extra}" ${attrs}>${on ? '<span class="tick">✓</span>' : ''}${esc(nomServ(s))}</button>`;
const globoTema = (t, attrs = '', on = false) => `<button type="button" class="globo fam-${t.fam} ${on ? 'on' : ''}" ${attrs}>${on ? '<span class="tick">✓</span>' : ''}${esc(t.n)}</button>`;
const globoMini = s => `<span class="globo-mini fam-${D.servicios[s]?.fam || 'cara'}">${esc(nomServ(s))}</span>`;
const chips = (attr, opciones, valor) => `<div class="opciones">${opciones.map(o =>
  `<button type="button" ${attr}="${esc(o)}" class="${valor === o ? 'on' : ''}">${esc(o)}</button>`).join('')}</div>`;

// ---------- bloqueo por centro y PIN ----------
// Al bloquearse con una ficha a medias se guarda todo (en memoria y en la base de la tablet) para seguir tras el PIN.
function guardarParaSeguir() {
  if (!S.centro || !S.clienta || document.querySelector('.bloqueo')) return;
  S.reanudar = JSON.parse(JSON.stringify({ clienta: S.clienta, pantalla: S.pantalla, pestana: S.pestana, paso: S.pasoClienta, sesion: S.sesion, presu: S.presu }));
  DB.fijar('borrador', S.reanudar).catch(() => {});
}
async function seguirDondeIba(r) {
  S.clienta = r.clienta; S.pestana = r.pestana || 'datos'; S.sesion = r.sesion || null; S.presu = r.presu || null;
  S.seleccion = []; S.montajes = {}; S.comparando = null;
  avisar('Seguimos donde lo dejaste');
  if (r.pantalla === 'clienta') return modoClienta(r.paso || 0);
  if (r.pantalla === 'pre') return pantallaPreClienta();
  return pantallaFicha();
}
async function pantallaBloqueo(error = '') {
  guardarParaSeguir();
  S.clienta = null; S.modoClienta = false; S.presu = null;
  let elegido = S.centro || localStorage.getItem('ultimoCentro') || 'deseu';
  if (!D.centros[elegido]) elegido = Object.keys(D.centros)[0];
  const varios = Object.keys(D.centros).length > 1;
  let pin = '', primero = null, modo = 'entrar', turno = 0;
  async function prepararModo() {           // si se cambia de centro deprisa, solo vale el último
    const mio = ++turno, c = elegido;
    await DB.abrir(c);
    const tiene = await DB.ajuste('pin');
    if (mio !== turno || DB.centro !== c) return false;
    modo = tiene ? 'entrar' : 'crear'; primero = null; pin = '';
    return true;
  }
  function dibujar(msg = error) {
    const titulo = modo === 'crear' ? (primero ? 'Repite el PIN' : 'Crea un PIN de 4 a 6 números') : 'Escribe el PIN';
    pintar(`<div class="bloqueo"><div class="caja">
      <img src="icons/logo.png" alt="De Seu by Orixe Benestar">
      <div class="franjas" style="margin:0 auto 6px"><span></span><span></span><span></span></div>
      ${varios ? `<div class="centros">${Object.entries(D.centros).map(([k, c]) =>
        `<button data-c="${k}" class="${k === elegido ? 'on' : ''}">${esc(c.nombre)}</button>`).join('')}</div>` : ''}
      <h2>${titulo}</h2>
      <div class="pin">${[0,1,2,3,4,5].map(i => `<span class="${i < pin.length ? 'lleno' : ''}"></span>`).join('')}</div>
      <div class="error">${esc(msg)}</div>
      <div class="teclado">${[1,2,3,4,5,6,7,8,9].map(n => `<button data-n="${n}">${n}</button>`).join('')}
        <button data-n="borrar" aria-label="Borrar">⌫</button><button data-n="0">0</button><button data-n="ok">OK</button></div>
      <p style="color:var(--suave);font-size:.85rem;margin-top:18px">Los datos se guardan solo en esta tablet.</p>
    </div></div>`);
  }
  // Al teclear solo se actualizan los puntos y el mensaje (redibujar toda la pantalla en cada número iba lento).
  function puntos(msg = '') {
    document.querySelectorAll('.bloqueo .pin span').forEach((s, i) => s.classList.toggle('lleno', i < pin.length));
    const er = document.querySelector('.bloqueo .error'); if (er) er.textContent = msg;
  }
  await prepararModo(); dibujar();
  $app.onclick = null;
  $app.onpointerdown = async e => {
    if (!document.querySelector('.bloqueo')) { $app.onpointerdown = null; return; }
    const c = e.target.closest('[data-c]'), n = e.target.closest('[data-n]');
    if (c) { elegido = c.dataset.c; error = ''; if (await prepararModo()) dibujar(''); return; }
    if (!n || DB.centro !== elegido) return;
    e.preventDefault();
    const v = n.dataset.n;
    if (v === 'borrar') { pin = pin.slice(0, -1); puntos(); return; }
    if (v !== 'ok') { if (pin.length < 6) pin += v; puntos(); if (pin.length < 6) return; }
    if (pin.length < 4) { puntos('Mínimo 4 números'); return; }
    if (modo === 'crear') {
      if (!primero) { primero = pin; pin = ''; dibujar(''); return; }
      if (primero !== pin) { primero = null; pin = ''; dibujar('No coinciden. Empieza otra vez'); return; }
      const sal = DB.id();
      await DB.fijar('pin', { sal, hash: await sha(sal + pin) });
      entrar(elegido);
    } else {
      const g = await DB.ajuste('pin');
      if (await sha(g.sal + pin) === g.hash) entrar(elegido);
      else { pin = ''; dibujar('PIN incorrecto'); }
    }
  };
}
async function entrar(c) {
  S.centro = c; localStorage.setItem('ultimoCentro', c); await cargarTarifas();
  const r = S.reanudar || await DB.ajuste('borrador'); S.reanudar = null;
  if (r && r.clienta) { await DB.fijar('borrador', null); return seguirDondeIba(r); }
  pantallaInicio();
}
let temporizador;
function reiniciarBloqueo() {
  clearTimeout(temporizador);
  if (S.centro && !document.querySelector('.bloqueo')) temporizador = setTimeout(() => { cerrarCamara(); pantallaBloqueo('Bloqueada por inactividad'); }, BLOQUEO_MIN * 60000);
}
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, reiniciarBloqueo, { passive: true }));
// Salir un momento (elegir un archivo, WhatsApp, compartir, cámara del sistema) NO bloquea.
// Solo se pide el PIN al abrir la app de cero, con el botón «Bloquear» o tras 5 minutos sin usarla (también si se estuvo fuera más de 5 minutos).
let ocultaDesde = 0;
document.addEventListener('visibilitychange', () => {
  if (!S.centro) return;
  if (document.hidden) { ocultaDesde = Date.now(); return; }
  if (ocultaDesde && Date.now() - ocultaDesde > BLOQUEO_MIN * 60000 && !document.querySelector('.bloqueo')) { cerrarCamara(); pantallaBloqueo('Bloqueada por inactividad'); }
  ocultaDesde = 0;
});

// ---------- triaje: de las respuestas a «apta / precaución / esperar / no tratar» ----------
function serviciosElegidos(c) { return (c.servicios && c.servicios.length) ? c.servicios : ['valoracion']; }
function preguntasVisibles(c) {
  const sel = serviciosElegidos(c), toca = b => b === '*' || b.some(s => sel.includes(s));
  const out = []; let seccion = null, visibleSec = false, buffer = [];
  for (const q of D.cuestionario) {
    if (q.titulo) { if (visibleSec && buffer.length) out.push(seccion, ...buffer); seccion = q; visibleSec = toca(q.bloque); buffer = []; continue; }
    if (!visibleSec) continue;
    if (q.ver && !q.ver.some(s => sel.includes(s))) continue;
    buffer.push(q);
  }
  if (visibleSec && buffer.length) out.push(seccion, ...buffer);
  return out;
}
// La clienta responde; la profesional revisa. La revisión deja de valer si cambian las respuestas o los servicios.
function huellaRevision(c) { return JSON.stringify([c.salud || {}, serviciosElegidos(c), c.fototipo?.r || []]); }
const revisada = c => !!c.revision && c.revision.huella === huellaRevision(c);
function fototipo(c) {
  const r = c.fototipo?.r || [];
  if (r.filter(x => x != null).length < D.fototipo.length) return null;
  const pts = r.reduce((a, b) => a + b, 0);
  return { pts, tipo: D.fototipoTramos.find(([max]) => pts <= max)[1] };
}
function triaje(c) {
  const sel = serviciosElegidos(c), res = {};
  sel.forEach(s => res[s] = { nivel: 'verde', msgs: [] });
  const add = (servs, n, m) => (servs === '*' ? sel : servs.filter(s => sel.includes(s))).forEach(s => {
    if (!res[s]) return;
    res[s].msgs.push({ n, m });
    if (NIVEL[n] > NIVEL[res[s].nivel]) res[s].nivel = n;
  });
  const vis = preguntasVisibles(c).filter(q => !q.titulo);
  let pendientes = 0;
  for (const q of vis) {
    const r = c.salud?.[q.id]?.r;
    if (!r) { pendientes++; continue; }
    for (const g of q.reglas || []) if (g.v.includes(r)) add(g.s, g.n, g.m + (c.salud[q.id].d ? ` (${c.salud[q.id].d})` : ''));
  }
  const e = edad(c.nacimiento);
  if (e != null && e < 18) {
    add(['laser', 'rf_facial', 'rf_corporal'], 'ambar', `Menor de edad (${e} años): consentimiento firmado por madre, padre o tutor y autorización médica.`);
    add(['pestanas', 'cejas', 'higiene', 'masaje', 'madero', 'preso', 'craneal', 'valoracion'], 'aviso', `Menor de edad (${e} años): firma de madre, padre o tutor.`);
    if (e < 16) add(['pestanas', 'cejas'], 'rojo', 'Menor de 16: no usar tintes con PPD.');
  }
  if (sel.includes('laser')) {
    const auto = fototipo(c), obs = c.revision?.fototipoObs;
    const f = obs ? { tipo: obs } : auto;
    if (!auto && !obs) pendientes++;
    else if (['IV', 'V', 'VI'].includes(f.tipo)) add(['laser'], 'aviso', `Fototipo ${f.tipo}: fluencia más baja, pulso más largo y más enfriamiento. Prueba de parcheo con lectura más larga (hasta 14 días en piel oscura).`);
  }
  return { res, pendientes };
}
const peor = t => Object.values(t.res).reduce((a, r) => NIVEL[r.nivel] > NIVEL[a] ? r.nivel : a, 'verde');
function panelTriaje(c, compacto) {
  const t = triaje(c);
  return `<div class="triaje">${Object.entries(t.res).map(([s, r]) => `
    <div class="semaforo ${r.nivel}"><div class="cab"><span class="luz"></span><b>${esc(nomServ(s))}</b><span class="espacio"></span><span>${ETQ[r.nivel]}</span></div>
    ${r.msgs.length && !compacto ? `<ul>${r.msgs.sort((a, b) => NIVEL[b.n] - NIVEL[a.n]).map(x => `<li class="${x.n}">${esc(x.m)}</li>`).join('')}</ul>` : ''}</div>`).join('')}
    ${t.pendientes ? `<p class="pend">Faltan ${t.pendientes} respuesta${t.pendientes > 1 ? 's' : ''}: el resultado aún no es definitivo.</p>` : ''}
  </div>`;
}

// ---------- inicio: lista de clientas ----------
async function pantallaInicio(filtro = '') {
  S.clienta = null; S.seleccion = []; S.sesion = null; S.comparando = null; S.presu = null; S.modoClienta = false; S.promo = S.promoVer = null; S.pantalla = 'inicio';
  reintentarEnvios().then(n => { if (n) avisar(`${n} presupuesto(s) pendiente(s) enviado(s)`); });
  const nRec = await contarRecordatoriosHoy();
  const todas = (await DB.todas('clientas')).sort((a, b) => (b.actualizada || '').localeCompare(a.actualizada || ''));
  const f = normal(filtro);
  const lista = f ? todas.filter(c => c.busqueda.includes(f)) : todas;
  pintar(`${barra('Clientas')}
  <main>
    <div class="fila" style="margin-bottom:16px">
      <input type="search" id="buscar" placeholder="Buscar por nombre o teléfono" value="${esc(filtro)}" style="flex:1;min-width:220px">
      <button class="btn coral grande" data-a="nueva-clienta">+ Nueva · la rellena la clienta</button>
      <button class="btn sec" data-a="nueva">+ Nueva (profesional)</button>
    </div>
    <div class="fila" style="margin-bottom:16px"><button class="btn sec" data-a="promociones">Promociones</button><button class="btn sec con-burbuja" data-a="recordatorios">Recordatorios${nRec ? `<span class="burbuja">${nRec}</span><span class="vh"> para hoy</span>` : ''}</button></div>
    ${lista.length ? `<ul class="lista">${lista.map(c => {
      const st = estadoFicha(c), p = peor(triaje(c));
      return `<li><button data-id="${c.id}"><span class="ini">${esc((c.nombre || '?')[0].toUpperCase())}</span>
        <span style="flex:1"><span class="nom">${esc(c.nombre)} ${esc(c.apellidos)}</span>
        ${p !== 'verde' ? `<span class="etiqueta ${p}">${ETQ[p]}</span>` : ''}
        ${st.firmada ? '<span class="etiqueta ok">Firmada</span>' : '<span class="etiqueta aviso">Sin firmar</span>'}
        ${revisada(c) ? '' : '<span class="etiqueta ambar">Por revisar</span>'}
        <br><span class="det">${serviciosElegidos(c).map(globoMini).join('')} ${esc(c.telefono || '')} · ${fecha(c.actualizada)}</span></span><span>›</span></button></li>`;
    }).join('')}</ul>` : `<p class="vacio">${todas.length ? 'No hay ninguna clienta con ese nombre.' : 'Aún no hay fichas. Empieza con «Nueva clienta».'}</p>`}
    <div class="fila" style="margin-top:28px">
      <button class="btn sec" data-a="copias">Ajustes: tarifa, correo, copias y mejoras</button>
      <span class="espacio"></span>
      <span style="color:var(--suave);font-size:.85rem">${todas.length} ficha${todas.length === 1 ? '' : 's'} · v${D.version}</span>
    </div>
  </main>`);
  const b = document.getElementById('buscar');
  b.oninput = () => { clearTimeout(b.t); b.t = setTimeout(() => pantallaInicio(b.value).then(() => { const n = document.getElementById('buscar'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }), 250); };
  $app.onclick = e => {
    const t = e.target.closest('[data-a],[data-id]'); if (!t) return;
    if (t.dataset.id) return abrirClienta(t.dataset.id);
    acciones(t.dataset.a);
  };
}
function gruposConsent(c) { return [...new Set(serviciosElegidos(c).map(s => D.servicios[s]?.grupo))].filter(g => D.consentimientos[g]); }
function estadoFicha(c) {
  const firmada = !!c.firma && c.firma.huella === huellaFicha(c);
  return { firmada, cambiada: !!c.firma && !firmada };
}
// Huella de lo que se firmó: si cambian las respuestas, los servicios o los permisos, hay que volver a firmar.
function huellaFicha(c) { return JSON.stringify([c.salud || {}, c.consent || {}, serviciosElegidos(c), c.fototipo?.r || [], D.version.split('.').slice(0, 2).join('.')]); }

async function acciones(a) {
  if (a === 'bloquear') { cerrarCamara(); return pantallaBloqueo(); }
  if (a === 'inicio') return pantallaInicio();
  if (a === 'nueva') { S.clienta = nuevaClienta(); S.pestana = 'datos'; return pantallaFicha(); }
  if (a === 'nueva-clienta') { S.clienta = nuevaClienta(); return pantallaPreClienta(); }
  if (a === 'promociones') return pantallaPromos();
  if (a === 'recordatorios') return pantallaRecordatorios();
  if (a === 'tarifas') return pantallaTarifas();
  if (a === 'copias') return pantallaCopias();
  if (a === 'mejora') return apuntarMejora();
}
async function apuntarMejora() {
  const t = prompt('¿Qué mejorarías o qué ha fallado? (se guarda en la tablet y se revisa cada mes)');
  if (!t || !t.trim()) return;
  const lista = (await DB.ajuste('mejoras')) || [];
  lista.push({ fecha: new Date().toISOString(), pantalla: S.clienta ? S.pestana : 'inicio', texto: t.trim() });
  await DB.fijar('mejoras', lista); avisar('Mejora apuntada. ¡Gracias!');
}
function nuevaClienta() {
  return { id: DB.id(), nombre: '', apellidos: '', telefono: '', email: '', nacimiento: '', origen: '', notas: '', servicios: [],
    salud: {}, fototipo: { r: [] }, consent: { datos: false, veracidad: false, fotos: false, comunicaciones: false, redes: 'No' }, firma: null,
    sinCorreo: false, condicion: { pct: 0, motivo: '' }, promos: { acepta: false, temas: [], canales: ['whatsapp'] },
    creada: new Date().toISOString(), valoracion: { inicio: new Date().toISOString() }, nueva: true };
}
async function abrirClienta(id) {
  S.clienta = await DB.una('clientas', id);
  S.clienta.servicios ??= []; S.clienta.fototipo ??= { r: [] }; S.clienta.condicion ??= { pct: 0, motivo: '' }; S.clienta.promos ??= { acepta: false, temas: [], canales: ['whatsapp'] };
  S.pestana = 'datos'; S.seleccion = []; S.sesion = null; S.comparando = null; S.fotoArea = null; S.fotoMomento = null; S.montajes = {}; S.presu = null; pantallaFicha();
}

// ---------- ficha ----------
async function guardarClienta(silencioso) {
  const c = S.clienta;
  const falta = !c.nombre.trim() ? 'Falta el nombre' : !(c.apellidos || '').trim() ? 'Faltan los apellidos'
    : !telValido(c.telefono) ? 'Falta un WhatsApp válido (9 números, o con prefijo de país)'
    : (!c.sinCorreo && !correoValido(c.email)) ? 'Falta un correo válido (o marca «No tiene correo»)' : '';
  if (falta) { avisar(falta); if (!S.modoClienta) { S.pestana = 'datos'; pantallaFicha(); } return false; }
  c.busqueda = normal(`${c.nombre} ${c.apellidos} ${c.telefono} ${c.email}`);
  c.actualizada = new Date().toISOString();
  delete c.nueva;
  await DB.guardar('clientas', c);
  if (!silencioso) avisar('Ficha guardada');
  return true;
}
async function pantallaFicha() {
  S.pantalla = 'ficha';
  const c = S.clienta, st = estadoFicha(c), t = triaje(c), p = peor(t);
  const titulo = c.nombre ? esc(`${c.nombre} ${c.apellidos}`) : 'Nueva clienta';
  const marca = { verde: '', aviso: ' ●', ambar: ' ●', rojo: ' ●' };
  const tabs = [['datos', 'Datos'], ['salud', `Cuestionario<span class="pto ${p}">${t.pendientes ? '' : marca[p]}</span>`],
    ['firma', st.firmada ? 'Consentimiento ✓' : 'Consentimiento'], ['sesiones', 'Sesiones'], ['presupuestos', 'Presupuestos'], ['fotos', 'Fotos']];
  let cuerpo = '';
  if (S.pestana === 'datos') cuerpo = vistaDatos(c);
  if (S.pestana === 'salud') cuerpo = vistaSalud(c);
  if (S.pestana === 'firma') cuerpo = vistaFirma(c, st);
  if (S.pestana === 'sesiones') cuerpo = await vistaSesiones(c);
  if (S.pestana === 'fotos') cuerpo = await vistaFotos(c);
  if (S.pestana === 'presupuestos') cuerpo = await vistaPresupuestos(c);
  pintar(`${barra(titulo, 'inicio')}<main>
    <nav class="pestanas no-imprimir">${tabs.map(([k, tt]) => `<button data-tab="${k}" class="${S.pestana === k ? 'on' : ''}">${tt}</button>`).join('')}</nav>
    ${st.cambiada ? '<div class="nota no-imprimir">Ha cambiado algo después de firmar (respuestas, servicios o permisos). Pide a la clienta que revise y vuelva a firmar.</div>' : ''}
    ${cuerpo}</main>`);
  if (S.pestana === 'firma') montarFirma();
  if (S.pestana === 'fotos') montarComparador();
  $app.onclick = manejarFicha;
  $app.oninput = e => {
    const tg = e.target;
    if (tg.dataset.f) c[tg.dataset.f] = tg.value;
    if (tg.dataset.det) c.salud[tg.dataset.det] = { ...(c.salud[tg.dataset.det] || {}), d: tg.value };
    if (tg.dataset.sf && S.sesion) S.sesion.datos[tg.dataset.sf] = tg.value;
    if (tg.dataset.sdet && S.sesion) S.sesion.datos[tg.dataset.sdet + '_d'] = tg.value;
    if (tg.id === 'autorizacion_nota' && S.sesion) S.sesion.autorizacionNota = tg.value;
    if (tg.dataset.cond) c.condicion[tg.dataset.cond] = tg.dataset.cond === 'pct' ? +tg.value.replace(',', '.') || 0 : tg.value;
    const P = S.presu;
    if (P) {
      const num = v => v === '' ? '' : +v.replace(',', '.');
      if (tg.dataset.pl) { const l = P.lineas[+tg.dataset.pl], k = tg.dataset.campo; l[k] = k === 'concepto' ? tg.value : num(tg.value); P.cambiado = true; }
      if (tg.id === 'dtovalor') { P.dto.valor = num(tg.value) || 0; P.cambiado = true; }
      if (tg.id === 'dtomotivo') P.dto.motivo = tg.value;
      if (tg.id === 'presunotas') { P.notas = tg.value; P.cambiado = true; }
    }
  };
  $app.onchange = e => {
    const tg = e.target;
    if (tg.dataset.cons) { c.consent[tg.dataset.cons] = tg.checked; pantallaFicha(); }
    if (tg.dataset.f === 'nacimiento') pantallaFicha();
    if (tg.id === 'autorizacion' && S.sesion) { S.sesion.autorizacion = tg.checked; pantallaFicha(); }
    if (tg.id === 'sincorreo') { c.sinCorreo = tg.checked; }
    if (S.presu && (tg.dataset.pl || tg.id === 'dtovalor')) { const y = scrollY; pantallaFicha().then(() => scrollTo(0, y)); }
    if (S.presu && tg.id === 'dtotipo') { S.presu.dto.tipo = tg.value; S.presu.cambiado = true; const y = scrollY; pantallaFicha().then(() => scrollTo(0, y)); }
    if (tg.dataset.msel) { S.montajes ||= {}; (S.montajes[tg.dataset.marea] ||= {})[tg.dataset.msel] = tg.value; S.comparando = null; const y = scrollY; pantallaFicha().then(() => scrollTo(0, y)); }
  };
}
function vistaDatos(c) {
  const campo = (f, t, tipo = 'text', extra = '') => `<label class="campo"><span>${t}</span><input type="${tipo}" data-f="${f}" value="${esc(c[f])}" ${extra}></label>`;
  const e = edad(c.nacimiento), min = c.valoracion?.fin ? Math.round((new Date(c.valoracion.fin) - new Date(c.valoracion.inicio)) / 60000) : null;
  return `<section class="tarjeta">
    <div class="rejilla">
      ${campo('nombre', 'Nombre *', 'text', 'autocomplete="off"')}${campo('apellidos', 'Apellidos *', 'text', 'autocomplete="off"')}
      ${campo('telefono', 'WhatsApp *', 'tel')}${campo('email', 'Correo * (para el presupuesto)', 'email')}
      <label class="campo"><span>Fecha de nacimiento${e != null ? ` · ${e} años` : ''}</span><input type="date" data-f="nacimiento" value="${esc(c.nacimiento)}"></label>
      <label class="campo"><span>¿Cómo nos conociste?</span><select data-f="origen">
        ${['', 'Instagram', 'Recomendación', 'Pasaba por Coia', 'Google', 'Orixe', 'Otro'].map(o => `<option ${c.origen === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
    </div>
    <div class="campo"><span class="lbl">Para qué viene (lo marca la profesional: decide las preguntas de salud y los consentimientos)</span>
      <div class="globos">${centro().servicios.map(s => globo(s, `data-serv="${s}"`, c.servicios.includes(s))).join('')}</div></div>
    <label class="check"><input type="checkbox" id="sincorreo" ${c.sinCorreo ? 'checked' : ''}> No tiene correo electrónico</label>
    <div class="campo"><span class="lbl">Promociones (lo elige la clienta en su recorrido)</span>
      ${c.promos?.acepta ? `<div class="globos">${D.temasPromo.filter(t => c.promos.temas.includes(t.id)).map(t => `<span class="globo-mini fam-${t.fam}">${esc(t.n)}</span>`).join('')}</div>
        <p class="det" style="margin:6px 0">Por ${c.promos.canales.map(x => x === 'whatsapp' ? 'WhatsApp' : 'correo').join(' y ')} · aceptado el ${fecha(c.promos.fecha)}.
        <button class="btn peligro" style="min-height:36px;padding:4px 12px;font-size:.85rem" data-a="baja-promos">Dar de baja</button></p>`
      : `<p class="det" style="margin:4px 0">No quiere recibir promociones${c.promos?.baja ? ` (baja el ${fecha(c.promos.baja)})` : ''}. Para cambiarlo, «Pasar la tablet a la clienta».</p>`}</div>
    <label class="campo"><span>Notas de la valoración (solo equipo)</span><textarea data-f="notas">${esc(c.notas)}</textarea></label>
    <div class="rejilla"><label class="campo"><span>Condición especial de precio (% de descuento, solo equipo)</span><input type="text" inputmode="decimal" data-cond="pct" value="${esc(c.condicion?.pct || '')}" placeholder="0"></label>
      <label class="campo"><span>Motivo</span><input type="text" data-cond="motivo" value="${esc(c.condicion?.motivo || '')}" placeholder="Familiar, usuaria de Orixe…"></label></div>
    ${min ? `<p style="color:var(--suave);font-size:.9rem">Valoración completa (ficha → firma) en ${min} min.</p>` : ''}
    <div class="fila fin">
      ${c.nueva ? '' : '<button class="btn peligro" data-a="borrar">Borrar ficha</button><span class="espacio"></span>'}
      <button class="btn sec" data-a="pasar-clienta">Pasar la tablet a la clienta</button>
      <button class="btn" data-a="guardar-sig">${c.nueva ? 'Guardar y seguir al cuestionario' : 'Guardar'}</button>
    </div></section>`;
}
function vistaSalud(c) {
  const vis = preguntasVisibles(c), laser = serviciosElegidos(c).includes('laser'), f = fototipo(c);
  const rv = revisada(c), fAuto = fototipo(c);
  let h = `<section class="tarjeta"><h2>Resultado <em class="cur">para la profesional</em></h2>${panelTriaje(c)}
    <div class="revision ${rv ? 'ok' : ''}"><h3>Revisión de la profesional</h3>
      ${rv ? `<p>✓ Revisado por <b>${esc(c.revision.por)}</b> el ${fecha(c.revision.fecha)}${c.revision.fototipoObs ? ` · fototipo observado ${c.revision.fototipoObs}` : ''}.</p>
        <button class="btn sec" data-a="quitar-revision">Volver a revisar</button>`
      : `<p>Repasa con la clienta cada respuesta que no sea «No», completa el detalle si falta${laser ? ' y confirma el fototipo mirando la piel y el vello' : ''}. Sin esta revisión no se puede guardar ninguna sesión.</p>
        <div class="rejilla"><label class="campo"><span>Profesional</span><input type="text" id="revpor" value="${esc(S.profesional || D.profesionalPorDefecto || '')}" placeholder="Tu nombre"></label>
        ${laser ? `<div class="campo"><span class="lbl">Fototipo observado${fAuto ? ` (el test da ${fAuto.tipo})` : ''}</span>${chips('data-ftobs', ['I', 'II', 'III', 'IV', 'V', 'VI'], c.revision?.fototipoObs || S.ftobs || '')}</div>` : ''}</div>
        <button class="btn coral" data-a="revisar">Marcar como revisado</button>`}
    </div></section>
    <section class="tarjeta"><h2>Cuestionario <em class="cur">antes de empezar</em></h2>
    <p style="color:var(--suave)">Solo salen las preguntas de: ${esc(serviciosElegidos(c).map(nomServ).join(', '))}. Si una respuesta no es la primera, se pide el detalle.</p>`;
  for (const q of vis) {
    if (q.titulo) { h += `<h3 class="seccion">${esc(q.titulo)}</h3>`; continue; }
    const r = c.salud[q.id] || {}, ops = q.tipo === 'sino' ? null : q.op;
    const marcado = r.r && (q.tipo === 'sino' ? r.r === 'si' : r.r !== q.op[0]);
    h += `<div class="pregunta"><div class="txt">${esc(q.p)}</div>
      ${ops ? `<div class="opciones">${ops.map((o, i) => `<button type="button" data-q="${q.id}" data-r="${esc(o)}" class="${r.r === o ? 'on' + (i ? ' si' : '') : ''}">${esc(o)}</button>`).join('')}</div>`
        : `<div class="sino"><button data-q="${q.id}" data-r="no" class="${r.r === 'no' ? 'on' : ''}">No</button><button data-q="${q.id}" data-r="si" class="si ${r.r === 'si' ? 'on' : ''}">Sí</button></div>`}
      ${marcado && (q.det || q.tipo === 'sino') ? `<input type="text" class="detalle" data-det="${q.id}" placeholder="Detalle (qué, dónde, desde cuándo)" value="${esc(r.d)}">` : ''}
      ${q.id === 'fotosens' || q.id === 'medicacion' ? `<details class="ayuda"><summary>Ver lista de fotosensibilizantes</summary><p>${esc(D.fotosensibilizantes)}</p></details>` : ''}
    </div>`;
  }
  if (laser) {
    h += `<h3 class="seccion">Fototipo (test de Fitzpatrick)${f ? ` · <span class="etiqueta">Fototipo ${f.tipo} (${f.pts} puntos)</span>` : ''}</h3>`;
    D.fototipo.forEach(([p, ops], i) => {
      h += `<div class="pregunta"><div class="txt">${esc(p)}</div><div class="opciones">${ops.map((o, k) =>
        `<button type="button" data-ft="${i}" data-pt="${k}" class="${c.fototipo.r[i] === k ? 'on' : ''}">${esc(o)}</button>`).join('')}</div></div>`;
    });
  }
  const t = triaje(c);
  h += `<div class="fila fin no-imprimir" style="margin-top:18px">
      <span style="color:var(--suave)">${t.pendientes ? `Faltan ${t.pendientes}` : 'Todo respondido'}</span><span class="espacio"></span>
      ${t.pendientes ? '<button class="btn sec" data-a="resto-no">El resto, la primera opción («No»)</button>' : ''}
      <button class="btn" data-a="guardar-firma">Guardar y pasar a firmar</button></div></section>`;
  return h;
}
function vistaFirma(c, st) {
  const K = D.consentimientos, t = triaje(c), grupos = gruposConsent(c);
  const oblig = ['datos', 'veracidad', ...grupos];
  const listo = oblig.every(k => c.consent[k]) && !t.pendientes;
  return `<section class="tarjeta">
    <div class="solo-impresion"><img src="icons/logo.png" style="width:140px"><h2>Ficha de ${esc(c.nombre)} ${esc(c.apellidos)}</h2>
      <p>Tel. ${esc(c.telefono)} · ${esc(c.email)} · Nacimiento: ${esc(c.nacimiento)} · Servicios: ${esc(serviciosElegidos(c).map(nomServ).join(', '))}</p>
      <h3>Cuestionario</h3><ul>${preguntasVisibles(c).filter(q => !q.titulo).map(q => `<li>${esc(q.p)} <b>${esc(c.salud[q.id]?.r === 'si' ? 'Sí' : c.salud[q.id]?.r === 'no' ? 'No' : c.salud[q.id]?.r || '—')}</b> ${esc(c.salud[q.id]?.d || '')}</li>`).join('')}</ul>
      ${fototipo(c) ? `<p>Fototipo: ${fototipo(c).tipo}</p>` : ''}
      <h3>Resultado</h3>${panelTriaje(c)}</div>
    <h2>Consentimiento</h2>
    ${t.pendientes ? `<div class="nota">Faltan ${t.pendientes} respuestas del cuestionario.</div>` : ''}
    ${oblig.map(k => `<div class="consent"><b>${esc(K[k].titulo)}</b><p>${esc(K[k].texto)}</p>
      <label class="check"><input type="checkbox" data-cons="${k}" ${c.consent[k] ? 'checked' : ''}> Acepto</label></div>`).join('')}
    ${['comunicaciones', 'fotos'].map(k => `<div class="consent"><b>${esc(K[k].titulo)}</b><p>${esc(K[k].texto)}</p>
      <label class="check"><input type="checkbox" data-cons="${k}" ${c.consent[k] ? 'checked' : ''}> Acepto</label></div>`).join('')}
    <div class="consent"><b>${esc(K.redes.titulo)}</b><p>${esc(K.redes.texto)}</p>${chips('data-redes', K.redes.opciones, c.consent.redes)}</div>
    ${edad(c.nacimiento) != null && edad(c.nacimiento) < 18 ? '<div class="nota">Es menor de edad: firma la madre, el padre o el tutor legal.</div>' : ''}
    <h3 style="margin-top:20px">Firma</h3>
    ${st.firmada ? `<p>Firmada el ${fecha(c.firma.fecha)}${c.firma.porClienta ? ' por la clienta en la tablet' : ''}.</p><img src="${c.firma.img}" alt="Firma" style="max-width:360px;border:1px solid var(--linea);border-radius:10px;background:#fff">
      <div class="fila no-imprimir" style="margin-top:14px"><button class="btn sec" data-a="refirmar">Volver a firmar</button><span class="espacio"></span><button class="btn sec" data-a="imprimir">Imprimir</button><button class="btn coral" data-a="pdf-consent">Guardar PDF y pasar a fotos</button></div>
      <p style="color:var(--suave);font-size:.85rem">Se abre el menú de compartir: elige <b>Drive</b> y la carpeta del centro (o «Guardar» para dejarlo en la tablet).</p>`
    : `<canvas class="firma" id="firma"></canvas>
      <div class="fila no-imprimir" style="margin-top:12px"><button class="btn sec" data-a="limpiar-firma">Borrar firma</button><span class="espacio"></span>
      <button class="btn coral" data-a="firmar" ${listo ? '' : 'disabled'}>Firmar y guardar</button></div>
      ${listo ? '' : '<p style="color:var(--suave);font-size:.9rem">Para firmar: cuestionario completo y todos los consentimientos obligatorios aceptados.</p>'}`}
  </section>`;
}

// Firma con el lápiz o el dedo
let firmaVacia = true;
function montarFirma() {
  const cv = document.getElementById('firma'); if (!cv) return;
  const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  cv.width = r.width * dpr; cv.height = r.height * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#1E2B45';
  firmaVacia = true; let ant = null;
  const pos = e => { const b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top, p: e.pressure || .5 }; };
  cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); ant = pos(e); };
  cv.onpointermove = e => {
    if (!ant) return; const p = pos(e);
    g.lineWidth = 1.2 + p.p * 3; g.beginPath(); g.moveTo(ant.x, ant.y); g.lineTo(p.x, p.y); g.stroke();
    ant = p; firmaVacia = false;
  };
  cv.onpointerup = cv.onpointercancel = () => { ant = null; };
}

async function manejarFicha(e) {
  const c = S.clienta, t = e.target.closest('button'); if (!t) return;
  if (t.dataset.tab) {
    if (c.nueva && t.dataset.tab !== 'datos' && !(await guardarClienta(true))) return;
    S.pestana = t.dataset.tab; S.sesion = null; S.presu = null; return pantallaFicha();
  }
  if (t.dataset.serv) { const s = t.dataset.serv, i = c.servicios.indexOf(s); i >= 0 ? c.servicios.splice(i, 1) : c.servicios.push(s); return pantallaFicha(); }
  if (t.dataset.q) { c.salud[t.dataset.q] = { ...(c.salud[t.dataset.q] || {}), r: t.dataset.r }; return pantallaFicha(); }
  if (t.dataset.ft) { c.fototipo.r[+t.dataset.ft] = +t.dataset.pt; return pantallaFicha(); }
  if (t.dataset.redes) { c.consent.redes = t.dataset.redes; return pantallaFicha(); }
  if (t.dataset.ftobs) { S.ftobs = t.dataset.ftobs; S.profesional = document.getElementById('revpor')?.value || S.profesional; const y = scrollY; await pantallaFicha(); return scrollTo(0, y); }
  if (t.dataset.foto) return alternarSeleccion(t.dataset.foto);
  if (t.dataset.farea) { S.fotoArea = S.fotoArea === t.dataset.farea ? null : t.dataset.farea; S.fotoMomento = null; const y = scrollY; await pantallaFicha(); return scrollTo(0, y); }
  if (t.dataset.fmom) { S.fotoMomento = t.dataset.fmom; const y = scrollY; await pantallaFicha(); return scrollTo(0, y); }
  if (t.dataset.completar) return continuarSerie(t.dataset.completar);
  if (t.dataset.rehacer) return continuarSerie(t.dataset.rehacer, +t.dataset.vista);
  if (t.dataset.vcomp) return compararVista(t.dataset.vcomp, +t.dataset.vista);
  if (t.dataset.borrarserie) {
    const fs = (await DB.fotosDe(c.id)).filter(f => f.serie === t.dataset.borrarserie);
    if (!confirm(`¿Borrar esta serie (${fs.length} fotos)? No se puede deshacer.`)) return;
    for (const f of fs) await DB.borrar('fotos', f.id);
    S.comparando = null; avisar('Serie borrada'); const y = scrollY; await pantallaFicha(); return scrollTo(0, y);
  }
  if (t.dataset.zonafoto) return abrirCamara(t.dataset.zonafoto, t.dataset.servfoto);
  if (t.dataset.sv && S.sesion) { S.sesion.datos[t.dataset.sv] = t.dataset.val; return pantallaFicha(); }
  if (t.dataset.nuevasesion) return nuevaSesion(t.dataset.nuevasesion);
  if (t.dataset.versesion) { S.sesion = await DB.una('sesiones', t.dataset.versesion); return pantallaFicha(); }
  if (t.dataset.verpresu) { S.presu = await DB.una('presupuestos', t.dataset.verpresu); S.bonoActivo = await bonoFacialActivo(c, S.presu); return pantallaFicha(); }
  if (t.dataset.addtar && S.presu) { const tt = tarifa(t.dataset.addtar); if (tt) return anadirLinea(c, S.presu, tt); }
  if (t.dataset.quitar && S.presu) { S.presu.lineas.splice(+t.dataset.quitar, 1); S.presu.cambiado = true; return pantallaFicha(); }
  if (t.dataset.dtorap !== undefined && S.presu) { S.presu.dto = { tipo: '%', valor: +t.dataset.pct, motivo: t.dataset.dtorap }; S.presu.cambiado = true; const y = scrollY; await pantallaFicha(); return scrollTo(0, y); }
  const a = t.dataset.a;
  if (a === 'inicio') { if (!c.nueva) await guardarClienta(true); return pantallaInicio(); }
  if (a === 'bloquear' || a === 'mejora') return acciones(a);
  if (['nuevo-presu', 'cerrar-presu', 'add-linea', 'add-libre', 'estado-presu', 'imprimir-presu', 'whatsapp-presu', 'guardar-presu', 'enviar-presu'].includes(a)) return accionPresupuesto(a, t);
  if (a === 'baja-promos') {
    if (!confirm('¿Dar de baja a esta clienta de las promociones?')) return;
    c.promos = { acepta: false, temas: [], canales: [], baja: new Date().toISOString() }; await guardarClienta(true); avisar('Baja de promociones hecha'); return pantallaFicha();
  }
  if (a === 'revisar') {
    const por = (document.getElementById('revpor')?.value || '').trim();
    if (!por) return avisar('Escribe tu nombre');
    const t0 = triaje(c);
    if (t0.pendientes && !(serviciosElegidos(c).includes('laser') && t0.pendientes === 1 && S.ftobs)) return avisar('Faltan respuestas del cuestionario');
    if (serviciosElegidos(c).includes('laser') && !S.ftobs && !fototipo(c)) return avisar('Indica el fototipo observado');
    S.profesional = por;
    c.revision = { por, fecha: new Date().toISOString(), fototipoObs: S.ftobs || null, huella: huellaRevision(c) };
    S.ftobs = null; await guardarClienta(true); avisar('Cuestionario revisado'); return pantallaFicha();
  }
  if (a === 'quitar-revision') { S.ftobs = c.revision?.fototipoObs || null; c.revision = null; await guardarClienta(true); return pantallaFicha(); }
  if (a === 'pasar-clienta') { if (!(await guardarClienta(true))) return; return pantallaPreClienta(); }
  if (a === 'guardar-sig') { if (await guardarClienta()) { if (c.servicios.length === 0) c.servicios.push('valoracion'); S.pestana = 'salud'; pantallaFicha(); } }
  if (a === 'resto-no') {
    if (!confirm('¿Has leído con la clienta TODAS las preguntas que faltan? Se marcarán con la primera opción («No»).')) return;
    for (const q of preguntasVisibles(c)) if (!q.titulo && !c.salud[q.id]?.r) c.salud[q.id] = { r: q.tipo === 'sino' ? 'no' : q.op[0] };
    return pantallaFicha();
  }
  if (a === 'guardar-firma') { if (await guardarClienta(true)) { S.pestana = 'firma'; pantallaFicha(); } }
  if (a === 'limpiar-firma') montarFirma();
  if (a === 'firmar') {
    if (firmaVacia) return avisar('Falta la firma');
    c.firma = { img: document.getElementById('firma').toDataURL('image/png'), fecha: new Date().toISOString(), huella: huellaFicha(c) };
    if (c.valoracion && !c.valoracion.fin) c.valoracion.fin = c.firma.fecha;
    await guardarClienta(true); avisar('Consentimiento firmado'); pantallaFicha();
  }
  if (a === 'refirmar') { c.firma = null; await guardarClienta(true); pantallaFicha(); }
  if (a === 'imprimir') window.print();
  if (a === 'pdf-consent') {
    t.disabled = true; t.textContent = 'Creando PDF…';
    try {
      const blob = await pdfConsentimiento(c);
      const nombre = `consentimiento-${normal(c.nombre + ' ' + c.apellidos).replace(/\W+/g, '-')}-${hoy()}.pdf`;
      const ok = await compartirODescargar([new File([blob], nombre, { type: 'application/pdf' })], `Consentimiento de ${c.nombre} ${c.apellidos}`);
      if (ok === false) { t.disabled = false; t.textContent = 'Guardar PDF y pasar a fotos'; return; }
      c.consentPdf = new Date().toISOString(); await guardarClienta(true);
      S.pestana = 'fotos'; return pantallaFicha();
    } catch (err) { avisar('No se pudo crear el PDF'); t.disabled = false; t.textContent = 'Guardar PDF y pasar a fotos'; return; }
  }
  if (a === 'borrar') {
    const n = prompt(`Para borrar la ficha, sus sesiones y TODAS sus fotos, escribe el nombre: ${c.nombre}`);
    if (n === null) return;
    if (normal(n.trim()) !== normal(c.nombre.trim())) return avisar('El nombre no coincide: no se ha borrado');
    for (const f of await DB.fotosDe(c.id)) await DB.borrar('fotos', f.id);
    for (const s of await DB.sesionesDe(c.id)) await DB.borrar('sesiones', s.id);
    for (const p of await DB.presupuestosDe(c.id)) await DB.borrar('presupuestos', p.id);
    await DB.borrar('clientas', c.id); avisar('Ficha borrada'); pantallaInicio();
  }
  if (a === 'nueva-foto') return abrirCamara(document.getElementById('zona').value, document.getElementById('servicio').value);
  if (a === 'comparar') return comparar();
  if (a === 'empezar-serie') return empezarSerie();
  if (a === 'exportar-montaje') return exportarMontaje(t.dataset.marea, false);
  if (a === 'exportar-vistas') return exportarMontaje(t.dataset.marea, true);
  if (a === 'exportar') return exportarComparacion();
  if (a === 'borrar-fotos') {
    if (!confirm(`¿Borrar ${S.seleccion.length} foto(s)? No se puede deshacer.`)) return;
    for (const id of S.seleccion) await DB.borrar('fotos', id);
    S.seleccion = []; avisar('Fotos borradas'); pantallaFicha();
  }
  if (a === 'cerrar-comparar') { S.comparando = null; pantallaFicha(); }
  if (a === 'guardar-sesion') return guardarSesion();
  if (a === 'cerrar-sesion') { S.sesion = null; return pantallaFicha(); }
  if (a === 'ir-cuestionario') { S.sesion = null; S.pestana = 'salud'; return pantallaFicha(); }
  if (a === 'cuidados') return enviarCuidados(t.dataset.grupo);
}

// ---------- sesiones ----------
async function vistaSesiones(c) {
  if (S.sesion) return vistaSesion(c, S.sesion);
  const ses = (await DB.sesionesDe(c.id)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const t = triaje(c), st = estadoFicha(c);
  return `<section class="tarjeta"><h2>Nueva sesión</h2>
    ${st.firmada ? '' : '<div class="nota">La ficha no está firmada (o ha cambiado desde la firma). Firma antes de empezar.</div>'}
    <div class="globos">${serviciosElegidos(c).map(s => globo(s, `data-nuevasesion="${s}"`, false, 'sem-' + (t.res[s]?.nivel || 'verde'))).join('')}</div>
    <p style="color:var(--suave);font-size:.9rem">Para otro servicio, márcalo antes en «Datos» (así el cuestionario pregunta lo que hace falta).</p></section>
    <section class="tarjeta"><h2>Historial</h2>
    ${ses.length ? `<ul class="lista">${ses.map(s => `<li><button data-versesion="${s.id}"><span class="ini">${s.n}</span><span style="flex:1">
      <span class="nom">${esc(nomServ(s.servicio))}${s.bono ? ` · ${s.bono.num}/${s.bono.total}` : ''}${s.datos.zona ? ' · ' + esc(s.datos.zona) : ''}${s.datos.parcheo === 'si' ? ' <span class="etiqueta">Parcheo</span>' : ''}</span><br>
      <span class="det">${fecha(s.fecha)}${s.proxima ? ' · próxima entre ' + fecha(s.proxima[0]) + ' y ' + fecha(s.proxima[1]) : ''}</span></span><span>›</span></button></li>`).join('')}</ul>`
    : '<p class="vacio">Aún no hay sesiones.</p>'}</section>`;
}
async function nuevaSesion(servicio) {
  const c = S.clienta, grupo = D.servicios[servicio].grupo;
  const previas = (await DB.sesionesDe(c.id)).filter(s => s.servicio === servicio).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const ultima = previas.at(-1);
  // Se copian los parámetros de la última sesión del mismo servicio (se revisan antes de guardar).
  const datos = {};
  if (ultima) for (const f of D.sesion[grupo] || []) if (!['dolor', 'sensacion', 'eritema', 'alarma', 'reaccion', 'parcheo', 'rasurado', 'metal_retirado', 'prueba', 'bronceado'].includes(f.id) && ultima.datos[f.id] != null) datos[f.id] = ultima.datos[f.id];
  // Si tiene un bono aceptado de este servicio, la sesión se numera dentro del bono (1 de 4, 2 de 4…).
  const bonos = (await DB.presupuestosDe(c.id)).filter(p => p.estado === 'aceptado').flatMap(p => p.lineas.map(l => ({ ...l, desde: p.actualizado || p.fecha })))
    .filter(l => l.servicio === servicio && (l.sesiones || 1) > 1).sort((a, b) => b.desde.localeCompare(a.desde));
  let bono = null;
  if (bonos.length) { const bb = bonos[0], hechas = previas.filter(x => x.fecha >= bb.desde && x.datos.parcheo !== 'si').length;
    bono = { nombre: bb.concepto, total: (bb.sesiones || 1) * (+bb.cant || 1), num: hechas + 1 }; }
  S.sesion = { id: DB.id(), clientaId: c.id, servicio, grupo, fecha: new Date().toISOString(), n: previas.length + 1, bono, datos, copiada: !!ultima, nueva: true };
  pantallaFicha();
}
function campoSesion(f, d) {
  const v = d[f.id];
  if (f.tipo === 'sino') return `<div class="pregunta"><div class="txt">${esc(f.t)}</div><div class="sino">
    <button data-sv="${f.id}" data-val="no" class="${v === 'no' ? 'on' : ''}">No</button><button data-sv="${f.id}" data-val="si" class="${v === 'si' ? 'on' : ''}">Sí</button></div>
    ${f.det && v === 'si' ? `<input type="text" class="detalle" data-sdet="${f.id}" value="${esc(d[f.id + '_d'])}" placeholder="¿Qué ha cambiado?">` : ''}</div>`;
  if (f.tipo === 'op') return `<div class="pregunta"><div class="txt">${esc(f.t)}</div><div class="opciones">${f.op.map(o => `<button type="button" data-sv="${f.id}" data-val="${esc(o)}" class="${v === o ? 'on' : ''}">${esc(o)}</button>`).join('')}</div></div>`;
  if (f.tipo === 'escala') return `<div class="pregunta"><div class="txt">${esc(f.t)}</div><div class="opciones escala">${[...Array(11).keys()].map(n => `<button type="button" data-sv="${f.id}" data-val="${n}" class="${v == n ? 'on' : ''}">${n}</button>`).join('')}</div></div>`;
  if (f.tipo === 'sel') return `<label class="campo"><span>${esc(f.t)}</span><select data-sf="${f.id}"><option></option>${Object.keys(D[f.op]).map(o => `<option ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  if (f.tipo === 'area') return `<label class="campo"><span>${esc(f.t)}</span><textarea data-sf="${f.id}">${esc(v)}</textarea></label>`;
  return `<label class="campo"><span>${esc(f.t)}</span><input type="text" ${f.tipo === 'num' ? 'inputmode="decimal"' : ''} data-sf="${f.id}" value="${esc(v)}"></label>`;
}
function proximaSesion(s) {
  if (s.grupo === 'laser') { const r = D.zonasLaser[s.datos.zona]; return r ? [masDias(s.fecha, r[0]), masDias(s.fecha, r[1])] : null; }
  const r = D.servicios[s.servicio].intervalo; return r ? [masDias(s.fecha, r[0]), masDias(s.fecha, r[1])] : null;
}
function vistaSesion(c, s) {
  const t = triaje(c).res[s.servicio] || { nivel: 'verde', msgs: [] }, st = estadoFicha(c);
  const consOk = !D.consentimientos[s.grupo] || c.consent[s.grupo];
  const bloqueo = !s.nueva ? '' : t.nivel === 'rojo' ? 'No se puede tratar: hay una contraindicación (ver arriba).'
    : !st.firmada ? 'Falta firmar la ficha (o ha cambiado desde la firma).'
    : !consOk ? 'Falta el consentimiento específico de este servicio.'
    : !revisada(c) ? 'Falta la revisión del cuestionario por la profesional (pestaña Cuestionario).'
    : t.nivel === 'ambar' && !s.autorizacion ? 'Marca que se ha cumplido el plazo o hay autorización médica.'
    : s.datos.cambios === 'si' ? 'Hay cambios desde la última vez: actualiza el cuestionario antes.'
    : !s.datos.cambios ? 'Responde si hay cambios desde la última vez.' : '';
  const campos = [...D.sesion.comun, ...(D.sesion[s.grupo] || D.sesion.otro), ...D.sesion.final];
  const prox = s.nueva ? proximaSesion(s) : s.proxima;
  return `<section class="tarjeta"><div class="fila"><h2 style="margin:0">${esc(nomServ(s.servicio))} · ${s.bono ? `sesión ${s.bono.num} de ${s.bono.total} del bono` : `sesión ${s.n}`}</h2><span class="espacio"></span>
      <button class="btn sec" data-a="cerrar-sesion">${s.nueva ? 'Cancelar' : 'Cerrar'}</button></div>
    <p style="color:var(--suave)">${fecha(s.fecha)}${s.bono ? ` · ${esc(s.bono.nombre)}${s.bono.num > s.bono.total ? ' · <b style="color:var(--profundo)">el bono ya está terminado: haz un presupuesto nuevo</b>' : ''}` : ''}${s.copiada && s.nueva ? ' · Parámetros copiados de la sesión anterior: revísalos.' : ''}</p>
    <div class="semaforo ${t.nivel}"><div class="cab"><span class="luz"></span><b>${ETQ[t.nivel]}</b></div>
      ${t.msgs.length ? `<ul>${t.msgs.map(x => `<li class="${x.n}">${esc(x.m)}</li>`).join('')}</ul>` : ''}</div>
    ${t.nivel === 'ambar' && s.nueva ? `<label class="check"><input type="checkbox" id="autorizacion" ${s.autorizacion ? 'checked' : ''}> Plazo cumplido o autorización médica aportada</label>
      <input type="text" id="autorizacion_nota" placeholder="Qué documento o qué fecha" value="${esc(s.autorizacionNota)}">` : ''}
    ${!s.nueva && s.autorizacion ? `<p>Autorización / plazo: ${esc(s.autorizacionNota || 'sí')}</p>` : ''}
    ${s.datos.cambios === 'si' && s.nueva ? '<div class="nota">Hay cambios: <button class="btn sec" data-a="ir-cuestionario">Revisar el cuestionario</button></div>' : ''}
    <fieldset ${s.nueva ? '' : 'disabled'} class="campos">${campos.map(f => campoSesion(f, s.datos)).join('')}</fieldset>
    ${prox ? `<p><b>Próxima sesión:</b> entre ${fecha(prox[0])} y ${fecha(prox[1])}.</p>` : ''}
    <div class="fila fin">
      ${D.cuidados[s.grupo] ? `<button class="btn sec" data-a="cuidados" data-grupo="${s.grupo}">Enviar cuidados por WhatsApp</button>` : ''}
      <span class="espacio"></span>
      ${s.nueva ? `<button class="btn coral" data-a="guardar-sesion" ${bloqueo ? 'disabled' : ''}>Guardar sesión</button>` : ''}</div>
    ${bloqueo ? `<p class="pend">${esc(bloqueo)}</p>` : ''}
  </section>`;
}
async function guardarSesion() {
  const s = S.sesion; if (!s) return;
  s.proxima = proximaSesion(s); delete s.nueva;
  await DB.guardar('sesiones', s); await guardarClienta(true);
  if (s.grupo === 'laser' && s.datos.parcheo === 'si') avisar('Prueba de parcheo guardada: revisar a las 24–48 h y empezar a partir de 7 días');
  else avisar('Sesión guardada');
  S.sesion = null; pantallaFicha();
}
function enviarCuidados(grupo) {
  const txt = D.cuidados[grupo] + (centro().whatsapp ? `\n\nDudas: wa.me/${centro().whatsapp}` : '');
  let tel = (S.clienta.telefono || '').replace(/\D/g, '');
  if (tel.length === 9) tel = '34' + tel;
  if (tel) window.open(`https://wa.me/${tel}?text=${encodeURIComponent(txt)}`, '_blank');
  else navigator.clipboard?.writeText(txt).then(() => avisar('Sin teléfono: texto copiado'));
}

// ---------- fotos ----------
// v0.7: cada zona se fotografía en una SERIE de 5 vistas (lateral izq., medio izq., frente/espalda, medio dcho., lateral dcho.).
// Cada foto guarda { serie, area, vista, momento: 'antes' | 'despues' }. El montaje antes/después lo hace la app sola.
const areasFoto = () => centro().areas || [];
const areaFoto = n => areasFoto().find(a => a.n === n) || { n, centro: 'frente' };
const vistasDe = area => D.vistasFoto[areaFoto(area).centro] || D.vistasFoto.frente;

// Pictograma de lo que se verá en la pantalla: cabeza y hombros girados según la vista (0 = de frente, ±90 = perfil, 180 = de espaldas).
function picto(ang, tam = 54) {
  const rad = ang * Math.PI / 180, sx = Math.sin(rad), d = Math.sign(sx), a = Math.abs(ang), cx = 30, cy = 23, rx = 11, k = n => n.toFixed(1);
  const hombros = 9 + 13 * Math.abs(Math.cos(rad)), blanco = 'fill="#fff"';
  const ojo = (x, w = 1.8) => `<ellipse cx="${k(x)}" cy="${cy - 2}" rx="${k(w)}" ry="1.8" ${blanco}/>`;
  const oreja = x => `<ellipse cx="${k(x)}" cy="${cy + 1}" rx="2.4" ry="3.6" fill="currentColor"/><ellipse cx="${k(x)}" cy="${cy + 1}" rx="1" ry="2" ${blanco} opacity=".6"/>`;
  const nariz = (x, sale) => `<polygon points="${k(x)},${cy - 3} ${k(x + d * sale)},${cy + 5} ${k(x)},${cy + 6}" fill="currentColor"/>`;
  let extra = '', delante = '';
  if (a === 0) { extra = oreja(cx - rx) + oreja(cx + rx); delante = ojo(cx - 4.5) + ojo(cx + 4.5) + `<path d="M${cx} ${cy} v4 h-1.5" fill="none" stroke="#fff" stroke-width="1.3"/>`; }
  else if (a === 45) { extra = oreja(cx - d * rx); delante = ojo(cx + d * 1.5) + ojo(cx + d * 8, 1.1) + `<path d="M${k(cx + d * 5.5)} ${cy} l${k(d * 2)} 4 h${k(-d * 2)}" fill="none" stroke="#fff" stroke-width="1.3"/>`; }
  else if (a === 90) { extra = nariz(cx + d * (rx - 1), 5); delante = ojo(cx + d * 6, 1.2) + `<ellipse cx="${k(cx - d * 2)}" cy="${cy + 1}" rx="2.2" ry="3.4" fill="none" stroke="#fff" stroke-width="1.2"/>`; }
  else if (a === 135) { extra = oreja(cx + d * rx); delante = `<path d="M${cx - 8} ${cy - 7} q8 -7 16 0" fill="none" stroke="#fff" stroke-width="1.2" opacity=".6"/>`; }
  else { extra = oreja(cx - rx) + oreja(cx + rx); delante = `<path d="M${cx - 8} ${cy - 7} q8 -7 16 0 M${cx} ${cy - 10} v12" fill="none" stroke="#fff" stroke-width="1.2" opacity=".6"/>`; }
  return `<svg class="picto" width="${tam}" height="${tam}" viewBox="0 0 60 60" aria-hidden="true">
    <path d="M${k(cx - hombros)} 59 q0 -15 ${k(hombros)} -17 q${k(hombros)} 2 ${k(hombros)} 17z" fill="currentColor" opacity=".5"/>
    <rect x="${cx - 3.5}" y="${cy + 11}" width="7" height="8" fill="currentColor" opacity=".8"/>
    ${extra}<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="14" fill="currentColor"/>${delante}</svg>`;
}

function seriesDe(fotos) {
  const m = {};
  for (const f of fotos) if (f.serie) {
    const s = (m[f.serie] ||= { id: f.serie, area: f.area, servicio: f.servicio, momento: f.momento, fecha: f.fechaSerie || f.fecha, fotos: [] });
    s.fotos[f.vista] = f;
  }
  return Object.values(m).sort((a, b) => a.fecha.localeCompare(b.fecha));
}
const completas = s => vistasDe(s.area).filter((_, i) => s.fotos[i]).length;

// Qué series compara el montaje de una zona: el «antes» más reciente anterior al último «después» (o lo elegido a mano).
function parMontaje(area, series) {
  const de = series.filter(s => s.area === area), elegido = S.montajes?.[area] || {};
  const despues = de.find(s => s.id === elegido.despues) || de.filter(s => s.momento === 'despues').at(-1);
  if (!despues) return null;
  const antes = de.find(s => s.id === elegido.antes) || de.filter(s => s.momento === 'antes' && s.fecha <= despues.fecha).at(-1)
    || de.filter(s => s.momento === 'antes').at(-1);
  return antes ? { antes, despues, de } : null;
}

async function vistaFotos(c) {
  if (!c.consent.fotos) return `<section class="tarjeta"><h2>Fotos</h2><p>Para hacer fotos, la clienta tiene que aceptar «Fotos de seguimiento» en Consentimiento y firmar.</p>
    <button class="btn" data-tab="firma">Ir a consentimiento</button></section>`;
  const fotos = (await DB.fotosDe(c.id)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const series = seriesDe(fotos), sueltas = fotos.filter(f => !f.serie);
  const C = centro(), area = S.fotoArea, servs = serviciosElegidos(c);
  let html = '';

  // 1 · Nueva serie
  const deArea = series.filter(s => s.area === area), hayAntes = deArea.some(s => s.momento === 'antes');
  const momento = S.fotoMomento || (hayAntes ? 'despues' : 'antes');
  const refAntes = deArea.filter(s => s.momento === 'antes').at(-1);
  html += `<section class="tarjeta no-imprimir"><h2>Nueva serie de fotos</h2>
    <p class="paso-foto"><b>1.</b> ¿Qué zona?</p>
    <div class="chips-areas">${areasFoto().map(a => `<button data-farea="${esc(a.n)}" class="${a.n === area ? 'on' : ''}">${esc(a.n)}</button>`).join('')}</div>
    ${area ? `<p class="paso-foto"><b>2.</b> ¿Es el antes o el después?</p>
      <div class="chips-momento"><button data-fmom="antes" class="antes ${momento === 'antes' ? 'on' : ''}">ANTES</button>
        <button data-fmom="despues" class="despues ${momento === 'despues' ? 'on' : ''}" ${hayAntes ? '' : 'disabled'}>DESPUÉS</button></div>
      <p class="nota-foto">${momento === 'despues' && refAntes ? `Se comparará con el antes del <b>${fecha(refAntes.fecha)}</b>. En la cámara verás esa foto en transparencia para repetir la postura.`
        : hayAntes ? 'Empieza un tratamiento nuevo: esta serie será el nuevo punto de partida.' : 'Primera serie de esta zona: será el punto de partida.'}</p>
      <p class="paso-foto"><b>3.</b> Las 5 fotos, en este orden:</p>
      <ol class="tira-vistas">${vistasDe(area).map((v, i) => `<li>${picto(v.ang)}<span><b>${i + 1}</b> ${esc(v.corto)}</span></li>`).join('')}</ol>
      <div class="fila"><label class="campo" style="min-width:260px"><span>Servicio</span><select id="fservicio">${servs.map(s => `<option>${esc(nomServ(s))}</option>`).join('')}</select></label>
        <span class="espacio"></span><button class="btn coral grande" data-a="empezar-serie">📷 Empezar · 5 fotos</button></div>`
    : '<p class="nota-foto">Toca la zona. La app te irá diciendo cada foto y hará el montaje sola.</p>'}
  </section>`;

  // 2 · Montaje automático y series por zona
  const areasConSeries = [...new Set(series.map(s => s.area))];
  if (S.comparando) html += vistaComparar();
  for (const a of areasConSeries) {
    const par = parMontaje(a, series), vs = vistasDe(a);
    html += `<section class="tarjeta" id="area-${normal(a).replace(/\W+/g, '-')}"><h2>${esc(a)}</h2>`;
    if (par) {
      const opt = (lista, sel) => lista.map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${s.momento === 'antes' ? 'Antes' : 'Después'} · ${fecha(s.fecha)}</option>`).join('');
      html += `<div class="montaje"><div class="fila" style="gap:10px"><h3 style="margin:0">Antes y <em class="cur">después</em> · montaje automático</h3><span class="espacio"></span>
          <label class="mini">Antes <select data-msel="antes" data-marea="${esc(a)}">${opt(par.de, par.antes.id)}</select></label>
          <label class="mini">Después <select data-msel="despues" data-marea="${esc(a)}">${opt(par.de, par.despues.id)}</select></label></div>
        <div class="rejilla-montaje">
          <span></span>${vs.map(v => `<span class="cab">${picto(v.ang, 34)}${esc(v.corto)}</span>`).join('')}
          <span class="fila-rot antes">ANTES<br><small>${fecha(par.antes.fecha)}</small></span>
          ${vs.map((v, i) => celda(par.antes.fotos[i], a, i)).join('')}
          <span class="fila-rot despues">DESPUÉS<br><small>${fecha(par.despues.fecha)}</small></span>
          ${vs.map((v, i) => celda(par.despues.fotos[i], a, i)).join('')}
        </div>
        <p class="nota-foto">Toca una columna para compararla con el deslizador.</p>
        <div class="fila fin"><span style="color:var(--suave);font-size:.9rem">Redes: ${esc(c.consent.redes)}</span><span class="espacio"></span>
          <button class="btn sec" data-a="exportar-vistas" data-marea="${esc(a)}">Guardar las 5 por separado</button>
          <button class="btn" data-a="exportar-montaje" data-marea="${esc(a)}">Guardar montaje</button></div></div>`;
    } else {
      html += `<p class="nota-foto">Cuando haya una serie de <b>después</b>, aquí aparecerá el montaje antes/después hecho automáticamente.</p>`;
    }
    html += `<h3 class="seccion">Series</h3>${series.filter(s => s.area === a).reverse().map(s => {
      const faltan = vs.length - completas(s);
      return `<div class="serie"><div class="serie-cab"><span class="etq-mom ${s.momento}">${s.momento === 'antes' ? 'ANTES' : 'DESPUÉS'}</span>
          <b>${fecha(s.fecha)}</b> · ${esc(s.servicio)}${faltan ? ` · <span class="falta-txt">faltan ${faltan}</span>` : ' · ✓ completa'}<span class="espacio"></span>
          ${faltan ? `<button class="btn coral" style="min-height:40px;padding:4px 16px" data-completar="${s.id}">📷 Completar</button>` : ''}
          <button class="btn sec peligro-txt" style="min-height:40px;padding:4px 14px" data-borrarserie="${s.id}">Borrar</button></div>
        <div class="serie-fotos">${vs.map((v, i) => s.fotos[i]
          ? `<button data-rehacer="${s.id}" data-vista="${i}" title="Repetir ${esc(v.n)}"><img src="${url(s.fotos[i].blob)}" alt="${esc(a)} ${esc(v.n)} ${fecha(s.fecha)}" loading="lazy"><span class="pie">${i + 1} · ${esc(v.corto)}</span></button>`
          : `<button class="hueco" data-rehacer="${s.id}" data-vista="${i}">${picto(v.ang, 40)}<span>${i + 1} · ${esc(v.corto)}<br>Falta</span></button>`).join('')}</div></div>`;
    }).join('')}</section>`;
  }

  // 3 · Fotos de detalle (1 sola foto) y fotos de versiones anteriores
  const zonasSueltas = [...new Set(sueltas.map(f => f.zona))];
  html += `<section class="tarjeta"><h2>Fotos de detalle</h2>
    <p class="nota-foto">Una sola foto, para zonas pequeñas (axilas, ingles, una mancha…). Toca 2 fotos para compararlas.</p>
    <div class="rejilla no-imprimir">
      <label class="campo"><span>Zona (siempre el mismo encuadre)</span><select id="zona">${C.zonas.map(z => `<option>${esc(z)}</option>`).join('')}</select></label>
      <label class="campo"><span>Servicio</span><select id="servicio">${servs.map(s => `<option>${esc(nomServ(s))}</option>`).join('')}</select></label>
    </div>
    <div class="fila no-imprimir" style="margin-bottom:12px"><button class="btn" data-a="nueva-foto">📷 Foto de detalle</button><span class="espacio"></span>
      ${S.seleccion.length === 2 ? '<button class="btn" data-a="comparar">Comparar las 2</button>' : ''}
      ${S.seleccion.length ? '<button class="btn peligro" data-a="borrar-fotos">Borrar</button>' : ''}</div>
    ${sueltas.length ? zonasSueltas.map(z => `<div class="grupo-zona"><h3>${esc(z)} <button class="btn sec" style="min-height:40px;padding:4px 14px;font-size:.85rem" data-zonafoto="${esc(z)}" data-servfoto="${esc(sueltas.filter(f => f.zona === z).at(-1).servicio)}">+ otra</button></h3>
      <div class="galeria">${sueltas.filter(f => f.zona === z).map(f => {
        const i = S.seleccion.indexOf(f.id);
        return `<button data-foto="${f.id}" class="${i >= 0 ? 'sel' : ''}">${i >= 0 ? `<span class="num">${i + 1}</span>` : ''}
          <img src="${url(f.blob)}" alt="${esc(z)} ${fecha(f.fecha)}" loading="lazy"><span class="pie">${fecha(f.fecha)} · ${esc(f.servicio)}</span></button>`; }).join('')}</div></div>`).join('')
    : '<p class="vacio">Aún no hay fotos de detalle.</p>'}</section>`;
  return html;
}
const celda = (f, area, i) => f ? `<button class="celda" data-vcomp="${esc(area)}" data-vista="${i}"><img src="${url(f.blob)}" alt="" loading="lazy"></button>`
  : `<span class="celda vacia">sin foto</span>`;

function alternarSeleccion(id) {
  const i = S.seleccion.indexOf(id);
  if (i >= 0) S.seleccion.splice(i, 1); else { S.seleccion.push(id); if (S.seleccion.length > 2) S.seleccion.shift(); }
  pantallaFicha();
}
async function comparar() {
  const [a, b] = await Promise.all(S.seleccion.map(id => DB.una('fotos', id)));
  S.comparando = [a, b].sort((x, y) => x.fecha.localeCompare(y.fecha));
  pantallaFicha();
}
async function compararVista(area, i) {
  const par = parMontaje(area, seriesDe(await DB.fotosDe(S.clienta.id)));
  if (!par?.antes.fotos[i] || !par?.despues.fotos[i]) return avisar('Falta una de las dos fotos');
  S.comparando = [par.antes.fotos[i], par.despues.fotos[i]];
  await pantallaFicha(); document.getElementById('comp')?.scrollIntoView({ block: 'center' });
}
const etiquetaFoto = f => f.serie ? `${f.area} · ${vistasDe(f.area)[f.vista]?.n || ''}` : f.zona;
function vistaComparar() {
  const [a, b] = S.comparando;
  return `<section class="tarjeta no-imprimir"><div class="fila"><h2 style="margin:0">Antes y <em class="cur">después</em></h2><span class="espacio"></span>
    <button class="btn sec" data-a="cerrar-comparar">Cerrar</button></div>
    <p style="color:var(--suave)">Desliza sobre la imagen. ${esc(etiquetaFoto(a))} · ${fecha(a.fecha)} → ${fecha(b.fecha)}</p>
    <div class="comparador" id="comp"><img src="${url(a.blob)}" alt="Antes"><img class="despues" src="${url(b.blob)}" alt="Después">
      <div class="raya"></div><span class="rot" style="left:10px">Antes</span><span class="rot" style="right:10px">Después</span></div>
    <div class="fila fin" style="margin-top:14px"><span style="color:var(--suave);font-size:.9rem">Redes: ${esc(S.clienta.consent.redes)}</span><span class="espacio"></span>
      <button class="btn" data-a="exportar">Guardar imagen comparativa</button></div></section>`;
}
function montarComparador() {
  const el = document.getElementById('comp'); if (!el) return;
  const mover = e => {
    const r = el.getBoundingClientRect(), p = Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100));
    el.querySelector('.despues').style.clipPath = `inset(0 0 0 ${p}%)`; el.querySelector('.raya').style.left = p + '%';
  };
  el.onpointerdown = e => { el.setPointerCapture(e.pointerId); mover(e); el.onpointermove = mover; };
  el.onpointerup = el.onpointercancel = () => { el.onpointermove = null; };
}

// Lienzo común de las imágenes para redes (1080×1440, colores y logo del manual).
async function lienzo(titulo, subtitulo) {
  const W = 1080, H = 1440, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'); g.fillStyle = '#FFFBFA'; g.fillRect(0, 0, W, H);
  await document.fonts.ready;
  g.fillStyle = '#1E2B45'; g.textAlign = 'center'; g.font = '64px "DM Serif"'; g.fillText(titulo, W / 2, 140);
  g.font = '600 28px "DM Sans"'; g.fillStyle = '#B23A48'; g.fillText(subtitulo.toUpperCase(), W / 2, 200);
  return { cv, g, W, H };
}
const dibujaFoto = (g, im, x, y, w, h) => { const s = Math.max(w / im.width, h / im.height), sw = w / s, sh = h / s; g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h); };
async function cierreLienzo({ cv, g, W, H }, yTexto) {
  g.textAlign = 'center'; g.font = '22px "DM Sans"'; g.fillStyle = '#5A6680';
  g.fillText('Fotos reales, sin filtros ni retoque · Mismo encuadre y misma luz', W / 2, yTexto);
  try { const logo = await createImageBitmap(await (await fetch('icons/logo.png')).blob());
    const lw = 170, lh = logo.height * lw / logo.width; g.drawImage(logo, (W - lw) / 2, H - lh - 36, lw, lh); } catch (e) {}
  const interno = S.clienta.consent.redes === 'No';
  if (interno) { g.save(); g.translate(W / 2, H / 2); g.rotate(-Math.PI / 6); g.font = '700 90px "DM Sans"'; g.fillStyle = 'rgba(178,58,72,.35)'; g.fillText('USO INTERNO', 0, 0); g.restore(); }
  return { blob: await new Promise(r => cv.toBlob(r, 'image/jpeg', .92)), interno };
}
async function imagenComparacion(a, b) {
  const L = await lienzo('Antes y después', `${a.servicio} · ${etiquetaFoto(a)}`), { g } = L;
  const [ia, ib] = await Promise.all([a, b].map(f => createImageBitmap(f.blob)));
  const pw = 520, ph = 693, y = 280;
  dibujaFoto(g, ia, 13, y, pw, ph); dibujaFoto(g, ib, 547, y, pw, ph);
  g.fillStyle = '#1E2B45'; g.font = '30px "DM Sans"'; g.textAlign = 'center';
  g.fillText('Antes · ' + fecha(a.fecha), 13 + pw / 2, y + ph + 50); g.fillText('Después · ' + fecha(b.fecha), 547 + pw / 2, y + ph + 50);
  return cierreLienzo(L, y + ph + 110);
}
async function imagenMontaje(area, par) {
  const vs = vistasDe(area), L = await lienzo('Antes y después', `${par.despues.servicio} · ${area}`), { g, W } = L;
  const w = 204, h = 272, gap = 6, x0 = (W - (5 * w + 4 * gap)) / 2;
  const filas = [[par.antes, 'ANTES', 350], [par.despues, 'DESPUÉS', 730]];
  for (const [s, rot, y] of filas) {
    g.textAlign = 'left'; g.font = '700 24px "DM Sans"'; g.fillStyle = rot === 'ANTES' ? '#5A6680' : '#B23A48';
    g.fillText(`${rot} · ${fecha(s.fecha)}`, x0, y - 14);
    for (let i = 0; i < 5; i++) {
      const x = x0 + i * (w + gap);
      if (s.fotos[i]) dibujaFoto(g, await createImageBitmap(s.fotos[i].blob), x, y, w, h);
      else { g.fillStyle = '#EDE6E3'; g.fillRect(x, y, w, h); }
    }
  }
  g.textAlign = 'center'; g.font = '22px "DM Sans"'; g.fillStyle = '#1E2B45';
  vs.forEach((v, i) => g.fillText(v.corto, x0 + i * (w + gap) + w / 2, 730 + h + 40));
  return cierreLienzo(L, 730 + h + 100);
}
async function exportarComparacion() {
  const [a, b] = S.comparando, { blob, interno } = await imagenComparacion(a, b);
  const nombre = `antes-despues-${normal(etiquetaFoto(a)).replace(/\W+/g, '-')}-${hoy()}${interno ? '-USO-INTERNO' : ''}.jpg`;
  await compartirODescargar([new File([blob], nombre, { type: blob.type })], interno ? 'Comparativa (uso interno: sin permiso para redes)' : 'Comparativa antes y después');
  avisoCara();
}
async function exportarMontaje(area, separadas) {
  const par = parMontaje(area, seriesDe(await DB.fotosDe(S.clienta.id))); if (!par) return;
  const base = `antes-despues-${normal(area).replace(/\W+/g, '-')}-${hoy()}`, files = [];
  let interno = false;
  if (separadas) {
    const vs = vistasDe(area);
    for (let i = 0; i < vs.length; i++) if (par.antes.fotos[i] && par.despues.fotos[i]) {
      const r = await imagenComparacion(par.antes.fotos[i], par.despues.fotos[i]); interno = r.interno;
      files.push(new File([r.blob], `${base}-${i + 1}-${vs[i].id}${interno ? '-USO-INTERNO' : ''}.jpg`, { type: 'image/jpeg' }));
    }
  } else {
    const r = await imagenMontaje(area, par); interno = r.interno;
    files.push(new File([r.blob], `${base}-montaje${interno ? '-USO-INTERNO' : ''}.jpg`, { type: 'image/jpeg' }));
  }
  if (!files.length) return avisar('No hay ninguna vista con antes y después');
  await compartirODescargar(files, interno ? 'Antes y después (uso interno)' : 'Antes y después');
  avisoCara();
}
function avisoCara() { if (S.clienta.consent.redes === 'Sí, sin que se me vea la cara') avisar('Ojo: permiso sin cara. Comprueba que no se ve antes de publicar'); }
// Acepta (lista de File, título) o, como antes, (blob, nombre, título).
async function compartirODescargar(files, titulo, titulo2) {
  if (!Array.isArray(files)) { files = [new File([files], titulo, { type: files.type || 'application/octet-stream' })]; titulo = titulo2; }
  if (navigator.canShare && navigator.canShare({ files })) {
    try { await navigator.share({ files, title: titulo }); return true; } catch (e) { if (e.name === 'AbortError') return false; }
  }
  for (const f of files) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000); if (files.length > 1) await new Promise(r => setTimeout(r, 250));
  }
  avisar(files.length > 1 ? `${files.length} archivos guardados en Descargas` : 'Guardado en Descargas');
  return true;
}

// ---------- PDF del consentimiento (se crea en la tablet; luego se comparte a Drive o se guarda) ----------
async function cargarJsPDF() {
  if (!window.jspdf) await new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'vendor/jspdf.umd.min.js'; s.onload = ok; s.onerror = mal; document.head.appendChild(s); });
  return window.jspdf.jsPDF;
}
const aDataURL = blob => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
async function imagenPDF(src) {
  const d = src.startsWith('data:') ? src : await aDataURL(await (await fetch(src)).blob());
  const im = new Image(); im.src = d; await im.decode(); return { d, w: im.width, h: im.height };
}
async function pdfConsentimiento(c) {
  const jsPDF = await cargarJsPDF(), doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 18, W = 210 - 2 * M, ALTO = 297; let y = M;
  const salto = h => { if (y + h > ALTO - M) { doc.addPage(); y = M; } };
  const txt = (t, o = {}) => {
    const size = o.size || 10; doc.setFont('helvetica', o.bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...(o.color || [30, 43, 69]));
    const lh = size * 0.43;
    for (const l of doc.splitTextToSize(String(t), W - (o.sangria || 0))) { salto(lh); doc.text(l, M + (o.sangria || 0), y + lh * 0.8); y += lh; }
    y += o.gap ?? 1.5;
  };
  const raya = () => { salto(4); doc.setDrawColor(249, 126, 127); doc.setLineWidth(0.8); doc.line(M, y, M + W, y); y += 5; };
  try { const L = await imagenPDF('icons/logo.png'); doc.addImage(L.d, 'PNG', M, y, 42, 42 * L.h / L.w); y += 42 * L.h / L.w + 4; } catch (e) {}
  txt('Ficha y consentimiento informado', { size: 16, bold: true, gap: 2 }); raya();
  const C = centro(), e = edad(c.nacimiento), si = r => r === 'si' ? 'Sí' : r === 'no' ? 'No' : (r || '—');
  txt(`${c.nombre} ${c.apellidos}`, { size: 12, bold: true, gap: 1 });
  txt(`WhatsApp: ${c.telefono || '—'} · Correo: ${c.email || '—'} · Nacimiento: ${c.nacimiento || '—'}${e != null ? ` (${e} años)` : ''}`);
  txt(`Servicios: ${serviciosElegidos(c).map(nomServ).join(', ')}`, { gap: 4 });
  txt('Cuestionario de salud', { size: 12, bold: true, gap: 1 });
  for (const q of preguntasVisibles(c)) {
    if (q.titulo) { txt(q.titulo, { bold: true, size: 10, gap: 0.5, color: [178, 58, 72] }); continue; }
    const r = c.salud[q.id] || {};
    txt(`${q.p} — ${si(r.r)}${r.d ? ` (${r.d})` : ''}`, { sangria: 3, gap: 0.8 });
  }
  const ft = fototipo(c); if (ft || c.revision?.fototipoObs) txt(`Fototipo: ${ft ? `${ft.tipo} según el test (${ft.pts} puntos)` : ''}${c.revision?.fototipoObs ? ` · observado por la profesional: ${c.revision.fototipoObs}` : ''}`, { gap: 2 });
  if (c.revision?.por) txt(`Revisado por ${c.revision.por} el ${fecha(c.revision.fecha)}.`, { gap: 3 });
  y += 2; txt('Consentimientos', { size: 12, bold: true, gap: 1 });
  const K = D.consentimientos, limpio = s => s.replace(/\s*\[NOTA:[^\]]*\]/g, '');
  for (const k of ['datos', 'veracidad', ...gruposConsent(c), 'comunicaciones', 'fotos']) {
    txt(`${c.consent[k] ? '[X] Acepta' : '[ ] No acepta'} · ${K[k].titulo}`, { bold: true, gap: 0.5 });
    txt(limpio(K[k].texto), { size: 8.5, sangria: 3, gap: 2, color: [70, 80, 100] });
  }
  txt(`${K.redes.titulo}: ${c.consent.redes}`, { bold: true, gap: 4 });
  if (e != null && e < 18) txt('Menor de edad: firma la madre, el padre o el tutor legal.', { bold: true, gap: 2 });
  if (c.firma?.img) {
    const F = await imagenPDF(c.firma.img), fw = 70, fh = Math.min(35, fw * F.h / F.w);
    salto(fh + 14); txt('Firma', { bold: true, gap: 1 });
    doc.addImage(F.d, 'PNG', M, y, fw, fh); y += fh + 2;
    txt(`Firmado el ${new Date(c.firma.fecha).toLocaleString('es-ES')}${c.firma.porClienta ? ' por la clienta en la tablet' : ''}.`, { size: 9 });
  }
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90, 102, 128);
    doc.text(`${C.nombre} ${C.sub} · ${C.direccion} · Documento con datos de salud: confidencial · Página ${i} de ${n}`, M, ALTO - 8); }
  return doc.output('blob');
}

// ---------- cámara guiada ----------
let flujo = null;
function cerrarCamara() { if (flujo) { flujo.getTracks().forEach(t => t.stop()); flujo = null; } document.querySelector('.camara')?.remove(); }

// Serie de 5: plan = { serie, area, servicio, momento, fechaSerie, pendientes: [índices de vista], ref: serie de referencia }
async function empezarSerie() {
  const area = S.fotoArea; if (!area) return avisar('Elige la zona');
  const fotos = await DB.fotosDe(S.clienta.id), series = seriesDe(fotos).filter(s => s.area === area);
  const momento = S.fotoMomento || (series.some(s => s.momento === 'antes') ? 'despues' : 'antes');
  const ref = series.filter(s => s.momento === 'antes').at(-1) || series.at(-1);
  return camaraSerie({ serie: DB.id(), area, servicio: document.getElementById('fservicio')?.value || '', momento,
    fechaSerie: new Date().toISOString(), pendientes: vistasDe(area).map((_, i) => i), ref, hechas: {} });
}
async function continuarSerie(id, vista) {
  const s = seriesDe(await DB.fotosDe(S.clienta.id)).find(x => x.id === id); if (!s) return;
  const todas = seriesDe(await DB.fotosDe(S.clienta.id)).filter(x => x.area === s.area && x.id !== s.id);
  const ref = s.momento === 'despues' ? todas.filter(x => x.momento === 'antes').at(-1) : todas.at(-1);
  const pendientes = vista != null ? [vista] : vistasDe(s.area).map((_, i) => i).filter(i => !s.fotos[i]);
  return camaraSerie({ serie: s.id, area: s.area, servicio: s.servicio, momento: s.momento, fechaSerie: s.fecha, pendientes, ref,
    hechas: Object.fromEntries(s.fotos.map((f, i) => [i, f]).filter(([, f]) => f)) });
}

async function camaraSerie(plan) {
  const vs = vistasDe(plan.area);
  const capa = document.createElement('div'); capa.className = 'camara';
  capa.innerHTML = `<div class="pasos-cam"></div><div class="visor"><video playsinline autoplay muted></video><img class="fantasma" alt="" style="opacity:.4">
    <div class="guias"></div><div class="info"></div><div class="flash"></div></div>
    <div class="controles"><button class="btn sec" style="color:#fff;border-color:#fff" data-cam="cerrar">Terminar</button>
      <label class="lopac">Foto del antes <input type="range" min="0" max="80" value="40" id="opac"></label>
      <label><input type="checkbox" id="rejilla" checked style="width:24px;height:24px"> Rejilla</label>
      <span class="espacio"></span><button class="btn sec" style="color:#fff;border-color:#fff" data-cam="repetir">↺ Repetir la anterior</button>
      <button class="disparo" data-cam="foto" aria-label="Hacer foto"></button></div>`;
  document.body.appendChild(capa);
  const video = capa.querySelector('video'), fant = capa.querySelector('.fantasma');
  let i = plan.pendientes[0], ultima = null;
  const pinta = () => {
    const v = vs[i], g = plan.ref?.fotos[i];
    capa.querySelector('.pasos-cam').innerHTML = vs.map((x, k) => `<button data-ir="${k}" class="${k === i ? 'actual' : ''} ${plan.hechas[k] ? 'hecha' : ''}">
      ${plan.hechas[k] ? `<img src="${url(plan.hechas[k].blob)}" alt="">` : picto(x.ang, 44)}<span>${k + 1} · ${esc(x.corto)}${plan.hechas[k] ? ' ✓' : ''}</span></button>`).join('');
    capa.querySelector('.info').innerHTML = `<span class="etq-mom ${plan.momento}">${plan.momento === 'antes' ? 'ANTES' : 'DESPUÉS'}</span>
      <b>Foto ${i + 1} de 5 · ${esc(v.n)}</b>${picto(v.ang, 40)}<br>${esc(v.ins)}${g ? `<br><small>En transparencia: la foto del ${fecha(plan.ref.fecha)}. Haz coincidir la postura.</small>` : ''}`;
    if (g) { fant.src = url(g.blob); fant.style.display = ''; capa.querySelector('.lopac').style.display = ''; }
    else { fant.removeAttribute('src'); fant.style.display = 'none'; capa.querySelector('.lopac').style.display = 'none'; }
    capa.querySelector('[data-cam="repetir"]').style.visibility = ultima != null ? '' : 'hidden';
  };
  try {
    flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } }, audio: false });
    video.srcObject = flujo;
  } catch (err) { capa.remove(); avisar('Sin cámara en directo: se abre la del sistema, foto a foto'); return fotoDesdeArchivo(null, plan.servicio, { plan, vista: i }); }
  pinta();
  capa.querySelector('#opac').addEventListener('input', e => { fant.style.opacity = e.target.value / 100; });
  capa.querySelector('#rejilla').onchange = e => { capa.querySelector('.guias').style.display = e.target.checked ? '' : 'none'; };
  capa.onclick = async e => {
    const b = e.target.closest('[data-cam],[data-ir]'); if (!b) return;
    if (b.dataset.ir != null) { i = +b.dataset.ir; return pinta(); }
    if (b.dataset.cam === 'repetir') { i = ultima; return pinta(); }
    if (b.dataset.cam === 'cerrar') { cerrarCamara(); return finSerie(plan); }
    b.disabled = true;
    const blob = await recortar34(video, video.videoWidth, video.videoHeight);
    plan.hechas[i] = await guardarFotoSerie(plan, i, blob); ultima = i;
    const fl = capa.querySelector('.flash'); fl.textContent = `✓ ${vs[i].n}`; fl.classList.add('ver'); setTimeout(() => fl.classList.remove('ver'), 900);
    b.disabled = false;
    const sig = vs.map((_, k) => k).find(k => !plan.hechas[k] && k > i) ?? vs.map((_, k) => k).find(k => !plan.hechas[k]);
    if (sig == null) { cerrarCamara(); return finSerie(plan, true); }
    i = sig; pinta();
  };
}
async function guardarFotoSerie(plan, vista, blob) {
  const prev = plan.hechas[vista]; if (prev) await DB.borrar('fotos', prev.id);
  const f = { id: DB.id(), clientaId: S.clienta.id, serie: plan.serie, area: plan.area, vista, momento: plan.momento, fechaSerie: plan.fechaSerie,
    zona: plan.area, servicio: plan.servicio, fecha: new Date().toISOString(), blob };
  await DB.guardar('fotos', f); return f;
}
async function finSerie(plan, completa) {
  await guardarClienta(true); S.pestana = 'fotos'; S.fotoArea = null; S.fotoMomento = null; S.comparando = null;
  const n = Object.keys(plan.hechas).length;
  avisar(completa ? (plan.momento === 'despues' ? 'Serie completa · montaje antes/después listo' : 'Serie del antes completa') : `Guardadas ${n} de 5. Puedes completarla luego`);
  await pantallaFicha();
  document.getElementById('area-' + normal(plan.area).replace(/\W+/g, '-'))?.scrollIntoView({ block: 'start' });
}

// Foto de detalle (1 sola) con la anterior en transparencia
async function abrirCamara(zona, servicio) {
  const c = S.clienta;
  const previas = (await DB.fotosDe(c.id)).filter(f => !f.serie && f.zona === zona).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const ultima = previas.at(-1);
  const capa = document.createElement('div'); capa.className = 'camara';
  capa.innerHTML = `<div class="visor"><video playsinline autoplay muted></video>
    ${ultima ? `<img class="fantasma" src="${URL.createObjectURL(ultima.blob)}" style="opacity:.4" alt="">` : ''}
    <div class="guias"></div>
    <div class="info">${esc(zona)} · ${esc(servicio)}${ultima ? ` · foto anterior del ${fecha(ultima.fecha)} en transparencia` : ' · primera foto de esta zona'}</div></div>
    <div class="controles">
      <button class="btn sec" style="color:#fff;border-color:#fff" data-cam="cerrar">Cancelar</button>
      ${ultima ? '<label>Anterior <input type="range" min="0" max="80" value="40" id="opac"></label>' : ''}
      <label><input type="checkbox" id="rejilla" checked style="width:24px;height:24px"> Rejilla</label>
      <span class="espacio"></span><button class="disparo" data-cam="foto" aria-label="Hacer foto"></button></div>`;
  document.body.appendChild(capa);
  const video = capa.querySelector('video');
  try {
    flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } }, audio: false });
    video.srcObject = flujo;
  } catch (err) { capa.remove(); return fotoDesdeArchivo(zona, servicio); }
  capa.querySelector('#opac')?.addEventListener('input', e => { capa.querySelector('.fantasma').style.opacity = e.target.value / 100; });
  capa.querySelector('#rejilla').onchange = e => { capa.querySelector('.guias').style.display = e.target.checked ? '' : 'none'; };
  capa.onclick = async e => {
    const b = e.target.closest('[data-cam]'); if (!b) return;
    if (b.dataset.cam === 'cerrar') return cerrarCamara();
    const blob = await recortar34(video, video.videoWidth, video.videoHeight);
    cerrarCamara(); await guardarFoto(blob, zona, servicio);
  };
}
// Recorta al centro en 3:4 vertical (como se ve en el visor) y guarda a 1440×1920 como máximo.
async function recortar34(fuente, w, h) {
  let sw = w, sh = h;
  if (w / h > 3 / 4) sw = Math.round(h * 3 / 4); else sh = Math.round(w * 4 / 3);
  const k = Math.min(1, 1440 / sw), cv = document.createElement('canvas');
  cv.width = Math.round(sw * k); cv.height = Math.round(sh * k);
  cv.getContext('2d').drawImage(fuente, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, cv.width, cv.height);
  return new Promise(r => cv.toBlob(r, 'image/jpeg', .92));
}
// Sin cámara en directo: cámara del sistema. En serie, una vista cada vez (la siguiente se hace con «Completar»).
function fotoDesdeArchivo(zona, servicio, serie) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.capture = 'environment';
  i.onchange = async () => {
    const f = i.files[0]; if (!f) return;
    const im = await createImageBitmap(f), blob = await recortar34(im, im.width, im.height);
    if (serie) { serie.plan.hechas[serie.vista] = await guardarFotoSerie(serie.plan, serie.vista, blob); return finSerie(serie.plan, Object.keys(serie.plan.hechas).length === 5); }
    await guardarFoto(blob, zona, servicio);
  };
  if (!serie) avisar('Se abre la cámara del sistema (sin transparencia)');
  i.click();
}
async function guardarFoto(blob, zona, servicio) {
  await DB.guardar('fotos', { id: DB.id(), clientaId: S.clienta.id, zona, servicio, fecha: new Date().toISOString(), blob });
  await guardarClienta(true); avisar('Foto guardada'); S.pestana = 'fotos'; pantallaFicha();
}

// ---------- copias de seguridad cifradas y mejoras ----------
const b64 = buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const deb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function clave(pass, sal) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function pantallaCopias() {
  const ultima = await DB.ajuste('ultimaCopia'), mejoras = (await DB.ajuste('mejoras')) || [];
  const cs = (await DB.ajuste('correoScript')) || '', ct = (await DB.ajuste('correoToken')) || '', ea = !!(await DB.ajuste('envioAuto'));
  pintar(`${barra('Ajustes', 'inicio')}<main>
    <section class="tarjeta"><h2>Tarifa</h2><p>Precios de los servicios y productos para los presupuestos. Se pueden cambiar, ocultar o añadir.</p>
      <button class="btn" data-a="tarifas">Editar la tarifa</button></section>
    <section class="tarjeta"><h2>Envío automático de presupuestos por correo</h2>
      <p>Se envían desde la cuenta de Google del centro con un pequeño programa (Google Apps Script). Instrucciones en <code>docs/correo-presupuestos.md</code>. Solo salen el nombre, el correo y el presupuesto; nunca datos de salud. Sin configurar, el botón abre el correo con todo escrito.</p>
      <div class="rejilla"><label class="campo"><span>Dirección del programa (termina en /exec)</span><input type="text" id="cs" value="${esc(cs)}" placeholder="https://script.google.com/macros/s/…/exec"></label>
      <label class="campo"><span>Clave secreta</span><input type="password" id="ct" value="${esc(ct)}"></label></div>
      <label class="check"><input type="checkbox" id="ea" ${ea ? 'checked' : ''}> Enviar solo al guardar un presupuesto nuevo</label>
      <button class="btn" data-a="guardar-correo">Guardar</button></section>
    <section class="tarjeta"><h2>Importar clientas de Bookitit</h2>
      <p>Elige el archivo exportado de Bookitit (Clientes → Exportar, formato CSV). Se lee aquí, en la tablet: no se envía a ningún sitio.</p>
      <p style="color:var(--suave);font-size:.9rem">Se importan nombre, apellidos, móvil y correo. <b>No</b> se importan el DNI (no hace falta) ni las respuestas de salud (cada clienta rellena el cuestionario y firma en su primera visita). Los duplicados se juntan y no se repite a nadie que ya esté en la app.</p>
      <label class="campo"><span>Archivo .csv</span><input type="file" id="csvbk" accept=".csv,text/csv,text/plain"></label>
      <button class="btn" data-a="leer-csv">Revisar el archivo</button>
      <div id="resimport"></div></section>
    <section class="tarjeta"><h2>Hacer copia</h2>
      <p>Crea un archivo <b>cifrado</b> con todas las fichas, sesiones y fotos de ${esc(centro().nombre)}. Sin la contraseña no se puede abrir. Guárdalo en el Drive del centro.</p>
      <p style="color:var(--suave)">Última copia: ${ultima ? fecha(ultima) : 'ninguna'}. Recomendado: una vez por semana.</p>
      <div class="rejilla"><label class="campo"><span>Contraseña de la copia (mínimo 10 caracteres)</span><input type="password" id="p1" autocomplete="new-password"></label>
      <label class="campo"><span>Repite la contraseña</span><input type="password" id="p2" autocomplete="new-password"></label></div>
      <div class="nota">Apunta la contraseña en un lugar seguro fuera de la tablet. Si se pierde, la copia no se puede recuperar.</div>
      <button class="btn" data-a="exportar-copia">Crear copia cifrada</button></section>
    <section class="tarjeta"><h2>Mejoras apuntadas (${mejoras.length})</h2>
      <p style="color:var(--suave)">Lo que el equipo apunta con el botón 💡. Se revisa una vez al mes (ver «Proceso de mejora»). No incluyas datos de clientas.</p>
      ${mejoras.length ? `<ul>${mejoras.slice().reverse().map(m => `<li>${fecha(m.fecha)} · <i>${esc(m.pantalla)}</i> · ${esc(m.texto)}</li>`).join('')}</ul>
      <button class="btn sec" data-a="compartir-mejoras">Compartir la lista</button>` : '<p class="vacio">Aún no hay ninguna.</p>'}</section>
    <section class="tarjeta"><h2>Recuperar una copia</h2>
      <p>Sustituye todas las fichas de esta tablet por las de la copia.</p>
      <label class="campo"><span>Archivo .deseu</span><input type="file" id="arch" accept=".deseu,application/octet-stream"></label>
      <label class="campo"><span>Contraseña</span><input type="password" id="p3"></label>
      <button class="btn peligro" data-a="importar-copia">Recuperar copia</button></section></main>`);
  $app.onclick = async e => {
    const t = e.target.closest('[data-a]'); if (!t) return;
    const a = t.dataset.a;
    if (['inicio', 'bloquear', 'mejora', 'tarifas'].includes(a)) return acciones(a);
    if (a === 'guardar-correo') {
      await DB.fijar('correoScript', document.getElementById('cs').value.trim()); await DB.fijar('correoToken', document.getElementById('ct').value);
      await DB.fijar('envioAuto', document.getElementById('ea').checked); return avisar('Envío de correo guardado');
    }
    if (a === 'leer-csv') {
      const f = document.getElementById('csvbk').files[0]; if (!f) return avisar('Elige el archivo');
      S.importacion = await prepararImportacion(f);
      const R = S.importacion;
      document.getElementById('resimport').innerHTML = R.error ? `<div class="nota">${esc(R.error)}</div>` : `<div class="nota" style="margin-top:14px">
        <b>${R.nuevas.length}</b> clientas nuevas para importar.<br>
        ${R.juntadas} filas repetidas juntadas · ${R.yaEstaban} ya estaban en la app · ${R.descartadas} filas vacías o de prueba descartadas.<br>
        ${R.sinContacto} de las nuevas no tienen ni móvil ni correo válido: entran igual, pero habrá que completarlas cuando vengan.</div>
        <button class="btn coral" data-a="confirmar-import" ${R.nuevas.length ? '' : 'disabled'}>Importar ${R.nuevas.length} clientas</button>`;
      return;
    }
    if (a === 'confirmar-import') {
      const R = S.importacion; if (!R?.nuevas?.length) return;
      t.disabled = true; t.textContent = 'Importando…';
      for (const c of R.nuevas) await DB.guardar('clientas', c);
      S.importacion = null; avisar(`${R.nuevas.length} clientas importadas`); return pantallaInicio();
    }
    if (a === 'compartir-mejoras') {
      const txt = `Mejoras de la app De Seu (${hoy()})\n\n` + mejoras.map(m => `· ${m.fecha.slice(0, 10)} [${m.pantalla}] ${m.texto}`).join('\n');
      if (navigator.share) { try { await navigator.share({ title: 'Mejoras de la app', text: txt }); } catch (e) {} }
      else { await navigator.clipboard?.writeText(txt); avisar('Lista copiada'); }
    }
    if (a === 'exportar-copia') {
      const p = document.getElementById('p1').value;
      if (p.length < 10) return avisar('La contraseña es demasiado corta');
      if (p !== document.getElementById('p2').value) return avisar('Las contraseñas no coinciden');
      t.disabled = true; t.textContent = 'Cifrando…';
      const clientas = await DB.todas('clientas'), sesiones = await DB.todas('sesiones'), presupuestos = await DB.todas('presupuestos');
      const ajustes = { tarifas: await DB.ajuste('tarifas'), recordatorios: await DB.ajuste('recordatorios'), promociones: await DB.ajuste('promociones'), contadorPresu: await DB.ajuste('contadorPresu') };
      const fotos = await Promise.all((await DB.todas('fotos')).map(async f => ({ ...f, blob: b64(await f.blob.arrayBuffer()), tipo: f.blob.type })));
      const datos = new TextEncoder().encode(JSON.stringify({ app: 'deseu-fichas', version: D.version, centro: S.centro, fecha: new Date().toISOString(), clientas, sesiones, presupuestos, fotos, mejoras, ajustes }));
      const sal = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
      const cif = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await clave(p, sal), datos);
      const blob = new Blob([new TextEncoder().encode('DESEU1'), sal, iv, cif], { type: 'application/octet-stream' });
      await DB.fijar('ultimaCopia', new Date().toISOString());
      await compartirODescargar(blob, `copia-${S.centro}-${hoy()}.deseu`, 'Copia de seguridad cifrada');
      pantallaCopias();
    }
    if (a === 'importar-copia') {
      const f = document.getElementById('arch').files[0], p = document.getElementById('p3').value;
      if (!f || !p) return avisar('Elige el archivo y escribe la contraseña');
      try {
        const u = new Uint8Array(await f.arrayBuffer());
        if (new TextDecoder().decode(u.slice(0, 6)) !== 'DESEU1') throw new Error('formato');
        const plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(22, 34) }, await clave(p, u.slice(6, 22)), u.slice(34));
        const d = JSON.parse(new TextDecoder().decode(plano));
        if (d.centro !== S.centro) return avisar(`Esta copia es de ${D.centros[d.centro]?.nombre || d.centro}: entra con ese centro`);
        if (!confirm(`La copia es del ${fecha(d.fecha)} con ${d.clientas.length} fichas. Se borrará lo que hay ahora en la tablet. ¿Seguir?`)) return;
        await DB.vaciar();
        for (const c of d.clientas) await DB.guardar('clientas', c);
        for (const s of d.sesiones || []) await DB.guardar('sesiones', s);
        for (const p of d.presupuestos || []) await DB.guardar('presupuestos', p);
        for (const [k, v] of Object.entries(d.ajustes || {})) if (v != null) await DB.fijar(k, v);
        await cargarTarifas();
        for (const x of d.fotos) await DB.guardar('fotos', { ...x, blob: new Blob([deb64(x.blob)], { type: x.tipo }) });
        if (d.mejoras) await DB.fijar('mejoras', d.mejoras);
        avisar('Copia recuperada'); pantallaInicio();
      } catch (err) { avisar('No se pudo abrir: contraseña incorrecta o archivo dañado'); }
    }
  };
}

// ---------- Importar clientas de Bookitit (CSV con «;») ----------
// Solo nombre, apellidos, móvil y correo. Sin DNI ni datos de salud (mínimo de datos; la salud se pregunta y se firma en la app).
function leerCSV(txt, sep = ';') {
  const filas = []; let fila = [], campo = '', comillas = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (comillas) { if (ch === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else comillas = false; } else campo += ch; continue; }
    if (ch === '"') comillas = true;
    else if (ch === sep) { fila.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else campo += ch;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter(f => f.some(x => x.trim()));
}
const palabras = s => normal(s).replace(/[^a-zñ ]/g, ' ').split(/\s+/).filter(Boolean);
const mismaPersona = (a, b) => { const x = palabras(a), y = palabras(b); if (!x.length || !y.length) return false;
  const [c, l] = x.length <= y.length ? [x, y] : [y, x]; return c.every(w => l.includes(w)); };
function partirNombre(t) {
  let s = t.replace(/[,;]+\s*$/, '').replace(/\s+/g, ' ').trim();
  if (s === s.toUpperCase() || s === s.toLowerCase()) s = s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, m => m.toUpperCase());
  const w = s.split(' ');
  if (w.length <= 1) return { nombre: s, apellidos: '' };
  if (w.length === 2) return { nombre: w[0], apellidos: w[1] };
  return { nombre: w.slice(0, -2).join(' '), apellidos: w.slice(-2).join(' ') };
}
function limpiarTel(t) {
  let d = (t || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('34')) d = d.slice(2);
  if (d.length === 9 && /^[6-9]/.test(d)) return d;
  return d.length >= 11 && d.length <= 13 ? d : '';
}
async function prepararImportacion(file) {
  const buf = await file.arrayBuffer();
  let txt = new TextDecoder('utf-8').decode(buf);
  if (txt.includes('�')) txt = new TextDecoder('windows-1252').decode(buf);
  txt = txt.replace(/^﻿/, '');
  const filas = leerCSV(txt); if (filas.length < 2) return { error: 'El archivo está vacío o no es un CSV.' };
  const cab = filas[0].map(h => normal(h.trim()));
  const col = n => cab.findIndex(h => h === n);
  const iNom = col('nombre y apellidos'), iTel = col('movil'), iMail = col('email'), iDir = col('direccion');
  if (iNom < 0 || (iTel < 0 && iMail < 0)) return { error: 'No encuentro las columnas «Nombre y Apellidos», «Móvil» o «Email». ¿Es el CSV de clientes de Bookitit?' };
  const grupos = []; let descartadas = 0, juntadas = 0;
  for (const f of filas.slice(1)) {
    const nombre = (f[iNom] || '').trim();
    let email = (f[iMail] || '').trim().toLowerCase();
    if (!correoValido(email)) email = correoValido(f[iDir] || '') ? f[iDir].trim().toLowerCase() : '';
    const tel = limpiarTel(f[iTel]);
    if (!nombre || /prueba|borrar|^test$/i.test(nombre) || (palabras(nombre).length < 2 && !tel && !email)) { descartadas++; continue; }
    const g = grupos.find(x => mismaPersona(x.nombre, nombre) &&
      ((tel && x.tels.includes(tel)) || (email && x.emails.includes(email)) || normal(x.nombre) === normal(nombre) || (!tel && !email) || (!x.tels.length && !x.emails.length)));
    if (g) {
      juntadas++;
      if (palabras(nombre).length > palabras(g.nombre).length) g.nombre = nombre;
      if (tel && !g.tels.includes(tel)) g.tels.push(tel);
      if (email && !g.emails.includes(email)) g.emails.push(email);
    } else grupos.push({ nombre, tels: tel ? [tel] : [], emails: email ? [email] : [] });
  }
  const existentes = await DB.todas('clientas');
  let yaEstaban = 0, sinContacto = 0; const nuevas = [], ahora = new Date().toISOString();
  for (const g of grupos) {
    const esta = existentes.some(c => mismaPersona(`${c.nombre} ${c.apellidos}`, g.nombre) &&
      (g.tels.includes(limpiarTel(c.telefono)) || g.emails.includes((c.email || '').toLowerCase()) || normal(`${c.nombre} ${c.apellidos}`) === normal(g.nombre)));
    if (esta) { yaEstaban++; continue; }
    const c = nuevaClienta(), n = partirNombre(g.nombre);
    Object.assign(c, n, { telefono: g.tels[0] || '', email: g.emails[0] || '', origen: '', creada: ahora, actualizada: ahora,
      notas: g.tels.length > 1 || g.emails.length > 1 ? `Importada de Bookitit con varios contactos: ${[...g.tels.slice(1), ...g.emails.slice(1)].join(', ')}` : '',
      importada: { de: 'Bookitit', fecha: ahora } });
    delete c.nueva; delete c.valoracion;
    c.busqueda = normal(`${c.nombre} ${c.apellidos} ${c.telefono} ${c.email}`);
    if (!c.telefono && !c.email) sinContacto++;
    nuevas.push(c);
  }
  return { nuevas, juntadas, yaEstaban, descartadas, sinContacto };
}

// ===================== v0.3 · modo clienta, presupuestos, recordatorios y tarifa =====================
const euros = n => (Math.round((+n || 0) * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const correoValido = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((e || '').trim());
async function cargarTarifas() {
  let g = await DB.ajuste('tarifas');
  if (Array.isArray(g)) g = { version: null, lista: g };                       // formato de la v0.3
  if (!g || g.version !== D.tarifaVersion) {                                    // hoja de precios nueva
    const propias = (g?.lista || []).filter(t => String(t.id).startsWith('x_'));
    S.tarifas = [...D.tarifas.map(t => ({ ...t })), ...propias];
    if (g) await DB.fijar('tarifas', { version: D.tarifaVersion, lista: S.tarifas });
  } else S.tarifas = g.lista;
}
const telValido = t => { const d = (t || '').replace(/\D/g, ''); return d.length === 9 || (d.length >= 11 && d.length <= 13); };
const tarifa = id => (S.tarifas || D.tarifas).find(t => t.id === id);

// ---------- Antes de dar la tablet: la profesional marca para qué viene ----------
function pantallaPreClienta() {
  S.pantalla = 'pre';
  const c = S.clienta;
  pintar(`${barra('Antes de dar la tablet', 'inicio')}<main>
    <section class="tarjeta"><h2>¿Para qué <em class="cur">viene</em>?</h2>
      <p>Marca lo que se va a valorar o a hacer hoy. Solo saldrán las preguntas de salud y los consentimientos de eso. Si aún no lo sabéis, deja solo «Valoración»: después, cuando se decida el tratamiento, se le vuelve a pasar la tablet para lo que falte.</p>
      <div class="globos">${centro().servicios.map(s => globo(s, `data-serv="${s}"`, c.servicios.includes(s))).join('')}</div>
      <div class="fila fin" style="margin-top:20px"><button class="btn coral grande" data-a="dar-tablet">Dar la tablet a la clienta →</button></div>
    </section></main>`);
  $app.onclick = e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.serv) { const s = t.dataset.serv, i = c.servicios.indexOf(s); i >= 0 ? c.servicios.splice(i, 1) : c.servicios.push(s); return pantallaPreClienta(); }
    if (t.dataset.a === 'dar-tablet') { if (!c.servicios.length) c.servicios.push('valoracion'); return modoClienta(0); }
    if (t.dataset.a) return acciones(t.dataset.a);
  };
}

// ---------- Modo clienta: la clienta rellena lo que no depende de la profesional ----------
function pasosClienta(c) {
  const p = ['datos'];
  const vis = preguntasVisibles(c);
  vis.forEach((q, i) => { if (q.titulo) p.push('sec:' + i); });
  if (serviciosElegidos(c).includes('laser')) p.push('fototipo');
  p.push('promos', 'consent', 'fin');
  return p;
}
function preguntasDeSeccion(c, idx) {
  const vis = preguntasVisibles(c), out = [];
  for (let i = idx + 1; i < vis.length && !vis[i].titulo; i++) out.push(vis[i]);
  return { titulo: vis[idx].titulo, preguntas: out };
}
async function modoClienta(paso = 0) {
  const c = S.clienta; S.modoClienta = true; S.pantalla = 'clienta';
  const pasos = pasosClienta(c), id = pasos[Math.min(paso, pasos.length - 1)];
  S.pasoClienta = paso;
  const ok = (msg) => `<p class="error" id="errcli">${esc(msg || '')}</p>`;
  let cuerpo = '';
  if (id === 'datos') {
    const campo = (f, t, tipo = 'text', extra = '') => `<label class="campo"><span>${t}</span><input type="${tipo}" data-f="${f}" value="${esc(c[f])}" ${extra}></label>`;
    cuerpo = `<h1>Hola, <em class="cur">bienvenida</em></h1><p>Antes de empezar necesitamos unos datos. Tardarás unos 5 minutos.</p>
      <div class="rejilla">${campo('nombre', 'Nombre *', 'text', 'autocomplete="off"')}${campo('apellidos', 'Apellidos *', 'text', 'autocomplete="off"')}
      ${campo('telefono', 'WhatsApp * (para avisarte de tus citas)', 'tel', 'inputmode="tel"')}${campo('email', 'Correo electrónico * (para enviarte tu presupuesto)', 'email', 'autocomplete="off" inputmode="email"')}
      ${campo('nacimiento', 'Fecha de nacimiento', 'date')}
      <label class="campo"><span>¿Cómo nos conociste?</span><select data-f="origen">${['', 'Instagram', 'Recomendación', 'Pasaba por Coia', 'Google', 'Orixe', 'Otro'].map(o => `<option ${c.origen === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label></div>
      <label class="check"><input type="checkbox" id="sincorreo" ${c.sinCorreo ? 'checked' : ''}> No tengo correo electrónico</label>`;
  } else if (id === 'promos') {
    const P = c.promos || (c.promos = { acepta: false, temas: [], canales: ['whatsapp'] });
    cuerpo = `<h1>¿Te avisamos de <em class="cur">novedades</em>?</h1><p>Opcional. Marca los temas que te interesan y solo te escribiremos de eso cuando tengamos una promoción.</p>
      <div class="globos grande">${D.temasPromo.map(t => globoTema(t, `data-tema="${t.id}"`, P.temas.includes(t.id))).join('')}</div>
      <h3 style="margin-top:22px">¿Por dónde?</h3>
      <div class="globos">${[['whatsapp', 'WhatsApp'], ['correo', 'Correo electrónico']].map(([k, n]) => `<button type="button" class="globo fam-plan ${P.canales.includes(k) ? 'on' : ''}" data-canal="${k}">${P.canales.includes(k) ? '<span class="tick">✓</span>' : ''}${n}</button>`).join('')}</div>
      <label class="check" style="margin-top:18px"><input type="checkbox" id="promoacepta" ${P.acepta ? 'checked' : ''}> Quiero recibir promociones de De Seu sobre los temas marcados. Puedo darme de baja cuando quiera.</label>`;
  } else if (id.startsWith('sec:')) {
    const { titulo, preguntas } = preguntasDeSeccion(c, +id.slice(4));
    cuerpo = `<h1>Tu salud · <em class="cur">${esc(titulo.toLowerCase())}</em></h1><p>Contesta con tranquilidad. Si algo no lo tienes claro, pregúntanos.</p>
      ${preguntas.map(q => {
        const r = c.salud[q.id] || {}, marcado = r.r && (q.tipo === 'sino' ? r.r === 'si' : r.r !== q.op[0]);
        return `<div class="pregunta"><div class="txt">${esc(q.p)}</div>
          ${q.tipo === 'sino' ? `<div class="sino"><button data-q="${q.id}" data-r="no" class="${r.r === 'no' ? 'on' : ''}">No</button><button data-q="${q.id}" data-r="si" class="si ${r.r === 'si' ? 'on' : ''}">Sí</button></div>`
          : `<div class="opciones">${q.op.map((o, i) => `<button type="button" data-q="${q.id}" data-r="${esc(o)}" class="${r.r === o ? 'on' + (i ? ' si' : '') : ''}">${esc(o)}</button>`).join('')}</div>`}
          ${marcado && (q.det || q.tipo === 'sino') ? `<input type="text" class="detalle" data-det="${q.id}" placeholder="Cuéntanos un poco más" value="${esc(r.d)}">` : ''}
          ${q.id === 'fotosens' || q.id === 'medicacion' ? `<details class="ayuda"><summary>Ver ejemplos de medicamentos</summary><p>${esc(D.fotosensibilizantes)}</p></details>` : ''}</div>`;
      }).join('')}
      <div class="fila" style="margin-top:14px"><button class="btn sec" data-cli="ninguna">No me pasa ninguna de las que faltan</button></div>`;
  } else if (id === 'fototipo') {
    cuerpo = `<h1>Tu tipo de <em class="cur">piel</em></h1><p>Nos ayuda a ajustar el láser a tu piel.</p>
      ${D.fototipo.map(([p, ops], i) => `<div class="pregunta"><div class="txt">${esc(p)}</div><div class="opciones">${ops.map((o, k) => `<button type="button" data-ft="${i}" data-pt="${k}" class="${c.fototipo.r[i] === k ? 'on' : ''}">${esc(o)}</button>`).join('')}</div></div>`).join('')}`;
  } else if (id === 'consent') {
    const K = D.consentimientos, oblig = ['datos', 'veracidad', ...gruposConsent(c)];
    cuerpo = `<h1>Tu <em class="cur">consentimiento</em></h1><p>Léelo con calma. Las marcadas con * son necesarias para tratarte.</p>
      ${oblig.map(k => `<div class="consent"><b>${esc(K[k].titulo)}${K[k].titulo.includes('obligatorio') ? '' : ' *'}</b><p>${esc(K[k].texto.replace(/\[NOTA:[^\]]*\]/g, ''))}</p>
        <label class="check"><input type="checkbox" data-cons="${k}" ${c.consent[k] ? 'checked' : ''}> Acepto</label></div>`).join('')}
      ${['comunicaciones', 'fotos'].map(k => `<div class="consent"><b>${esc(K[k].titulo)}</b><p>${esc(K[k].texto)}</p>
        <label class="check"><input type="checkbox" data-cons="${k}" ${c.consent[k] ? 'checked' : ''}> Acepto</label></div>`).join('')}
      <div class="consent"><b>${esc(K.redes.titulo)}</b><p>${esc(K.redes.texto)}</p>${chips('data-redes', K.redes.opciones, c.consent.redes)}</div>
      ${edad(c.nacimiento) != null && edad(c.nacimiento) < 18 ? '<div class="nota">Eres menor de edad: tiene que firmar tu madre, padre o tutor.</div>' : ''}
      <h3>Firma aquí con el lápiz o el dedo</h3><canvas class="firma" id="firma"></canvas>
      <div class="fila"><button class="btn sec" data-cli="borrar-firma">Borrar firma</button></div>`;
  } else {
    cuerpo = `<div style="text-align:center;padding:40px 0"><img src="icons/logo.png" style="width:200px" alt="De Seu"><h1>¡Gracias, <em class="cur">${esc(c.nombre)}</em>!</h1>
      <p>Ya está todo. Devuelve la tablet a la profesional.</p></div>`;
  }
  const ultimo = id === 'fin';
  pintar(`<div class="modo-clienta">
    <header class="barra-cli"><img src="icons/logo.png" alt="De Seu"><span class="espacio"></span>
      ${ultimo ? '' : `<span class="paso">Paso ${paso + 1} de ${pasos.length - 1}</span>`}
      <button data-cli="salir" class="salir">${ultimo ? 'Volver (equipo)' : 'Equipo'}</button></header>
    <main>${cuerpo.replace('</h1>', '</h1><div class="franjas"><span></span><span></span><span></span></div>')}${ok()}
    ${ultimo ? '' : `<div class="fila" style="margin-top:24px">${paso > 0 ? '<button class="btn sec grande" data-cli="atras">← Atrás</button>' : ''}<span class="espacio"></span>
      <button class="btn coral grande" data-cli="sig">${id === 'consent' ? 'Firmar y terminar' : 'Siguiente →'}</button></div>`}
    </main></div>`);
  if (id === 'consent') montarFirma();
  $app.oninput = e => {
    const tg = e.target;
    if (tg.dataset.f) c[tg.dataset.f] = tg.value;
    if (tg.dataset.det) c.salud[tg.dataset.det] = { ...(c.salud[tg.dataset.det] || {}), d: tg.value };
  };
  $app.onchange = e => {
    const tg = e.target;
    if (tg.id === 'sincorreo') c.sinCorreo = tg.checked;
    if (tg.dataset.cons) c.consent[tg.dataset.cons] = tg.checked;
    if (tg.id === 'promoacepta') c.promos.acepta = tg.checked;
  };
  const error = m => { document.getElementById('errcli').textContent = m; document.getElementById('errcli').scrollIntoView({ block: 'center' }); };
  $app.onclick = async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.tema || t.dataset.canal) {
      const P = c.promos, lista = t.dataset.tema ? P.temas : P.canales, v = t.dataset.tema || t.dataset.canal, i = lista.indexOf(v);
      i >= 0 ? lista.splice(i, 1) : lista.push(v); const y = scrollY; await modoClienta(paso); scrollTo(0, y); return;
    }
    if (t.dataset.q) { c.salud[t.dataset.q] = { ...(c.salud[t.dataset.q] || {}), r: t.dataset.r }; const y = scrollY; await modoClienta(paso); scrollTo(0, y); return; }
    if (t.dataset.ft) { c.fototipo.r[+t.dataset.ft] = +t.dataset.pt; const y = scrollY; await modoClienta(paso); scrollTo(0, y); return; }
    if (t.dataset.redes) { c.consent.redes = t.dataset.redes; const y = scrollY; await modoClienta(paso); scrollTo(0, y); montarFirma(); return; }
    const a = t.dataset.cli;
    if (a === 'salir') return salirModoClienta();
    if (a === 'atras') return modoClienta(paso - 1);
    if (a === 'borrar-firma') return montarFirma();
    if (a === 'ninguna') {
      const { preguntas } = preguntasDeSeccion(c, +id.slice(4));
      preguntas.forEach(q => { if (!c.salud[q.id]?.r) c.salud[q.id] = { r: q.tipo === 'sino' ? 'no' : q.op[0] }; });
      const y = scrollY; await modoClienta(paso); scrollTo(0, y); return;
    }
    if (a !== 'sig') return;
    // Validación de cada paso
    if (id === 'datos') {
      if (!c.nombre.trim() || !c.apellidos.trim()) return error('Escribe tu nombre y tus apellidos.');
      if (!telValido(c.telefono)) return error('Escribe tu número de WhatsApp (9 números).');
      if (!c.sinCorreo && !correoValido(c.email)) return error('Revisa el correo electrónico (o marca «No tengo correo»).');
    }
    if (id === 'promos') {
      const P = c.promos;
      if (P.acepta && !P.temas.length) return error('Marca al menos un tema, o quita la casilla.');
      if (P.temas.length && !P.acepta) return error('Si quieres recibir promociones, marca la casilla de abajo. Si no, desmarca los temas.');
      if (P.acepta && !P.canales.length) return error('Elige WhatsApp, correo o los dos.');
      P.fecha = new Date().toISOString();
    }
    if (id.startsWith('sec:')) {
      const { preguntas } = preguntasDeSeccion(c, +id.slice(4));
      if (preguntas.some(q => !c.salud[q.id]?.r)) return error('Falta alguna respuesta en esta página.');
    }
    if (id === 'fototipo' && D.fototipo.some((_, i) => c.fototipo.r[i] == null)) return error('Falta alguna respuesta.');
    if (id === 'consent') {
      const oblig = ['datos', 'veracidad', ...gruposConsent(c)];
      if (!oblig.every(k => c.consent[k])) return error('Para poder tratarte hace falta aceptar los apartados marcados con *.');
      if (firmaVacia) return error('Falta tu firma.');
      c.firma = { img: document.getElementById('firma').toDataURL('image/png'), fecha: new Date().toISOString(), huella: huellaFicha(c), porClienta: true };
      if (c.valoracion && !c.valoracion.fin) c.valoracion.fin = c.firma.fecha;
    }
    await guardarClienta(true);
    modoClienta(paso + 1);
  };
}
function salirModoClienta() {
  const capa = document.createElement('div'); capa.className = 'capa-pin';
  capa.innerHTML = `<div class="caja-pin"><h2>PIN del equipo</h2><input type="password" inputmode="numeric" id="pinsalir" autocomplete="off">
    <p class="error" id="pinerr"></p><div class="fila fin"><button class="btn sec" data-p="no">Cancelar</button><button class="btn" data-p="si">Entrar</button></div></div>`;
  document.body.appendChild(capa); capa.querySelector('input').focus();
  capa.onclick = async e => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    if (b.dataset.p === 'no') return capa.remove();
    const g = await DB.ajuste('pin');
    if (await sha(g.sal + capa.querySelector('input').value) !== g.hash) { capa.querySelector('#pinerr').textContent = 'PIN incorrecto'; return; }
    capa.remove(); S.modoClienta = false;
    if (S.clienta?.nombre) { await guardarClienta(true); S.pestana = 'salud'; pantallaFicha(); } else pantallaInicio();
  };
}

// ---------- Cosmética con el bono facial ----------
const esCosmetica = l => String(l.tarifaId || '').startsWith('cos_');
async function bonoFacialActivo(c, p) {
  const CB = D.cosmeticaBono;
  if (p && p.lineas.some(l => CB.bonos.includes(l.tarifaId))) return true;
  const aceptados = (await DB.presupuestosDe(c.id)).filter(x => x.estado === 'aceptado' && x.lineas.some(l => CB.bonos.includes(l.tarifaId)));
  if (!aceptados.length) return false;
  const desde = aceptados.map(x => x.actualizado || x.fecha).sort()[0];
  const total = aceptados.flatMap(x => x.lineas).filter(l => CB.bonos.includes(l.tarifaId)).reduce((a, l) => a + (l.sesiones || 1) * (+l.cant || 1), 0);
  const ses = (await DB.sesionesDe(c.id)).filter(s => s.servicio === 'rf_facial' && s.fecha >= desde).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (ses.length < total) return true;
  return masDias(ses.at(-1).fecha, CB.diasTrasBono) >= new Date().toISOString();
}
function aplicarDtoCosmetica(p) {
  const CB = D.cosmeticaBono;
  for (const l of p.lineas) if (esCosmetica(l) && !+l.dto) { l.dto = CB.pct; l.motivoDto = CB.motivo; }
}
function rutinaSugerida(c, p) {
  const sel = serviciosElegidos(c), laser = sel.includes('laser'), ya = new Set(p.lineas.map(l => l.tarifaId));
  const lista = (S.tarifas || D.tarifas).filter(t => t.cos && !t.oculta && t.cos.para.some(s => sel.includes(s)) && !ya.has(t.id))
    .sort((a, b) => (b.cos.clave ? 1 : 0) - (a.cos.clave ? 1 : 0));
  if (!lista.length) return '';
  return `<div class="rutina"><h3>Rutina en casa sugerida <em class="cur">(Amai Hana)</em></h3>
    <p class="det">Según lo que le interesa. ${S.bonoActivo ? `<b>Con bono facial: −${D.cosmeticaBono.pct} % en cosmética.</b>` : `Si compra un bono facial, la cosmética tiene −${D.cosmeticaBono.pct} %.`} Recomendar solo lo que encaje con su piel.</p>
    <div class="opciones">${lista.slice(0, 8).map(t => `<button type="button" data-addtar="${t.id}" title="${esc(t.n)}">+ ${esc(t.n.replace(/ \d+ ml.*$/, ''))} · ${euros(t.p)}${laser && t.cos.citrico ? ' ⚠' : ''}</button>`).join('')}</div>
    ${laser && lista.some(t => t.cos.citrico) ? '<p class="det">⚠ Lleva cítricos (bergamota): no usar en las zonas de láser 4 semanas antes ni después de cada sesión.</p>' : ''}</div>`;
}

// ---------- Presupuestos ----------
function calcPresu(p) {
  let bruto = 0, dtoLineas = 0;
  for (const l of p.lineas) { const b = (+l.precio || 0) * (+l.cant || 1); bruto += b; dtoLineas += b * (+l.dto || 0) / 100; }
  const base = bruto - dtoLineas;
  const dtoGlobal = p.dto.tipo === '€' ? Math.min(base, +p.dto.valor || 0) : base * (+p.dto.valor || 0) / 100;
  return { bruto, dtoLineas, dtoGlobal, total: Math.max(0, base - dtoGlobal) };
}
async function nuevoPresupuesto(c) {
  const n = ((await DB.ajuste('contadorPresu')) || 0) + 1; await DB.fijar('contadorPresu', n);
  const lineas = [];
  // Propone las tarifas de los servicios que le interesan (la profesional borra o cambia lo que no vaya).
  for (const s of serviciosElegidos(c)) { const t = (S.tarifas || D.tarifas).find(x => x.s === s && !x.oculta && x.p != null && s !== 'laser'); if (t) lineas.push({ tarifaId: t.id, concepto: t.n, cant: 1, precio: t.p, precioTarifa: t.p, dto: 0, sesiones: t.sesiones || 1, servicio: t.s }); }
  const cond = c.condicion || {};
  return { id: DB.id(), clientaId: c.id, numero: `${new Date().getFullYear()}-${String(n).padStart(3, '0')}`, fecha: new Date().toISOString(),
    lineas, dto: { tipo: '%', valor: +cond.pct || 0, motivo: cond.motivo || '' }, notas: '', estado: 'borrador', envios: [], version: 1, nueva: true };
}
async function vistaPresupuestos(c) {
  if (S.presu) return vistaPresupuesto(c, S.presu);
  const lista = (await DB.presupuestosDe(c.id)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ESTADO = { borrador: 'Borrador', enviado: 'Enviado', pendiente: 'Pendiente de envío', aceptado: 'Aceptado', rechazado: 'Rechazado' };
  return `<section class="tarjeta"><div class="fila"><h2 style="margin:0">Presupuestos</h2><span class="espacio"></span><button class="btn coral" data-a="nuevo-presu">+ Nuevo presupuesto</button></div>
    ${c.condicion?.pct ? `<p style="color:var(--suave)">Condición especial de esta clienta: ${c.condicion.pct} % (${esc(c.condicion.motivo || 'sin motivo')}). Se aplica sola a los presupuestos nuevos.</p>` : ''}
    ${lista.length ? `<ul class="lista" style="margin-top:14px">${lista.map(p => `<li><button data-verpresu="${p.id}"><span class="ini">€</span><span style="flex:1">
      <span class="nom">Nº ${esc(p.numero)} · ${euros(calcPresu(p).total)}</span> <span class="etiqueta ${p.estado === 'aceptado' ? 'ok' : p.estado === 'pendiente' ? 'ambar' : ''}">${ESTADO[p.estado] || p.estado}</span><br>
      <span class="det">${fecha(p.fecha)} · ${esc(p.lineas.map(l => l.concepto).join(', ').slice(0, 90))}${p.envios.length ? ' · enviado ' + fecha(p.envios.at(-1).fecha) : ''}</span></span><span>›</span></button></li>`).join('')}</ul>`
    : '<p class="vacio">Aún no hay presupuestos.</p>'}</section>`;
}
function vistaPresupuesto(c, p) {
  const k = calcPresu(p), T = (S.tarifas || D.tarifas).filter(t => !t.oculta);
  const grupos = [...new Set(T.map(t => t.g))];
  const validez = masDias(p.fecha, D.validezPresupuesto);
  return `<section class="tarjeta"><div class="fila"><h2 style="margin:0">Presupuesto nº ${esc(p.numero)}</h2><span class="espacio"></span>
      <button class="btn sec" data-a="cerrar-presu">Cerrar</button></div>
    <p style="color:var(--suave)">${fecha(p.fecha)} · válido hasta ${fecha(validez)}${p.version > 1 ? ` · versión ${p.version}` : ''} · Siempre se puede editar.</p>
    <div class="fila"><select id="addtarifa" style="flex:1;min-width:260px"><option value="">Añadir de la tarifa…</option>
      ${grupos.map(g => `<optgroup label="${esc(g)}">${T.filter(t => t.g === g).map(t => `<option value="${t.id}">${esc(t.n)} · ${t.p == null ? 'precio por confirmar' : euros(t.p)}</option>`).join('')}</optgroup>`).join('')}</select>
      <button class="btn" data-a="add-linea">Añadir</button><button class="btn sec" data-a="add-libre">+ Línea libre</button></div>
    ${rutinaSugerida(c, p)}
    <table class="tabla-presu"><thead><tr><th>Concepto</th><th>Uds.</th><th>Precio</th><th>Dto. %</th><th>Importe</th><th></th></tr></thead><tbody>
      ${p.lineas.map((l, i) => { const imp = (+l.precio || 0) * (+l.cant || 1) * (1 - (+l.dto || 0) / 100);
        return `<tr><td><input type="text" data-pl="${i}" data-campo="concepto" value="${esc(l.concepto)}"></td>
          <td><input type="text" inputmode="numeric" data-pl="${i}" data-campo="cant" value="${esc(l.cant)}" class="corto"></td>
          <td><input type="text" inputmode="decimal" data-pl="${i}" data-campo="precio" value="${esc(l.precio ?? '')}" class="medio">${l.precioTarifa != null && +l.precio !== +l.precioTarifa ? `<small class="tachado">${euros(l.precioTarifa)}</small>` : ''}</td>
          <td><input type="text" inputmode="decimal" data-pl="${i}" data-campo="dto" value="${esc(l.dto)}" class="corto"></td>
          <td class="imp">${euros(imp)}</td><td><button class="quitar" data-quitar="${i}" aria-label="Quitar">✕</button></td></tr>`; }).join('')}
      ${p.lineas.length ? '' : '<tr><td colspan="6" class="vacio">Añade servicios de la tarifa o una línea libre.</td></tr>'}</tbody></table>
    <h3>Descuento al total</h3>
    <div class="opciones">${D.descuentos.map(d => `<button type="button" data-dtorap="${esc(d.n)}" data-pct="${d.pct}" class="${p.dto.motivo === d.n ? 'on' : ''}">${esc(d.n)}${d.pct ? ' · ' + d.pct + ' %' : ''}</button>`).join('')}
      <button type="button" data-dtorap="" data-pct="0" class="${!p.dto.valor ? 'on' : ''}">Sin descuento</button></div>
    <div class="rejilla" style="margin-top:10px"><label class="campo"><span>Descuento</span><div class="fila"><input type="text" inputmode="decimal" id="dtovalor" value="${esc(p.dto.valor)}" style="flex:1">
      <select id="dtotipo" style="width:90px"><option ${p.dto.tipo === '%' ? 'selected' : ''}>%</option><option ${p.dto.tipo === '€' ? 'selected' : ''}>€</option></select></div></label>
      <label class="campo"><span>Motivo (solo lo ve el equipo)</span><input type="text" id="dtomotivo" value="${esc(p.dto.motivo)}" placeholder="Familiar, detalle especial…"></label></div>
    <label class="campo"><span>Nota para la clienta (sale en el presupuesto)</span><textarea id="presunotas">${esc(p.notas)}</textarea></label>
    <div class="totales">
      <div><span>Suma</span><b>${euros(k.bruto)}</b></div>
      ${k.dtoLineas ? `<div><span>Descuentos por línea</span><b>− ${euros(k.dtoLineas)}</b></div>` : ''}
      ${k.dtoGlobal ? `<div><span>Descuento${p.dto.tipo === '%' ? ' ' + p.dto.valor + ' %' : ''}</span><b>− ${euros(k.dtoGlobal)}</b></div>` : ''}
      <div class="total"><span>Total (IVA incluido)</span><b>${euros(k.total)}</b></div></div>
    ${p.lineas.some(l => l.precio === null || l.precio === '') ? '<div class="nota">Hay líneas sin precio: escríbelo antes de enviar.</div>' : ''}
    <p style="color:var(--suave);font-size:.9rem">Se enviará a: ${c.sinCorreo || !c.email ? '<b>sin correo</b> (usa WhatsApp o imprime)' : esc(c.email)}${p.envios.length ? ' · Envíos: ' + p.envios.map(x => fecha(x.fecha) + ' (' + x.via + ')').join(', ') : ''}</p>
    <div class="fila fin">
      <button class="btn sec" data-a="estado-presu" data-estado="aceptado">Aceptado</button>
      <button class="btn sec" data-a="estado-presu" data-estado="rechazado">Rechazado</button>
      <span class="espacio"></span>
      <button class="btn sec" data-a="imprimir-presu">PDF / imprimir</button>
      <button class="btn sec" data-a="whatsapp-presu">WhatsApp</button>
      <button class="btn" data-a="guardar-presu">Guardar</button>
      <button class="btn coral" data-a="enviar-presu" ${c.sinCorreo || !correoValido(c.email) ? 'disabled' : ''}>${p.envios.length ? 'Guardar y reenviar' : 'Guardar y enviar por correo'}</button></div>
  </section>`;
}
function htmlPresupuesto(c, p, logoSrc = 'icons/logo.png') {
  const k = calcPresu(p), C = centro(), validez = masDias(p.fecha, D.validezPresupuesto);
  const fila = (a, b, est = '') => `<tr><td style="padding:8px 0;border-bottom:1px solid #E4E8EF;${est}">${a}</td><td style="padding:8px 0;border-bottom:1px solid #E4E8EF;text-align:right;white-space:nowrap;${est}">${b}</td></tr>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Presupuesto ${esc(p.numero)}</title></head>
  <body style="margin:0;background:#FFFBFA;font-family:Helvetica,Arial,sans-serif;color:#1E2B45">
  <div style="max-width:620px;margin:0 auto;padding:28px 24px;background:#FFFFFF">
    <div style="padding-bottom:14px;margin-bottom:20px;border-bottom:4px solid #F97E7F;box-shadow:0 4px 0 #C4D6E8">
      <img src="${logoSrc}" alt="De Seu by Orixe Benestar" width="150" style="display:block;width:150px;height:auto;border:0"></div>
    <p style="font-size:16px">Hola, ${esc(c.nombre)}:</p>
    <p style="font-size:15px;line-height:1.5">Te enviamos el presupuesto que hemos preparado para ti tras la valoración.</p>
    <p style="font-size:13px;color:#5A6680">Presupuesto nº ${esc(p.numero)} · ${fecha(p.fecha)} · válido hasta ${fecha(validez)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      ${p.lineas.map(l => { const imp = (+l.precio || 0) * (+l.cant || 1) * (1 - (+l.dto || 0) / 100);
        return fila(`${esc(l.concepto)}${(+l.cant || 1) > 1 ? ` × ${esc(l.cant)}` : ''}${+l.dto ? ` <span style="color:#B23A48">(−${esc(l.dto)} %)</span>` : ''}`, euros(imp)); }).join('')}
      ${k.dtoGlobal ? fila('Descuento' + (p.dto.tipo === '%' ? ` ${esc(p.dto.valor)} %` : ''), '− ' + euros(k.dtoGlobal), 'color:#B23A48') : ''}
      ${fila('<b>Total (IVA incluido)</b>', `<b style="font-size:18px">${euros(k.total)}</b>`, 'border-bottom:0')}
    </table>
    ${p.lineas.some(l => l.motivoDto) ? `<p style="font-size:14px;color:#B23A48">${esc(D.cosmeticaBono.motivo)}: −${D.cosmeticaBono.pct} % en cosmética Amai Hana.</p>` : ''}
    ${p.notas ? `<p style="font-size:15px;line-height:1.5;background:#FFFBFA;padding:12px 14px;border-radius:8px">${esc(p.notas).replace(/\n/g, '<br>')}</p>` : ''}
    <p style="font-size:15px;line-height:1.5">Valoramos. Planificamos. Y lo compruebas tú.</p>
    <p style="font-size:13px;color:#5A6680;line-height:1.5">${esc(C.nombre)} ${esc(C.sub)} · ${esc(C.direccion)}${C.whatsapp ? ` · WhatsApp +${C.whatsapp.slice(0, 2)} ${C.whatsapp.slice(2)}` : ''}<br>
    Has recibido este correo porque lo pediste en tu valoración. Si no quieres recibir más, responde «baja».</p>
  </div></body></html>`;
}
function textoPresupuesto(c, p) {
  const k = calcPresu(p);
  return `Hola, ${c.nombre} 👋 Te paso el presupuesto de De Seu (nº ${p.numero}):\n\n` +
    p.lineas.map(l => `· ${l.concepto}${(+l.cant || 1) > 1 ? ' × ' + l.cant : ''}: ${euros((+l.precio || 0) * (+l.cant || 1) * (1 - (+l.dto || 0) / 100))}`).join('\n') +
    (k.dtoGlobal ? `\n· Descuento: − ${euros(k.dtoGlobal)}` : '') + `\n\nTotal: ${euros(k.total)} (IVA incluido). Válido ${D.validezPresupuesto} días.` + (p.notas ? `\n\n${p.notas}` : '');
}
async function enviarCorreoPresupuesto(c, p) {
  const url = await DB.ajuste('correoScript'), token = await DB.ajuste('correoToken');
  const asunto = `Tu presupuesto de De Seu · nº ${p.numero}`;
  if (!url) {           // Sin el envío automático configurado: abre el correo con todo escrito.
    location.href = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(textoPresupuesto(c, p))}`;
    p.envios.push({ fecha: new Date().toISOString(), via: 'correo (manual)' }); p.estado = 'enviado';
    return 'manual';
  }
  try {
    const logo = b64(await (await fetch('icons/logo.png')).arrayBuffer());   // el logo va incrustado en el correo (manual: nunca escrito a mano)
    const r = await fetch(url, { method: 'POST', body: JSON.stringify({ token, para: c.email, asunto, html: htmlPresupuesto(c, p, 'cid:logo'), logo, archivo: `Presupuesto De Seu ${p.numero}.pdf` }) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'error');
    p.envios.push({ fecha: new Date().toISOString(), via: 'correo' }); p.estado = 'enviado'; delete p.pendienteEnvio;
    return 'ok';
  } catch (e) { p.estado = 'pendiente'; p.pendienteEnvio = true; return 'pendiente'; }
}
async function reintentarEnvios() {
  if (!navigator.onLine || !(await DB.ajuste('correoScript'))) return 0;
  let n = 0;
  for (const p of (await DB.todas('presupuestos')).filter(x => x.pendienteEnvio)) {
    const c = await DB.una('clientas', p.clientaId); if (!c) continue;
    if (await enviarCorreoPresupuesto(c, p) === 'ok') { await DB.guardar('presupuestos', p); n++; }
  }
  return n;
}
async function anadirLinea(c, p, tt) {
  p.lineas.push({ tarifaId: tt.id, concepto: tt.n, cant: 1, precio: tt.p, precioTarifa: tt.p, dto: 0, sesiones: tt.sesiones || 1, servicio: tt.s, zona: tt.zona });
  S.bonoActivo = await bonoFacialActivo(c, p);
  if (S.bonoActivo) aplicarDtoCosmetica(p);
  p.cambiado = true; const y = scrollY; await pantallaFicha(); scrollTo(0, y);
}
async function accionPresupuesto(a, t) {
  const c = S.clienta, p = S.presu;
  if (a === 'nuevo-presu') { S.presu = await nuevoPresupuesto(c); S.bonoActivo = await bonoFacialActivo(c, S.presu); return pantallaFicha(); }
  if (!p) return;
  if (a === 'cerrar-presu') { S.presu = null; return pantallaFicha(); }
  if (a === 'add-linea') {
    const tt = tarifa(document.getElementById('addtarifa').value); if (!tt) return avisar('Elige un servicio de la tarifa');
    return anadirLinea(c, p, tt);
  }
  if (a === 'add-libre') { p.lineas.push({ concepto: 'Concepto', cant: 1, precio: '', dto: 0 }); return pantallaFicha(); }
  if (a === 'estado-presu') { p.estado = t.dataset.estado; await guardarPresu(p); avisar(p.estado === 'aceptado' ? 'Presupuesto aceptado' : 'Presupuesto rechazado'); return pantallaFicha(); }
  if (a === 'imprimir-presu') {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0'; f.srcdoc = htmlPresupuesto(c, p);
    document.body.appendChild(f); f.onload = () => { f.contentWindow.print(); setTimeout(() => f.remove(), 2000); }; return;
  }
  if (a === 'whatsapp-presu') {
    let tel = (c.telefono || '').replace(/\D/g, ''); if (tel.length === 9) tel = '34' + tel;
    if (!tel) return avisar('No hay teléfono');
    p.envios.push({ fecha: new Date().toISOString(), via: 'WhatsApp' }); if (p.estado === 'borrador') p.estado = 'enviado';
    await guardarPresu(p); window.open(`https://wa.me/${tel}?text=${encodeURIComponent(textoPresupuesto(c, p))}`, '_blank'); return pantallaFicha();
  }
  if (a === 'guardar-presu' || a === 'enviar-presu') {
    if (p.lineas.some(l => l.precio === null || l.precio === '' || isNaN(+l.precio))) return avisar('Hay líneas sin precio');
    const primeraVez = p.nueva;
    if (!primeraVez && p.envios.length && p.cambiado) { p.version++; }
    delete p.cambiado;
    const auto = primeraVez && (await DB.ajuste('envioAuto')) && (await DB.ajuste('correoScript')) && correoValido(c.email) && !c.sinCorreo;
    if (a === 'enviar-presu' || auto) {
      const r = await enviarCorreoPresupuesto(c, p);
      await guardarPresu(p);
      avisar(r === 'ok' ? `Presupuesto enviado a ${c.email}` : r === 'pendiente' ? 'Sin conexión: se enviará solo cuando vuelva internet' : 'Se ha abierto el correo con el presupuesto: pulsa «Enviar»');
    } else { await guardarPresu(p); avisar('Presupuesto guardado'); }
    S.presu = null; return pantallaFicha();
  }
}
async function guardarPresu(p) { delete p.nueva; p.actualizado = new Date().toISOString(); await DB.guardar('presupuestos', p); await guardarClienta(true); }

// ---------- Recordatorios ----------
function ventanaLaserDesde(iso) {
  const d = iso.slice(0, 10);
  return D.ventanasLaser.find(([, fin]) => fin >= d) || null;
}
async function calcularRecordatorios() {
  const [clientas, sesiones, presus] = await Promise.all([DB.todas('clientas'), DB.todas('sesiones'), DB.todas('presupuestos')]);
  const estado = (await DB.ajuste('recordatorios')) || {}, hoyIso = new Date().toISOString();
  const out = [], sinPermiso = new Set();
  for (const c of clientas) {
    const suyas = sesiones.filter(s => s.clientaId === c.id).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const grupos = {};
    for (const s of suyas) { const k = s.servicio + (s.servicio === 'laser' ? '|' + (s.datos.zona || '') : ''); (grupos[k] ||= []).push(s); }
    for (const [k, lista] of Object.entries(grupos)) {
      const servicio = k.split('|')[0], zona = k.split('|')[1] || '', R = D.recordatorios[servicio]; if (!R) continue;
      const ult = lista.at(-1);
      const tanda = lista.filter(s => new Date(ult.fecha) - new Date(s.fecha) <= 200 * 864e5 && s.datos.parcheo !== 'si').length;
      // Si aceptó un bono de ese servicio, la tanda es la del bono.
      const bono = Math.max(0, ...presus.filter(p => p.clientaId === c.id && p.estado === 'aceptado').flatMap(p => p.lineas).filter(l => l.servicio === servicio).map(l => (l.sesiones || 1) * (+l.cant || 1)));
      const curso = bono > 1 ? bono : R.curso;
      let tipo, vence, texto;
      if (curso && tanda < curso) {
        tipo = 'seguir';
        vence = ult.proxima ? ult.proxima[servicio === 'laser' ? 0 : 1] : masDias(ult.fecha, R.retomar || 21);
        texto = `Lleva ${tanda} de ${curso} sesiones. La siguiente tocaba ${ult.proxima ? 'entre ' + fecha(ult.proxima[0]) + ' y ' + fecha(ult.proxima[1]) : 'hacia el ' + fecha(vence)}.`;
      } else {
        tipo = 'mant'; vence = masDias(ult.fecha, R.mant);
        texto = curso ? `Terminó una tanda de ${tanda} sesiones el ${fecha(ult.fecha)}. Mantenimiento recomendado a los ${R.texto}.` : `Última sesión el ${fecha(ult.fecha)}. Lo habitual es repetir cada ${R.texto}.`;
      }
      let ventana = null;
      if (servicio === 'laser') {
        ventana = ventanaLaserDesde(vence);
        if (ventana) { const aviso = masDias(ventana[0] + 'T09:00:00', -14); vence = aviso > vence ? aviso : vence; texto += ` Próxima semana de láser: del ${fecha(ventana[0])} al ${fecha(ventana[1])}.`; }
      }
      const clave = [c.id, k, ult.id, tipo].join('|'), st = estado[clave];
      if (st && (st.estado === 'hecho' || st.estado === 'descartado')) continue;
      if (st && st.estado === 'pospuesto' && st.hasta > vence) vence = st.hasta;
      if (!c.consent?.comunicaciones) { sinPermiso.add(c.id); }
      out.push({ clave, c, servicio, zona, tipo, vence, texto, ev: R.ev, ventana, permiso: !!c.consent?.comunicaciones });
    }
  }
  out.sort((a, b) => a.vence.localeCompare(b.vence));
  return { lista: out, hoy: hoyIso, sinPermiso: sinPermiso.size };
}
function mensajeRecordatorio(r) {
  const n = r.c.nombre, sv = nomServ(r.servicio).toLowerCase() + (r.zona ? ` (${r.zona.toLowerCase()})` : '');
  if (r.servicio === 'laser' && r.ventana) return `Hola, ${n} 👋 Soy de De Seu. Del ${fecha(r.ventana[0])} al ${fecha(r.ventana[1])} tenemos el láser en el centro. ¿Te reservo para tu sesión de ${sv}?`;
  if (r.tipo === 'seguir') return `Hola, ${n} 👋 Soy de De Seu. Te toca la siguiente sesión de ${sv}. ¿Te busco hueco esta semana?`;
  return `Hola, ${n} 👋 Soy de De Seu. Ya ha pasado un tiempo desde tu última sesión de ${sv}. Para mantener lo conseguido, ahora es buen momento para una sesión de mantenimiento. ¿Te busco hueco?`;
}
async function contarRecordatoriosHoy() { const { lista } = await calcularRecordatorios(); const h = new Date().toISOString(); return lista.filter(r => r.vence <= h && r.permiso).length; }
async function pantallaRecordatorios() {
  const { lista, sinPermiso } = await calcularRecordatorios(), h = new Date().toISOString(), en14 = masDias(h, 14);
  const item = r => `<li class="recor ${r.permiso ? '' : 'sinpermiso'}"><div style="flex:1"><b>${esc(r.c.nombre)} ${esc(r.c.apellidos)}</b> · ${esc(nomServ(r.servicio))}${r.zona ? ' · ' + esc(r.zona) : ''}
      <span class="etiqueta">${r.tipo === 'seguir' ? 'Siguiente sesión' : 'Mantenimiento'}</span><br>
      <span class="det">${esc(r.texto)} Recordar: ${fecha(r.vence)}.</span>
      <details class="ayuda"><summary>¿De dónde sale?</summary><p>${esc(r.ev)}</p></details>
      ${r.permiso ? '' : '<span class="det" style="color:var(--profundo)">Sin permiso para escribirle: díselo en persona cuando venga.</span>'}</div>
    <div class="botones">${r.permiso && r.c.telefono ? `<button class="btn" data-rec="wa" data-k="${esc(r.clave)}">WhatsApp</button>` : ''}
      ${r.permiso && correoValido(r.c.email) ? `<button class="btn sec" data-rec="mail" data-k="${esc(r.clave)}">Correo</button>` : ''}
      <button class="btn sec" data-rec="hecho" data-k="${esc(r.clave)}">Hecho</button>
      <button class="btn sec" data-rec="pos" data-k="${esc(r.clave)}">+7 días</button>
      <button class="btn peligro" data-rec="desc" data-k="${esc(r.clave)}">Descartar</button></div></li>`;
  const ya = lista.filter(r => r.vence <= h), pronto = lista.filter(r => r.vence > h && r.vence <= en14), luego = lista.filter(r => r.vence > en14);
  pintar(`${barra('Recordatorios', 'inicio')}<main>
    <section class="tarjeta"><h2>Para hoy o atrasados (${ya.length})</h2>${ya.length ? `<ul class="lista-recor">${ya.map(item).join('')}</ul>` : '<p class="vacio">Nada pendiente hoy.</p>'}</section>
    <section class="tarjeta"><h2>Próximos 14 días (${pronto.length})</h2>${pronto.length ? `<ul class="lista-recor">${pronto.map(item).join('')}</ul>` : '<p class="vacio">Nada.</p>'}</section>
    <section class="tarjeta"><details><summary><b>Más adelante (${luego.length})</b></summary>${luego.length ? `<ul class="lista-recor">${luego.map(item).join('')}</ul>` : ''}</details></section>
    <p style="color:var(--suave);font-size:.9rem">Los recordatorios salen solos de las sesiones guardadas y de los bonos aceptados. Solo se escribe a quien dio permiso en el consentimiento${sinPermiso ? ` (${sinPermiso} clienta${sinPermiso > 1 ? 's' : ''} sin permiso)` : ''}. Los mensajes no mencionan nada de salud.</p>
  </main>`);
  $app.onclick = async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.a) return acciones(t.dataset.a);
    const r = lista.find(x => x.clave === t.dataset.k); if (!r) return;
    const est = (await DB.ajuste('recordatorios')) || {};
    if (t.dataset.rec === 'wa') {
      let tel = r.c.telefono.replace(/\D/g, ''); if (tel.length === 9) tel = '34' + tel;
      window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensajeRecordatorio(r))}`, '_blank');
      est[r.clave] = { estado: 'hecho', fecha: new Date().toISOString(), via: 'WhatsApp' };
    }
    if (t.dataset.rec === 'mail') {
      location.href = `mailto:${encodeURIComponent(r.c.email)}?subject=${encodeURIComponent('Tu próxima sesión en De Seu')}&body=${encodeURIComponent(mensajeRecordatorio(r))}`;
      est[r.clave] = { estado: 'hecho', fecha: new Date().toISOString(), via: 'correo' };
    }
    if (t.dataset.rec === 'hecho') est[r.clave] = { estado: 'hecho', fecha: new Date().toISOString() };
    if (t.dataset.rec === 'pos') est[r.clave] = { estado: 'pospuesto', hasta: masDias((r.vence > h ? r.vence : h), 7) };
    if (t.dataset.rec === 'desc') est[r.clave] = { estado: 'descartado', fecha: new Date().toISOString() };
    await DB.fijar('recordatorios', est); avisar('Recordatorio actualizado'); pantallaRecordatorios();
  };
}

// ---------- Tarifa editable ----------
async function pantallaTarifas() {
  const T = S.tarifas, grupos = [...new Set(T.map(t => t.g))];
  pintar(`${barra('Tarifa', 'copias')}<main>
    <div class="nota">Precios de la hoja de De Seu del 22-nov-2026 (la cosmética, de la hoja de mayo). Los cambios valen para los presupuestos nuevos; los ya hechos no cambian.</div>
    ${grupos.map(g => `<section class="tarjeta"><h2>${esc(g)}</h2>${T.map((t, i) => t.g !== g ? '' : `<div class="fila-tarifa ${t.oculta ? 'oculta' : ''}">
      <input type="text" data-ti="${i}" data-tc="n" value="${esc(t.n)}" style="flex:1">
      <input type="text" inputmode="decimal" data-ti="${i}" data-tc="p" value="${t.p ?? ''}" placeholder="por confirmar" class="medio"> €
      <label class="check" style="min-height:0"><input type="checkbox" data-to="${i}" ${t.oculta ? '' : 'checked'}> Visible</label></div>`).join('')}</section>`).join('')}
    <section class="tarjeta"><h2>Añadir a la tarifa</h2><div class="rejilla">
      <label class="campo"><span>Grupo</span><input type="text" id="ng" list="grupos" value="Otros"><datalist id="grupos">${grupos.map(g => `<option>${esc(g)}</option>`).join('')}</datalist></label>
      <label class="campo"><span>Servicio (para fichas y recordatorios)</span><select id="ns"><option value="">— (producto u otro)</option>${Object.keys(D.servicios).map(s => `<option value="${s}">${esc(nomServ(s))}</option>`).join('')}</select></label>
      <label class="campo"><span>Nombre</span><input type="text" id="nn"></label><label class="campo"><span>Precio (€)</span><input type="text" inputmode="decimal" id="np"></label>
      <label class="campo"><span>Sesiones incluidas (bono)</span><input type="text" inputmode="numeric" id="nses" value="1"></label></div>
      <button class="btn" data-a="tarifa-add">Añadir</button></section>
    <div class="fila"><button class="btn peligro" data-a="tarifa-reset">Volver a la tarifa original</button><span class="espacio"></span><button class="btn coral" data-a="tarifa-guardar">Guardar tarifa</button></div>
  </main>`);
  $app.oninput = e => { const t = e.target; if (t.dataset.ti) { const x = S.tarifas[+t.dataset.ti]; x[t.dataset.tc] = t.dataset.tc === 'p' ? (t.value === '' ? null : +t.value.replace(',', '.')) : t.value; } };
  $app.onchange = e => { const t = e.target; if (t.dataset.to) S.tarifas[+t.dataset.to].oculta = !t.checked; };
  $app.onclick = async e => {
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (['inicio', 'bloquear', 'mejora', 'copias'].includes(a)) return acciones(a);
    if (a === 'tarifa-add') {
      const n = document.getElementById('nn').value.trim(); if (!n) return avisar('Escribe el nombre');
      const p = document.getElementById('np').value.replace(',', '.');
      S.tarifas.push({ id: 'x_' + DB.id().slice(0, 8), g: document.getElementById('ng').value.trim() || 'Otros', s: document.getElementById('ns').value || null, n, p: p === '' ? null : +p, sesiones: +document.getElementById('nses').value || 1 });
      return pantallaTarifas();
    }
    if (a === 'tarifa-guardar') { await DB.fijar('tarifas', { version: D.tarifaVersion, lista: S.tarifas }); avisar('Tarifa guardada'); }
    if (a === 'tarifa-reset') { if (!confirm('¿Volver a la tarifa original? Se pierden los cambios de precios.')) return; await DB.fijar('tarifas', null); await cargarTarifas(); pantallaTarifas(); }
  };
}

// ---------- Promociones: solo a quien las pidió, y solo de los temas que eligió ----------
const temaNom = id => D.temasPromo.find(t => t.id === id)?.n || id;
function destinatarias(p, clientas) {
  return clientas.filter(c => c.promos?.acepta && (c.promos.temas || []).some(t => p.temas.includes(t)) && (c.promos.canales || []).length);
}
function textoPromo(p, c) {
  return `Hola, ${c.nombre} 👋 ${p.texto}${p.hasta ? `\n\nVálida hasta el ${fecha(p.hasta + 'T12:00:00')}.` : ''}\n\nDe Seu · ${centro().direccion}. Si no quieres recibir más promociones, responde «baja».`;
}
function htmlPromo(p, c, logoSrc) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(p.titulo)}</title></head>
  <body style="margin:0;background:#FFFBFA;font-family:Helvetica,Arial,sans-serif;color:#1E2B45"><div style="max-width:620px;margin:0 auto;padding:28px 24px;background:#fff">
    <div style="padding-bottom:14px;margin-bottom:20px;border-bottom:4px solid #F97E7F;box-shadow:0 4px 0 #C4D6E8"><img src="${logoSrc}" alt="De Seu by Orixe Benestar" width="150" style="display:block;width:150px;height:auto;border:0"></div>
    <p style="font-size:16px">Hola, ${esc(c.nombre)}:</p>
    <h1 style="font-family:Georgia,serif;font-weight:400;font-size:26px;margin:8px 0 12px">${esc(p.titulo)}</h1>
    <p style="font-size:15px;line-height:1.55">${esc(p.texto).replace(/\n/g, '<br>')}</p>
    ${p.hasta ? `<p style="font-size:14px;color:#B23A48">Válida hasta el ${fecha(p.hasta + 'T12:00:00')}.</p>` : ''}
    <p style="font-size:15px">Reserva por WhatsApp${centro().whatsapp ? `: <a href="https://wa.me/${centro().whatsapp}" style="color:#B23A48">+${centro().whatsapp.slice(0, 2)} ${centro().whatsapp.slice(2)}</a>` : ''}.</p>
    <p style="font-size:12px;color:#5A6680;line-height:1.5">${esc(centro().nombre)} ${esc(centro().sub)} · ${esc(centro().direccion)}<br>
    Te escribimos porque elegiste recibir promociones sobre ${esc((c.promos.temas || []).filter(t => p.temas.includes(t)).map(temaNom).join(', ').toLowerCase())}. Si no quieres recibir más, responde «baja».</p>
  </div></body></html>`;
}
async function guardarPromos(lista) { await DB.fijar('promociones', lista); }
async function pantallaPromos() {
  const lista = (await DB.ajuste('promociones')) || [], clientas = await DB.todas('clientas');
  const conPermiso = clientas.filter(c => c.promos?.acepta).length;
  if (S.promo) return editorPromo(S.promo, clientas, lista);
  if (S.promoVer) return detallePromo(lista.find(p => p.id === S.promoVer), clientas, lista);
  pintar(`${barra('Promociones', 'inicio')}<main>
    <section class="tarjeta"><div class="fila"><h2 style="margin:0">Promociones</h2><span class="espacio"></span><button class="btn coral" data-a="nueva-promo">+ Nueva promoción</button></div>
      <p class="det">Solo se escribe a quien lo pidió en su recorrido y solo sobre los temas que eligió. Ahora: <b>${conPermiso}</b> clienta${conPermiso === 1 ? '' : 's'} con permiso.</p>
      <div class="globos" style="margin-top:6px">${D.temasPromo.map(t => `<span class="globo-mini fam-${t.fam}">${esc(t.n)} · ${clientas.filter(c => c.promos?.acepta && c.promos.temas.includes(t.id)).length}</span>`).join('')}</div>
      ${lista.length ? `<ul class="lista" style="margin-top:16px">${lista.slice().reverse().map(p => { const d = destinatarias(p, clientas), env = Object.keys(p.envios || {}).length;
        return `<li><button data-verpromo="${p.id}"><span class="ini">%</span><span style="flex:1"><span class="nom">${esc(p.titulo)}</span>
          ${p.hasta && p.hasta < hoy() ? '<span class="etiqueta">Terminada</span>' : ''}<br>
          <span class="det">${p.temas.map(t => `<span class="globo-mini fam-${D.temasPromo.find(x => x.id === t)?.fam}">${esc(temaNom(t))}</span>`).join('')} ${env} de ${d.length} enviadas${p.hasta ? ' · hasta ' + fecha(p.hasta + 'T12:00:00') : ''}</span></span><span>›</span></button></li>`; }).join('')}</ul>`
      : '<p class="vacio">Aún no hay promociones.</p>'}</section>
    <p class="det">Las ofertas de anuncios de Meta las lleva André; aquí van las que decidáis comunicar a vuestras clientas.</p></main>`);
  $app.onclick = async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.verpromo) { S.promoVer = t.dataset.verpromo; return pantallaPromos(); }
    if (t.dataset.a === 'nueva-promo') { S.promo = { id: DB.id(), titulo: '', texto: '', temas: [], hasta: '', creada: new Date().toISOString(), envios: {} }; return pantallaPromos(); }
    if (t.dataset.a) { S.promo = S.promoVer = null; return acciones(t.dataset.a); }
  };
}
function editorPromo(p, clientas, lista) {
  const d = destinatarias(p, clientas);
  pintar(`${barra('Nueva promoción', 'promociones')}<main><section class="tarjeta">
    <label class="campo"><span>Título (sale en el correo)</span><input type="text" id="ptit" value="${esc(p.titulo)}" placeholder="Ej.: Semana de láser en diciembre"></label>
    <label class="campo"><span>Mensaje (WhatsApp y correo). Sin promesas de resultados ni palabras médicas.</span><textarea id="ptxt" style="min-height:120px" placeholder="Ej.: Del 4 al 14 de diciembre tenemos el láser en el centro. Si quieres empezar o continuar, te buscamos hueco.">${esc(p.texto)}</textarea></label>
    <label class="campo" style="max-width:260px"><span>Válida hasta</span><input type="date" id="phasta" value="${esc(p.hasta)}"></label>
    <div class="campo"><span class="lbl">¿A quién le interesa? Se enviará a las clientas que eligieron alguno de estos temas.</span>
      <div class="globos">${D.temasPromo.map(t => globoTema(t, `data-ptema="${t.id}"`, p.temas.includes(t.id))).join('')}</div></div>
    <div class="nota" style="margin-top:14px"><b>${d.length}</b> clienta${d.length === 1 ? '' : 's'} recibirán esta promoción.</div>
    <div class="fila fin"><button class="btn sec" data-a="cancelar-promo">Cancelar</button><button class="btn coral" data-a="guardar-promo">Guardar y ver destinatarias</button></div>
  </section></main>`);
  const leer = () => { p.titulo = document.getElementById('ptit').value; p.texto = document.getElementById('ptxt').value; p.hasta = document.getElementById('phasta').value; };
  $app.onclick = async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.ptema) { leer(); const i = p.temas.indexOf(t.dataset.ptema); i >= 0 ? p.temas.splice(i, 1) : p.temas.push(t.dataset.ptema); return editorPromo(p, clientas, lista); }
    if (t.dataset.a === 'cancelar-promo' || t.dataset.a === 'promociones') { S.promo = null; return pantallaPromos(); }
    if (t.dataset.a === 'guardar-promo') {
      leer();
      if (!p.titulo.trim() || !p.texto.trim()) return avisar('Falta el título o el mensaje');
      if (!p.temas.length) return avisar('Elige al menos un tema');
      const i = lista.findIndex(x => x.id === p.id); i >= 0 ? lista[i] = p : lista.push(p);
      await guardarPromos(lista); S.promo = null; S.promoVer = p.id; return pantallaPromos();
    }
    if (t.dataset.a) { S.promo = null; return acciones(t.dataset.a); }
  };
}
async function detallePromo(p, clientas, lista) {
  if (!p) { S.promoVer = null; return pantallaPromos(); }
  const d = destinatarias(p, clientas), script = await DB.ajuste('correoScript');
  const porCorreo = d.filter(c => c.promos.canales.includes('correo') && correoValido(c.email) && !p.envios[c.id]);
  pintar(`${barra(esc(p.titulo), 'promociones')}<main>
    <section class="tarjeta"><h2>${esc(p.titulo)}</h2>
      <div class="globos" style="margin-bottom:10px">${p.temas.map(t => `<span class="globo-mini fam-${D.temasPromo.find(x => x.id === t)?.fam}">${esc(temaNom(t))}</span>`).join('')}</div>
      <p style="white-space:pre-line;background:var(--rosapalo);padding:12px 14px;border-radius:12px">${esc(d[0] ? textoPromo(p, d[0]) : p.texto)}</p>
      <div class="fila"><button class="btn sec" data-a="editar-promo">Editar</button><span class="espacio"></span>
        ${script && porCorreo.length ? `<button class="btn coral" data-a="correo-todas">Enviar por correo a ${porCorreo.length}</button>` : ''}</div></section>
    <section class="tarjeta"><h2>Destinatarias (${d.length})</h2>
      ${d.length ? `<ul class="lista-recor">${d.map(c => { const env = p.envios[c.id], wa = c.promos.canales.includes('whatsapp') && c.telefono, ml = c.promos.canales.includes('correo') && correoValido(c.email);
        return `<li class="recor"><div style="flex:1"><b>${esc(c.nombre)} ${esc(c.apellidos)}</b> ${env ? `<span class="etiqueta ok">Enviada ${fecha(env.fecha)} · ${esc(env.via)}</span>` : ''}<br>
          <span class="det">Le interesa: ${esc(c.promos.temas.filter(t => p.temas.includes(t)).map(temaNom).join(', '))} · por ${c.promos.canales.map(x => x === 'whatsapp' ? 'WhatsApp' : 'correo').join(' y ')}</span></div>
          <div class="botones">${wa ? `<button class="btn" data-pw="${c.id}">WhatsApp</button>` : ''}${ml ? `<button class="btn sec" data-pm="${c.id}">Correo</button>` : ''}
          ${env ? '' : `<button class="btn sec" data-pok="${c.id}">Hecho</button>`}</div></li>`; }).join('')}</ul>`
      : '<p class="vacio">Nadie ha pedido promociones de estos temas todavía.</p>'}
      <p class="det">Cada WhatsApp se abre con el mensaje escrito: solo hay que pulsar «Enviar». Los correos salen desde la cuenta del centro si está configurado en Ajustes.</p></section>
  </main>`);
  const marcar = async (id, via) => { p.envios[id] = { fecha: new Date().toISOString(), via }; await guardarPromos(lista); };
  $app.onclick = async e => {
    const t = e.target.closest('button'); if (!t) return;
    const c = clientas.find(x => x.id === (t.dataset.pw || t.dataset.pm || t.dataset.pok));
    if (t.dataset.pw) { let tel = c.telefono.replace(/\D/g, ''); if (tel.length === 9) tel = '34' + tel; window.open(`https://wa.me/${tel}?text=${encodeURIComponent(textoPromo(p, c))}`, '_blank'); await marcar(c.id, 'WhatsApp'); return detallePromo(p, clientas, lista); }
    if (t.dataset.pm) {
      if (script) { const ok = await enviarCorreoPromo(p, c); if (!ok) return avisar('No se pudo enviar: revisa la conexión'); await marcar(c.id, 'correo'); avisar('Correo enviado'); }
      else { location.href = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(p.titulo)}&body=${encodeURIComponent(textoPromo(p, c))}`; await marcar(c.id, 'correo (manual)'); }
      return detallePromo(p, clientas, lista);
    }
    if (t.dataset.pok) { await marcar(c.id, 'otro'); return detallePromo(p, clientas, lista); }
    if (t.dataset.a === 'correo-todas') {
      if (!confirm(`¿Enviar «${p.titulo}» por correo a ${porCorreo.length} clientas?`)) return;
      let n = 0; for (const x of porCorreo) if (await enviarCorreoPromo(p, x)) { await marcar(x.id, 'correo'); n++; }
      avisar(`${n} correo${n === 1 ? '' : 's'} enviado${n === 1 ? '' : 's'}`); return detallePromo(p, clientas, lista);
    }
    if (t.dataset.a === 'editar-promo') { S.promo = p; S.promoVer = null; return pantallaPromos(); }
    if (t.dataset.a === 'promociones') { S.promoVer = null; return pantallaPromos(); }
    if (t.dataset.a) { S.promoVer = null; return acciones(t.dataset.a); }
  };
}
async function enviarCorreoPromo(p, c) {
  try {
    const url = await DB.ajuste('correoScript'), token = await DB.ajuste('correoToken');
    const logo = b64(await (await fetch('icons/logo.png')).arrayBuffer());
    const r = await fetch(url, { method: 'POST', body: JSON.stringify({ token, para: c.email, asunto: p.titulo, html: htmlPromo(p, c, 'cid:logo'), logo, sinPdf: true }) });
    return (await r.json()).ok;
  } catch (e) { return false; }
}

// ---------- arranque ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage?.persist) navigator.storage.persist();   // que el navegador no borre los datos por falta de espacio
pantallaBloqueo();
})();
