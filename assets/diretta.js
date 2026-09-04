/* Diretta — segue una partita del club mentre si gioca.

   Dati: API pubblica di swiss unihockey.
     /api/games?mode=club   elenco partite, con l'identificativo in link.ids
     /api/game_events/{id}  cronaca: gol con assist, penalità, inizio e fine tempo

   Il feed è memorizzato per 60 secondi dal server, quindi l'aggiornamento più
   fitto che abbia senso è circa un minuto: non è secondo per secondo, ma basta
   per seguire l'andamento.

   Con ?diretta=demo la barra riproduce una partita vera già giocata,
   così si può vedere come funziona anche quando non si gioca. */
(function () {
  'use strict';

  var lento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var API = 'https://api-v2.swissunihockey.ch/api';
  var CLUB = 435553, STAGIONE = 2026;
  var RITMO = 45000;              // ogni quanto ricontrollare, in millisecondi
  var PRIMA = 15 * 60000;         // quanto prima dell'inizio mostrare la barra
  var DOPO = 3.5 * 3600000;       // per quanto continuare a seguirla dopo l'inizio

  /* La simulazione parte da sola quando non c'è nessuna partita in corso, così
     la proposta mostra sempre come funziona. È dichiarata: la barra dice
     «Simulazione», non «In diretta». Con ?diretta=vera resta solo il vero. */
  var soloVere = /[?&]diretta=vera/.test(location.search);
  var demo = false, demoAvviata = false, demoFerma = false;
  var radice = null, statoAperto = false, tempoDemo = 0;
  var partite = [], scelta = 0;   // più squadre del club possono giocare insieme
  var giaMostrata = false;

  /* La prima volta che si trova una partita in corso il pannello si apre da solo:
     deve saltare all'occhio. Poi resta come l'ha lasciato chi guarda, anche
     cambiando pagina, così non diventa invadente. */
  function ricorda(v) {
    try { sessionStorage.setItem('tiuh-diretta', v); } catch (e) {}
  }
  function ricordato() {
    try { return sessionStorage.getItem('tiuh-diretta'); } catch (e) { return null; }
  }

  /* I motivi delle penalità arrivano in tedesco dal referto elettronico. */
  var MOTIVI = {
    'hoher stock': 'bastone alto',
    'stossen': 'spinta',
    'zu viele spieler': 'troppi giocatori in campo',
    'überharter körpereinsatz': 'gioco falloso',
    'wiederholte vergehen eines teams': 'falli ripetuti di squadra',
    'haken': 'uncino',
    'halten': 'trattenuta',
    'beinstellen': 'sgambetto',
    'schlagen': 'colpo di bastone',
    'stockschlag': 'colpo di bastone',
    'spielverzögerung': 'ritardo di gioco',
    'unsportliches verhalten': 'comportamento antisportivo',
    'distanzvergehen': 'distanza non rispettata',
    'unkorrekter abstand': 'distanza non rispettata',
    'zeitspiel': 'gioco temporeggiante',
    'behinderung': 'ostruzione',
    'rückenangriff': 'carica da dietro',
    'bandencheck': 'carica contro la balaustra',
    'falscher wechsel': 'cambio irregolare',
    'reklamieren': 'proteste'
  };

  function motivo(t) {
    if (!t) return '';
    var k = t.trim().toLowerCase();
    return MOTIVI[k] || t.toLowerCase();
  }

  /* ── dizionario: la federazione scrive in tedesco ── */
  function traduci(t) {
    if (!t) return '';
    var m = t.match(/^Torschütze\s+(\d+:\d+)/);
    if (m) return { tipo: 'gol', punti: m[1], testo: 'Gol' };
    m = t.match(/^(\d+)'-Strafe(?:\s*\((.+)\))?/);
    if (m) return { tipo: 'penalita',
                    testo: 'Penalità ' + m[1] + "'" + (m[2] ? ' · ' + motivo(m[2]) : '') };
    m = t.match(/^Beginn\s+(\d+)\.\s*Drittel/);
    if (m) return { tipo: 'inizio', tempo: +m[1], testo: 'Inizio ' + m[1] + '° tempo' };
    m = t.match(/^Ende\s+(\d+)\.\s*Drittel/);
    if (m) return { tipo: 'fine', tempo: +m[1], testo: 'Fine ' + m[1] + '° tempo' };
    if (/^Spielbeginn/.test(t)) return { tipo: 'inizio', tempo: 1, testo: 'Inizio partita' };
    if (/^Spielende/.test(t)) return { tipo: 'finita', testo: 'Fine partita' };
    if (/^Timeout/.test(t)) return { tipo: 'altro', testo: 'Timeout' };
    return { tipo: 'altro', testo: t };
  }

  /* Quale squadra del club sta giocando: sulla stessa giornata possono
     esserci fino a quattro partite in contemporanea, anche di due formazioni
     della stessa categoria (per esempio U14 B I e II). */
  var CATEGORIE = {
    'Herren NLB': 'Prima squadra', 'Mobiliar Unihockey Cup Männer': 'Coppa',
    'Junioren U21 B': 'U21 B', 'Junioren U18 B': 'U18 B', 'Junioren U16 A': 'U16 A',
    'Junioren U16 C': 'U16 C', 'Junioren U14 B': 'U14 B',
    'Junioren C Regional': 'Juniores C', 'Junioren D Regional': 'Juniores D'
  };

  function etichetta(p) {
    var base = (p.torneo || '').split(' Gruppe')[0].split('  ')[0].trim();
    var cat = CATEGORIE[base] || base;
    var nostra = p.casa.indexOf('Ticino Unihockey') === 0 ? p.casa : p.ospite;
    var suffisso = nostra.replace('Ticino Unihockey', '').trim();   // «I», «II» quando c'è
    return cat + (suffisso ? ' ' + suffisso : '');
  }

  /* Gli stemmi arrivano dal dettaglio partita; se mancano si mostra
     un tondo con l'iniziale, così l'impaginato non si sfalda. */
  /* Il punteggio del tabellone si compone a pezzi: così i due numeri e i due
     punti hanno spazi propri e restano leggibili anche a corpo grande. */
  function tabellone(punti) {
    var p = (punti || '0:0').split(':');
    return '<b><span>' + p[0] + '</span><i>:</i><span>' + p[1] + '</span></b>';
  }

  function stemma(url, nome) {
    if (url) {
      return '<span class="dir-stemma"><img src="' + url + '" alt="" loading="lazy"></span>';
    }
    var i = (nome || '?').replace(/^(FC|UHC|SV|UH)\s+/i, '').charAt(0).toUpperCase();
    return '<span class="dir-stemma dir-stemma-vuoto">' + i + '</span>';
  }

  /* «Junioren U16 C Gruppe 4» → «Juniores U16 C · girone 4» */
  function torneoLeggibile(t) {
    if (!t) return '';
    var pezzi = String(t).split(/\s+Gruppe\s+/);
    var base = pezzi[0].replace(/\s+$/, '');
    var nome = CATEGORIE[base] ? ('Junioren' === base.split(' ')[0]
      ? base.replace('Junioren', 'Juniores') : CATEGORIE[base]) : base.replace('Junioren', 'Juniores');
    if (base === 'Mobiliar Unihockey Cup Männer') nome = 'Coppa svizzera';
    if (base === 'Herren NLB') nome = 'LNB maschile';
    return nome + (pezzi[1] ? ' · girone ' + pezzi[1] : '');
  }

  function avversario(p) {
    return p.casa.indexOf('Ticino Unihockey') === 0 ? p.ospite : p.casa;
  }

  function chiedi(url) {
    return fetch(url, { mode: 'cors' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }

  function righeDi(json) {
    var out = [];
    (((json || {}).data || {}).regions || []).forEach(function (reg) {
      (reg.rows || []).forEach(function (row) {
        var c = [];
        (row.cells || []).forEach(function (cel) {
          var t = cel.text;
          c.push(Object.prototype.toString.call(t) === '[object Array]'
            ? t.join(' ') : (t ? String(t) : ''));
        });
        out.push({ celle: c, ids: (row.link || {}).ids || [] });
      });
    });
    return out;
  }

  /* ── stato della partita ricavato dalla cronaca ── */
  function leggiEventi(righe, casa, ospite) {
    var punti = '0:0', tempo = 1, finita = false, elenco = [];
    righe.forEach(function (c) {
      var e = traduci(c[1]);
      if (e.tipo === 'gol') punti = e.punti;
      if (e.tipo === 'inizio') tempo = e.tempo;
      if (e.tipo === 'fine') tempo = Math.max(tempo, e.tempo);
      if (e.tipo === 'finita') finita = true;
      if (e.tipo === 'gol' || e.tipo === 'penalita') {
        elenco.push({ minuto: c[0], testo: e.testo, squadra: c[2], chi: c[3],
                      punti: e.punti || '', tipo: e.tipo });
      }
    });
    return { punti: punti, tempo: tempo, finita: finita,
             eventi: elenco.slice(-6).reverse(), casa: casa, ospite: ospite };
  }

  /* ── disegno ── */
  function disegna() {
    if (!radice || !partite.length) return;
    if (scelta >= partite.length) scelta = 0;
    var p = partite[scelta];
    var noi = p.ospite.indexOf('Ticino Unihockey') === 0 ? 'ospite' : 'casa';
    var pz = p.punti.split(':');
    var nostri = noi === 'casa' ? pz[0] : pz[1];
    var loro = noi === 'casa' ? pz[1] : pz[0];
    var stato = p.finita ? 'Finita' : (p.tempo + '° tempo');

    var selettore = '';
    if (partite.length > 1) {
      selettore = '<div class="dir-scelta" role="tablist" aria-label="Partita da seguire">' +
        partite.map(function (q, i) {
          return '<button type="button" role="tab" aria-selected="' + (i === scelta) + '" data-i="' + i + '">' +
            '<b>' + etichetta(q) + '</b><span>' + q.punti + '</span>' +
            '<i>' + (q.finita ? 'finita · ' : '') + avversario(q) + '</i></button>';
        }).join('') + '</div>';
    }

    var eventi = p.eventi.map(function (e) {
      var mio = e.squadra.indexOf('Ticino Unihockey') === 0;
      /* Il colore della riga dice che cosa è successo, non solo a chi:
         verde gol nostro, rosso gol subito, ambra penalità. */
      var classe = e.tipo + (mio ? ' noi' : ' loro');
      return '<li class="' + classe + '">' +
        '<b>' + e.minuto + '</b>' +
        '<span class="che ' + e.tipo + '">' + e.testo + (e.punti ? ' ' + e.punti : '') + '</span>' +
        '<span class="chi">' + (e.chi || e.squadra) + '</span></li>';
    }).join('') || '<li class="niente">Nessun gol né penalità finora.</li>';

    radice.innerHTML =
      '<button class="dir-barra" type="button" aria-expanded="' + statoAperto + '" aria-controls="dir-pannello">' +
        '<span class="dir-punto"' + (p.finita ? ' data-finita="1"' : '') +
          (demo ? ' data-demo="1"' : '') + '></span>' +
        '<span class="dir-eti">' +
          (demo ? 'Simulazione' : (p.finita ? 'Finita' : 'In diretta')) + '</span>' +
        '<span class="dir-squadre">' +
          '<u>' + etichetta(p) + '</u> ' +
          p.casa + ' <b>' + p.punti + '</b> ' + p.ospite + '</span>' +
        '<span class="dir-stato">' +
          (partite.length > 1 ? partite.length + ' partite · ' : '') + stato + '</span>' +
        '<span class="dir-freccia" aria-hidden="true"></span>' +
      '</button>' +
      '<div class="dir-schermo" id="dir-pannello" role="dialog" aria-modal="true" ' +
           'aria-label="Partita in corso"' + (statoAperto ? '' : ' hidden') + '>' +
        '<div class="dir-testa">' +
          '<span class="dir-punto"' + (p.finita ? ' data-finita="1"' : '') +
            (demo ? ' data-demo="1"' : '') + '></span>' +
          '<span class="dir-eti">' +
            (demo ? 'Simulazione' : (p.finita ? 'Partita finita' : 'In diretta')) + '</span>' +
          '<span class="dir-squadre">' +
            '<u>' + etichetta(p) + '</u> ' +
            p.casa + ' <b>' + p.punti + '</b> ' + p.ospite + '</span>' +
          '<span class="dir-stato">' +
            (partite.length > 1 ? partite.length + ' partite · ' : '') + stato + '</span>' +
          '<button type="button" class="dir-chiudi" aria-label="Riduci il punteggio dal vivo">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="dir-corpo">' +
          selettore +
          '<div class="dir-tabellone">' +
            '<span class="dir-lato">' + stemma(p.stemmaCasa, p.casa) +
              '<span class="dir-nome">' + p.casa + '</span></span>' +
            tabellone(p.punti) +
            '<span class="dir-lato">' + stemma(p.stemmaOspite, p.ospite) +
              '<span class="dir-nome">' + p.ospite + '</span></span>' +
          '</div>' +
          '<p class="dir-riga">' + torneoLeggibile(p.torneo) + ' · ' + stato +
            (p.dove ? ' · ' + p.dove : '') + '</p>' +
          '<ul class="dir-eventi">' + eventi + '</ul>' +
          (demo ? '<p class="dir-nota">Simulazione su partite vere in calendario ' +
                  '(13 settembre): squadre, categorie e palestre sono reali, i punteggi ' +
                  'generati. Dal vivo qui compaiono anche i marcatori.</p>'
                : '<p class="dir-nota">Dati da swiss unihockey, aggiornati circa ogni minuto.</p>') +
        '</div>' +
      '</div>';

    radice.setAttribute('data-visibile', 'true');
    [].forEach.call(radice.querySelectorAll('.dir-scelta button'), function (b) {
      b.addEventListener('click', function () {
        scelta = +b.getAttribute('data-i');
        statoAperto = true;
        disegna();
      });
    });
    radice.querySelector('.dir-barra').addEventListener('click', function () { apri(!statoAperto); });
    var chiudi = radice.querySelector('.dir-chiudi');
    if (chiudi) chiudi.addEventListener('click', function () { apri(false); });
    var schermo = radice.querySelector('.dir-schermo');
    if (schermo) schermo.addEventListener('click', function (e) {
      if (e.target === schermo) apri(false);      // clic sullo spazio vuoto
    });
    applicaApertura();
    var vivo = radice.querySelector('.dir-annuncio');
    if (vivo) vivo.textContent = 'Punteggio ' + nostri + ' a ' + loro + ', ' + stato;
  }

  /* A schermo intero il sito dietro sparisce: si segue solo la partita. */
  function applicaApertura() {
    if (!radice) return;
    var schermo = radice.querySelector('.dir-schermo');
    var barra = radice.querySelector('.dir-barra');
    if (schermo) schermo.hidden = !statoAperto;
    if (barra) barra.setAttribute('aria-expanded', String(statoAperto));
    radice.setAttribute('data-aperto', String(statoAperto));
    document.documentElement.style.overflow = statoAperto ? 'hidden' : '';
  }

  function apri(v) {
    statoAperto = v;
    ricorda(v ? 'aperto' : 'chiuso');
    applicaApertura();
    if (!v) {
      var b = radice.querySelector('.dir-barra');
      if (b) b.focus();
    }
  }

  function nascondi(motivo) {
    if (motivo && window.console && console.warn) {
      console.warn('[diretta] niente da mostrare:', motivo && motivo.message || motivo);
    }
    if (radice) {
      radice.setAttribute('data-visibile', 'false');
      if (statoAperto) { statoAperto = false; applicaApertura(); }
    }
  }

  /* La prima volta che compare, il pannello si apre da solo: deve saltare
     all'occhio. Poi rispetta la scelta di chi guarda, anche cambiando pagina. */
  function ripiegoSimulazione() {
    if (soloVere) { nascondi(); return; }
    if (demoAvviata) return;                    // già in corso: non riavviarla
    demoAvviata = true;
    demo = true;
    avviaDemo();
  }

  /* La schermata copre tutta la pagina, perciò non si apre mai da sola:
     sarebbe un sequestro. Compare la barra, che si fa notare; ad aprirla è chi
     guarda. Cambiando pagina si ritrova però la scelta fatta. */
  function apriLaPrimaVolta() {
    if (giaMostrata) return;
    giaMostrata = true;
    statoAperto = (ricordato() === 'aperto');
  }

  /* ── modalità dimostrativa ── */
  function avviaDemo() {
    fetch('data/diretta-demo.json').then(function (r) { return r.json(); }).then(function (elenco) {
      function minuti(m) {
        /* «Spielende» non ha minuto: vale come ultimissimo evento, non come primo */
        if (!/^\d+:\d+$/.test(m || '')) return 999;
        var p = m.split(':');
        return (+p[0]) + (+p[1] || 0) / 60;
      }
      function passo() {
        tempoDemo += 3;                       // tre minuti di gioco a ogni battuta
        partite = elenco.map(function (d, i) {
          var fin = d.eventi.filter(function (c) { return minuti(c[0]) <= tempoDemo; });
          var p = leggiEventi(fin, d.casa, d.ospite);
          p.id = 'demo' + i; p.torneo = d.torneo; p.dove = d.dove;
          p.stemmaCasa = d.stemmaCasa; p.stemmaOspite = d.stemmaOspite;
          return p;
        });
        apriLaPrimaVolta();
        disegna();
        if (demoFerma) return;                  // è cominciata una partita vera
        if (tempoDemo < 64) {
          setTimeout(passo, lento ? 4000 : 1800);
        } else {
          setTimeout(function () { tempoDemo = 0; passo(); }, 7000);
        }
      }
      passo();
    }).catch(nascondi);
  }

  /* ── modalità vera ── */
  function cerca() {
    chiedi(API + '/games?mode=club&club_id=' + CLUB + '&season=' + STAGIONE + '&games_per_page=300')
      .then(function (j) {
        var ora = Date.now(), candidate = [];
        righeDi(j).forEach(function (r) {
          var c = r.celle;
          if (!c.length || String(c[0]).indexOf('.') < 0 || !r.ids.length) return;
          var d = c[0].split(' ')[0].split('.');
          var t = (c[0].split(' ')[1] || '00:00').split(':');
          if (d.length !== 3) return;
          var quando = new Date(+d[2], +d[1] - 1, +d[0], +(t[0] || 0), +(t[1] || 0)).getTime();
          if (quando - PRIMA <= ora && ora <= quando + DOPO) {
            candidate.push({ id: r.ids[0], casa: c[3], ospite: c[4], torneo: c[2], dove: c[1] });
          }
        });
        if (!candidate.length) { ripiegoSimulazione(); return; }
        demoFerma = true;                       // c'è del vero: la simulazione si ferma
        return segui(candidate.slice(0, 6));
      })
      .catch(nascondi);
  }

  function segui(lista) {
    var presi = lista.map(function (g) {
      return Promise.all([
        chiedi(API + '/game_events/' + g.id),
        chiedi(API + '/games/' + g.id).catch(function () { return null; })
      ]).then(function (due) {
        var loghi = [];
        if (due[1]) {
          (((due[1].data || {}).regions) || []).forEach(function (reg) {
            (reg.rows || []).forEach(function (row) {
              (row.cells || []).forEach(function (c) {
                if (c.image && c.image.url) loghi.push(c.image.url);
              });
            });
          });
        }
        return { g: g, righe: righeDi(due[0]).map(function (r) { return r.celle; }), loghi: loghi };
      }).catch(function () { return null; });
    });
    return Promise.all(presi).then(function (esiti) {
      var vive = [], concluse = [];
      esiti.forEach(function (e) {
        if (!e || !e.righe.length) return;
        var p = leggiEventi(e.righe, e.g.casa, e.g.ospite);
        p.id = e.g.id; p.torneo = e.g.torneo; p.dove = e.g.dove;
        p.stemmaCasa = e.loghi[0] || ''; p.stemmaOspite = e.loghi[1] || '';
        (p.finita ? concluse : vive).push(p);
      });
      /* prima quelle in corso; se non ce n'è nessuna resta l'ultima conclusa */
      var nuove = vive.length ? vive : concluse.slice(0, 1);
      if (!nuove.length) { ripiegoSimulazione(); return; }
      demo = false;
      var seguita = partite[scelta] && partite[scelta].id;
      partite = nuove;
      scelta = 0;
      for (var i = 0; i < partite.length; i++) {
        if (partite[i].id === seguita) { scelta = i; break; }   // non cambiare sotto le mani
      }
      disegna();
    });
  }

  function avvia() {
    radice = document.getElementById('diretta');
    if (!radice) return;
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && statoAperto) apri(false);
    });
    if (/[?&]diretta=demo/.test(location.search)) { ripiegoSimulazione(); return; }
    cerca();
    setInterval(cerca, RITMO);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) cerca();     // tornando sulla scheda, aggiorna subito
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else {
    avvia();
  }
})();
