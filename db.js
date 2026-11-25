// Base de datos local (IndexedDB). Una base por centro: los datos de De Seu y de Orixe no se mezclan.
window.DB = (() => {
  let db = null, centro = null;

  function abrir(c) {
    centro = c;
    return new Promise((ok, mal) => {
      const r = indexedDB.open('fichas_' + c, 3);
      r.onupgradeneeded = e => {
        const d = r.result;
        if (e.oldVersion < 1) {
          const cl = d.createObjectStore('clientas', { keyPath: 'id' });
          cl.createIndex('nombre', 'busqueda');
          const f = d.createObjectStore('fotos', { keyPath: 'id' });
          f.createIndex('clienta', 'clientaId');
          d.createObjectStore('ajustes', { keyPath: 'clave' });
        }
        if (e.oldVersion < 2) {                 // v0.2: fichas de cada sesión
          const se = d.createObjectStore('sesiones', { keyPath: 'id' });
          se.createIndex('clienta', 'clientaId');
        }
        if (e.oldVersion < 3) {                 // v0.3: presupuestos
          const pr = d.createObjectStore('presupuestos', { keyPath: 'id' });
          pr.createIndex('clienta', 'clientaId');
        }
      };
      r.onsuccess = () => { db = r.result; ok(db); };
      r.onerror = () => mal(r.error);
    });
  }

  function tx(store, modo, fn) {
    return new Promise((ok, mal) => {
      const t = db.transaction(store, modo);
      const s = t.objectStore(store);
      let res;
      Promise.resolve(fn(s)).then(v => { res = v; });
      t.oncomplete = () => ok(res);
      t.onerror = () => mal(t.error);
      t.onabort = () => mal(t.error);
    });
  }
  const req = r => new Promise((ok, mal) => { r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); });

  const api = {
    abrir,
    get centro() { return centro; },
    id: () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)),
    async todas(store) { return tx(store, 'readonly', s => req(s.getAll())); },
    async una(store, id) { return tx(store, 'readonly', s => req(s.get(id))); },
    async guardar(store, obj) { return tx(store, 'readwrite', s => req(s.put(obj))); },
    async borrar(store, id) { return tx(store, 'readwrite', s => req(s.delete(id))); },
    async fotosDe(clientaId) { return tx('fotos', 'readonly', s => req(s.index('clienta').getAll(clientaId))); },
    async presupuestosDe(clientaId) { return tx('presupuestos', 'readonly', s => req(s.index('clienta').getAll(clientaId))); },
    async sesionesDe(clientaId) { return tx('sesiones', 'readonly', s => req(s.index('clienta').getAll(clientaId))); },
    async ajuste(clave) { const r = await api.una('ajustes', clave); return r ? r.valor : undefined; },
    async fijar(clave, valor) { return api.guardar('ajustes', { clave, valor }); },
    async vaciar() {
      for (const s of ['clientas', 'fotos', 'sesiones', 'presupuestos']) await tx(s, 'readwrite', st => req(st.clear()));
    }
  };
  return api;
})();
