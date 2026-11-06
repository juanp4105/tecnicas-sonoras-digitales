/* scorm-api.js — conexión mínima y segura con la plataforma (LMS): SCORM 2004 (4.ª edición) con
 * respaldo automático a SCORM 1.2. Sin dependencias. A² Learning Studio · Vibe Coding CEDIA 2026.
 *
 * Funciona en D2L Brightspace, Moodle, Canvas y Blackboard. Fuera de una plataforma (vista previa
 * local) entra en «modo sin plataforma»: guarda el estado en localStorage y muestra en la consola
 * lo que habría enviado, para que la actividad se pueda probar sin subirla.
 *
 * Uso:
 *   SCORM.iniciar();                                  // al cargar la página
 *   SCORM.interaccion({ id: 'p01', tipo: 'choice', respuesta: 'b', correcta: 'b', resultado: 'correct',
 *                       descripcion: 'Pregunta 1', peso: 1 });
 *   SCORM.puntaje(7, 10);                             // puntaje bruto y máximo (calcula el escalado)
 *   SCORM.terminarConResultado({ aprobado: true });   // completado + aprobado/no aprobado
 *   SCORM.guardar({ ... });  SCORM.leer();            // estado para reanudar (suspend_data, JSON)
 *   SCORM.terminar();                                 // también se llama solo al cerrar la página
 */
