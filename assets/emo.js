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

  /* ── classifica di categoria ──────────────────────────── */
  (function classifica() {
    var box = document.getElementById('classifica');
    if (!box) return;
    var API = 'https://api-v2.swissunihockey.ch/api/rankings';
    var lega = box.getAttribute('data-lega');
    var classe = box.getAttribute('data-classe');
    var gruppo = box.getAttribute('data-gruppo');
    /* I gironi cambiano numero ogni stagione: per l'anno scorso serve il suo. */
    var gruppoPrec = box.getAttribute('data-gruppo-prec') || '';
    var stagione = 2026;

    function indirizzo(anno) {
      var g = (anno === stagione) ? gruppo : gruppoPrec;
      if (!g) return null;
      return API + '?season=' + anno + '&league=' + lega + '&game_class=' + classe +
        '&group=' + encodeURIComponent(g);
    }
    function righeDi(j) {
      var out = [];
      ((((j || {}).data) || {}).regions || []).forEach(function (reg) {
        (reg.rows || []).forEach(function (row) {
          var celle = [], stemma = '';
          (row.cells || []).forEach(function (c) {
            var t = c.text;
            celle.push(Object.prototype.toString.call(t) === '[object Array]'
              ? t.join(' ') : (t ? String(t) : ''));
            if (c.image && c.image.url && !stemma) stemma = c.image.url;
          });
          out.push({ celle: celle, stemma: stemma });
        });
      });
      return out;
    }
    function disegna(righe, anno, titolo) {
      if (!righe.length) {
        box.innerHTML = '<p class="vuota">La classifica comparirà dopo le prime giornate.</p>';
        return;
      }
      var corpo = righe.map(function (r) {
        var c = r.celle;
        var nostra = c.some(function (x) { return x.indexOf('Ticino Unihockey') === 0; });
        var nome = c[2] || c[1];
        return '<tr' + (nostra ? ' class="noi"' : '') + '>' +
          '<td>' + c[0] + '</td>' +
          '<td><span class="squadra">' +
            (r.stemma ? '<img src="' + r.stemma + '" alt="" loading="lazy">' : '') +
            '<span>' + nome + '</span></span></td>' +
          '<td>' + (c[3] || '') + '</td>' +
          '<td>' + (c[c.length - 4] || '') + '</td>' +
          '<td>' + (c[c.length - 3] || '') + '</td>' +
          '<td class="punti">' + (c[c.length - 1] || '') + '</td></tr>';
      }).join('');
      box.innerHTML =
        '<p class="stato">' + titolo + '</p>' +
        '<table><thead><tr><th>Rg</th><th>Squadra</th><th>G</th><th>Reti</th>' +
        '<th>Diff</th><th>Punti</th></tr></thead><tbody>' + corpo + '</tbody></table>' +
        '<p class="fonte">Fonte: swiss unihockey · ' +
          (anno === stagione ? gruppo : gruppoPrec).replace('Gruppe', 'girone') + '</p>';
    }
    function chiedi(u) {
      return fetch(u, { mode: 'cors' }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      });
    }
    function ciSiamo(righe) {
      return righe.some(function (r) {
        return r.celle.some(function (x) { return x.indexOf('Ticino Unihockey') === 0; });
      });
    }
    chiedi(indirizzo(stagione)).then(function (j) {
      var righe = righeDi(j);
      if (righe.length) { disegna(righe, stagione, 'Stagione 2026/27'); return; }
      /* Stagione non ancora cominciata. Si può mostrare quella conclusa, ma solo
         se il club c'era: i gironi cambiano ogni anno, e una tabella senza di noi
         non dice nulla. */
      var prec = indirizzo(stagione - 1);
      if (!prec) { disegna([], stagione, ''); return; }
      return chiedi(prec).then(function (k) {
        var vecchie = righeDi(k);
        if (vecchie.length && ciSiamo(vecchie)) {
          disegna(vecchie, stagione - 1,
            'La stagione 2026/27 non è ancora cominciata — qui sotto la classifica finale 2025/26');
        } else {
          disegna([], stagione, '');
        }
      }).catch(function () {
        /* Nessuna tabella nemmeno l'anno scorso (capita nei gironi regionali):
           vale il messaggio neutro, non un errore. */
        disegna([], stagione, '');
      });
    }).catch(function () {
      box.innerHTML = '<p class="vuota">Classifica non disponibile in questo momento.</p>';
    });
  })();

  /* ── statistiche dei giocatori ──────────────────────────
     La federazione pubblica la lista giocatori (api/teams/…/players) solo per
     NLA e NLB. Ma il referto di ogni singola partita è pubblico per tutti: da
     lì, al momento della pubblicazione, abbiamo raccolto numero di maglia,
     anno di nascita, presenze e — dove qualcuno l'ha registrato — il ruolo.
     Gol, assist e penalità arrivano invece dalla cronaca, letta qui e ora,
     così si aggiornano dopo ogni giornata. */
  (function statistiche() {
    var box = document.getElementById('statistiche');
    if (!box) return;
    var API = 'https://api-v2.swissunihockey.ch/api';
    var CLUB = 435553;
    var STAGIONE = 2026;
    var competizione = box.getAttribute('data-competizione') || '';
    var RUOLI = { P: 'portiere', D: 'difensore', A: 'attaccante' };
    var NOSTRA = box.getAttribute('data-nostra') || '';

    function json(el) {
      try { return el ? JSON.parse(el.textContent) : null; } catch (e) { return null; }
    }
    var accanto = box.parentNode || document;
    var DIST = json(accanto.querySelector('.distinte')) || { stagioni: {} };
    var ANAG = json(accanto.querySelector('.anagrafica')) || [];

    function chiedi(u) {
      return fetch(u, { mode: 'cors' }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      });
    }
    function celle(row) {
      return (row.cells || []).map(function (c) {
        var t = c.text;
        return Object.prototype.toString.call(t) === '[object Array]' ? t.join(' ')
          : (t ? String(t) : '');
      });
    }
    function ricorda(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    function ricordato(k) {
      try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; }
    }

    function semplice(t) {
      return (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    function combacia(a, b) {
      return semplice(a).split(' ').sort().join(' ') === semplice(b).split(' ').sort().join(' ');
    }
    /* La cronaca abbrevia: «R. Bruni». La distinta scrive «Riccardo Bruni».
       Il cognome deve esserci per intero, l'iniziale deve trovare il suo nome. */
    function accostabile(corto, lungo) {
      var a = semplice(corto).split(' '), b = semplice(lungo).split(' ');
      var iniziali = [], parole = [], resto = b.slice();
      a.forEach(function (t) { (t.length === 1 ? iniziali : parole).push(t); });
      if (!iniziali.length || !parole.length) return false;
      for (var i = 0; i < parole.length; i++) {
        var k = resto.indexOf(parole[i]);
        if (k < 0) return false;
        resto.splice(k, 1);
      }
      for (var j = 0; j < iniziali.length; j++) {
        var trovato = -1;
        for (var h = 0; h < resto.length; h++) {
          if (resto[h].charAt(0) === iniziali[j]) { trovato = h; break; }
        }
        if (trovato < 0) return false;
        resto.splice(trovato, 1);
      }
      return true;
    }
    function somiglia(a, b) {
      return combacia(a, b) || accostabile(a, b) || accostabile(b, a);
    }
    /* Un solo candidato, altrimenti due omonimi si scambierebbero i gol. */
    function unico(nome, elenco, campo) {
      var esiti = [];
      for (var i = 0; i < elenco.length; i++) {
        if (somiglia(nome, campo ? elenco[i][campo] : elenco[i])) esiti.push(i);
      }
      return esiti.length === 1 ? esiti[0] : -1;
    }

    function estrai(dati) {
      var out = [];
      (((dati || {}).data || {}).regions || []).forEach(function (reg) {
        (reg.rows || []).forEach(function (row) {
          var c = celle(row);
          if (c.length < 4 || c[2].indexOf('Ticino Unihockey') !== 0) return;
          var chi = (c[3] || '').trim();
          if (!chi) return;
          if (c[1].indexOf('Torschütze') === 0) {
            var m = /^(.+?)\s*\((.+)\)\s*$/.exec(chi);
            out.push({ t: 'g', chi: (m ? m[1] : chi).trim(), assist: m ? m[2].trim() : '' });
          } else {
            var pen = /^(\d+)'(?:\+(\d+)')?-Strafe/.exec(c[1]);
            if (pen) out.push({ t: 'p', chi: chi, min: (+pen[1]) + (pen[2] ? +pen[2] : 0) });
          }
        });
      });
      return out;
    }
    function insieme(elenco, quanti, lavoro) {
      var i = 0, esiti = [];
      function passo() {
        if (i >= elenco.length) return Promise.resolve();
        var mio = i++;
        return lavoro(elenco[mio]).then(function (r) { esiti[mio] = r; return passo(); });
      }
      var fili = [];
      for (var k = 0; k < Math.min(quanti, elenco.length); k++) fili.push(passo());
      return Promise.all(fili).then(function () { return esiti; });
    }

    /* Gol, assist e penalità dalla cronaca di ogni partita già giocata. */
    function cronaca(anno) {
      return chiedi(API + '/games?mode=club&club_id=' + CLUB + '&season=' + anno +
                    '&games_per_page=300').then(function (j) {
        var ids = [];
        (((j.data || {}).regions) || []).forEach(function (reg) {
          (reg.rows || []).forEach(function (row) {
            var c = celle(row);
            if (c.length < 6 || c[0].indexOf('.') < 0) return;
            if (competizione && c[2].indexOf(competizione) !== 0) return;
            if (c[5].indexOf(':') < 0) return;
            var link = (row.link || {}).ids || [];
            if (link.length) ids.push(link[0]);
          });
        });
        return insieme(ids, 6, function (id) {
          var chiave = 'tiuh-ev3-' + id, salvato = ricordato(chiave);
          if (salvato) return Promise.resolve(salvato);
          return chiedi(API + '/game_events/' + id).then(function (e) {
            var v = estrai(e); ricorda(chiave, v); return v;
          }).catch(function () { return []; });
        }).then(function (esiti) {
          var conto = {};
          function voce(n) {
            if (!conto[n]) conto[n] = { g: 0, a: 0, m: 0 };
            return conto[n];
          }
          esiti.forEach(function (lista) {
            (lista || []).forEach(function (ev) {
              if (ev.t === 'g') {
                voce(ev.chi).g++;
                if (ev.assist) voce(ev.assist).a++;
              } else { voce(ev.chi).m += ev.min; }
            });
          });
          return conto;
        });
      });
    }

    /* Distinte ufficiali + cronaca: una riga per giocatore. */
    function unisci(base, conto) {
      var righe = base.map(function (q) {
        return { n: q.n || '', nome: q.nome, anno: q.anno || '', ruolo: q.ruolo || '',
                 pres: q.pres || 0, g: 0, a: 0, p: 0, m: 0 };
      });
      Object.keys(conto).forEach(function (nome) {
        var k = unico(nome, righe, 'nome');
        if (k < 0) {                     // ha segnato ma non è in nessuna distinta
          var e = { n: '', nome: nome, anno: '', ruolo: '', pres: 0, g: 0, a: 0, p: 0, m: 0 };
          var v = unico(nome, ANAG.map(function (x) { return x[0]; }));
          if (v >= 0) { e.nome = ANAG[v][0]; e.da = ANAG[v][1]; }
          righe.push(e);
          k = righe.length - 1;
        }
        righe[k].g += conto[nome].g;
        righe[k].a += conto[nome].a;
        righe[k].m += conto[nome].m;
      });
      righe.forEach(function (r) { r.p = r.g + r.a; });
      righe.sort(function (x, y) {
        return y.p - x.p || y.g - x.g || y.pres - x.pres || x.nome.localeCompare(y.nome);
      });
      return righe;
    }

    /* Gli stessi numeri accanto a ogni giocatore nella rosa qui sopra. */
    function collega(righe) {
      var voci = [].slice.call(document.querySelectorAll('.rosa-lista li'))
        .concat([].slice.call(document.querySelectorAll('.volto')));
      var presi = [];
      function altrove(r) {
        if (r.da) return;
        var v = unico(r.nome, ANAG.map(function (x) { return x[0]; }));
        if (v < 0) return;
        var sue = ANAG[v][1].split(' · ').filter(function (b) { return b !== NOSTRA; });
        if (sue.length) r.da = sue.join(' · ');
      }
      function cerca(nome, largo) {
        var esiti = [];
        for (var i = 0; i < righe.length; i++) {
          if (presi.indexOf(i) >= 0) continue;
          if (largo ? somiglia(nome, righe[i].nome) : combacia(nome, righe[i].nome)) esiti.push(i);
        }
        return esiti.length === 1 ? esiti[0] : -1;
      }
      [false, true].forEach(function (largo) {
        voci.forEach(function (v) {
          if (v.getAttribute('data-abbinato')) return;
          var et = v.querySelector('.nome') ||
                   v.querySelector('span:not(.num):not(.ruolo):not(.anche)');
          if (!et) return;
          var k = cerca(et.textContent.trim(), largo);
          if (k < 0) return;
          presi.push(k);
          v.setAttribute('data-abbinato', '1');
          var r = righe[k];
          var pezzi = [];
          if (r.anno) pezzi.push('classe ' + r.anno);
          if (r.g || r.a) pezzi.push('<b>' + r.g + '</b> gol · <b>' + r.a + '</b> assist');
          else if (r.pres) pezzi.push('<b>' + r.pres + '</b> presenze');
          if (!pezzi.length || v.querySelector('.rosa-stat')) return;
          var b = document.createElement('span');
          b.className = 'rosa-stat';
          b.innerHTML = pezzi.join(' · ');
          v.appendChild(b);
          var pri = (r.ruolo || '').split('/').filter(function (x) { return RUOLI[x]; });
          if (!v.getAttribute('data-ruolo') && pri.length) {
            v.setAttribute('data-ruolo', pri[0]);
            var sp = document.createElement('span');
            sp.className = 'ruolo';
            sp.title = pri.map(function (x) { return RUOLI[x]; }).join(' e ');
            sp.textContent = pri.join('/');
            v.insertBefore(sp, b);
          }
        });
      });
      /* chi ha giocato con noi ma è in rosa con un'altra categoria */
      righe.forEach(function (r, i) { if (presi.indexOf(i) < 0) altrove(r); });
    }

    function data(t) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t || '');
      var mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio',
                  'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
      return m ? (+m[3]) + ' ' + mesi[+m[2] - 1] + ' ' + m[1] : '';
    }

    function disegna(righe, anno) {
      if (!righe.length) {
        box.innerHTML = '<p class="vuota">Le statistiche compariranno dopo la prima giornata.</p>';
        return;
      }
      collega(righe);
      var conN = righe.some(function (r) { return r.n; });
      var conAnno = righe.some(function (r) { return r.anno; });
      function pastiglie(r) {
        return (r.ruolo || '').split('/').filter(function (x) { return RUOLI[x]; });
      }
      var conRuolo = righe.some(function (r) { return pastiglie(r).length; });
      var conPres = righe.some(function (r) { return r.pres; });
      var conPen = righe.some(function (r) { return r.m; });
      var corpo = righe.map(function (r, i) {
        return '<tr' + (i === 0 && r.p ? ' class="primo"' : '') + '>' +
          (conN ? '<td class="num">' + (r.n || '·') + '</td>' : '') +
          '<td class="chi">' + r.nome +
            (r.da ? ' <span class="stat-da" title="In rosa con ' + r.da + '">' +
              r.da + '</span>' : '') + '</td>' +
          (conRuolo ? '<td class="ruolo">' + pastiglie(r).map(function (x) {
            return '<span class="' + x + '" title="' + RUOLI[x] + '">' + x + '</span>';
          }).join('') + '</td>' : '') +
          (conAnno ? '<td class="anno">' + (r.anno || '') + '</td>' : '') +
          (conPres ? '<td class="pres">' + (r.pres || '') + '</td>' : '') +
          '<td>' + r.g + '</td><td>' + r.a + '</td>' +
          '<td class="punti">' + r.p + '</td>' +
          (conPen ? '<td class="pen">' + (r.m || '') + '</td>' : '') + '</tr>';
      }).join('');
      var quando = data(DIST.aggiornato);
      box.innerHTML =
        '<p class="stato">' + (anno === STAGIONE ? 'Stagione 2026/27'
          : 'La stagione 2026/27 non è ancora cominciata — qui sotto la stagione 2025/26') + '</p>' +
        '<table><thead><tr>' + (conN ? '<th class="num">N.</th>' : '') +
        '<th class="chi">Giocatore</th>' + (conRuolo ? '<th>Ruolo</th>' : '') +
        (conAnno ? '<th class="anno">Classe</th>' : '') +
        (conPres ? '<th class="pres" title="Partite in distinta">Pres.</th>' : '') +
        '<th>Gol</th><th>Assist</th><th>Punti</th>' +
        (conPen ? '<th class="pen" title="Minuti di penalità">Pen.</th>' : '') +
        '</tr></thead><tbody>' + corpo + '</tbody></table>' +
        '<p class="fonte">Gol, assist e penalità dalla cronaca ufficiale di swiss unihockey, ' +
        'aggiornati dopo ogni giornata. Numero, anno di nascita e presenze dalle distinte ' +
        'delle singole partite' + (quando ? ', raccolte il ' + quando : '') + '. ' +
        'Il ruolo è indicato solo dove il club o la federazione lo pubblicano. ' +
        'I tiri non vengono registrati, quindi le parate dei portieri non sono calcolabili.</p>';
    }

    var stagioni = DIST.stagioni || {};
    var anno = (stagioni[STAGIONE] && stagioni[STAGIONE].length) ? STAGIONE : STAGIONE - 1;
    var base = stagioni[anno] || [];
    cronaca(anno).then(function (conto) {
      disegna(unisci(base, conto), anno);
    }).catch(function () {
      if (base.length) disegna(unisci(base, {}), anno);
      else box.innerHTML = '<p class="vuota">Statistiche non disponibili in questo momento.</p>';
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

  /* ── scheda del giocatore ───────────────────────────────
     Il ritratto va a tutto schermo e i dati salgono su di esso mentre si
     scorre: la foto si muove più piano del testo, il numero più in fretta.
     È la stessa grammatica del resto del sito, applicata a una persona sola. */
  (function giocatore() {
    var pista = $('.pista'), dati = $('.dossier');
    if (!pista || !dati) return;
    var ROSA;
    try { ROSA = JSON.parse(dati.textContent); } catch (e) { return; }
    if (!ROSA || !ROSA.length) return;

    var API = 'https://api-v2.swissunihockey.ch/api';
    var schermo = null, quale = -1, filo = 0, piani = [];

    /* I blocchi di dati scorrono a velocità appena diverse fra loro: il
       ritratto resta leggibile sotto e la lettura acquista profondità. */
    function raccogliPiani() {
      piani = schermo ? $$('[data-piano]', schermo) : [];
    }

    function eta(nato) {
      var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(nato || '');
      if (!m) return '';
      var o = new Date(), a = o.getFullYear() - (+m[3]);
      var mese = o.getMonth() + 1, giorno = o.getDate();
      if (mese < +m[2] || (mese === +m[2] && giorno < +m[1])) a--;
      return a > 0 && a < 120 ? a + ' anni' : '';
    }
    function dataLunga(nato) {
      var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(nato || '');
      var mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio',
                  'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
      return m ? (+m[1]) + ' ' + mesi[+m[2] - 1] + ' ' + m[3] : '';
    }
    function fatto(et, v) {
      return v ? '<div class="gio-fatto"><dt>' + et + '</dt><dd>' + v + '</dd></div>' : '';
    }
    function celle(row) {
      return (row.cells || []).map(function (c) {
        var t = c.text;
        return Object.prototype.toString.call(t) === '[object Array]' ? t.join(' ')
          : (t == null ? '' : String(t));
      });
    }

    function telaio(g) {
      var nome = g.nome.split(' ');
      var cognome = nome.length > 1 ? nome.slice(1).join(' ') : '';
      var sotto = [g.ruolo, eta(g.nato)].filter(Boolean).join(' · ');
      return '<div class="gio-sfondo"><img src="' + g.foto + '" alt=""></div>' +
        '<div class="gio-velo"></div>' +

        /* Il nome non sta dentro la copertina: sale con lo scorrimento e si
           ferma in cima, della stessa misura con cui si è aperto. */
        '<div class="gio-titolo">' +
          '<h2 class="gio-nome"><span>' + nome[0] + '</span>' +
            (cognome ? '<span>' + cognome + '</span>' : '') + '</h2>' +
          (sotto ? '<p class="gio-ruolo">' + sotto + '</p>' : '') +
        '</div>' +
        '<div class="gio-scorri" tabindex="-1">' +
          '<div class="gio-apice">' +
            '<span class="gio-numero" aria-hidden="true">' + (+g.n || g.n) + '</span>' +
            '<span class="gio-giu" aria-hidden="true"></span>' +
          '</div>' +
          '<div class="gio-foglio">' +
            '<div class="gio-tappa"><div class="gio-tappa-fermo">' +
              '<dl class="gio-fatti">' +
                fatto('Numero', g.n ? '#' + (+g.n || g.n) : '') +
                fatto('Ruolo', g.ruolo) +
                fatto('Nato il', dataLunga(g.nato)) +
                fatto('Nazionalità', g.paese) +
                fatto('Altezza', g.altezza) +
                fatto('Peso', g.peso) +
              '</dl>' +
            '</div></div>' +
            '<div class="gio-numeri"><p class="gio-attesa">Carriera in arrivo…</p></div>' +
            (g.sponsor.length
              ? '<div class="gio-sponsor" data-piano="0.5"><h3>Sponsor personale</h3><div>' +
                g.sponsor.map(function (s) {
                  return '<a href="' + s.sito + '" target="_blank" rel="noopener">' +
                    '<img src="' + s.img + '" alt="" loading="lazy"></a>';
                }).join('') + '</div></div>'
              : '') +
          '</div>' +
        '</div>' +
        '<button type="button" class="gio-chiudi" aria-label="Chiudi la scheda">' +
          '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        (ROSA.length > 1
          ? '<button type="button" class="gio-passo prec" aria-label="Giocatore precedente">' +
              '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>' +
            '<button type="button" class="gio-passo succ" aria-label="Giocatore successivo">' +
              '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>'
          : '');
    }

    /* La carriera arriva dalla federazione: una richiesta sola, e solo
       quando la scheda si apre davvero. */
    function carriera(g, mio) {
      var box = schermo.querySelector('.gio-numeri');
      if (!box || !g.pid) { if (box) box.innerHTML = ''; return; }
      var chiave = 'tiuh-car2-' + g.pid;
      function rendi(righe) {
        if (mio !== filo || !schermo) return;
        var b = schermo.querySelector('.gio-numeri');
        if (!b) return;
        if (!righe.length) { b.innerHTML = ''; return; }
        var nostre = righe.filter(function (r) { return r.club.indexOf('Ticino') >= 0; });
        var tot = nostre.reduce(function (a, r) {
          return { p: a.p + r.p, g: a.g + r.g, a: a.a + r.a, n: a.n + r.n };
        }, { p: 0, g: 0, a: 0, n: 0 });
        var quante = {};
        nostre.forEach(function (r) { quante[r.stagione] = 1; });
        b.innerHTML =
          '<h3>In rossoblù</h3>' +
          '<div class="gio-cifre" data-piano="1.6">' +
            '<div><b>' + Object.keys(quante).length + '</b><span>stagioni</span></div>' +
            '<div><b>' + tot.p + '</b><span>partite</span></div>' +
            '<div><b>' + tot.g + '</b><span>gol</span></div>' +
            '<div><b>' + tot.a + '</b><span>assist</span></div>' +
            '<div><b>' + (tot.g + tot.a) + '</b><span>punti</span></div>' +
          '</div>' +
          '<h3>Stagione per stagione</h3>' +
          '<div class="gio-tabella" data-piano="0.7"><table><thead><tr><th>Stagione</th><th>Lega</th>' +
          '<th>Pt.</th><th>Gol</th><th>Ass.</th><th>Punti</th></tr></thead><tbody>' +
          righe.map(function (r, i) {
            return '<tr' + (i === 0 ? ' class="prima"' : '') + '><td>' + r.stagione + '</td>' +
              '<td>' + r.lega + '</td><td>' + r.p + '</td><td>' + r.g + '</td>' +
              '<td>' + r.a + '</td><td class="punti">' + (r.g + r.a) + '</td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<p class="gio-fonte">Carriera da swiss unihockey.</p>';
        raccogliPiani();
      }
      var salvato = null;
      try { salvato = JSON.parse(localStorage.getItem(chiave) || 'null'); } catch (e) {}
      if (salvato) { rendi(salvato); return; }
      fetch(API + '/players/' + g.pid + '/statistics', { mode: 'cors' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (j) {
          var righe = [];
          (((j.data || {}).regions) || []).forEach(function (reg) {
            (reg.rows || []).forEach(function (row) {
              var c = celle(row);
              if (c.length < 7) return;
              righe.push({ stagione: c[0], lega: c[1], club: c[2],
                           p: +c[3] || 0, g: +c[4] || 0, a: +c[5] || 0 });
            });
          });
          try { localStorage.setItem(chiave, JSON.stringify(righe)); } catch (e) {}
          rendi(righe);
        })
        .catch(function () {
          if (mio !== filo || !schermo) return;
          var b = schermo.querySelector('.gio-numeri');
          if (b) b.innerHTML = '';
        });
    }

    /* Il parallasse: la foto scorre a un terzo, il numero quasi in fretta,
       il nome nel mezzo. Tre velocità bastano a dare profondità. */
    /* I dati principali si accendono uno alla volta: finché non ci sono
       tutti la tappa resta ferma sotto gli occhi, poi la pagina riprende a
       scorrere come sempre. */
    function preparaTappa() {
      var tappa = schermo.querySelector('.gio-tappa');
      if (!tappa) return null;
      var carte = $$('.gio-fatto', tappa);
      if (!carte.length) { tappa.style.display = 'none'; return null; }
      tappa.style.setProperty('--carte', carte.length);
      if (lento) { carte.forEach(function (c) { c.classList.add('vede'); }); return null; }
      return { tappa: tappa, carte: carte };
    }

    /* Dal basso della copertina fino in cima: il viaggio dura una schermata,
       poi il nome resta lì, della stessa misura, per tutta la lettura. */
    function poseTitolo(q, alta) {
      var titolo = schermo && schermo.querySelector('.gio-titolo');
      if (!titolo) return;
      var suo = titolo.offsetHeight;
      var giu = Math.max(0, alta - suo - alta * 0.14 - 44);
      var su = Math.max(10, alta * 0.022);
      titolo.style.transform = 'translate3d(0,' + (giu + (su - giu) * q).toFixed(1) + 'px,0)';
      titolo.style.setProperty('--fondo', q.toFixed(3));
    }

    function parallasse() {
      var scorri = schermo.querySelector('.gio-scorri');
      /* Il parallasse muove la cornice; la lenta deriva della foto resta
         all'animazione CSS dentro, così le due non si sovrascrivono. */
      var foto = schermo.querySelector('.gio-sfondo');
      var numero = schermo.querySelector('.gio-numero');
      var apice = schermo.querySelector('.gio-apice');
      var seq = preparaTappa();
      if (!scorri || lento) return;
      var atteso = false;
      scorri.addEventListener('scroll', function () {
        if (atteso) return;
        atteso = true;
        requestAnimationFrame(function () {
          atteso = false;
          var y = scorri.scrollTop, h = apice.offsetHeight || 1;
          var q = Math.min(1, y / h);
          poseTitolo(q, scorri.clientHeight || h);
          /* La foto sale più piano di tutto il resto e si ferma quando il
             foglio l'ha coperta: oltre non servirebbe, e scoprirebbe il fondo. */
          foto.style.transform = 'translate3d(0,' + (-Math.min(y, h) * 0.3) + 'px,0)';
          if (numero) numero.style.transform = 'translate3d(0,' + (-y * 0.42) + 'px,0)';
          apice.style.opacity = String(Math.max(0, 1 - q * 1.25));
          /* passata la foto i comandi cambiano fondo: sull'avorio del foglio
             il bianco su bianco sparirebbe */
          schermo.classList.toggle('sceso', q > 0.55);
          var alta = scorri.clientHeight || 1;
          if (seq) {
            var rt = seq.tappa.getBoundingClientRect();
            var corsa = seq.tappa.offsetHeight - (scorri.clientHeight || 1);
            var avanti = corsa > 0 ? Math.min(1, Math.max(0, -rt.top / corsa)) : 1;
            var n = seq.carte.length;
            for (var k = 0; k < n; k++) {
              seq.carte[k].classList.toggle('vede', avanti * n >= k);
            }
          }
          for (var i = 0; i < piani.length; i++) {
            var el = piani[i], r = el.getBoundingClientRect();
            var d = (r.top + r.height / 2 - alta / 2) / alta;   // −1 sopra, +1 sotto
            el.style.transform =
              'translate3d(0,' + (d * 30 * parseFloat(el.getAttribute('data-piano'))).toFixed(1) + 'px,0)';
          }
        });
      }, { passive: true });
    }

    function chiudi() {
      if (!schermo) return;
      var vecchio = schermo;
      schermo = null;
      quale = -1;
      vecchio.classList.remove('aperto');
      document.documentElement.style.overflow = '';
      window.setTimeout(function () {
        if (vecchio.parentNode) vecchio.parentNode.removeChild(vecchio);
      }, lento ? 0 : 320);
    }

    function apri(i) {
      var g = ROSA[i];
      if (!g) return;
      filo++;
      var mio = filo;
      quale = i;
      if (!schermo) {
        schermo = document.createElement('div');
        schermo.className = 'gio-schermo';
        schermo.setAttribute('role', 'dialog');
        schermo.setAttribute('aria-modal', 'true');
        document.body.appendChild(schermo);
        document.documentElement.style.overflow = 'hidden';
      }
      schermo.setAttribute('aria-label', 'Scheda di ' + g.nome);
      schermo.innerHTML = telaio(g);
      schermo.querySelector('.gio-chiudi').addEventListener('click', chiudi);
      var prec = schermo.querySelector('.gio-passo.prec');
      var succ = schermo.querySelector('.gio-passo.succ');
      if (prec) prec.addEventListener('click', function () { apri((i - 1 + ROSA.length) % ROSA.length); });
      if (succ) succ.addEventListener('click', function () { apri((i + 1) % ROSA.length); });
      parallasse();
      var primo = schermo.querySelector('.gio-scorri');
      poseTitolo(0, (primo && primo.clientHeight) || window.innerHeight);
      raccogliPiani();
      carriera(g, mio);
      requestAnimationFrame(function () {
        if (schermo) schermo.classList.add('aperto');
      });
      var s = schermo.querySelector('.gio-scorri');
      if (s) s.focus();
    }

    /* Trascinare il carosello non deve aprire nessuna scheda. */
    var partenza = 0, mosso = false;
    pista.addEventListener('pointerdown', function (e) { partenza = e.clientX; mosso = false; });
    pista.addEventListener('pointermove', function (e) {
      if (Math.abs(e.clientX - partenza) > 6) mosso = true;
    });
    $$('.volto[data-scheda]', pista).forEach(function (b) {
      b.addEventListener('click', function (e) {
        if (mosso) { e.preventDefault(); return; }
        apri(+b.getAttribute('data-scheda'));
      });
    });
    document.addEventListener('keydown', function (e) {
      if (!schermo) return;
      if (e.key === 'Escape') { chiudi(); return; }
      if (e.key === 'ArrowLeft') apri((quale - 1 + ROSA.length) % ROSA.length);
      if (e.key === 'ArrowRight') apri((quale + 1) % ROSA.length);
    });
  })();
})();
