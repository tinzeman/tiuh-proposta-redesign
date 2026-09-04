/* Ticino Unihockey — versione emozionale.
   Ogni blocco parte solo se trova il proprio elemento, così ogni pagina usa
   quello che le serve senza produrre errori. */
(function () {
  'use strict';

  var lento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var piccolo = window.matchMedia('(max-width:820px)');
  var senzaHover = window.matchMedia('(hover: none)');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ── testata: piena appena si scorre ── */
  (function testata() {
    var testa = $('.testa');
    if (!testa) return;
    var cop = $('.cop');
    var atteso = false;
    function guarda() {
      atteso = false;
      var soglia = cop ? Math.min(cop.offsetHeight - 90, 160) : 20;
      testa.classList.toggle('piena', (window.scrollY || 0) > Math.max(soglia, 20));
    }
    window.addEventListener('scroll', function () {
      if (!atteso) { atteso = true; requestAnimationFrame(guarda); }
    }, { passive: true });
    guarda();
  })();

  /* ── menu ── */
  (function menu() {
    var hamb = $('.hamb'), velo = $('.velo');

    function apriVelo(v) {
      if (!hamb || !velo) return;
      hamb.setAttribute('aria-expanded', String(v));
      hamb.setAttribute('aria-label', v ? 'Chiudi il menu' : 'Apri il menu');
      velo.setAttribute('data-aperto', String(v));
      document.documentElement.style.overflow = v ? 'hidden' : '';
    }
    if (hamb && velo) {
      hamb.addEventListener('click', function () {
        apriVelo(hamb.getAttribute('aria-expanded') !== 'true');
      });
      piccolo.addEventListener('change', function (e) { if (!e.matches) apriVelo(false); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && hamb.getAttribute('aria-expanded') === 'true') {
          apriVelo(false); hamb.focus();
        }
      });
    }

    /* tendine del menu grande */
    $$('.menu > div').forEach(function (voce) {
      var tenda = $('.tenda', voce);
      if (!tenda) return;
      var capo = $('a.capo', voce);
      capo.setAttribute('aria-haspopup', 'true');
      capo.setAttribute('aria-expanded', 'false');
      function apri(v) {
        voce.setAttribute('data-aperto', String(v));
        capo.setAttribute('aria-expanded', String(v));
      }
      voce.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'mouse' && !piccolo.matches) apri(true);
      });
      voce.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'mouse') apri(false);
      });
      voce.addEventListener('focusin', function () { if (!piccolo.matches) apri(true); });
      voce.addEventListener('focusout', function (e) {
        if (!voce.contains(e.relatedTarget)) apri(false);
      });
      capo.addEventListener('click', function (e) {
        if (senzaHover.matches && voce.getAttribute('data-aperto') !== 'true') {
          e.preventDefault(); apri(true);
        }
      });
      voce.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { apri(false); capo.focus(); }
      });
    });

    /* Toccando una voce il menu si chiude. Se punta a una sezione della pagina
       che stiamo già guardando il browser non ricarica: ci pensiamo noi. */
    function gestisci(e) {
      var a = e.target.closest && e.target.closest('a');
      if (!a) return;
      apriVelo(false);
      $$('.menu > div[data-aperto="true"]').forEach(function (v) {
        v.setAttribute('data-aperto', 'false');
        var c = $('a.capo', v);
        if (c) c.setAttribute('aria-expanded', 'false');
      });
      var href = a.getAttribute('href') || '';
      var tag = href.indexOf('#');
      if (tag < 0) return;
      var file = href.slice(0, tag);
      var qui = location.pathname.split('/').pop() || 'index.html';
      if (file && file !== qui) return;
      var meta = document.getElementById(href.slice(tag + 1));
      if (!meta) return;
      e.preventDefault();
      if (history.replaceState) history.replaceState(null, '', href.slice(tag));
      requestAnimationFrame(function () {
        meta.scrollIntoView({ behavior: lento ? 'auto' : 'smooth', block: 'start' });
      });
    }
    if (velo) velo.addEventListener('click', gestisci);
    var grande = $('.menu');
    if (grande) grande.addEventListener('click', gestisci);
  })();

  /* ── comparse e contatori ── */
  (function comparse() {
    function conta(el) {
      var meta = parseInt(el.getAttribute('data-cifra'), 10);
      var pre = el.getAttribute('data-pre') || '';
      var post = el.getAttribute('data-post') || '';
      var fatto = false;
      function chiudi() { if (!fatto) { fatto = true; el.textContent = pre + meta + post; } }
      if (lento) { chiudi(); return; }
      var t0 = Date.now(), dur = 1300;
      function passo() {
        if (fatto) return;
        var p = Math.min((Date.now() - t0) / dur, 1);
        if (p >= 1) { chiudi(); return; }
        el.textContent = pre + Math.round(meta * (1 - Math.pow(1 - p, 3))) + post;
        requestAnimationFrame(passo);
      }
      requestAnimationFrame(passo);
      setTimeout(chiudi, dur + 150);
    }
    function accendi(el) {
      el.classList.add('in');
      $$('[data-cifra]', el).forEach(conta);
      if (el.hasAttribute('data-cifra')) conta(el);
    }
    var bersagli = $$('.riv, .masc, .scala');
    if (!bersagli.length) return;
    if (lento || !('IntersectionObserver' in window)) {
      bersagli.forEach(accendi);
      return;
    }
    var io = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        if (v.isIntersecting) { accendi(v.target); io.unobserve(v.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.12 });
    bersagli.forEach(function (b) { io.observe(b); });
    setTimeout(function () { $$('.cop .masc, .cop .riv').forEach(accendi); }, 110);
  })();

  /* ── parallasse: un calcolo per fotogramma, solo su ciò che è in vista ── */
  (function parallasse() {
    var strati = $$('[data-par]');
    if (lento || !strati.length) return;
    var atteso = false;
    function muovi() {
      atteso = false;
      var h = window.innerHeight;
      for (var i = 0; i < strati.length; i++) {
        var el = strati[i], r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -160 || r.top > h + 160) continue;
        var q = (r.top + r.height / 2 - h / 2) / h;
        el.style.transform = 'translate3d(0,' +
          (q * parseFloat(el.getAttribute('data-par'))).toFixed(2) + 'px,0)';
      }
    }
    window.addEventListener('scroll', function () {
      if (!atteso) { atteso = true; requestAnimationFrame(muovi); }
    }, { passive: true });
    window.addEventListener('resize', muovi, { passive: true });
    muovi();
  })();

  /* ── la pista dei ritratti si trascina anche col mouse ── */
  (function pista() {
    var p = $('.pista');
    if (!p) return;
    var giu = false, x0 = 0, s0 = 0;
    p.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      giu = true; x0 = e.clientX; s0 = p.scrollLeft; p.style.cursor = 'grabbing';
    });
    window.addEventListener('pointerup', function () { giu = false; p.style.cursor = ''; });
    p.addEventListener('pointermove', function (e) {
      if (!giu) return;
      e.preventDefault();
      p.scrollLeft = s0 - (e.clientX - x0);
    });
  })();

  /* ── partite da swiss unihockey ── */
  (function partite() {
    var lista = $('#calList'), prossima = $('#pxChi');
    if (!lista && !prossima) return;

    var API = 'https://api-v2.swissunihockey.ch/api/games?mode=club&club_id=435553' +
      '&season=2026&games_per_page=300';
    var COPIA = window.TIUH_COPIA || [];
    var QUANTE = parseInt((lista && lista.getAttribute('data-quante')) || '10', 10);

    var NOMI = {
      'Herren NLB': 'LNB maschile', 'Mobiliar Unihockey Cup Männer': 'Coppa svizzera',
      'Junioren U21 B': 'Juniores U21 B', 'Junioren U18 B': 'Juniores U18 B',
      'Junioren U16 A': 'Juniores U16 A', 'Junioren U16 C': 'Juniores U16 C',
      'Junioren U14 B': 'Juniores U14 B', 'Junioren C Regional': 'Juniores C',
      'Junioren D Regional': 'Juniores D'
    };
    var GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
    var MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

    function nome(c) { var b = (c || '').split(' · ')[0]; return NOMI[b] || b; }
    function data(g) {
      var p = (g.d || '').split('.');
      if (p.length !== 3) return null;
      var t = (g.t || '00:00').split(':');
      return new Date(+p[2], +p[1] - 1, +p[0], +(t[0] || 0), +(t[1] || 0));
    }
    function giorno(dt) { return GIORNI[dt.getDay()] + ' ' + dt.getDate() + ' ' + MESI[dt.getMonth()]; }
    /* Designazione e palestra non coincidono sempre: il segno segue la
       designazione ufficiale, il fuori sede è uno stato a sé. */
    function nostra(v) { return /bellinzona|arti e mestieri/i.test(v || ''); }
    function segno(g) {
      if (g.h.indexOf('Ticino Unihockey') !== 0) return { t: 'trasferta', c: '' };
      return nostra(g.v) ? { t: 'in casa', c: ' casa' } : { t: 'in casa · fuori sede', c: ' fuori' };
    }

    var tutte = [], filtro = 'Tutte';

    function leggi(json) {
      var out = [];
      ((json && json.data && json.data.regions) || []).forEach(function (reg) {
        (reg.rows || []).forEach(function (row) {
          var c = row.cells || [];
          function t(k) {
            var v = c[k] && c[k].text;
            return Object.prototype.toString.call(v) === '[object Array]' ? v : (v ? [v] : []);
          }
          var dt = t(0);
          if (!dt.length || String(dt[0]).indexOf('.') < 0) return;
          out.push({ d: dt[0], t: dt[1] || '', v: t(1).join(', '), c: t(2).join(' · '),
                     h: t(3)[0] || '', a: t(4)[0] || '', r: t(5)[0] || '' });
        });
      });
      return out;
    }

    function mostraProssima() {
      if (!prossima) return;
      var ora = new Date(), p = null;
      for (var i = 0; i < tutte.length; i++) {
        var dt = data(tutte[i]);
        if (dt && dt >= ora) { p = tutte[i]; p._dt = dt; break; }
      }
      if (!p) return;
      var casa = p.h.indexOf('Ticino Unihockey') === 0;
      prossima.textContent = (casa ? p.h : p.a) + ' – ' + (casa ? p.a : p.h);
      var q = $('#pxQuando'), d = $('#pxDove'), t = $('#pxTorneo');
      if (t) t.textContent = nome(p.c) + ' · ' + segno(p).t;
      if (q) q.textContent = giorno(p._dt) + (p.t ? ' · ' + p.t : '');
      if (d) d.textContent = p.v;
    }

    function mostraCalendario() {
      if (!lista) return;
      var ora = new Date(), righe = [];
      for (var i = 0; i < tutte.length && righe.length < QUANTE; i++) {
        var g = tutte[i], dt = data(g);
        if (!dt || dt < ora) continue;
        if (filtro !== 'Tutte' && nome(g.c) !== filtro) continue;
        righe.push({ g: g, dt: dt });
      }
      lista.innerHTML = '';
      if (!righe.length) {
        lista.innerHTML = '<li class="vuoto">Nessuna partita in programma per questa selezione.</li>';
        return;
      }
      righe.forEach(function (r) {
        var g = r.g, casa = g.h.indexOf('Ticino Unihockey') === 0;
        var s = segno(g);
        var li = document.createElement('li');
        li.innerHTML =
          '<div class="quando"><b>' + giorno(r.dt) + '</b><span>' + (g.t || '') + '</span></div>' +
          '<div class="chi"><b><em>' + (casa ? g.h : g.a) + '</em> – ' + (casa ? g.a : g.h) +
            '</b><span>' + nome(g.c) + ' · ' + g.v + '</span></div>' +
          '<span class="segno' + s.c + '">' + s.t + '</span>';
        lista.appendChild(li);
      });
    }

    function mostraRisultati() {
      var el = $('#calRis');
      if (!el) return;
      var ora = new Date(), righe = [];
      for (var i = tutte.length - 1; i >= 0 && righe.length < 8; i--) {
        var g = tutte[i], dt = data(g);
        if (!dt || dt > ora || !g.r || g.r.indexOf(':') < 0) continue;
        righe.push({ g: g, dt: dt });
      }
      el.innerHTML = '';
      if (!righe.length) {
        el.innerHTML = '<li class="vuoto">La stagione è appena cominciata: qui compariranno i risultati.</li>';
        return;
      }
      righe.forEach(function (r) {
        var g = r.g, casa = g.h.indexOf('Ticino Unihockey') === 0;
        var p = g.r.split(':');
        var noi = casa ? parseInt(p[0], 10) : parseInt(p[1], 10);
        var loro = casa ? parseInt(p[1], 10) : parseInt(p[0], 10);
        var li = document.createElement('li');
        li.innerHTML =
          '<div class="quando"><b>' + giorno(r.dt) + '</b></div>' +
          '<div class="chi"><b><em>' + (casa ? g.h : g.a) + '</em> – ' + (casa ? g.a : g.h) +
            '</b><span>' + nome(g.c) + '</span></div>' +
          '<span class="punti' + (noi > loro ? ' v' : (noi < loro ? ' p' : '')) + '">' +
            noi + ':' + loro + '</span>';
        el.appendChild(li);
      });
    }

    function costruisciFiltri() {
      var box = $('#calFiltri');
      if (!box) return;
      var visti = ['Tutte'], ora = new Date();
      tutte.forEach(function (g) {
        var dt = data(g);
        if (!dt || dt < ora) return;
        var l = nome(g.c);
        if (visti.indexOf(l) < 0) visti.push(l);
      });
      box.innerHTML = '';
      visti.forEach(function (etichetta) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = etichetta;
        b.setAttribute('aria-pressed', String(etichetta === filtro));
        b.addEventListener('click', function () {
          filtro = etichetta;
          $$('button', box).forEach(function (c) {
            c.setAttribute('aria-pressed', String(c === b));
          });
          mostraCalendario();
        });
        box.appendChild(b);
      });
    }

    function avvia(elenco, viva) {
      tutte = elenco.slice().sort(function (a, b) {
        var x = data(a), y = data(b);
        return (x ? x.getTime() : 0) - (y ? y.getTime() : 0);
      });
      var stato = $('#calStato');
      if (stato) {
        stato.className = 'diretta' + (viva ? '' : ' spenta');
        stato.lastChild.textContent = viva
          ? 'dati in diretta da swiss unihockey · ' + tutte.length + ' partite'
          : 'copia locale — swiss unihockey non raggiungibile';
      }
      costruisciFiltri();
      mostraCalendario();
      mostraRisultati();
      mostraProssima();
    }

    var chiuso = false;
    function ripiego() { if (!chiuso) { chiuso = true; avvia(COPIA, false); } }
    var guardia = setTimeout(ripiego, 6000);

    if (window.fetch) {
      fetch(API, { mode: 'cors' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (j) {
          var l = leggi(j);
          if (!l.length) throw new Error('vuoto');
          if (!chiuso) { chiuso = true; clearTimeout(guardia); avvia(l, true); }
        })
        .catch(function () { clearTimeout(guardia); ripiego(); });
    } else {
      clearTimeout(guardia); ripiego();
    }
  })();
})();
