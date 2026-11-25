// Datos fijos de la app De Seu · v0.7.1 (25-nov-2026). Solo De Seu: las valoraciones de Orixe van en su propia app.
// BORRADOR: el cuestionario, las reglas y los textos legales los revisa la profesional y el gestor / DPD
// antes de usarlos con clientas reales. Fuentes en sistema-redes/app-tablet/02-contraindicaciones.md.
// Niveles: 'rojo' = no tratar (o no en esa zona); 'ambar' = esperar o pedir autorización médica; 'aviso' = se puede, con precaución.
(() => {
const LASER = ['laser'], RF = ['rf_facial', 'rf_corporal'], APARATOS = ['laser', 'rf_facial', 'rf_corporal'];
const CIRC = ['preso', 'madero', 'masaje', 'rf_corporal'], OJOS = ['pestanas', 'cejas'];
const TODOS = '*';

window.DATOS = {
  version: '0.7.2',
  centros: {
    deseu: {
      nombre: 'De Seu', sub: 'by Orixe Benestar', direccion: 'Rúa do Grove 2 · Coia · Vigo', whatsapp: '34746075962',
      servicios: ['valoracion', 'higiene', 'hidratacion', 'rf_facial', 'rf_corporal', 'laser', 'cejas', 'pestanas', 'craneal', 'madero', 'preso', 'masaje'],
      // Fotos de seguimiento: cada zona se fotografía en 5 vistas (de lateral a lateral) para comparar segmento a segmento.
      areas: [{ n: 'Rostro', centro: 'frente' }, { n: 'Cuello y escote', centro: 'frente' }, { n: 'Abdomen y cintura', centro: 'frente' },
        { n: 'Brazos', centro: 'frente' }, { n: 'Piernas (delante)', centro: 'frente' }, { n: 'Glúteos y piernas (detrás)', centro: 'espalda' },
        { n: 'Espalda', centro: 'espalda' }],
      // Detalle: una sola foto (zonas pequeñas o láser).
      zonas: ['Axilas', 'Ingles', 'Labio superior', 'Cejas y mirada', 'Mancha o detalle de piel', 'Otra']
    }
  },

  // Las 5 vistas de cada serie de fotos, en el orden en que se ven en el montaje (de su lateral izquierdo a su lateral derecho).
  // ang: hacia dónde apunta la nariz vista desde arriba (0 = mira a la cámara, -90 = a la izquierda de la foto, 180 = de espaldas).
  vistasFoto: {
    frente: [
      { id: 'lat_izq', n: 'Lateral izquierdo', corto: 'Lateral izq.', ang: -90, ins: 'De perfil: que gire hasta mirar a su derecha. Vemos su lado izquierdo.' },
      { id: 'med_izq', n: 'Medio lado izquierdo', corto: 'Medio izq.', ang: -45, ins: 'Que gire a medio camino hacia su derecha.' },
      { id: 'frente', n: 'De frente', corto: 'Frente', ang: 0, ins: 'Mirando a la cámara, barbilla recta y hombros relajados.' },
      { id: 'med_dch', n: 'Medio lado derecho', corto: 'Medio dcho.', ang: 45, ins: 'Que gire a medio camino hacia su izquierda.' },
      { id: 'lat_dch', n: 'Lateral derecho', corto: 'Lateral dcho.', ang: 90, ins: 'De perfil: que gire hasta mirar a su izquierda. Vemos su lado derecho.' }],
    espalda: [
      { id: 'lat_izq', n: 'Lateral izquierdo', corto: 'Lateral izq.', ang: -90, ins: 'De perfil: vemos su lado izquierdo.' },
      { id: 'med_izq_post', n: 'Medio lado izquierdo (de espaldas)', corto: 'Medio izq.', ang: -135, ins: 'De espaldas, girada a medio camino: vemos su lado izquierdo y la espalda.' },
      { id: 'espalda', n: 'De espaldas', corto: 'Espalda', ang: 180, ins: 'De espaldas a la cámara, brazos relajados.' },
      { id: 'med_dch_post', n: 'Medio lado derecho (de espaldas)', corto: 'Medio dcho.', ang: 135, ins: 'De espaldas, girada a medio camino: vemos su lado derecho y la espalda.' },
      { id: 'lat_dch', n: 'Lateral derecho', corto: 'Lateral dcho.', ang: 90, ins: 'De perfil: vemos su lado derecho.' }]
  },

  // Servicios. grupo = qué ficha de sesión y qué consentimiento usa.
  // fam = familia de color del manual de marca: plan (marino), cara y técnica (niebla clara), mirada (niebla), cuerpo y calma (rosa palo).
  servicios: {
    valoracion: { nombre: 'Valoración', grupo: 'otro', fam: 'plan' },
    higiene: { nombre: 'Higiene facial', grupo: 'otro', fam: 'cara' },
    hidratacion: { nombre: 'Hidratación facial', grupo: 'otro', fam: 'cara' },
    rf_facial: { nombre: 'Diatermia facial (radiofrecuencia)', grupo: 'rf', fam: 'cara', intervalo: [7, 14] },
    rf_corporal: { nombre: 'Diatermia corporal (radiofrecuencia)', grupo: 'rf', fam: 'cara', intervalo: [7, 14] },
    laser: { nombre: 'Depilación láser SHR', grupo: 'laser', fam: 'cara' },
    cejas: { nombre: 'Cejas (laminado o depilación)', grupo: 'ojos', fam: 'mirada' },
    pestanas: { nombre: 'Lifting de pestañas', grupo: 'ojos', fam: 'mirada' },
    craneal: { nombre: 'Masaje craneal', grupo: 'otro', fam: 'cuerpo' },
    madero: { nombre: 'Maderoterapia', grupo: 'otro', fam: 'cuerpo' },
    preso: { nombre: 'Presoterapia', grupo: 'otro', fam: 'cuerpo' },
    masaje: { nombre: 'Masaje', grupo: 'otro', fam: 'cuerpo' }
  },

  // Zonas de láser con intervalo orientativo entre sesiones en días (práctica habitual, no evidencia: cara 4–6 sem; cuerpo 6–10).
  zonasLaser: {
    'Labio': [28, 42], 'Cara completa': [28, 42], 'Axilas': [42, 56], 'Ingle completa': [42, 56],
    'Perianal': [42, 56], 'Media pierna': [42, 70], 'Pierna completa': [42, 70], 'Medio brazo': [42, 70], 'Brazo entero': [42, 70],
    'Hombros': [42, 70], 'Tórax': [42, 70], 'Pecho': [42, 70], 'Abdomen': [42, 70], 'Espalda': [42, 70], 'Lumbar': [42, 70],
    'Dorsal': [42, 70], 'Glúteos': [42, 70], 'Cuerpo entero': [42, 70], 'Otra': [42, 70]
  },


  // ---------- Tarifa (hoja de precios de De Seu, 22-nov-2026; cosmética de la hoja de mayo 2026) ----------
  // Editable desde Ajustes → Tarifa. sesiones: nº de sesiones del bono (sirve para los recordatorios).
  // Las ofertas de anuncios (p. ej. «Plan Firmeza») las lleva André: se añaden como línea libre.
  tarifaVersion: '2026-11-22c',
  tarifas: [
    ...[['Ingle completa', 20], ['Perianal', 10], ['Axilas', 15], ['Media pierna', 25], ['Pierna completa', 40], ['Tórax', 30],
      ['Espalda', 30], ['Hombros', 15], ['Glúteos', 20], ['Brazo entero', 25], ['Medio brazo', 20], ['Abdomen', 20], ['Pecho', 20],
      ['Lumbar', 15], ['Dorsal', 15], ['Cuerpo entero', 120], ['Labio', 10], ['Cara completa', 20]]
      .map(([z, p]) => ({ id: 'las_' + z.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\W+/g, '_'), s: 'laser', g: 'Depilación láser (por sesión)', n: z, p, zona: z })),
    { id: 'rf_primera', s: 'rf_facial', g: 'Diatermia facial', n: 'Primera sesión (20 min diatermia + crema final)', p: 35 },
    { id: 'rf_fb_1', s: 'rf_facial', g: 'Diatermia facial', n: 'Facial básico (30 min) · sesión suelta', p: 40 },
    { id: 'rf_fb_4', s: 'rf_facial', g: 'Diatermia facial', n: 'Facial básico · bono 4 sesiones', p: 140, sesiones: 4 },
    { id: 'rf_fb_8', s: 'rf_facial', g: 'Diatermia facial', n: 'Facial básico · bono 8 sesiones', p: 260, sesiones: 8 },
    { id: 'rf_fp_1', s: 'rf_facial', g: 'Diatermia facial', n: 'Facial premium (30 min + masaje 15 min) · sesión suelta', p: 48 },
    { id: 'rf_fp_4', s: 'rf_facial', g: 'Diatermia facial', n: 'Facial premium · bono 4 sesiones', p: 165, sesiones: 4 },
    { id: 'rf_fp_8', s: 'rf_facial', g: 'Diatermia facial', n: 'Facial premium · bono 8 sesiones', p: 290, sesiones: 8 },
    { id: 'rf_cb_1', s: 'rf_corporal', g: 'Diatermia corporal', n: 'Corporal básico (45 min) · sesión suelta', p: 45 },
    { id: 'rf_cb_4', s: 'rf_corporal', g: 'Diatermia corporal', n: 'Corporal básico · bono 4 sesiones', p: 160, sesiones: 4 },
    { id: 'rf_cb_8', s: 'rf_corporal', g: 'Diatermia corporal', n: 'Corporal básico · bono 8 sesiones', p: 300, sesiones: 8 },
    { id: 'rf_cp_1', s: 'rf_corporal', g: 'Diatermia corporal', n: 'Corporal premium (45 min + masaje 15 min) · sesión suelta', p: 50 },
    { id: 'rf_cp_4', s: 'rf_corporal', g: 'Diatermia corporal', n: 'Corporal premium · bono 4 sesiones', p: 175, sesiones: 4 },
    { id: 'rf_cp_8', s: 'rf_corporal', g: 'Diatermia corporal', n: 'Corporal premium · bono 8 sesiones', p: 325, sesiones: 8 },
    { id: 'hig_1', s: 'higiene', g: 'Higiene facial', n: 'Higiene facial básica (1 hora)', p: 40 },
    { id: 'hig_2', s: 'higiene', g: 'Higiene facial', n: 'Higiene + 15 min diatermia', p: 50 },
    { id: 'hid_1', s: 'hidratacion', g: 'Higiene facial', n: 'Hidratación básica', p: 30 },
    { id: 'hid_2', s: 'hidratacion', g: 'Higiene facial', n: 'Hidratación profunda', p: 40 },
    { id: 'cejas_lam', s: 'cejas', g: 'Cejas y pestañas', n: 'Laminado de cejas', p: 20 },
    { id: 'cejas_pinza', s: 'cejas', g: 'Cejas y pestañas', n: 'Depilación de cejas (pinza)', p: 8 },
    { id: 'pest_lift', s: 'pestanas', g: 'Cejas y pestañas', n: 'Lifting de pestañas', p: 30 },
    { id: 'pest_lift_lam', s: 'pestanas', g: 'Cejas y pestañas', n: 'Lifting de pestañas + laminado', p: 45 },
    { id: 'mas_60', s: 'masaje', g: 'Masajes', n: 'Masaje 60 minutos', p: 45 },
    { id: 'mas_45', s: 'masaje', g: 'Masajes', n: 'Masaje 45 minutos', p: 35 },
    { id: 'mas_30', s: 'masaje', g: 'Masajes', n: 'Masaje 30 minutos', p: 25 },
    { id: 'craneo_preso', s: 'craneal', g: 'Masajes', n: 'Presoterapia 30 minutos + masaje craneofacial (+10 €)', p: 30 },
    { id: 'mas_local', s: 'masaje', g: 'Masajes', n: 'Masaje bienestar localizado', p: 30 },
    { id: 'mas_dep', s: 'masaje', g: 'Masajes', n: 'Masaje deportivo 30 minutos', p: 30 },
    { id: 'madero_30', s: 'madero', g: 'Maderoterapia', n: 'Maderoterapia 30 minutos', p: 35 },
    { id: 'madero_60', s: 'madero', g: 'Maderoterapia', n: 'Maderoterapia 1 hora', p: 50 },
    { id: 'madero_60_5', s: 'madero', g: 'Maderoterapia', n: 'Maderoterapia 1 hora · bono 5 sesiones', p: 220, sesiones: 5 },
    { id: 'madero_30_5', s: 'madero', g: 'Maderoterapia', n: 'Maderoterapia 30 minutos · bono 5 sesiones', p: 150, sesiones: 5 },
    { id: 'preso_1', s: 'preso', g: 'Masajes', n: 'Presoterapia 30 minutos', p: 20 },   // Adrián, 22-nov
    // Cosmética Amai Hana (amai-hana.com, revisado el 22-nov-2026). Precio del centro donde ya existía (hoja de mayo); el resto, PVP de la web.
    // cos: datos para la «rutina en casa». citrico = lleva bergamota u otros cítricos (la marca avisa de fotosensibilidad en el Citrus Shot).
    { id: 'cos_spf50', s: null, g: 'Cosmética Amai Hana', n: 'Pantalla solar Pearl Cream SPF50 (filtro mineral) 150 ml', p: 37, cos: { para: ['laser', 'rf_facial', 'higiene', 'hidratacion'], clave: true } },
    { id: 'cos_mousse', s: null, g: 'Cosmética Amai Hana', n: 'Crema de día Mousse Lift 55 ml (piel mixta, grasa o con rojeces)', p: 36, cos: { para: ['rf_facial', 'higiene', 'hidratacion'] } },
    { id: 'cos_thermal', s: null, g: 'Cosmética Amai Hana', n: 'Crema de día Thermal Rose 55 ml (piel seca o sensible)', p: 31, cos: { para: ['rf_facial', 'higiene', 'hidratacion'] } },
    { id: 'cos_g1', s: null, g: 'Cosmética Amai Hana', n: 'Sérum Piel Sedosa G1 30 ml (piel seca o mixta)', p: 35, cos: { para: ['rf_facial', 'hidratacion'] } },
    { id: 'cos_noche_a', s: null, g: 'Cosmética Amai Hana', n: 'Crema de noche Regenerante A+ 55 ml (piel seca)', p: 39, cos: { para: ['rf_facial'], citrico: true } },
    { id: 'cos_noche_c', s: null, g: 'Cosmética Amai Hana', n: 'Crema de noche Sensitive Satin C+ 55 ml (piel madura o con manchas)', p: 39, cos: { para: ['rf_facial'], citrico: true } },
    { id: 'cos_leche', s: null, g: 'Cosmética Amai Hana', n: 'Leche facial Cleansing Rose Lift 150 ml', p: 22, cos: { para: ['higiene', 'hidratacion', 'rf_facial'] } },
    { id: 'cos_jabon', s: null, g: 'Cosmética Amai Hana', n: 'Jabón botánico Phyto Carotene 150 ml', p: 18, cos: { para: ['higiene', 'hidratacion', 'rf_facial'] } },
    { id: 'cos_micelar', s: null, g: 'Cosmética Amai Hana', n: 'Agua micelar Citrus Shot 150 ml (piel grasa)', p: 18, cos: { para: ['higiene'] } },
    { id: 'cos_detox', s: null, g: 'Cosmética Amai Hana', n: 'Mascarilla botánica Détox 120 ml (piel grasa)', p: 27, cos: { para: ['higiene'] } },
    { id: 'cos_pomada', s: null, g: 'Cosmética Amai Hana', n: 'Pomada Calmante 60 ml (tras la depilación)', p: 26, cos: { para: ['laser'] } },
    { id: 'cos_ceramide', s: null, g: 'Cosmética Amai Hana', n: 'Ceramide Oil 100 ml (sin perfume, piel seca o frágil)', p: 29, cos: { para: ['laser', 'rf_corporal', 'madero'] } },
    { id: 'cos_zen', s: null, g: 'Cosmética Amai Hana', n: 'Zen Firming Oil 100 ml (aceite corporal)', p: 39, cos: { para: ['rf_corporal', 'madero', 'masaje'], citrico: true } },
    { id: 'cos_slim', s: null, g: 'Cosmética Amai Hana', n: 'Crema Slim 120 ml (frescor, piernas ligeras)', p: 22, cos: { para: ['preso', 'madero', 'rf_corporal'] } },
    { id: 'cos_bodymilk', s: null, g: 'Cosmética Amai Hana', n: 'Body Milk Thermal Rose 250 ml', p: 22, cos: { para: ['laser', 'masaje', 'madero'] } },
    { id: 'cos_balsamo', s: null, g: 'Cosmética Amai Hana', n: 'Bálsamo de labios 10 ml', p: 8, cos: { para: ['higiene', 'hidratacion'] } },
    { id: 'cos_pack1', s: null, g: 'Cosmética Amai Hana', n: 'Pack jabón botánico + crema Thermal Rose', p: 39 },
    { id: 'cos_pack2', s: null, g: 'Cosmética Amai Hana', n: 'Pack leche Cleansing Rose Lift + crema de día Lift', p: 48 }
  ],
  // Descuentos rápidos. Todos se pueden cambiar en cada presupuesto.
  descuentos: [
    { n: 'Usuaria de Orixe', pct: 10 },          // vigente (confirmado por Adrián, 22-nov-2026)
    { n: 'Familiar o amistad', pct: 20 },
    { n: 'Detalle especial', pct: 0 }
  ],
  // Temas de interés para promociones (los elige la clienta; independiente de lo que venga a hacerse).
  temasPromo: [
    { id: 'facial', n: 'Tratamientos faciales', fam: 'cara', serv: ['rf_facial', 'higiene', 'hidratacion'] },
    { id: 'laser', n: 'Depilación láser', fam: 'cara', serv: ['laser'] },
    { id: 'mirada', n: 'Cejas y pestañas', fam: 'mirada', serv: ['cejas', 'pestanas'] },
    { id: 'masajes', n: 'Masajes y bienestar', fam: 'cuerpo', serv: ['masaje', 'craneal'] },
    { id: 'corporal', n: 'Corporal (maderoterapia, presoterapia, diatermia)', fam: 'cuerpo', serv: ['madero', 'preso', 'rf_corporal'] },
    { id: 'cosmetica', n: 'Cosmética natural', fam: 'plan', serv: [] },
    { id: 'regalo', n: 'Tarjetas regalo y fechas especiales', fam: 'plan', serv: [] }
  ],
  validezPresupuesto: 30,                        // días
  // Venta de cosmética con el bono facial (decisión pendiente de Adrián: % y duración).
  cosmeticaBono: {
    pct: 15,                                     // descuento en cosmética mientras dure un bono facial
    bonos: ['rf_fb_4', 'rf_fb_8', 'rf_fp_4', 'rf_fp_8'],
    diasTrasBono: 30,                            // sigue valiendo hasta 30 días después de la última sesión del bono
    motivo: 'Precio especial por tu bono facial'
  },

  // ---------- Ventanas del láser alquilado (plan/calendario-campanas.md) ----------
  ventanasLaser: [
    ['2026-12-04', '2026-12-14'], ['2027-01-04', '2027-01-12'], ['2027-02-02', '2027-02-08'], ['2027-03-02', '2027-03-08'],
    ['2027-03-30', '2027-04-05'], ['2027-04-27', '2027-05-03'], ['2027-05-25', '2027-05-31'], ['2027-06-22', '2027-06-28']
  ],

  // ---------- Recordatorios ----------
  // curso: sesiones de una tanda; mant: días tras terminar la tanda (o tras la última sesión si no hay tanda) para recordar;
  // retomar: si se corta la tanda, días sin venir para recordar la siguiente. ev: de dónde sale (ver 04-presupuestos-y-recordatorios.md).
  recordatorios: {
    rf_facial: { curso: 4, retomar: 21, mant: 75, texto: '2–3 meses', ev: '[P/G] Mantenimiento mensual a trimestral tras 6–10 sesiones (Sanitas; Rousseaux 2017). Sin ensayos sobre el intervalo exacto.' },
    rf_corporal: { curso: 4, retomar: 21, mant: 75, texto: '2–3 meses', ev: '[P/G] Igual que la facial.' },
    laser: { curso: 6, mant: 270, texto: '6–12 meses', ev: '[G/E] Tras 4–8 sesiones, mantenimiento cada 6–12 meses (StatPearls; ESLD). Se ajusta a la siguiente semana de láser.' },
    madero: { curso: 5, retomar: 21, mant: 30, texto: '1 mes', ev: '[P] Sin evidencia científica; práctica del sector.' },
    preso: { curso: 6, retomar: 21, mant: 30, texto: '1 mes', ev: '[P] Manual physioPRESS: 2–3 sesiones por semana en tanda; mantenimiento sin evidencia.' },
    masaje: { mant: 28, texto: '4 semanas', ev: '[E] Los efectos del masaje se acumulan con la frecuencia y se pierden en semanas (Rapaport 2012, Emory; Sherman 2014, KPWHRI).' },
    craneal: { mant: 28, texto: '4 semanas', ev: '[P] Como el masaje.' },
    higiene: { mant: 35, texto: '4–6 semanas', ev: '[P] Renovación de la piel ~28 días; recomendación habitual de dermatología estética.' },
    hidratacion: { mant: 35, texto: '4–6 semanas', ev: '[P] Como la higiene facial.' },
    pestanas: { mant: 49, texto: '6–8 semanas', ev: '[P] El lifting dura 6–8 semanas por el ciclo de crecimiento de la pestaña (Healthline).' },
    cejas: { mant: 32, texto: '4–5 semanas', ev: '[P] Crecimiento del vello de la ceja (el laminado dura unas 6 semanas).' }
  },

  // ---------- Cuestionario con reglas ----------
  // bloque: qué servicios hacen que se muestre la sección ('*' = siempre); ver: la pregunta solo se muestra con esos servicios.
  // tipo 'sino' → valores 'si'/'no'; tipo 'op' → opciones (la primera es siempre la respuesta «sin problema»).
  // reglas: { v: [valores que la disparan], s: servicios afectados o '*', n: nivel, m: mensaje para la profesional }.
  cuestionario: [
    { titulo: 'Para todas', bloque: TODOS },
    { id: 'embarazo', p: '¿Estás embarazada, puedes estarlo o estás dando el pecho?', tipo: 'op',
      op: ['No', 'Embarazada o puede estarlo', 'Dando el pecho'], reglas: [
        { v: ['Embarazada o puede estarlo'], s: [...APARATOS, 'preso'], n: 'rojo', m: 'Embarazo: no tratar hasta después del parto (seguridad no estudiada).' },
        { v: ['Embarazada o puede estarlo'], s: ['madero', 'masaje'], n: 'ambar', m: 'Embarazo: nunca abdomen; consultar con su matrona o médico.' },
        { v: ['Embarazada o puede estarlo'], s: OJOS, n: 'aviso', m: 'Embarazo: la reacción a los productos es menos previsible.' },
        { v: ['Dando el pecho'], s: LASER, n: 'aviso', m: 'Lactancia: se considera compatible (e-lactancia), pero no tratar el pecho y sin anestésico en zonas amplias.' },
        { v: ['Dando el pecho'], s: RF, n: 'ambar', m: 'Lactancia: evitar tórax y abdomen; consultar.' }] },
    { id: 'cancer', p: '¿Tienes o has tenido cáncer?', tipo: 'op',
      op: ['No', 'Sí, en tratamiento ahora', 'Sí, terminé hace menos de 5 años', 'Sí, hace más de 5 años'], det: true, reglas: [
        { v: ['Sí, en tratamiento ahora'], s: [...APARATOS, ...CIRC], n: 'rojo', m: 'Cáncer en tratamiento: no tratar.' },
        { v: ['Sí, en tratamiento ahora'], s: TODOS, n: 'ambar', m: 'Cáncer en tratamiento: autorización de su oncólogo para cualquier servicio.' },
        { v: ['Sí, terminé hace menos de 5 años'], s: [...APARATOS, ...CIRC], n: 'ambar', m: 'Cáncer en los últimos 5 años: autorización médica por escrito. Nunca sobre zona radiada.' },
        { v: ['Sí, hace más de 5 años'], s: APARATOS, n: 'aviso', m: 'Antecedente de cáncer: no tratar sobre zona radiada.' }] },
    { id: 'implante_electronico', p: '¿Llevas marcapasos, desfibrilador, neuroestimulador, bomba de insulina o sensor de glucosa?', tipo: 'sino', det: true, reglas: [
        { v: ['si'], s: [...RF, 'preso'], n: 'rojo', m: 'Dispositivo electrónico: no aplicar radiofrecuencia ni presoterapia.' },
        { v: ['si'], s: LASER, n: 'ambar', m: 'Dispositivo electrónico: mantener cable y pieza de mano a más de 15 cm; consultar el manual y al médico.' }] },
    { id: 'infeccion', p: '¿Tienes ahora fiebre, alguna infección, heridas, quemaduras o irritación en la zona a tratar?', tipo: 'sino', det: true, reglas: [
        { v: ['si'], s: TODOS, n: 'rojo', m: 'Fiebre, infección o herida: aplazar hasta que se cure (no tratar esa zona).' }] },
    { id: 'herpes', p: '¿Te salen calenturas (herpes labial o genital)?', tipo: 'op', op: ['No', 'Sí, a menudo, pero ahora no', 'Sí, tengo una ahora'], reglas: [
        { v: ['Sí, tengo una ahora'], s: [...APARATOS, 'higiene', 'hidratacion'], n: 'rojo', m: 'Herpes activo: no tratar la zona hasta que cure.' },
        { v: ['Sí, a menudo, pero ahora no'], s: ['laser', 'rf_facial'], n: 'aviso', m: 'Herpes recurrente: el calor puede reactivarlo. Si quiere prevención, que lo consulte con su médico (el centro no receta).' }] },
    { id: 'coagulacion', p: '¿Tomas anticoagulantes (Sintrom, Xarelto, Eliquis…) o tienes problemas de coagulación?', tipo: 'sino', det: true, reglas: [
        { v: ['si'], s: [...APARATOS, ...CIRC], n: 'ambar', m: 'Anticoagulantes: autorización médica. Nunca sugerir dejar la medicación.' }] },
    { id: 'trombosis', p: '¿Has tenido trombosis o flebitis, o tienes ahora una pierna hinchada, caliente y dolorida?', tipo: 'sino', det: true, reglas: [
        { v: ['si'], s: CIRC, n: 'rojo', m: 'Trombosis o sospecha: no hacer presoterapia, maderoterapia, masaje ni RF corporal. Si la pierna está hinchada y dolorida ahora, que vaya al médico hoy.' }] },
    { id: 'varices', p: '¿Tienes varices importantes?', tipo: 'sino', reglas: [
        { v: ['si'], s: ['preso'], n: 'ambar', m: 'Varices importantes: autorización médica para presoterapia.' },
        { v: ['si'], s: ['madero', 'masaje', 'rf_corporal'], n: 'aviso', m: 'Varices: no presionar ni aplicar calor sobre ellas.' }] },
    { id: 'corazon', p: '¿Tienes problemas de corazón o tensión alta que no esté controlada?', tipo: 'sino', det: true, reglas: [
        { v: ['si'], s: ['preso', ...RF], n: 'ambar', m: 'Corazón o tensión sin controlar: autorización médica.' }] },
    { id: 'diabetes', p: '¿Tienes diabetes?', tipo: 'op', op: ['No', 'Sí, bien controlada', 'Sí, mal controlada o con pérdida de sensibilidad'], reglas: [
        { v: ['Sí, bien controlada'], s: APARATOS, n: 'aviso', m: 'Diabetes: menos potencia y vigilar el calor; cicatriza más lento.' },
        { v: ['Sí, mal controlada o con pérdida de sensibilidad'], s: [...APARATOS, 'preso'], n: 'ambar', m: 'Diabetes mal controlada o neuropatía: autorización médica; no nota bien el calor.' }] },
    { id: 'epilepsia', p: '¿Tienes epilepsia o te han dado crisis con luces o destellos?', tipo: 'sino', reglas: [
        { v: ['si'], s: APARATOS, n: 'ambar', m: 'Epilepsia: autorización médica (sobre todo con luz pulsada).' }] },
    { id: 'autoinmune', p: '¿Tienes alguna enfermedad autoinmune (lupus, esclerodermia…) o tomas corticoides o inmunosupresores?', tipo: 'sino', det: true, reglas: [
        { v: ['si'], s: APARATOS, n: 'ambar', m: 'Autoinmune o inmunosupresión: autorización médica; si está en brote, no tratar.' }] },
    { id: 'alergias', p: '¿Tienes alguna alergia (cosméticos, látex, metales, tintes, medicamentos)?', tipo: 'sino', det: true, reglas: [
        { v: ['si'], s: TODOS, n: 'aviso', m: 'Alergias: revisar productos y materiales antes de empezar.' },
        { v: ['si'], s: OJOS, n: 'ambar', m: 'Alergias: prueba de alergia al producto al menos 48 h antes.' }] },
    { id: 'medicacion', p: '¿Tomas alguna otra medicación, planta o suplemento de forma habitual?', tipo: 'sino', det: true, reglas: [
        { v: ['si'], s: LASER, n: 'aviso', m: 'Medicación: comprobar si es fotosensibilizante (lista en «Ayuda»).' }] },

    { titulo: 'Láser y radiofrecuencia', bloque: APARATOS },
    { id: 'isotretinoina', p: '¿Has tomado isotretinoína para el acné (Roacután, Isdiben, Acnemin…)?', tipo: 'op',
      op: ['No, nunca o hace más de 6 meses', 'La dejé hace menos de 6 meses', 'La tomo ahora'], reglas: [
        { v: ['La dejé hace menos de 6 meses', 'La tomo ahora'], s: APARATOS, n: 'ambar', m: 'Isotretinoína: esperar 6 meses desde la última dosis (ficha técnica española) o informe del dermatólogo.' }] },
    { id: 'tratamientos_zona', p: '¿Te has hecho peeling, láser, microagujas o radiofrecuencia en la zona en las últimas 2 semanas?', tipo: 'sino', det: true, reglas: [
        { v: ['si'], s: APARATOS, n: 'ambar', m: 'Tratamiento reciente en la zona: esperar a que no haya irritación (unas 2 semanas; 3 meses si fue profundo o ablativo).' }] },

    { titulo: 'Depilación láser', bloque: LASER },
    { id: 'fotosens', p: '¿En el último mes has tomado antibióticos (doxiciclina, minociclina…), diuréticos, amiodarona, antidepresivos, antiinflamatorios a diario, hipérico (hierba de San Juan) u otro producto cuyo prospecto hable de reacciones al sol?', tipo: 'sino', det: true, reglas: [
        { v: ['si'], s: LASER, n: 'ambar', m: 'Fotosensibilizante: esperar a terminar el tratamiento y hacer prueba de parcheo; si es crónico, autorización médica.' }] },
    { id: 'sol', p: '¿Cuándo tomaste el sol o rayos UVA por última vez?', tipo: 'op',
      op: ['Hace más de 4 semanas', 'En las últimas 4 semanas', 'Estoy morena o quemada ahora'], reglas: [
        { v: ['En las últimas 4 semanas'], s: LASER, n: 'ambar', m: 'Sol reciente: esperar a 4 semanas sin sol ni UVA.' },
        { v: ['Estoy morena o quemada ahora'], s: LASER, n: 'rojo', m: 'Bronceado o quemadura: no tratar hasta que se vaya.' }] },
    { id: 'autobronceador', p: '¿Has usado autobronceador o inyecciones bronceadoras en las últimas 2 semanas?', tipo: 'sino', reglas: [
        { v: ['si'], s: LASER, n: 'ambar', m: 'Autobronceador: esperar a que se haya ido del todo (unas 2 semanas).' }] },
    { id: 'cera', p: '¿Te has depilado la zona con cera, pinzas, hilo, crema o decoloración en las últimas 6 semanas?', tipo: 'sino', reglas: [
        { v: ['si'], s: LASER, n: 'ambar', m: 'Cera o pinzas recientes: hace falta el pelo en el folículo. Esperar 4–6 semanas; entre sesiones, solo cuchilla.' }] },
    { id: 'lunares', p: '¿Tienes algún lunar que haya cambiado, o has tenido cáncer de piel o melanoma?', tipo: 'sino', det: true, reglas: [
        { v: ['si'], s: LASER, n: 'rojo', m: 'Lunar que cambia o antecedente de cáncer de piel: que lo vea un dermatólogo antes. No tratar la zona.' }] },
    { id: 'tatuajes', p: '¿Tienes tatuajes, micropigmentación o lunares en la zona a depilar?', tipo: 'sino', det: true, reglas: [
        { v: ['si'], s: LASER, n: 'aviso', m: 'Tatuaje o lunares: no pasar por encima; taparlos con lápiz blanco o material opaco.' }] },
    { id: 'piel_laser', p: '¿Tienes vitíligo, psoriasis o queloides, o cicatrizas mal?', tipo: 'sino', det: true, reglas: [
        { v: ['si'], s: LASER, n: 'ambar', m: 'Vitíligo, psoriasis o queloides: no tratar si está activo ni sobre las placas; prueba de parcheo antes.' }] },
    { id: 'hormonal', p: '¿Tienes ovarios poliquísticos o reglas irregulares, o el vello ha aparecido de repente o va a más deprisa?', tipo: 'sino', reglas: [
        { v: ['si'], s: LASER, n: 'aviso', m: 'Posible causa hormonal: el resultado será menor y puede volver. Recomendar valoración médica (no retrasar un diagnóstico).' }] },
    { id: 'oro', p: '¿Te han tratado alguna vez con sales de oro (artritis)?', tipo: 'sino', reglas: [
        { v: ['si'], s: LASER, n: 'ambar', m: 'Sales de oro: valoración médica antes.' }] },
    { id: 'laser_previo', p: '¿Te has hecho láser o luz pulsada antes?', tipo: 'sino', det: true, reglas: [] },

    { titulo: 'Radiofrecuencia', bloque: RF },
    { id: 'metal', p: '¿Tienes prótesis, placas, tornillos u otros metales en el cuerpo?', tipo: 'op', op: ['No', 'Sí, lejos de la zona a tratar', 'Sí, en la zona a tratar'], det: true, reglas: [
        { v: ['Sí, en la zona a tratar'], s: RF, n: 'rojo', m: 'Metal en la zona: no aplicar RF ahí ni entre el metal y la placa de retorno.' },
        { v: ['Sí, lejos de la zona a tratar'], s: RF, n: 'aviso', m: 'Metal lejos: comprobar en el manual que no queda en la trayectoria de la corriente.' }] },
    { id: 'relleno', ver: ['rf_facial'], p: '¿Te has puesto ácido hialurónico, bótox o hilos en la cara?', tipo: 'op',
      op: ['No', 'Sí, hace menos de 2 semanas', 'Sí, entre 2 y 6 semanas', 'Sí, hace más de 6 semanas', 'Rellenos permanentes o hilos de oro'], det: true, reglas: [
        { v: ['Sí, hace menos de 2 semanas'], s: ['rf_facial'], n: 'ambar', m: 'Relleno, toxina o hilos recientes: esperar al menos 2 semanas (4–6 si son hilos) sobre esa zona.' },
        { v: ['Sí, entre 2 y 6 semanas'], s: ['rf_facial'], n: 'aviso', m: 'Si son hilos, esperar a 6 semanas sobre esa zona; si es hialurónico o toxina, se puede.' },
        { v: ['Rellenos permanentes o hilos de oro'], s: ['rf_facial'], n: 'rojo', m: 'Relleno permanente o hilos de oro: no aplicar RF en esa zona sin autorización del médico que los puso.' }] },
    { id: 'dental', p: '¿Llevas brackets, retenedor fijo o implantes dentales?', tipo: 'op', op: ['No', 'Implantes o coronas', 'Brackets o retenedor fijo'], ver: ['rf_facial'], reglas: [
        { v: ['Brackets o retenedor fijo'], s: ['rf_facial'], n: 'rojo', m: 'Brackets o retenedor: no tratar la zona de la boca y mandíbula.' },
        { v: ['Implantes o coronas'], s: ['rf_facial'], n: 'aviso', m: 'Implantes dentales: precaución alrededor de la boca; parar si nota calor en dientes.' }] },
    { id: 'diu', ver: ['rf_corporal'], p: '¿Llevas DIU de cobre?', tipo: 'sino', reglas: [
        { v: ['si'], s: ['rf_corporal'], n: 'ambar', m: 'DIU de cobre: no tratar el abdomen bajo con RF con placa sin autorización médica.' }] },
    { id: 'cirugia', p: '¿Te han operado en la zona en los últimos 6 meses (incluida liposucción)?', tipo: 'sino', det: true, reglas: [
        { v: ['si'], s: [...RF, 'madero', 'masaje'], n: 'ambar', m: 'Cirugía reciente: esperar a la cicatrización completa y autorización del cirujano.' }] },
    { id: 'sensibilidad', p: '¿Tienes zonas con poca sensibilidad (cicatrices grandes, lesión de un nervio)?', tipo: 'sino', det: true, reglas: [
        { v: ['si'], s: RF, n: 'ambar', m: 'Poca sensibilidad: menos potencia y control de temperatura; no nota bien el calor.' }] },
    { id: 'rosacea', p: '¿Tienes rosácea o cuperosis, o la cara se te pone roja con el calor?', tipo: 'sino', ver: ['rf_facial', 'higiene', 'hidratacion'], reglas: [
        { v: ['si'], s: ['rf_facial', 'higiene', 'hidratacion'], n: 'aviso', m: 'Rosácea: baja temperatura y poco tiempo, sin vapor caliente; no tratar en brote.' }] },
    { id: 'tiroides', p: '¿Tienes problemas de tiroides, hígado o riñón?', tipo: 'sino', det: true, reglas: [
        { v: ['si'], s: RF, n: 'ambar', m: 'Tiroides, hígado o riñón: autorización médica (evitar el cuello si el tiroides no está controlado).' }] },

    { titulo: 'Higiene facial', bloque: ['higiene', 'hidratacion'] },
    { id: 'acne', p: '¿Tienes acné muy inflamado o con bultos dolorosos?', tipo: 'sino', reglas: [
        { v: ['si'], s: ['higiene', 'hidratacion'], n: 'ambar', m: 'Acné inflamatorio severo: sin extracción; recomendar dermatólogo.' }] },

    { titulo: 'Cejas y pestañas', bloque: OJOS },
    { id: 'ojos', p: '¿Tienes ahora irritación o infección en ojos o párpados (conjuntivitis, orzuelo)?', tipo: 'sino', reglas: [
        { v: ['si'], s: OJOS, n: 'rojo', m: 'Infección o irritación ocular: no tratar hasta que se cure.' }] },
    { id: 'tinte', p: '¿Has tenido reacción a tintes de pelo o de pestañas, o a un tatuaje de henna negra?', tipo: 'sino', reglas: [
        { v: ['si'], s: OJOS, n: 'rojo', m: 'Reacción previa a tintes o henna negra: no usar tinte (PPD). Lifting solo con prueba de alergia negativa a 48 h.' }] },
    { id: 'cirugia_ojos', p: '¿Te han operado de los ojos o párpados en los últimos 3 meses?', tipo: 'sino', reglas: [
        { v: ['si'], s: OJOS, n: 'ambar', m: 'Cirugía ocular reciente: autorización del oftalmólogo.' }] },
    { id: 'lentillas', p: '¿Usas lentillas?', tipo: 'sino', reglas: [
        { v: ['si'], s: OJOS, n: 'aviso', m: 'Lentillas: que se las quite antes.' }] }
  ],

  // Test de fototipo de Fitzpatrick (ARPANSA). 10 preguntas, 0–4 puntos.
  fototipo: [
    ['Color de ojos', ['Azul claro, verde o gris claro', 'Azul, verde o gris', 'Azul o verde oscuro, avellana', 'Marrón oscuro', 'Negro pardo']],
    ['Color natural del pelo', ['Pelirrojo', 'Rubio', 'Castaño o rubio oscuro', 'Castaño oscuro', 'Negro']],
    ['Piel donde no da el sol', ['Rosada', 'Muy pálida', 'Castaño claro u oliva', 'Morena', 'Muy morena']],
    ['Pecas donde no da el sol', ['Muchas', 'Varias', 'Pocas', 'Casi ninguna', 'Ninguna']],
    ['Si tomas mucho sol…', ['Quemadura intensa con ampollas', 'Quemadura moderada con ampollas', 'Me quemo y a veces me pelo', 'Rara vez me quemo', 'Nunca me quemo']],
    ['¿Te pones morena?', ['Nunca', 'Rara vez', 'A veces', 'A menudo', 'Siempre']],
    ['¿Cuánto te bronceas?', ['Nada o casi nada', 'Poco', 'Moderado', 'Mucho', 'Muy intenso']],
    ['Sensibilidad de la cara al sol', ['Muy sensible', 'Sensible', 'Normal', 'Resistente', 'Muy resistente']],
    ['¿Con qué frecuencia te bronceas?', ['Nunca', 'Rara vez', 'A veces', 'A menudo', 'Siempre']],
    ['Última vez que tomaste el sol o UVA', ['Hace más de 3 meses', 'Hace 2–3 meses', 'Hace 1–2 meses', 'La última semana', 'Ayer o hoy']]
  ],
  fototipoTramos: [[6, 'I'], [13, 'II'], [20, 'III'], [27, 'IV'], [34, 'V'], [99, 'VI']],

  fotosensibilizantes: 'Antibióticos: doxiciclina, minociclina, tetraciclinas, ciprofloxacino, levofloxacino, cotrimoxazol, azitromicina. Antifúngicos: griseofulvina, ketoconazol. Corazón: amiodarona, furosemida, hidroclorotiazida, captopril, enalapril. Antiinflamatorios: ibuprofeno, naproxeno, piroxicam, ketoprofeno, diclofenaco. Sistema nervioso: amitriptilina, imipramina, clorpromazina, carbamazepina, alprazolam. Otros: anticonceptivos, metotrexato, isotretinoína, acitretina, cloroquina, glibenclamida. Tópicos: retinoides, peróxido de benzoílo, ketoprofeno en gel, perfumes, aceites de bergamota. Plantas: hipérico (hierba de San Juan), bergamota, ruda, apio, perejil, higuera. (Fuentes: Farmacovigilancia de Galicia 2003; Sacylipe 2016.)',

  // ---------- Consentimientos ----------
  consentimientos: {
    datos: { titulo: 'Tratamiento de tus datos (obligatorio)', obligatorio: true,
      texto: 'Responsable: Orixe Benestar [NOTA: completar razón social, NIF y dirección]. Finalidad: gestionar tu ficha, tus citas y el seguimiento de tus tratamientos. Base legal: tu consentimiento explícito (los datos de salud son una categoría especial, art. 9 RGPD) y la prestación del servicio. Tus datos de salud se usan solo para valorar si un tratamiento es adecuado para ti. Se guardan en la tablet del centro y en copias de seguridad cifradas; no se ceden a terceros. Puedes acceder, rectificar, suprimir, oponerte, limitar y portar tus datos escribiendo al centro, y reclamar ante la Agencia Española de Protección de Datos.' },
    veracidad: { titulo: 'Veracidad de la información (obligatorio)', obligatorio: true,
      texto: 'Declaro que la información que he dado es cierta y completa, y que avisaré antes de cada sesión si cambia algo (embarazo, medicación, sol, otros tratamientos).' },
    laser: { titulo: 'Depilación láser SHR: información y riesgos', grupo: 'laser', obligatorio: true,
      texto: 'Es un tratamiento estético que reduce el vello con luz; no lo elimina de forma garantizada ni permanente. Hacen falta varias sesiones (habitualmente de 4 a 8) y mantenimiento. El vello rubio, canoso o pelirrojo responde poco, y si la causa es hormonal puede volver. Lo habitual tras la sesión es enrojecimiento y bultitos alrededor del pelo que desaparecen en horas o días. Poco frecuente: quemadura, ampollas o costras; manchas oscuras o claras (normalmente pasajeras, a veces permanentes); foliculitis; picor. Raro: cicatriz; aumento paradójico del vello; cambios en lunares; reactivación de herpes; lesión ocular si no se usan las gafas. Me comprometo a: no tomar el sol ni rayos UVA ni usar autobronceador 4 semanas antes y después; no depilarme con cera ni pinzas entre sesiones (solo cuchilla); rasurar la zona 24 h antes; usar las gafas de protección; seguir los cuidados posteriores y avisar de cualquier reacción. Alternativas: cuchilla, cera o electrólisis. Puedo retirar este consentimiento cuando quiera. [NOTA: entregar además el anexo informativo del fabricante del equipo, obligatorio por el Reglamento (UE) 2022/2346.]' },
    rf: { titulo: 'Radiofrecuencia: información y riesgos', grupo: 'rf', obligatorio: true,
      texto: 'Es un tratamiento estético no invasivo que calienta la piel. No es un tratamiento médico ni sustituye a la cirugía; los resultados son graduales, variables y no están garantizados, y suelen necesitar mantenimiento. Lo habitual: calor, enrojecimiento e hinchazón leve que pasan en horas. Poco frecuente: quemadura, ampolla o costra; bultos bajo la piel que suelen desaparecer en semanas; cambios de color en la piel; hormigueo pasajero; reacción al gel. Me comprometo a avisar en el momento si noto calor excesivo, dolor o pinchazo, a quitarme joyas y objetos metálicos, y a seguir los cuidados posteriores. Puedo retirar este consentimiento cuando quiera.' },
    ojos: { titulo: 'Cejas y pestañas: información y riesgos', grupo: 'ojos', obligatorio: true,
      texto: 'Los productos del lifting y del tinte pueden causar irritación o alergia. Si es la primera vez, si cambia el producto o si han pasado más de 6 meses, se hace una prueba de alergia al menos 48 h antes. Riesgos poco frecuentes: irritación ocular, alergia, pestañas debilitadas. Avisaré si noto picor o escozor durante el tratamiento.' },
    comunicaciones: { titulo: 'Recordatorios y presupuestos (opcional)',
      texto: 'Acepto que De Seu me envíe por WhatsApp o correo electrónico mis presupuestos y recordatorios de mis tratamientos (próxima sesión o mantenimiento). Puedo darme de baja cuando quiera.' },
    fotos: { titulo: 'Fotos de seguimiento (opcional)',
      texto: 'Autorizo que me hagan fotos de la zona tratada para ver mi evolución. Son de uso interno y solo las ve el equipo del centro.' },
    redes: { titulo: 'Uso de fotos en redes y web (opcional)',
      texto: 'Autorizo que se publiquen fotos de mi evolución en las redes sociales y la web del centro. Puedo retirar este permiso cuando quiera y se dejarán de usar.',
      opciones: ['No', 'Sí, sin que se me vea la cara', 'Sí, también con la cara'] }
  },

  // ---------- Cuidados (se pueden enviar por WhatsApp) ----------
  cuidados: {
    laser: 'Cuidados de tu depilación láser · De Seu\n\nANTES\n· 4 semanas sin sol ni rayos UVA; protector solar SPF 50 si la zona va al aire.\n· 2 semanas sin autobronceador.\n· Nada de cera, pinzas ni crema depilatoria: solo cuchilla.\n· Rasura la zona 24 h antes.\n· Ven con la piel limpia: sin desodorante, crema ni maquillaje en la zona.\n\nDESPUÉS\n· 24–48 h sin sauna, piscina, agua muy caliente ni deporte intenso.\n· Si notas calor, frío local envuelto en un paño.\n· Sin perfumes ni desodorante con alcohol en la zona ese día.\n· 4 semanas sin sol en la zona y protector solar.\n· El pelo tratado se cae en 1–3 semanas: es normal.\n· Si te sale una ampolla, una costra o una mancha, escríbenos.',
    rf: 'Cuidados de tu radiofrecuencia · De Seu\n\nANTES\n· Una semana sin sol intenso ni rayos UVA y sin exfoliantes fuertes.\n· Ven sin maquillaje ni joyas.\n· Bebe agua los días previos.\n\nDESPUÉS\n· 24 h sin exfoliantes ni cosmética agresiva.\n· 24–48 h sin sauna ni baños muy calientes.\n· Protector solar.\n· Si notas una ampolla, un bulto o una mancha, escríbenos.',
    ojos: 'Cuidados de tu lifting de pestañas · De Seu\n\n· 24–48 h sin mojar las pestañas, sin vapor ni sauna.\n· Sin rímel las primeras 24 h.\n· No te frotes los ojos.\n· Si notas picor, escozor o irritación, escríbenos.'
  },

  // Campos de la ficha de cada sesión según el grupo del servicio.
  sesion: {
    comun: [
      { id: 'cambios', t: '¿Algún cambio de salud, medicación, sol o tratamientos desde la última vez?', tipo: 'sino', det: true }
    ],
    laser: [
      { id: 'zona', t: 'Zona', tipo: 'sel', op: 'zonasLaser' },
      { id: 'equipo', t: 'Equipo alquilado (modelo y nº de serie)', tipo: 'txt' },
      { id: 'parcheo', t: '¿Es la prueba de parcheo?', tipo: 'sino' },
      { id: 'rasurado', t: 'Rasurado 24 h antes', tipo: 'sino' },
      { id: 'tapados', t: 'Lunares o tatuajes tapados', tipo: 'op', op: ['No hay', 'Sí'] },
      { id: 'bronceado', t: 'Bronceado actual', tipo: 'op', op: ['No', 'Leve', 'Evidente'] },
      { id: 'vello_color', t: 'Color del vello', tipo: 'op', op: ['Negro', 'Castaño', 'Rubio', 'Pelirrojo', 'Canoso'] },
      { id: 'vello_grosor', t: 'Grosor', tipo: 'op', op: ['Fino', 'Medio', 'Grueso'] },
      { id: 'vello_densidad', t: 'Densidad', tipo: 'op', op: ['Baja', 'Media', 'Alta'] },
      { id: 'modo', t: 'Modo', tipo: 'op', op: ['SHR / in motion', 'Disparo fijo (stack)'] },
      { id: 'onda', t: 'Longitud de onda o filtro', tipo: 'txt' },
      { id: 'fluencia', t: 'Fluencia (J/cm²)', tipo: 'num' },
      { id: 'pulso', t: 'Pulso (ms)', tipo: 'num' },
      { id: 'hz', t: 'Frecuencia (Hz)', tipo: 'num' },
      { id: 'spot', t: 'Spot (cm²)', tipo: 'num' },
      { id: 'pasadas', t: 'Pasadas', tipo: 'num' },
      { id: 'kj', t: 'Energía acumulada (kJ)', tipo: 'num' },
      { id: 'enfriamiento', t: 'Enfriamiento (°C)', tipo: 'num' },
      { id: 'eritema', t: 'Eritema perifolicular (lo esperado)', tipo: 'op', op: ['Sí', 'No'] },
      { id: 'dolor', t: 'Dolor (0–10)', tipo: 'escala' },
      { id: 'alarma', t: 'Signos de alarma', tipo: 'op', op: ['Ninguno', 'Piel grisácea', 'Ampolla', 'Blanqueo', 'Enrojecimiento que no cede'] }
    ],
    rf: [
      { id: 'zona', t: 'Zona', tipo: 'txt' },
      { id: 'tipo_rf', t: 'Tipo de RF', tipo: 'op', op: ['Bipolar', 'Multipolar', 'Monopolar', 'Capacitiva', 'Resistiva'] },
      { id: 'cabezal', t: 'Cabezal', tipo: 'txt' },
      { id: 'metal_retirado', t: 'Joyas y metales retirados', tipo: 'sino' },
      { id: 'potencia', t: 'Potencia o nivel', tipo: 'txt' },
      { id: 'temp_obj', t: 'Temperatura objetivo en superficie (°C)', tipo: 'num' },
      { id: 'temp_max', t: 'Temperatura máxima medida (°C)', tipo: 'num' },
      { id: 'tiempo', t: 'Tiempo en la zona (min)', tipo: 'num' },
      { id: 'producto', t: 'Producto conductor (marca y lote)', tipo: 'txt' },
      { id: 'sensacion', t: 'Sensación de calor (0–10)', tipo: 'escala' },
      { id: 'reaccion', t: 'Reacción', tipo: 'op', op: ['Enrojecimiento leve', 'Enrojecimiento marcado', 'Hinchazón', 'Zona blanquecina', 'Ampolla'] },
      { id: 'medidas', t: 'Perímetros (corporal): punto y cm', tipo: 'txt' }
    ],
    ojos: [
      { id: 'prueba', t: 'Prueba de alergia ≥ 48 h antes, negativa', tipo: 'op', op: ['Sí', 'No hace falta (misma marca, < 6 meses)', 'No'] },
      { id: 'producto', t: 'Productos (marca y lote)', tipo: 'txt' },
      { id: 'tiempos', t: 'Tiempos de cada paso (min)', tipo: 'txt' },
      { id: 'molde', t: 'Talla del molde', tipo: 'txt' },
      { id: 'reaccion', t: 'Reacción', tipo: 'op', op: ['Ninguna', 'Picor o escozor', 'Enrojecimiento'] }
    ],
    otro: [
      { id: 'zona', t: 'Zona', tipo: 'txt' },
      { id: 'producto', t: 'Productos', tipo: 'txt' },
      { id: 'reaccion', t: 'Reacción', tipo: 'op', op: ['Ninguna', 'Leve', 'A vigilar'] }
    ],
    final: [
      { id: 'incidencias', t: 'Incidencias y qué se hizo', tipo: 'area' },
      { id: 'cuidados', t: 'Cuidados explicados o enviados', tipo: 'sino' },
      { id: 'notas', t: 'Notas para la próxima sesión', tipo: 'area' }
    ]
  }
};
})();
