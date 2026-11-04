/* Efficient Planner — utilitaires (dates, formatage, DOM, analyse rapide) */
(function () {
  'use strict';
  const EP = window.EP = window.EP || {};
  const DAY = 86400000;
  const pad = (n) => String(n).padStart(2, '0');

  const uid = (prefix) => (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------------- Dates ---------------- */
  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number') return new Date(value);
    const s = String(value).trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  const toISO = (d) => {
    const dt = parseDate(d) || new Date();
    return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
  };
  const toISOdt = (d) => {
    const dt = parseDate(d) || new Date();
    return toISO(dt) + 'T' + pad(dt.getHours()) + ':' + pad(dt.getMinutes());
  };
  const dateKey = (d) => toISO(d);
  const todayKey = () => toISO(new Date());

  const startOfDay = (d) => {
    const dt = parseDate(d) || new Date();
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  };
  const endOfDay = (d) => {
    const dt = startOfDay(d);
    dt.setHours(23, 59, 0, 0);
    return dt;
  };
  const addDays = (d, n) => {
    const dt = startOfDay(d);
    dt.setDate(dt.getDate() + n);
    return dt;
  };
  const addMinutes = (d, n) => new Date((parseDate(d) || new Date()).getTime() + n * 60000);
  const addMonths = (d, n) => {
    const dt = parseDate(d) || new Date();
    return new Date(dt.getFullYear(), dt.getMonth() + n, dt.getDate(), dt.getHours(), dt.getMinutes());
  };
  const startOfWeek = (d, weekStartsOn) => {
    const ws = weekStartsOn == null ? 1 : weekStartsOn;
    const dt = startOfDay(d);
    const diff = (dt.getDay() - ws + 7) % 7;
    return addDays(dt, -diff);
  };
  const endOfWeek = (d, ws) => addDays(startOfWeek(d, ws), 6);
  const startOfMonth = (d) => {
    const dt = parseDate(d) || new Date();
    return new Date(dt.getFullYear(), dt.getMonth(), 1);
  };
  const endOfMonth = (d) => {
    const dt = parseDate(d) || new Date();
    return new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
  };
  const sameDay = (a, b) => {
    const da = parseDate(a), db = parseDate(b);
    return !!da && !!db && da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
  };
  const diffDays = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / DAY);
  const monthDiff = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

  function monthGrid(year, month, weekStartsOn) {
    const first = new Date(year, month, 1);
    const start = startOfWeek(first, weekStartsOn);
    const out = [];
    for (let i = 0; i < 42; i++) out.push(addDays(start, i));
    return out;
  }

  function durationMin(start, end) {
    const a = parseDate(start), b = parseDate(end);
    if (!a || !b) return 0;
    return Math.max(0, Math.round((b - a) / 60000));
  }

  const isEndOfDay = (iso) => {
    const d = parseDate(iso);
    return !!d && d.getHours() === 23 && d.getMinutes() === 59;
  };

  /* ---------------- Formatage ---------------- */
  const LOCALE = 'fr-CA';
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  function fmtDate(value, options) {
    const d = parseDate(value);
    if (!d) return '';
    return new Intl.DateTimeFormat(LOCALE, options || { day: 'numeric', month: 'short' }).format(d);
  }
  function fmtDateLong(value) {
    const d = parseDate(value);
    if (!d) return '';
    return cap(new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d));
  }
  function fmtDateFull(value) {
    const d = parseDate(value);
    if (!d) return '';
    return cap(new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(d));
  }
  function fmtTime(value) {
    const d = parseDate(value);
    if (!d) return '';
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fmtDateTime(value) {
    const d = parseDate(value);
    if (!d) return '';
    return fmtDate(d) + ' · ' + fmtTime(d);
  }
  function fmtMonthYear(value) {
    const d = parseDate(value);
    if (!d) return '';
    return new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' }).format(d);
  }
  function weekdayShort(value) {
    const d = parseDate(value);
    if (!d) return '';
    return new Intl.DateTimeFormat(LOCALE, { weekday: 'short' }).format(d).replace('.', '');
  }
  function weekdayLong(value) {
    const d = parseDate(value);
    if (!d) return '';
    return new Intl.DateTimeFormat(LOCALE, { weekday: 'long' }).format(d);
  }
  const WEEKDAYS = [
    { value: 1, short: 'Lun', long: 'Lundi' },
    { value: 2, short: 'Mar', long: 'Mardi' },
    { value: 3, short: 'Mer', long: 'Mercredi' },
    { value: 4, short: 'Jeu', long: 'Jeudi' },
    { value: 5, short: 'Ven', long: 'Vendredi' },
    { value: 6, short: 'Sam', long: 'Samedi' },
    { value: 0, short: 'Dim', long: 'Dimanche' }
  ];
  function weekdayName(n, short) {
    const w = WEEKDAYS.find((x) => x.value === Number(n));
    return w ? (short ? w.short : w.long) : '';
  }

  function relative(value) {
    const d = parseDate(value);
    if (!d) return '';
    const diff = diffDays(d, new Date());
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Demain';
    if (diff === 2) return 'Après-demain';
    if (diff === -1) return 'Hier';
    if (diff === -2) return 'Avant-hier';
    if (diff > 2 && diff <= 7) return 'Dans ' + diff + ' jours';
    if (diff < -2 && diff >= -7) return 'Il y a ' + Math.abs(diff) + ' jours';
    return fmtDate(d, { day: 'numeric', month: 'short' });
  }

  function dueText(value) {
    const d = parseDate(value);
    if (!d) return 'Sans échéance';
    const txt = relative(d);
    if (isEndOfDay(d)) return txt;
    if (d.getHours() === 0 && d.getMinutes() === 0) return txt;
    return txt + ' · ' + fmtTime(d);
  }

  function fmtRange(start, end) {
    const a = parseDate(start), b = parseDate(end);
    if (!a) return '';
    if (!b) return fmtDateTime(a);
    if (sameDay(a, b)) return fmtDate(a, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + fmtTime(a) + '–' + fmtTime(b);
    return fmtDateTime(a) + ' → ' + fmtDateTime(b);
  }

  function humanDuration(mins) {
    const m = Math.round(Number(mins) || 0);
    if (m <= 0) return '';
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60), r = m % 60;
    return h + ' h' + (r ? ' ' + pad(r) : '');
  }

  function num(value, digits) {
    if (value == null || value === '' || isNaN(Number(value))) return '—';
    const d = digits == null ? 1 : digits;
    return new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: d }).format(Number(value));
  }
  const percent = (value, digits) => (value == null || isNaN(Number(value)) ? '—' : num(value, digits == null ? 1 : digits) + ' %');

  function plural(n, singular, pluralForm) {
    return n + ' ' + (Math.abs(n) > 1 ? (pluralForm || singular + 's') : singular);
  }

  /* ---------------- Divers ---------------- */
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const sum = (arr, fn) => arr.reduce((acc, x) => acc + Number((fn ? fn(x) : x) || 0), 0);
  const avg = (arr) => (arr.length ? sum(arr) / arr.length : null);
  const unique = (arr) => Array.from(new Set(arr));
  function groupBy(arr, fn) {
    return arr.reduce((acc, x) => {
      const k = fn(x);
      (acc[k] = acc[k] || []).push(x);
      return acc;
    }, {});
  }
  function sortBy(arr, fn, desc) {
    return arr.slice().sort((a, b) => {
      const va = fn(a), vb = fn(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return desc ? 1 : -1;
      if (va > vb) return desc ? -1 : 1;
      return 0;
    });
  }
  const qs = (sel, root) => (root || document).querySelector(sel);
  const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  function on(el, event, handler, opts) {
    if (el) el.addEventListener(event, handler, opts);
    return () => el && el.removeEventListener(event, handler, opts);
  }
  function debounce(fn, wait) {
    let t;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, args), wait || 200);
    };
  }
  function approxEqual(a, b, eps) {
    return Math.abs(a - b) <= (eps == null ? 0.01 : eps);
  }
  function hexToRgba(hex, alpha) {
    const h = String(hex || '').replace('#', '');
    if (h.length !== 6 && h.length !== 3) return 'rgba(99,102,241,' + alpha + ')';
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }
  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* ---------------- Analyse de la saisie rapide ---------------- */
  const CAT_WORDS = {
    ecole: 'school', 'école': 'school', school: 'school', etudes: 'school', 'études': 'school',
    travail: 'work', work: 'work', boulot: 'work', pro: 'work',
    perso: 'personal', personnel: 'personal', personal: 'personal', vie: 'personal'
  };
  const PRIORITY_WORDS = {
    urgente: 'urgent', urgent: 'urgent', '!': 'urgent',
    haute: 'high', high: 'high', importante: 'high', important: 'high',
    normale: 'normal', normal: 'normal', moyenne: 'normal',
    basse: 'low', low: 'low', faible: 'low'
  };
  const DAY_NAMES = {
    lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0
  };

  function parseQuickAdd(raw, ctx) {
    const state = ctx || {};
    const res = {
      title: '',
      category: state.defaultCategory || 'personal',
      priority: 'normal',
      status: 'todo',
      tags: [],
      due: null,
      courseId: null,
      projectId: null,
      estimate: null
    };
    let text = ' ' + String(raw || '').replace(/\s+/g, ' ').trim() + ' ';
    if (!text.trim()) return res;

    // Hashtags : catégories ou étiquettes
    text = text.replace(/#([\p{L}\w-]+)/gu, (m, tag) => {
      const key = tag.toLowerCase();
      if (CAT_WORDS[key]) { res.category = CAT_WORDS[key]; return ' '; }
      res.tags.push(tag);
      return ' ';
    });

    // Priorité : !urgent, !haute…
    text = text.replace(/!(urgente?|haute?|high|importante?|normale?|moyenne?|basse?|low|faible)\b/gi, (m, p) => {
      const key = p.toLowerCase();
      if (PRIORITY_WORDS[key]) res.priority = PRIORITY_WORDS[key];
      return ' ';
    });

    // Durée estimée : ~45m, ~2h
    text = text.replace(/~(?:(\d+(?:[.,]\d+)?)\s*h(?:eures?)?)?\s*(?:(\d+)\s*(?:m|min))?/gi, (m, h, min) => {
      const minutes = (parseFloat(String(h || '0').replace(',', '.')) * 60) + Number(min || 0);
      if (minutes > 0) { res.estimate = Math.round(minutes); return ' '; }
      return m;
    });

    const now = new Date();
    let datePart = null, timePart = null;

    // Date ISO
    text = text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/, (m, y, mo, d) => {
      datePart = new Date(+y, +mo - 1, +d);
      return ' ';
    });
    // Date j/m ou j/m/aaaa
    if (!datePart) {
      text = text.replace(/\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/, (m, d, mo, y) => {
        const year = y ? (+y < 100 ? 2000 + +y : +y) : now.getFullYear();
        const cand = new Date(year, +mo - 1, +d);
        if (cand.getMonth() !== +mo - 1) return m;
        datePart = cand;
        return ' ';
      });
    }
    // Mots-clés
    if (!datePart) {
      const kw = text.match(/\b(aujourd'?hui|demain|apr[eè]s-demain|dans\s+\d+\s+(?:jours?|semaines?))\b/i);
      if (kw) {
        const w = kw[0].toLowerCase();
        if (/aujourd/.test(w)) datePart = new Date(now);
        else if (w === 'demain') datePart = addDays(now, 1);
        else if (/apr[eè]s-demain/.test(w)) datePart = addDays(now, 2);
        else {
          const m = w.match(/dans\s+(\d+)\s+(jours?|semaines?)/);
          if (m) datePart = addDays(now, +m[1] * (/semaine/.test(m[2]) ? 7 : 1));
        }
        text = text.replace(kw[0], ' ');
      }
    }
    // Jour de la semaine
    if (!datePart) {
      const kw = text.match(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?:\s+prochain)?\b/i);
      if (kw) {
        const target = DAY_NAMES[kw[1].toLowerCase()];
        let diff = (target - now.getDay() + 7) % 7;
        if (diff === 0) diff = 7;
        datePart = addDays(now, diff);
        text = text.replace(kw[0], ' ');
      }
    }
    // Heure : 14h, 14h30, 14:30, à 9 h
    text = text.replace(/(?:\bà\s+)?\b(\d{1,2})\s*(?:h|:)\s*(\d{2})?\b/gi, (m, h, min) => {
      const hh = Number(h), mm = Number(min || 0);
      if (hh > 23 || mm > 59) return m;
      timePart = { h: hh, m: mm };
      return ' ';
    });

    // Affectation par défaut : aujourd'hui en fin de journée
    let due = endOfDay(datePart || now);
    if (timePart) {
      due = new Date((datePart || now).getFullYear(), (datePart || now).getMonth(), (datePart || now).getDate(), timePart.h, timePart.m);
    } else if (datePart) {
      due = endOfDay(datePart);
    }
    res.due = toISOdt(due);

    // Détection du cours par code ou nom
    if (Array.isArray(state.courses)) {
      const lower = text.toLowerCase();
      const course = state.courses.find((c) => c.code && lower.includes(String(c.code).toLowerCase()));
      if (course) { res.courseId = course.id; res.category = 'school'; }
    }
    // Détection du projet via @nom
    if (Array.isArray(state.projects)) {
      const pm = text.match(/@([\p{L}\w-]+)/u);
      if (pm) {
        const project = state.projects.find((p) => p.name.toLowerCase().includes(pm[1].toLowerCase()));
        if (project) { res.projectId = project.id; res.category = 'work'; text = text.replace(pm[0], ' '); }
      }
    }

    let title = text.replace(/\s+/g, ' ').trim();
    if (!title) title = 'Nouvelle tâche';
    res.title = cap(title);
    return res;
  }

  function matchesQuery(haystack, query) {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const text = String(haystack || '').toLowerCase();
    return q.split(/\s+/).every((part) => text.includes(part));
  }

  EP.U = {
    DAY, pad, uid,
    parseDate, toISO, toISOdt, dateKey, todayKey,
    startOfDay, endOfDay, addDays, addMinutes, addMonths,
    startOfWeek, endOfWeek, startOfMonth, endOfMonth, monthGrid,
    sameDay, diffDays, monthDiff, durationMin, isEndOfDay,
    fmtDate, fmtDateLong, fmtDateFull, fmtTime, fmtDateTime, fmtMonthYear, fmtRange,
    weekdayShort, weekdayLong, weekdayName, WEEKDAYS,
    relative, dueText, humanDuration, num, percent, plural,
    esc, clamp, sum, avg, unique, groupBy, sortBy,
    qs, qsa, on, debounce, approxEqual, hexToRgba, download,
    parseQuickAdd, matchesQuery
  };
})();