(function (global) {
  'use strict';
  var api = null, version = null, iniciado = false, terminado = false, inicio = Date.now(), prefijoLocal = 'scorm_local_';

  function buscar(win, nombre) {
    for (var i = 0; win && i < 12; i++) {
      try { if (win[nombre]) return win[nombre]; } catch (e) { return null; } // marco de otro dominio
      if (!win.parent || win.parent === win) break;
      win = win.parent;
    }
    return null;
  }
  function localizar() {
    var w = global, a = buscar(w, 'API_1484_11');
    if (!a) { try { if (w.opener) a = buscar(w.opener, 'API_1484_11'); } catch (e) {} }
    if (a) return { v: '2004', api: a };
    a = buscar(w, 'API');
    if (!a) { try { if (w.opener) a = buscar(w.opener, 'API'); } catch (e) {} }
    return a ? { v: '1.2', api: a } : null;
  }
  // Nombres de los campos en cada versión
  var C = {
    '2004': { nombre: 'cmi.learner_name', id: 'cmi.learner_id', estado: 'cmi.suspend_data', ubicacion: 'cmi.location',
              salida: 'cmi.exit', bruto: 'cmi.score.raw', min: 'cmi.score.min', max: 'cmi.score.max', escalado: 'cmi.score.scaled',
              tiempo: 'cmi.session_time', modo: 'cmi.mode', entrada: 'cmi.entry' },
    '1.2': { nombre: 'cmi.core.student_name', id: 'cmi.core.student_id', estado: 'cmi.suspend_data', ubicacion: 'cmi.core.lesson_location',
             salida: 'cmi.core.exit', bruto: 'cmi.core.score.raw', min: 'cmi.core.score.min', max: 'cmi.core.score.max', escalado: null,
             tiempo: 'cmi.core.session_time', modo: 'cmi.core.lesson_mode', entrada: 'cmi.core.entry' }
  };
  var LIMITE_ESTADO = { '2004': 64000, '1.2': 4096 };

  function llamar(m2004, m12, a, b) {
    if (!api) return '';
    try { return version === '2004' ? api[m2004](a, b) : api[m12](a, b); } catch (e) { return ''; }
  }
  function obtener(campo) { if (!campo) return ''; return api ? String(llamar('GetValue', 'LMSGetValue', campo) || '') : (local()[campo] || ''); }
  function fijar(campo, valor) {
    if (!campo) return false;
    valor = String(valor);
    if (!api) { var l = local(); l[campo] = valor; guardarLocal(l); return true; }
    var r = llamar('SetValue', 'LMSSetValue', campo, valor);
    return r === true || r === 'true';
  }
  function confirmar() { if (api) llamar('Commit', 'LMSCommit', ''); }
  function local() { try { return JSON.parse(global.localStorage.getItem(prefijoLocal + clave()) || '{}'); } catch (e) { return {}; } }
  function guardarLocal(o) { try { global.localStorage.setItem(prefijoLocal + clave(), JSON.stringify(o)); } catch (e) {} }
  function clave() { try { return (global.location && global.location.pathname) || 'actividad'; } catch (e) { return 'actividad'; } }
  function duracion(ms) {
    var s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    if (version === '1.2') return (h < 10 ? '000' : h < 100 ? '00' : h < 1000 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x;
    return 'PT' + h + 'H' + m + 'M' + x + 'S';
  }
  function marca(d) { // 2004: AAAA-MM-DDThh:mm:ss
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function idSeguro(s) { return String(s || 'p').replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 250) || 'p'; }

  var SCORM = {
    get conectado() { return !!api; },
    get version() { return version; },
    iniciar: function () {
      if (iniciado) return !!api;
      iniciado = true; inicio = Date.now();
      var hallado = localizar();
      if (hallado) {
        api = hallado.api; version = hallado.v;
        var r = llamar('Initialize', 'LMSInitialize', '');
        if (!(r === true || r === 'true')) { api = null; version = null; }
      }
      if (api) {
        if (version === '2004') { if (obtener('cmi.completion_status') === 'not attempted' || !obtener('cmi.completion_status')) fijar('cmi.completion_status', 'incomplete'); }
        else if (obtener('cmi.core.lesson_status') === 'not attempted' || !obtener('cmi.core.lesson_status')) fijar('cmi.core.lesson_status', 'incomplete');
        fijar(C[version].salida, 'suspend'); confirmar();
      } else if (global.console) global.console.info('[SCORM] Sin plataforma: modo de vista previa (estado en este navegador).');
      if (global.addEventListener) {
        global.addEventListener('pagehide', function () { SCORM.terminar(); });
        global.addEventListener('beforeunload', function () { SCORM.terminar(); });
      }
      return !!api;
    },
    nombre: function () { return obtener(C[version || '2004'].nombre); },
    idPersona: function () { return obtener(C[version || '2004'].id); },
    modoRevision: function () { return obtener(C[version || '2004'].modo) === 'review'; },
    ubicacion: function (v) { var c = C[version || '2004'].ubicacion; if (v === undefined) return obtener(c); fijar(c, String(v).slice(0, 1000)); confirmar(); },
    guardar: function (obj) {
      var texto = JSON.stringify(obj || {}), lim = LIMITE_ESTADO[version || '2004'];
      if (texto.length > lim) { if (global.console) global.console.warn('[SCORM] Estado demasiado grande (' + texto.length + ' > ' + lim + '); no se guardó.'); return false; }
      var ok = fijar(C[version || '2004'].estado, texto); confirmar(); return ok;
    },
    leer: function () { var t = obtener(C[version || '2004'].estado); try { return t ? JSON.parse(t) : null; } catch (e) { return null; } },
    puntaje: function (bruto, maximo) {
      var c = C[version || '2004'], max = Number(maximo) || 100, raw = Math.max(0, Math.min(max, Number(bruto) || 0));
      // SCORM 1.2 solo acepta 0-100: se escala allí
      if (version === '1.2') { fijar(c.min, 0); fijar(c.max, 100); fijar(c.bruto, Math.round(raw / max * 10000) / 100); }
      else { fijar(c.min, 0); fijar(c.max, max); fijar(c.bruto, raw); fijar(c.escalado, Math.round(raw / max * 10000) / 10000); }
      confirmar();
    },
    terminarConResultado: function (o) {
      o = o || {};
      if (version === '1.2') fijar('cmi.core.lesson_status', o.aprobado === undefined ? 'completed' : (o.aprobado ? 'passed' : 'failed'));
      else { fijar('cmi.completion_status', 'completed'); if (o.aprobado !== undefined) fijar('cmi.success_status', o.aprobado ? 'passed' : 'failed'); }
      confirmar();
    },
    interaccion: function (o) {
      o = o || {};
      var n = Number(obtener(version === '1.2' ? 'cmi.interactions._count' : 'cmi.interactions._count')) || 0;
      if (!api) { var l = local(); n = Number(l._interacciones || 0); l._interacciones = n + 1; guardarLocal(l); }
      var b = 'cmi.interactions.' + n + '.', tipo = o.tipo || 'other';
      var tipos12 = { choice: 1, 'true-false': 1, 'fill-in': 1, matching: 1, performance: 1, sequencing: 1, likert: 1, numeric: 1 };
      if (version === '1.2' && !tipos12[tipo]) tipo = 'fill-in';
      fijar(b + 'id', idSeguro(o.id));
      fijar(b + 'type', tipo);
      if (o.descripcion && version !== '1.2') fijar(b + 'description', String(o.descripcion).slice(0, 250));
      if (o.peso !== undefined) fijar(b + 'weighting', Number(o.peso) || 0);
      var resp = String(o.respuesta === undefined ? '' : o.respuesta);
      if (tipo === 'choice' || tipo === 'sequencing') resp = resp.split(/\s*,\s*|\[,\]/).map(idSeguro).join('[,]');
      fijar(b + (version === '1.2' ? 'student_response' : 'learner_response'), resp.slice(0, version === '1.2' ? 255 : 4000));
      if (o.resultado) fijar(b + 'result', version === '1.2' && o.resultado === 'incorrect' ? 'wrong' : o.resultado);
      if (version === '1.2') fijar(b + 'time', marca(new Date()).slice(11));
      else fijar(b + 'timestamp', marca(new Date()));
      confirmar();
      return n;
    },
    terminar: function () {
      if (terminado || !iniciado) return;
      terminado = true;
      fijar(C[version || '2004'].tiempo, duracion(Date.now() - inicio));
      confirmar();
      if (api) llamar('Terminate', 'LMSFinish', '');
    },
    _probar: { duracion: duracion, idSeguro: idSeguro, reiniciar: function () { api = null; version = null; iniciado = false; terminado = false; } }
  };
  global.SCORM = SCORM;
})(typeof window !== 'undefined' ? window : globalThis);
