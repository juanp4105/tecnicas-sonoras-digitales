/* reproductor.js — lección narrada A² (Vibe Coding CEDIA 2026). Lee window.LECCION (leccion-datos.js, generado).
 * Una diapositiva a la vez con su narración, subtítulos sincronizados y transcripción resaltada; comprobaciones
 * rápidas entre diapositivas (no califican); «Siguiente» se habilita al terminar la narración, con una salida
 * siempre disponible («Continuar sin escuchar») a los pocos segundos, para que nadie quede bloqueado; reanuda donde
 * quedó; apuntes imprimibles; SCORM 2004/1.2 (completado al ver todo). Teclado: ← → espacio. Sin dependencias. */
(function () {
  'use strict';
  var D = window.LECCION, $ = function (id) { return document.getElementById(id); };
  var L = D.idioma === 'en' ? 'en' : 'es';
  var T = {
    es: { diapositiva: 'Diapositiva', de: 'de', anterior: 'Anterior', siguiente: 'Siguiente', reproducir: 'Reproducir la narración', pausar: 'Pausar',
      velocidad: 'Velocidad', subtitulos: 'Subtítulos', transcripcion: 'Transcripción', apuntes: 'Apuntes para imprimir', escape: 'Continuar sin escuchar',
      espere: 'Se habilita al terminar la narración', comprobacion: 'Comprobación rápida', comprobar: 'Comprobar', bien: 'Correcto.', mal: 'No es esa.', otra: 'Inténtelo de nuevo o continúe.',
      fin: 'Terminó la lección', finTxt: 'Su avance quedó registrado. Puede volver a cualquier diapositiva.', listaD: 'Diapositivas', sinAudio: 'No se pudo cargar el audio: lea la transcripción y continúe.',
      vista: 'Vista previa: el avance no se registra en la plataforma.', preparacion: 'Narración en preparación. Mientras tanto, lea la descripción de la diapositiva en la transcripción.', nueva: '(se abre en una pestaña nueva)' },
    en: { diapositiva: 'Slide', de: 'of', anterior: 'Previous', siguiente: 'Next', reproducir: 'Play the narration', pausar: 'Pause',
      velocidad: 'Speed', subtitulos: 'Captions', transcripcion: 'Transcript', apuntes: 'Printable notes', escape: 'Continue without listening',
      espere: 'Enabled when the narration ends', comprobacion: 'Quick check', comprobar: 'Check', bien: 'Correct.', mal: 'Not that one.', otra: 'Try again or continue.',
      fin: 'You finished the lesson', finTxt: 'Your progress was recorded. You can return to any slide.', listaD: 'Slides', sinAudio: 'The audio could not be loaded: read the transcript and continue.',
      vista: 'Preview: progress is not recorded on the platform.', preparacion: 'Narration in preparation. Meanwhile, read the slide description in the transcript.', nueva: '(opens in a new tab)' }
  };
  var t = function (k) { return T[L][k]; };
  var N = D.diapositivas.length, ESCAPE = D.escape || 8;
  var S = { i: 0, vistas: {}, terminadas: {}, comprob: {}, sub: true, vel: 1, fin: false };
  var audio = new Audio(), escTimer = 0, escListo = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var ICONOS = {
    linea: '<path d="M3 12h18"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 6v4M12 14v4M18 6v4"/>',
    microfono: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>',
    radio: '<rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="8" cy="14" r="3"/><path d="M14 12h4M14 16h4M7 8l10-5"/>',
    enlace: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
  };
  function icono(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONOS[k] || ICONOS.enlace) + '</svg>'; }
  function guardar() { var e = { i: S.i, vistas: S.vistas, terminadas: S.terminadas, comprob: S.comprob, fin: S.fin, sub: S.sub, vel: S.vel };
    if (window.SCORM && SCORM.conectado) { SCORM.guardar(e); SCORM.ubicacion(S.i); } else try { localStorage.setItem('a2_leccion_' + D.id + '_v' + D.version, JSON.stringify(e)); } catch (x) {} }
  function leer() { if (window.SCORM && SCORM.conectado) return SCORM.leer(); try { return JSON.parse(localStorage.getItem('a2_leccion_' + D.id + '_v' + D.version)); } catch (x) { return null; } }
  function d() { return D.diapositivas[S.i]; }
  function puedeAvanzar() { var x = d(); return !x.audio || S.terminadas[S.i] || escListo || D.avance === 'libre'; }
  function comprobacionPendiente() { var c = d().comprobacion; return c && !S.comprob[S.i]; }

  function montar() {
    document.documentElement.lang = L; document.title = D.titulo;
    $('app').innerHTML =
      '<header class="ln-top">' + (D.volver ? '<a class="ln-volver" href="' + esc(D.volver.url) + '">' + esc(D.volver.texto) + '</a>' : '') + '<b>' + esc(D.titulo) + '</b><span id="ln-cuenta"></span></header>' +
      '<div class="ln-cuerpo"><nav class="ln-lista" aria-label="' + t('listaD') + '"><ol id="ln-lista"></ol></nav>' +
      '<main class="ln-escena"><figure class="ln-fig"><img id="ln-img" alt=""><figcaption id="ln-sub" class="ln-sub" aria-hidden="true"></figcaption><div id="ln-enlaces" class="ln-enlaces"></div></figure>' +
      '<p id="ln-sinaudio" class="ln-sinaudio" hidden>' + t('preparacion') + '</p>' +
      '<div class="ln-controles"><button type="button" id="ln-play" class="ln-icono"></button><div id="ln-barra" class="ln-barra" aria-hidden="true"><span id="ln-lleno"></span></div>' +
      '<label class="ln-vel">' + t('velocidad') + ' <select id="ln-vel"><option value="0.75">0,75×</option><option value="1" selected>1×</option><option value="1.25">1,25×</option><option value="1.5">1,5×</option></select></label>' +
      '<button type="button" id="ln-cc" class="ln-chip" aria-pressed="true">' + t('subtitulos') + '</button></div>' +
      '<section id="ln-check" class="ln-check" hidden></section>' +
      '<div class="ln-nav"><button type="button" id="ln-ant" class="ln-btn sec">' + t('anterior') + '</button><span id="ln-espera" class="ln-espera"></span>' +
      '<button type="button" id="ln-escape" class="ln-enlace" hidden>' + t('escape') + '</button><button type="button" id="ln-sig" class="ln-btn">' + t('siguiente') + '</button></div>' +
      (window.SCORM && SCORM.conectado ? '' : '<p class="ln-nota">' + t('vista') + '</p>') + '</main>' +
      '<aside class="ln-trans"><details open><summary>' + t('transcripcion') + '</summary><ol id="ln-texto"></ol></details><button type="button" id="ln-apuntes" class="ln-enlace">' + t('apuntes') + '</button></aside></div>' +
      '<section id="ln-imprimir" class="ln-imprimir" aria-hidden="true"></section>';
    $('ln-lista').innerHTML = D.diapositivas.map(function (x, i) { var tit = x.titulo || (t('diapositiva') + ' ' + (i + 1));
      return '<li><button type="button" data-i="' + i + '" title="' + esc(tit) + '" aria-label="' + (i + 1) + '. ' + esc(tit) + '"><span class="ln-num">' + (i + 1) + '</span><span class="ln-tit">. ' + esc(tit) + '</span></button></li>'; }).join('');
    $('ln-lista').addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) ir(Number(b.getAttribute('data-i'))); });
    $('ln-play').addEventListener('click', function () { if (audio.paused) audio.play().catch(function () {}); else audio.pause(); });
    $('ln-vel').addEventListener('change', function () { S.vel = Number(this.value); audio.playbackRate = S.vel; guardar(); });
    $('ln-cc').addEventListener('click', function () { S.sub = !S.sub; this.setAttribute('aria-pressed', String(S.sub)); $('ln-sub').hidden = !S.sub; guardar(); });
    $('ln-ant').addEventListener('click', function () { ir(S.i - 1); });
    $('ln-sig').addEventListener('click', siguiente);
    $('ln-escape').addEventListener('click', function () { escListo = true; S.terminadas[S.i] = true; guardar(); pintarNav(); $('ln-sig').focus(); });
    $('ln-apuntes').addEventListener('click', imprimir);
    $('ln-barra').addEventListener('click', function (e) { var r = this.getBoundingClientRect(); if (audio.duration) audio.currentTime = (e.clientX - r.left) / r.width * audio.duration; });
    ['timeupdate', 'play', 'pause', 'loadedmetadata'].forEach(function (ev) { audio.addEventListener(ev, sincronizar); });
    audio.addEventListener('ended', function () { S.terminadas[S.i] = true; guardar(); sincronizar(); pintarNav(); });
    audio.addEventListener('error', function () { if (!d().audio) return; S.terminadas[S.i] = true; $('ln-sub').textContent = t('sinAudio'); pintarNav(); });
    document.addEventListener('keydown', function (e) {
      if (/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName) && e.key === ' ') return;
      if (e.key === 'ArrowRight' && !$('ln-sig').disabled) { e.preventDefault(); siguiente(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); ir(S.i - 1); }
      else if (e.key === ' ' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('ln-play').click(); }
    });
  }
  function ir(i, auto) {
    if (i < 0 || i >= N) return;
    audio.pause(); S.i = i; S.vistas[i] = true; escListo = !!S.terminadas[i]; clearTimeout(escTimer);
    var x = d();
    $('ln-img').src = x.imagen; $('ln-img').alt = x.alt || (t('diapositiva') + ' ' + (i + 1));
    $('ln-sub').textContent = ''; $('ln-sub').hidden = !S.sub;
    $('ln-texto').innerHTML = (x.frases || []).map(function (f, k) { return '<li data-k="' + k + '">' + esc(f.texto) + '</li>'; }).join('');
    $('ln-texto').onclick = function (e) { var li = e.target.closest('[data-k]'); if (li && x.frases) { audio.currentTime = x.frases[Number(li.getAttribute('data-k'))].t0; audio.play().catch(function () {}); } };
    $('ln-enlaces').innerHTML = (x.enlaces || []).map(function (e) {
      return '<a class="ln-recurso" href="' + esc(e.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(e.texto + ' ' + t('nueva')) + '" title="' + esc(e.texto) + '">' + icono(e.icono) + '<span>' + esc(e.texto) + '</span></a>'; }).join('');
    $('ln-sinaudio').hidden = !!x.audio;
    document.querySelector('.ln-controles').hidden = !x.audio;
    if (x.audio) { audio.src = x.audio; audio.playbackRate = S.vel; if (auto !== false) audio.play().catch(function () {}); }
    else audio.removeAttribute('src');
    if (!S.terminadas[i] && x.audio) escTimer = setTimeout(function () { $('ln-escape').hidden = false; }, ESCAPE * 1000);
    pintarCheck(); pintarNav(); sincronizar(); guardar();
    $('ln-lista').querySelectorAll('button').forEach(function (b, k) { b.classList.toggle('actual', k === i); b.classList.toggle('vista', !!S.vistas[k]); if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
  }
  function sincronizar() {
    var x = d(), ct = audio.currentTime || 0, dur = audio.duration || 0;
    $('ln-play').setAttribute('aria-label', audio.paused ? t('reproducir') : t('pausar')); $('ln-play').classList.toggle('sonando', !audio.paused);
    $('ln-lleno').style.width = dur ? Math.min(100, ct / dur * 100) + '%' : (S.terminadas[S.i] ? '100%' : '0');
    $('ln-cuenta').textContent = t('diapositiva') + ' ' + (S.i + 1) + ' ' + t('de') + ' ' + N;
    if (!x.frases) return;
    var k = -1; x.frases.forEach(function (f, j) { if (ct >= f.t0 - 0.05) k = j; });
    if (k >= 0 && !audio.paused || k >= 0 && ct > 0) $('ln-sub').textContent = x.frases[k].texto;
    $('ln-texto').querySelectorAll('li').forEach(function (li, j) { li.classList.toggle('actual', j === k && ct > 0); });
  }
  function pintarNav() {
    var bloqueo = !puedeAvanzar() || comprobacionPendiente();
    $('ln-ant').disabled = S.i === 0;
    $('ln-sig').disabled = bloqueo;
    $('ln-sig').textContent = S.i === N - 1 ? (L === 'en' ? 'Finish' : 'Terminar') : t('siguiente');
    $('ln-espera').textContent = !puedeAvanzar() ? t('espere') : '';
    if (puedeAvanzar()) $('ln-escape').hidden = true;
  }
  function pintarCheck() {
    var c = d().comprobacion, box = $('ln-check');
    if (!c) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    var hecho = S.comprob[S.i];
    box.innerHTML = '<h2>' + t('comprobacion') + '</h2><fieldset><legend>' + esc(c.pregunta) + '</legend><div class="ln-ops">' + c.opciones.map(function (o, k) {
      return '<label class="ln-op"><input type="radio" name="ln-c" value="' + k + '"' + (hecho && hecho.elegida === k ? ' checked' : '') + '><span>' + esc(o.t) + '</span></label>';
    }).join('') + '</div></fieldset><div class="ln-fila"><button type="button" class="ln-btn sec" id="ln-comprobar">' + t('comprobar') + '</button><p id="ln-retro" class="ln-retro" role="status" aria-live="polite"></p></div>';
    if (hecho) mostrarRetro(hecho.correcta, c);
    $('ln-comprobar').addEventListener('click', function () {
      var m = box.querySelector('input:checked'); if (!m) return;
      var k = Number(m.value), ok = !!c.opciones[k].c, previo = S.comprob[S.i];
      S.comprob[S.i] = { elegida: k, correcta: ok, primera: previo ? previo.primera : ok };
      if (window.SCORM) SCORM.interaccion({ id: 'comprobacion_' + (S.i + 1), tipo: 'choice', respuesta: 'abcdefgh'[k], resultado: ok ? 'correct' : 'incorrect', descripcion: c.pregunta.slice(0, 200) });
      mostrarRetro(ok, c); guardar(); pintarNav();
    });
  }
  function mostrarRetro(ok, c) { var r = $('ln-retro'); r.className = 'ln-retro ' + (ok ? 'bien' : 'mal'); r.textContent = (ok ? t('bien') + ' ' + (c.explicacion || '') : t('mal') + ' ' + t('otra')); }
  function siguiente() {
    if ($('ln-sig').disabled) return;
    if (S.i < N - 1) { ir(S.i + 1); return; }
    terminar();
  }
  function terminar() {
    S.fin = true; guardar();
    var checks = D.diapositivas.map(function (x, i) { return x.comprobacion ? S.comprob[i] : null; }).filter(Boolean);
    if (window.SCORM) {
      if (checks.length) SCORM.puntaje(checks.filter(function (c) { return c.primera; }).length, D.diapositivas.filter(function (x) { return x.comprobacion; }).length);
      SCORM.terminarConResultado({});
    }
    var box = $('ln-check'); box.hidden = false;
    box.innerHTML = '<h2 id="ln-fin" tabindex="-1">' + t('fin') + '</h2><p>' + t('finTxt') + '</p>';
    $('ln-fin').focus();
  }
  function imprimir() {
    $('ln-imprimir').innerHTML = '<h1>' + esc(D.titulo) + '</h1>' + D.diapositivas.map(function (x, i) {
      return '<article><h2>' + (i + 1) + '. ' + esc(x.titulo || '') + '</h2><img src="' + esc(x.imagen) + '" alt="' + esc(x.alt || '') + '"><p>' + esc((x.frases || []).map(function (f) { return f.texto; }).join(' ')) + '</p>' +
        (x.enlaces ? '<p>' + x.enlaces.map(function (e) { return esc(e.texto) + ': ' + esc(e.url); }).join('<br>') + '</p>' : '') +
        (x.comprobacion ? '<p><b>' + t('comprobacion') + ':</b> ' + esc(x.comprobacion.pregunta) + '</p>' : '') + '</article>';
    }).join('') + '<footer>' + esc(D.pie || '') + '</footer>';
    window.print();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (window.SCORM) SCORM.iniciar();
    montar();
    var p = leer();
    if (p) { S.vistas = p.vistas || {}; S.terminadas = p.terminadas || {}; S.comprob = p.comprob || {}; S.fin = !!p.fin; S.sub = p.sub !== false; S.vel = p.vel || 1;
      $('ln-vel').value = String(S.vel); $('ln-cc').setAttribute('aria-pressed', String(S.sub)); }
    ir(p ? Math.min(p.i || 0, N - 1) : 0, false);
  });
  window.A2Leccion = { estado: function () { return S; }, audio: audio };
})();
