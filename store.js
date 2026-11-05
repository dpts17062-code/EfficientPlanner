/* Efficient Planner — modèle de données, persistance et sélecteurs métier */
(function () {
  'use strict';
  const EP = window.EP;
  const U = EP.U;
  const STORAGE_KEY = 'efficient-planner:v1';
  const BACKUP_KEY = STORAGE_KEY + ':backup';
  const VERSION = 1;
  const ARCHIVE_DAYS = 7;

  const CATEGORIES = {
    school: { key: 'school', label: 'École', short: 'École', icon: 'school', color: '#6366f1' },
    work: { key: 'work', label: 'Travail', short: 'Travail', icon: 'briefcase', color: '#0ea5e9' },
    personal: { key: 'personal', label: 'Personnel', short: 'Perso', icon: 'heart', color: '#f59e0b' }
  };
  const PRIORITIES = {
    low: { key: 'low', label: 'Faible', color: '#64748b', rank: 1 },
    normal: { key: 'normal', label: 'Normale', color: '#64748b', rank: 2 },
    high: { key: 'high', label: 'Élevée', color: '#f97316', rank: 3 },
    urgent: { key: 'urgent', label: 'Urgente', color: '#e11d48', rank: 4 }
  };
  const STATUSES = {
    todo: { key: 'todo', label: 'À faire' },
    doing: { key: 'doing', label: 'En cours' },
    waiting: { key: 'waiting', label: 'En attente' },
    done: { key: 'done', label: 'Terminée' }
  };
  const KINDS = {
    devoir: 'Devoir individuel',
    equipe: "Travail d'équipe",
    labo: 'Laboratoire',
    examen: 'Examen',
    quiz: 'Quiz',
    projet: 'Projet de session',
    presentation: 'Présentation orale',
    etude: 'Étude / révision',
    autre: 'Autre'
  };
  const ASSESSMENT_TYPES = {
    examen: 'Examen',
    devoir: 'Devoir',
    laboratoire: 'Laboratoire',
    projet: 'Projet',
    quiz: 'Quiz',
    participation: 'Participation',
    presentation: 'Présentation',
    autre: 'Autre'
  };
  const ASSESSMENT_STATUSES = {
    upcoming: 'À venir',
    pending: 'En attente',
    graded: 'Corrigée'
  };
  const PROJECT_STATUSES = {
    active: 'En cours',
    paused: 'En pause',
    done: 'Terminé'
  };
  const RECURRENCES = {
    none: 'Aucune',
    daily: 'Quotidienne',
    weekly: 'Hebdomadaire',
    monthly: 'Mensuelle'
  };
  const REMINDER_OPTIONS = [
    { value: 0, label: 'Aucun rappel' },
    { value: 5, label: '5 minutes avant' },
    { value: 10, label: '10 minutes avant' },
    { value: 15, label: '15 minutes avant' },
    { value: 30, label: '30 minutes avant' },
    { value: 60, label: '1 heure avant' },
    { value: 1440, label: '1 jour avant' }
  ];

  function defaultSettings() {
    return {
      theme: 'system',
      accent: '#6366f1',
      colors: { school: '#6366f1', work: '#0ea5e9', personal: '#f59e0b' },
      userName: '',
      defaultCategory: 'personal',
      weekStartsOn: 1,
      defaultView: 'month',
      notifications: false,
      defaultReminder: 10,
      archiveAfterDays: ARCHIVE_DAYS,
      dashboardHabits: true,
      compactTasks: false
    };
  }

  function defaultState() {
    return {
      version: VERSION,
      settings: defaultSettings(),
      sessions: [],
      courses: [],
      tasks: [],
      taskSeries: [],
      assessments: [],
      events: [],
      projects: [],
      habits: [],
      goals: [],
      lists: [],
      meta: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        onboarded: false
      }
    };
  }

  /* ---------------- Persistance ---------------- */
  let state = null;
  let storageOk = true;
  let saveTimer = null;
  const listeners = [];

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function normalize(raw) {
    if (!isObject(raw)) throw new Error('Le fichier ne contient pas un objet de données valide.');
    const base = defaultState();
    const next = Object.assign({}, base, raw);
    next.settings = Object.assign({}, base.settings, isObject(raw.settings) ? raw.settings : {});
    next.settings.colors = Object.assign({}, base.settings.colors, isObject(next.settings.colors) ? next.settings.colors : {});
    next.meta = Object.assign({}, base.meta, isObject(raw.meta) ? raw.meta : {});
    ['sessions', 'courses', 'tasks', 'taskSeries', 'assessments', 'events', 'projects', 'habits', 'goals', 'lists'].forEach((key) => {
      if (!Array.isArray(next[key])) next[key] = [];
      next[key] = next[key].filter(isObject).map((item) => {
        if (!item.id) item.id = U.uid(key.slice(0, 3));
        return item;
      });
    });
    next.version = VERSION;
    return next;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try { state = normalize(JSON.parse(raw)); }
        catch (err) {
          console.warn('Données locales illisibles :', err);
          try { localStorage.setItem(BACKUP_KEY, raw); } catch (e) { /* ignore */ }
          state = defaultState();
        }
      }
    } catch (err) {
      console.warn('Stockage local inaccessible :', err);
      storageOk = false;
    }
    if (!state) state = defaultState();
    ensureTaskOccurrences();
    autoArchive();
    return state;
  }

  function saveNow() {
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageOk = true;
    } catch (err) {
      storageOk = false;
      console.warn('Sauvegarde impossible :', err);
      try { window.dispatchEvent(new CustomEvent('ep:storage-error')); } catch (e) { /* ignore */ }
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 120);
  }

  function flush() {
    clearTimeout(saveTimer);
    saveNow();
  }

  function emit(reason) {
    listeners.slice().forEach((fn) => {
      try { fn(reason || 'change'); } catch (err) { console.error(err); }
    });
  }

  function commit(reason) {
    if (!state) return;
    state.meta.updatedAt = new Date().toISOString();
    autoArchive();
    scheduleSave();
    emit(reason);
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function get() { ensureTaskOccurrences(); return state; }

  /* Chaque occurrence est une vraie tâche : la terminer ne termine pas la série.
     Le curseur persistant évite de recréer une occurrence supprimée. */
  function ensureTaskOccurrences(to) {
    if (!state) return;
    let changed = false;
    const horizon = U.addDays(new Date(), 90);
    const requested = U.parseDate(to);
    if (requested && requested > horizon) horizon.setTime(requested.getTime());
    state.taskSeries.forEach((series) => {
      if (series.stopped) return;
      const anchor = U.parseDate(series.template && series.template.due);
      const rule = series.recurrence;
      if (!anchor || !rule || rule.freq !== 'weekly') return;
      const limit = rule.until ? U.endOfDay(rule.until) : null;
      const end = limit && limit < horizon ? limit : horizon;
      // Créer aussi la première occurrence si la série commence loin dans le futur.
      const target = end < anchor && (!limit || limit >= anchor) ? U.addDays(anchor, 7 * rule.interval) : end;
      let day = U.parseDate(series.nextDate) || U.startOfDay(anchor);
      const weekdays = (rule.weekdays || [anchor.getDay()]).map(Number);
      for (; day <= target; day = U.addDays(day, 1)) {
        if (limit && day > limit) break;
        if (rule.count && series.generatedCount >= rule.count) break;
        const week = U.diffDays(U.startOfWeek(day, 1), U.startOfWeek(anchor, 1)) / 7;
        if (week % rule.interval !== 0 || !weekdays.includes(day.getDay())) continue;
        series.generatedCount = (series.generatedCount || 0) + 1;
        const due = U.toISOdt(new Date(day.getFullYear(), day.getMonth(), day.getDate(), anchor.getHours(), anchor.getMinutes()));
        if (!(series.skipDates || []).includes(due)) {
          const task = JSON.parse(JSON.stringify(series.template));
          task.id = series.generatedCount === 1 && series.firstId ? series.firstId : U.uid('tas');
          task.due = due;
          task.seriesId = series.id;
          task.seriesIndex = series.generatedCount;
          task.status = series.generatedCount === 1 ? task.status : 'todo';
          task.progress = task.status === 'done' ? 100 : series.generatedCount === 1 ? Number(task.progress) || 0 : 0;
          task.completedAt = task.status === 'done' ? U.toISOdt(new Date()) : null;
          task.archived = false;
          task.createdAt = U.toISOdt(new Date());
          task.subtasks = (task.subtasks || []).map((s) => Object.assign({}, s, { id: U.uid('st'), done: series.generatedCount === 1 && !!s.done }));
          state.tasks.push(task);
        }
      }
      const next = U.toISO(day);
      if (series.nextDate !== next) { series.nextDate = next; changed = true; }
      if ((rule.count && series.generatedCount >= rule.count) || (limit && day > limit)) {
        series.stopped = true;
        changed = true;
      }
    });
    if (changed) scheduleSave();
  }

  function taskSeries(task) {
    return task && task.seriesId ? find('taskSeries', task.seriesId) : null;
  }

  function stopTaskSeries(task) {
    const series = taskSeries(task);
    if (!series) return;
    series.stopped = true;
    series.recurrence.count = Math.max(0, task.seriesIndex - 1);
    state.tasks = state.tasks.filter((t) => t.seriesId !== series.id || t.seriesIndex < task.seriesIndex || t.status === 'done' || t.id === task.id);
  }

  function saveTask(id, patch, recurrence, scope) {
    const existing = id ? find('tasks', id) : null;
    if (existing && taskSeries(existing) && scope !== 'following') return put('tasks', id, patch);
    const previousSeries = taskSeries(existing);
    const skipDates = previousSeries ? state.tasks.filter((t) => t.seriesId === previousSeries.id && t.seriesIndex >= existing.seriesIndex && t.status === 'done').map((t) => t.due) : [];
    if (existing) stopTaskSeries(existing);
    if (!recurrence || recurrence.freq !== 'weekly') {
      const single = Object.assign({}, patch, { seriesId: null, seriesIndex: null });
      return existing ? put('tasks', id, single) : add('tasks', single);
    }
    const template = Object.assign({}, patch);
    const series = {
      id: U.uid('series'), template: template,
      recurrence: Object.assign({}, recurrence),
      nextDate: U.dateKey(template.due), generatedCount: 0,
      firstId: existing ? existing.id : null, skipDates: skipDates
    };
    if (existing) state.tasks = state.tasks.filter((t) => t.id !== existing.id);
    state.taskSeries.push(series);
    ensureTaskOccurrences();
    commit('task:series');
    return state.tasks.find((t) => t.seriesId === series.id) || null;
  }

  /* ---------------- CRUD ---------------- */
  function add(collection, obj) {
    const col = state[collection];
    if (!Array.isArray(col)) throw new Error('Collection inconnue : ' + collection);
    const item = Object.assign({}, obj);
    if (!item.id) item.id = U.uid(collection.slice(0, 3));
    if (!item.createdAt) item.createdAt = U.toISOdt(new Date());
    col.push(item);
    commit('add:' + collection);
    return item;
  }

  function find(collection, id) {
    return (state[collection] || []).find((x) => x.id === id) || null;
  }

  function put(collection, id, patch) {
    const item = find(collection, id);
    if (!item) return null;
    Object.assign(item, patch);
    if (collection === 'tasks' && patch.status) {
      if (item.status === 'done') {
        if (!item.completedAt) item.completedAt = U.toISOdt(new Date());
        item.archived = !!item.archived;
      } else {
        item.completedAt = null;
        item.archived = false;
      }
    }
    commit('put:' + collection);
    return item;
  }

  function remove(collection, id) {
    const col = state[collection];
    if (!Array.isArray(col)) return false;
    const i = col.findIndex((x) => x.id === id);
    if (i < 0) return false;
    col.splice(i, 1);
    if (collection === 'courses') {
      state.assessments = state.assessments.filter((a) => a.courseId !== id);
      state.tasks.forEach((t) => { if (t.courseId === id) t.courseId = null; });
      state.events.forEach((e) => { if (e.courseId === id) e.courseId = null; });
      state.taskSeries.forEach((s) => { if (s.template.courseId === id) s.template.courseId = null; });
    }
    if (collection === 'assessments') {
      state.tasks.forEach((t) => { if (t.assessmentId === id) t.assessmentId = null; });
      state.taskSeries.forEach((s) => { if (s.template.assessmentId === id) s.template.assessmentId = null; });
    }
    if (collection === 'projects') {
      state.tasks.forEach((t) => { if (t.projectId === id) t.projectId = null; });
      state.events.forEach((e) => { if (e.projectId === id) e.projectId = null; });
      state.taskSeries.forEach((s) => { if (s.template.projectId === id) s.template.projectId = null; });
    }
    if (collection === 'sessions') {
      state.courses.forEach((c) => { if (c.sessionId === id) c.sessionId = null; });
    }
    commit('remove:' + collection);
    return true;
  }

  function setSettings(patch) {
    if (!state) return;
    state.settings = Object.assign({}, state.settings, patch);
    if (patch && patch.colors) {
      state.settings.colors = Object.assign({}, state.settings.colors, patch.colors);
    }
    commit('settings');
  }

  function autoArchive() {
    if (!state) return;
    const days = Number(state.settings.archiveAfterDays) || ARCHIVE_DAYS;
    const limit = new Date(Date.now() - days * U.DAY);
    state.tasks.forEach((t) => {
      if (t.status === 'done') {
        if (!t.completedAt) t.completedAt = U.toISOdt(new Date());
        if (!t.archived && U.parseDate(t.completedAt) && U.parseDate(t.completedAt) < limit) t.archived = true;
      }
    });
  }

  /* ---------------- Import / export ---------------- */
  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text) {
    const parsed = JSON.parse(text);
    const next = normalize(parsed);
    try { localStorage.setItem(BACKUP_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    state = next;
    ensureTaskOccurrences();
    autoArchive();
    flush();
    emit('import');
    return state;
  }

  function reset(opts) {
    const options = opts || {};
    state = options.demo ? normalize(demoData()) : defaultState();
    state.meta.onboarded = options.onboarded !== false;
    state.meta.createdAt = new Date().toISOString();
    flush();
    emit('reset');
    return state;
  }

  function loadDemo() {
    return reset({ demo: true, onboarded: true });
  }

  /* ---------------- Couleurs & libellés ---------------- */
  function catColor(key) {
    return (state && state.settings.colors && state.settings.colors[key]) || (CATEGORIES[key] || {}).color || '#6366f1';
  }
  function cat(key) { return CATEGORIES[key] || CATEGORIES.personal; }
  function priority(key) { return PRIORITIES[key] || PRIORITIES.normal; }
  function status(key) { return STATUSES[key] || STATUSES.todo; }
  function assessmentType(key) { return ASSESSMENT_TYPES[key] || 'Autre'; }

  function assessmentStatus(a) {
    if (!a) return 'upcoming';
    if (a.status === 'graded' || (a.grade != null && a.grade !== '')) return 'graded';
    if (a.date && U.parseDate(a.date) && U.parseDate(a.date) < U.startOfDay(new Date())) return 'pending';
    return a.status === 'pending' ? 'pending' : 'upcoming';
  }

  /* ---------------- Sélecteurs — tâches ---------------- */
  function openTasks() {
    return state.tasks.filter((t) => t.status !== 'done' && !t.archived);
  }
  function overdueTasks() {
    const now = new Date();
    return openTasks().filter((t) => t.due && U.parseDate(t.due) < now);
  }
  function todayTasks() {
    return state.tasks.filter((t) => !t.archived && t.due && U.sameDay(t.due, new Date()));
  }
  function upcomingTasks(days) {
    const now = new Date();
    const limit = U.endOfDay(U.addDays(now, days == null ? 7 : days));
    return openTasks().filter((t) => t.due && U.parseDate(t.due) >= now && U.parseDate(t.due) <= limit);
  }
  function recentlyCompleted(days) {
    const limit = new Date(Date.now() - (days == null ? 7 : days) * U.DAY);
    return state.tasks
      .filter((t) => t.status === 'done' && t.completedAt && U.parseDate(t.completedAt) >= limit)
      .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
  }
  function taskBucket(t) {
    if (t.status === 'done') return 'done';
    if (!t.due) return 'none';
    const d = U.parseDate(t.due);
    const now = new Date();
    if (d < now) return 'overdue';
    if (U.sameDay(d, now)) return 'today';
    if (U.sameDay(d, U.addDays(now, 1))) return 'tomorrow';
    if (d <= U.endOfWeek(now, state.settings.weekStartsOn)) return 'week';
    return 'later';
  }
  function priorityScore(t) {
    let score = { urgent: 40, high: 26, normal: 12, low: 2 }[t.priority] || 12;
    if (t.priority === 'urgent') score += 8;
    if (t.due) {
      const diff = (U.parseDate(t.due) - new Date()) / U.DAY;
      if (diff < 0) score += 58 + Math.min(22, -diff * 2);
      else if (diff < 1) score += 36;
      else if (diff < 3) score += 22;
      else if (diff < 7) score += 10;
    }
    if (t.status === 'doing') score += 6;
    if (t.status === 'waiting') score -= 5;
    return score;
  }
  function priorityTasks(limit) {
    return openTasks()
      .slice()
      .sort((a, b) => priorityScore(b) - priorityScore(a) || String(a.due || '').localeCompare(String(b.due || '')))
      .slice(0, limit == null ? 6 : limit);
  }
  function dayProgress() {
    const list = state.tasks.filter((t) => !t.archived && ((t.due && U.sameDay(t.due, new Date())) || (t.completedAt && U.sameDay(t.completedAt, new Date()))));
    const done = list.filter((t) => t.status === 'done').length;
    return { total: list.length, done: done, percent: list.length ? Math.round((done / list.length) * 100) : 0 };
  }
  function weekProgress() {
    const start = U.startOfWeek(new Date(), state.settings.weekStartsOn);
    const end = U.endOfWeek(start, state.settings.weekStartsOn);
    const list = state.tasks.filter((t) => !t.archived && ((t.due && U.parseDate(t.due) >= start && U.parseDate(t.due) <= U.endOfDay(end)) || (t.completedAt && U.parseDate(t.completedAt) >= start && U.parseDate(t.completedAt) <= U.endOfDay(end))));
    const done = list.filter((t) => t.status === 'done').length;
    return { total: list.length, done: done, percent: list.length ? Math.round((done / list.length) * 100) : 0 };
  }

  /* ---------------- Sélecteurs — calendrier ---------------- */
  function makeOccurrence(ev, start, end, source) {
    return Object.assign({}, ev, {
      source: source || 'event',
      start: U.toISOdt(start),
      end: U.toISOdt(end),
      occurrenceStart: start,
      occurrenceKey: (source || 'event') + ':' + ev.id + ':' + U.toISOdt(start),
      isRecurring: !!(ev.recurrence && ev.recurrence.freq && ev.recurrence.freq !== 'none')
    });
  }

  function expandEvent(ev, from, to) {
    const fromD = U.startOfDay(from), toD = U.endOfDay(to);
    const start = U.parseDate(ev.start);
    if (!start) return [];
    let end = U.parseDate(ev.end);
    if (!end || end <= start) end = U.addMinutes(start, 60);
    const duration = Math.max(0, end - start);
    const rec = ev.recurrence || { freq: 'none' };
    const results = [];

    function push(occStart) {
      if (occStart < start) return;
      const occEnd = new Date(occStart.getTime() + duration);
      if (occStart <= toD && occEnd >= fromD) results.push(makeOccurrence(ev, occStart, occEnd, 'event'));
    }

    if (!rec.freq || rec.freq === 'none') {
      push(start);
      return results;
    }

    const interval = Math.max(1, Number(rec.interval) || 1);
    const startDay = U.startOfDay(start);
    const until = rec.until ? U.endOfDay(rec.until) : null;
    const hardEnd = until && until < toD ? until : toD;
    let cursor = U.startOfDay(fromD.getTime() - duration);
    if (cursor < startDay) cursor = startDay;

    for (let d = cursor; d <= hardEnd; d = U.addDays(d, 1)) {
      const diff = U.diffDays(d, startDay);
      let ok = false;
      if (rec.freq === 'daily') {
        ok = diff % interval === 0;
      } else if (rec.freq === 'weekly') {
        if (Array.isArray(rec.weekdays) && rec.weekdays.length) {
          ok = rec.weekdays.map(Number).includes(d.getDay()) && Math.floor(diff / 7) % interval === 0;
        } else {
          ok = diff % (7 * interval) === 0;
        }
      } else if (rec.freq === 'monthly') {
        ok = d.getDate() === start.getDate() && U.monthDiff(startDay, d) % interval === 0;
      }
      if (!ok) continue;
      push(new Date(d.getFullYear(), d.getMonth(), d.getDate(), start.getHours(), start.getMinutes()));
      if (results.length > 500) break;
    }
    return results;
  }

  function courseSessions(course, from, to) {
    const out = [];
    const fromD = U.startOfDay(from), toD = U.endOfDay(to);
    (course.schedule || []).forEach((slot, index) => {
      if (!slot || !slot.start || !slot.end) return;
      const sh = String(slot.start).split(':').map(Number);
      const eh = String(slot.end).split(':').map(Number);
      for (let d = fromD; d <= toD; d = U.addDays(d, 1)) {
        if (d.getDay() !== Number(slot.weekday)) continue;
        const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh[0] || 0, sh[1] || 0);
        const e = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh[0] || 0, eh[1] || 0);
        if (e <= s) e.setTime(s.getTime() + 60 * 60000);
        out.push({
          id: 'sched_' + course.id + '_' + (slot.id || index),
          source: 'course',
          courseId: course.id,
          title: (course.code ? course.code + ' · ' : '') + course.name,
          category: 'school',
          color: course.color,
          start: U.toISOdt(s),
          end: U.toISOdt(e),
          occurrenceStart: s,
          occurrenceKey: 'course:' + course.id + ':' + U.toISOdt(s),
          location: slot.room || course.location || '',
          isRecurring: true,
          readOnly: true
        });
      }
    });
    return out;
  }

  function eventsInRange(from, to, opts) {
    const o = opts || {};
    const fromD = U.startOfDay(from), toD = U.endOfDay(to);
    let list = [];
    state.events.forEach((ev) => {
      if (o.categories && !o.categories[ev.category]) return;
      if (o.courseId && ev.courseId !== o.courseId) return;
      expandEvent(ev, fromD, toD).forEach((occ) => list.push(occ));
    });
    if (o.includeSchedules !== false) {
      state.courses.forEach((course) => {
        if (o.categories && !o.categories.school) return;
        if (o.courseId && course.id !== o.courseId) return;
        courseSessions(course, fromD, toD).forEach((occ) => list.push(occ));
      });
    }
    return list.sort((a, b) => String(a.start).localeCompare(String(b.start)) || String(a.title).localeCompare(String(b.title)));
  }

  function calendarTasksInRange(from, to, opts) {
    const o = opts || {};
    ensureTaskOccurrences(to);
    const start = U.startOfDay(from), end = U.endOfDay(to);
    return state.tasks.filter((t) => t.showInCalendar && !t.archived && t.due &&
      U.parseDate(t.due) >= start && U.parseDate(t.due) <= end &&
      (!o.categories || o.categories[t.category]) && (!o.courseId || o.courseId === t.courseId))
      .map((t) => Object.assign({}, t, {
        source: 'task', start: t.due, end: t.due, allDay: true,
        isRecurring: !!t.seriesId, occurrenceKey: 'task:' + t.id
      }));
  }

  function conflicts(candidate) {
    if (!candidate || !candidate.start || !candidate.end) return [];
    const start = U.parseDate(candidate.start), end = U.parseDate(candidate.end);
    if (!start || !end || end <= start) return [];
    const list = eventsInRange(U.addDays(start, -1), U.addDays(end, 1), { includeSchedules: true });
    return list.filter((occ) => {
      if (candidate.id && occ.source === 'event' && occ.id === candidate.id) return false;
      return occ.start < candidate.end && occ.end > candidate.start;
    });
  }

  function todayEvents() {
    const now = new Date();
    return eventsInRange(now, U.endOfDay(now), { includeSchedules: true });
  }

  function upcomingEvents(days) {
    const now = new Date();
    const limit = U.endOfDay(U.addDays(now, days == null ? 7 : days));
    return eventsInRange(now, limit, { includeSchedules: true }).filter((e) => U.parseDate(e.end) >= now);
  }

  /* ---------------- Sélecteurs — école ---------------- */
  function activeSession() {
    return state.sessions.find((s) => s.active) || state.sessions[0] || null;
  }

  function courseAssessments(courseId) {
    return state.assessments
      .filter((a) => a.courseId === courseId)
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.name).localeCompare(String(b.name)));
  }

  function courseStats(courseId, opts) {
    const o = opts || {};
    const list = courseAssessments(courseId);
    const graded = list.filter((a) => assessmentStatus(a) === 'graded' && a.grade != null && a.grade !== '');
    const totalWeight = U.sum(list, (a) => Number(a.weight) || 0);
    const gradedWeight = U.sum(graded, (a) => Number(a.weight) || 0);
    const remainingWeight = U.sum(list.filter((a) => assessmentStatus(a) !== 'graded'), (a) => Number(a.weight) || 0);
    const earned = U.sum(graded, (a) => {
      const max = Number(a.max) || 100;
      const grade = Number(a.grade) || 0;
      return (grade / max) * 100 * (Number(a.weight) || 0);
    });
    const average = gradedWeight > 0 ? earned / gradedWeight : null;
    const hypothesis = o.hypo != null && o.hypo !== '' ? Number(o.hypo) : (average != null ? average : 75);
    const assessedWeight = gradedWeight + remainingWeight;
    const projected = assessedWeight > 0 ? (earned + hypothesis * remainingWeight) / assessedWeight : null;
    const target = o.target != null && o.target !== '' ? Number(o.target) : 80;
    const needed = remainingWeight > 0 ? (target * assessedWeight - earned) / remainingWeight : null;
    return {
      list: list,
      graded: graded,
      totalWeight: totalWeight,
      gradedWeight: gradedWeight,
      remainingWeight: remainingWeight,
      assessedWeight: assessedWeight,
      percentGraded: gradedWeight,
      percentRemaining: remainingWeight,
      earned: earned,
      average: average,
      hypothesis: hypothesis,
      projected: projected,
      target: target,
      needed: needed,
      weightValid: Math.abs(totalWeight - 100) < 0.01,
      weightOver: totalWeight > 100.01
    };
  }

  function nextAssessment(courseId) {
    const today = U.startOfDay(new Date());
    const list = courseAssessments(courseId).filter((a) => assessmentStatus(a) !== 'graded');
    const future = list.filter((a) => a.date && U.parseDate(a.date) >= today);
    return future[0] || list[0] || null;
  }

  function sessionSummary(sessionId) {
    const sid = sessionId || (activeSession() ? activeSession().id : null);
    const courses = state.courses.filter((c) => !sid || c.sessionId === sid);
    const rows = courses.map((course) => {
      const stats = courseStats(course.id);
      const tasks = state.tasks.filter((t) => t.courseId === course.id && t.status !== 'done' && !t.archived);
      return { course: course, stats: stats, tasks: tasks, next: nextAssessment(course.id) };
    });
    const averages = rows.map((r) => r.stats.average).filter((v) => v != null);
    return {
      session: state.sessions.find((s) => s.id === sid) || null,
      courses: rows,
      average: averages.length ? U.avg(averages) : null,
      assessments: state.assessments.filter((a) => courses.some((c) => c.id === a.courseId)).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    };
  }

  function schoolDeadlines(days) {
    return deadlines(days == null ? 21 : days).filter((d) => d.kind === 'assessment' || (d.kind === 'task' && d.task && d.task.category === 'school'));
  }

  function deadlines(days) {
    const today = U.startOfDay(new Date());
    const limit = U.endOfDay(U.addDays(today, days == null ? 14 : days));
    const out = [];
    state.assessments.forEach((a) => {
      if (assessmentStatus(a) === 'graded' || !a.date) return;
      const d = U.endOfDay(a.date);
      if (d < today || d > limit) return;
      const c = find('courses', a.courseId);
      out.push({
        kind: 'assessment', id: a.id, date: a.date, title: a.name, courseId: a.courseId,
        meta: (c ? c.code + ' · ' : '') + assessmentType(a.type) + ' · ' + (Number(a.weight) || 0) + ' %',
        type: a.type, weight: a.weight, assessment: a
      });
    });
    state.tasks.forEach((t) => {
      if (t.archived || t.status === 'done' || !t.due) return;
      if (t.assessmentId) return;
      if (t.category !== 'school' && t.category !== 'work') return;
      const d = U.parseDate(t.due);
      if (!d || d < today || d > limit) return;
      const c = t.courseId ? find('courses', t.courseId) : null;
      out.push({
        kind: 'task', id: t.id, date: t.due, title: t.title, courseId: t.courseId,
        meta: t.category === 'school' ? ((c ? c.code + ' · ' : '') + (KINDS[t.kind] || 'Travail scolaire')) : 'Travail · tâche',
        task: t
      });
    });
    state.projects.forEach((p) => {
      if (p.status === 'done' || !p.due) return;
      const d = U.endOfDay(p.due);
      if (d < today || d > limit) return;
      out.push({ kind: 'project', id: p.id, date: p.due, title: p.name, meta: 'Projet · ' + (PROJECT_STATUSES[p.status] || 'En cours') });
    });
    return out.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  /* ---------------- Sélecteurs — travail / perso ---------------- */
  function projectTasks(projectId) {
    return state.tasks.filter((t) => t.projectId === projectId);
  }
  function projectStats(projectId) {
    const list = projectTasks(projectId);
    const done = list.filter((t) => t.status === 'done').length;
    const open = list.length - done;
    const overdue = list.filter((t) => t.status !== 'done' && t.due && U.parseDate(t.due) < new Date()).length;
    const progress = list.length ? Math.round((done / list.length) * 100) : 0;
    return { total: list.length, done: done, open: open, overdue: overdue, progress: progress };
  }

  function habitApplicable(habit, date) {
    const d = U.parseDate(date);
    if (!d) return false;
    if (!habit.cadence || habit.cadence.type === 'daily') return true;
    return Array.isArray(habit.cadence.days) && habit.cadence.days.map(Number).includes(d.getDay());
  }
  function habitDone(habit, dateKey) {
    return !!(habit.log && habit.log[dateKey]);
  }
  function habitStats(habit) {
    const today = U.startOfDay(new Date());
    let required = 0, done = 0;
    for (let i = 0; i < 30; i++) {
      const d = U.addDays(today, -i);
      if (!habitApplicable(habit, d)) continue;
      required++;
      if (habitDone(habit, U.toISO(d))) done++;
    }
    let streak = 0;
    let cursor = today;
    if (habitApplicable(habit, cursor) && !habitDone(habit, U.toISO(cursor))) cursor = U.addDays(cursor, -1);
    for (let i = 0; i < 365; i++) {
      if (habitApplicable(habit, cursor)) {
        if (habitDone(habit, U.toISO(cursor))) streak++;
        else break;
      }
      cursor = U.addDays(cursor, -1);
    }
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = U.addDays(today, -i);
      last7.push({ date: U.toISO(d), applicable: habitApplicable(habit, d), done: habitDone(habit, U.toISO(d)), weekday: d.getDay() });
    }
    return { rate: required ? Math.round((done / required) * 100) : 0, streak: streak, done30: done, required30: required, last7: last7 };
  }

  function goalProgress(goal) {
    const target = Number(goal.target) || 0;
    const current = Number(goal.current) || 0;
    return { percent: target > 0 ? U.clamp(Math.round((current / target) * 100), 0, 100) : 0, current: current, target: target };
  }

  /* ---------------- Recherche ---------------- */
  function globalSearch(query) {
    const q = String(query || '').trim();
    const results = { tasks: [], courses: [], events: [], projects: [], assessments: [], habits: [], notes: [] };
    if (!q) return results;
    const test = (parts) => U.matchesQuery(parts.filter(Boolean).join(' '), q);

    state.tasks.forEach((t) => {
      const c = t.courseId ? find('courses', t.courseId) : null;
      const p = t.projectId ? find('projects', t.projectId) : null;
      if (test([t.title, t.description, t.notes, (t.tags || []).join(' '), c && c.code, c && c.name, p && p.name])) {
        results.tasks.push({ item: t, title: t.title, subtitle: [c ? c.code : '', p ? p.name : '', U.dueText(t.due)].filter(Boolean).join(' · ') });
      }
    });
    state.courses.forEach((c) => {
      if (test([c.code, c.name, c.teacher, c.location, c.notes])) {
        results.courses.push({ item: c, title: (c.code ? c.code + ' — ' : '') + c.name, subtitle: [c.teacher, c.location].filter(Boolean).join(' · ') });
      }
    });
    state.events.forEach((e) => {
      if (test([e.title, e.location, e.notes])) {
        results.events.push({ item: e, title: e.title, subtitle: U.fmtRange(e.start, e.end) });
      }
    });
    state.projects.forEach((p) => {
      if (test([p.name, p.description, p.notes])) {
        results.projects.push({ item: p, title: p.name, subtitle: PROJECT_STATUSES[p.status] || 'Projet' });
      }
    });
    state.assessments.forEach((a) => {
      const c = find('courses', a.courseId);
      if (test([a.name, a.notes, c && c.code, c && c.name])) {
        results.assessments.push({ item: a, title: a.name, subtitle: (c ? c.code + ' · ' : '') + U.fmtDate(a.date) });
      }
    });
    state.habits.forEach((h) => {
      if (test([h.name])) results.habits.push({ item: h, title: h.name, subtitle: 'Habitude' });
    });
    state.goals.forEach((g) => {
      if (test([g.title, g.notes])) results.notes.push({ item: g, title: g.title, subtitle: 'Objectif personnel', kind: 'goal' });
    });
    state.lists.forEach((l) => {
      const items = (l.items || []).map((i) => i.text).join(' ');
      if (test([l.title, items])) results.notes.push({ item: l, title: l.title, subtitle: 'Liste personnelle', kind: 'list' });
    });
    return results;
  }

  function dataStats() {
    const done = state.tasks.filter((t) => t.status === 'done').length;
    return {
      tasks: state.tasks.length,
      openTasks: state.tasks.length - done,
      doneTasks: done,
      courses: state.courses.length,
      assessments: state.assessments.length,
      events: state.events.length,
      projects: state.projects.length,
      habits: state.habits.length,
      goals: state.goals.length,
      lists: state.lists.length
    };
  }

  /* ---------------- Données de démonstration ---------------- */
  function demoData() {
    const s = defaultState();
    const now = new Date();
    const at = (offset, h, m) => U.toISOdt(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, h || 0, m || 0));
    const day = (offset) => U.toISO(U.addDays(now, offset));
    const monthName = now.getMonth() >= 7 ? 'Automne' : 'Hiver';
    const sid = 'sess_demo';
    const c1 = 'c_cr300', c2 = 'c_web', c3 = 'c_math', c4 = 'c_philo';
    const p1 = 'p_vitrine', p2 = 'p_rapports';

    s.meta.onboarded = true;
    s.settings.userName = '';
    s.sessions = [{ id: sid, name: monthName + ' ' + now.getFullYear(), start: day(-55), end: day(55), active: true, createdAt: at(-60, 9, 0) }];
    s.courses = [
      {
        id: c1, code: 'CR300', name: 'Communication et rédaction', teacher: 'Marie-Claude Tremblay',
        sessionId: sid, color: '#6366f1', location: 'Local C-245', onlineUrl: '',
        notes: "Portfolio de rédaction à remettre à la fin de la session.\nConsulter le plan de cours pour les critères de correction.",
        links: [{ id: 'l1', label: 'Plan de cours (PDF)', url: 'https://exemple.ca/cr300' }],
        schedule: [
          { id: 's1', weekday: 1, start: '08:30', end: '11:20', room: 'C-245' },
          { id: 's2', weekday: 3, start: '10:00', end: '11:30', room: 'C-245' }
        ]
      },
      {
        id: c2, code: '420-2B4', name: 'Développement web', teacher: 'Simon Lavoie',
        sessionId: sid, color: '#0ea5e9', location: 'Laboratoire B-118', onlineUrl: 'https://exemple.ca/visio-web',
        notes: 'Les laboratoires se font sur GitHub. Apporter son ordinateur portable.',
        links: [{ id: 'l2', label: 'Dépôt du cours', url: 'https://github.com/exemple/420-2B4' }],
        schedule: [
          { id: 's3', weekday: 2, start: '13:00', end: '16:00', room: 'B-118' },
          { id: 's4', weekday: 4, start: '08:30', end: '10:00', room: 'B-118' }
        ]
      },
      {
        id: c3, code: '201-3A3', name: 'Mathématiques appliquées', teacher: 'Nadia Benali',
        sessionId: sid, color: '#10b981', location: 'Local A-302', onlineUrl: '',
        notes: '', links: [],
        schedule: [
          { id: 's5', weekday: 1, start: '13:00', end: '15:00', room: 'A-302' },
          { id: 's6', weekday: 4, start: '10:15', end: '12:15', room: 'A-302' }
        ]
      },
      {
        id: c4, code: '340-1C2', name: 'Philosophie', teacher: 'Étienne Gagnon',
        sessionId: sid, color: '#f59e0b', location: 'Local D-101', onlineUrl: '',
        notes: ' lectures hebdomadaires à faire avant le cours.', links: [],
        schedule: [{ id: 's7', weekday: 5, start: '09:00', end: '12:00', room: 'D-101' }]
      }
    ];
    s.assessments = [
      { id: 'a1', courseId: c1, name: 'Analyse critique', type: 'devoir', date: day(-24), weight: 15, max: 100, grade: 82, status: 'graded', createdAt: at(-40, 9, 0) },
      { id: 'a2', courseId: c1, name: 'Examen mi-session', type: 'examen', date: day(-10), weight: 25, max: 100, grade: 76, status: 'graded', createdAt: at(-40, 9, 0) },
      { id: 'a3', courseId: c1, name: "Travail d'équipe — dossier", type: 'projet', date: day(5), weight: 25, max: 100, grade: null, status: 'upcoming', createdAt: at(-40, 9, 0) },
      { id: 'a4', courseId: c1, name: 'Examen final', type: 'examen', date: day(38), weight: 35, max: 100, grade: null, status: 'upcoming', createdAt: at(-40, 9, 0) },
      { id: 'a5', courseId: c2, name: 'Laboratoire 1 — HTML/CSS', type: 'laboratoire', date: day(-21), weight: 10, max: 100, grade: 90, status: 'graded', createdAt: at(-40, 9, 0) },
      { id: 'a6', courseId: c2, name: 'Laboratoire 2 — JavaScript', type: 'laboratoire', date: day(-7), weight: 15, max: 100, grade: 85, status: 'graded', createdAt: at(-40, 9, 0) },
      { id: 'a7', courseId: c2, name: 'Projet de session', type: 'projet', date: day(12), weight: 35, max: 100, grade: null, status: 'upcoming', createdAt: at(-40, 9, 0) },
      { id: 'a8', courseId: c2, name: 'Examen final', type: 'examen', date: day(40), weight: 40, max: 100, grade: null, status: 'upcoming', createdAt: at(-40, 9, 0) },
      { id: 'a9', courseId: c3, name: 'Quiz 1', type: 'quiz', date: day(-18), weight: 10, max: 20, grade: 14, status: 'graded', createdAt: at(-40, 9, 0) },
      { id: 'a10', courseId: c3, name: 'Quiz 2', type: 'quiz', date: day(-6), weight: 10, max: 20, grade: 16, status: 'graded', createdAt: at(-40, 9, 0) },
      { id: 'a11', courseId: c3, name: 'Examen mi-session', type: 'examen', date: day(-2), weight: 30, max: 100, grade: 71, status: 'graded', createdAt: at(-40, 9, 0) },
      { id: 'a12', courseId: c3, name: 'Examen final', type: 'examen', date: day(36), weight: 50, max: 100, grade: null, status: 'upcoming', createdAt: at(-40, 9, 0) },
      { id: 'a13', courseId: c4, name: 'Texte argumentatif', type: 'devoir', date: day(3), weight: 30, max: 100, grade: null, status: 'upcoming', createdAt: at(-40, 9, 0) },
      { id: 'a14', courseId: c4, name: 'Participation', type: 'participation', date: day(-4), weight: 10, max: 10, grade: 9, status: 'graded', createdAt: at(-40, 9, 0) },
      { id: 'a15', courseId: c4, name: 'Dissertation', type: 'devoir', date: day(20), weight: 20, max: 100, grade: null, status: 'upcoming', createdAt: at(-40, 9, 0) },
      { id: 'a16', courseId: c4, name: 'Examen final', type: 'examen', date: day(41), weight: 40, max: 100, grade: null, status: 'upcoming', createdAt: at(-40, 9, 0) }
    ];
    s.projects = [
      { id: p1, name: 'Refonte du site vitrine', description: 'Moderniser le site public : nouvelles maquettes, accessibilité et migration du contenu.', status: 'active', due: day(18), color: '#0ea5e9', notes: 'Client : Alterego studio. Réunion de suivi tous les lundis.', links: [{ id: 'pl1', label: 'Maquettes Figma', url: 'https://figma.com' }], createdAt: at(-30, 9, 0) },
      { id: p2, name: 'Automatisation des rapports', description: 'Réduire le temps de production des rapports mensuels.', status: 'paused', due: day(35), color: '#8b5cf6', notes: 'En attente des accès à la base de données.', links: [], createdAt: at(-20, 9, 0) }
    ];
    s.tasks = [
      {
        id: 't1', title: 'Travail d\'équipe — rapport final', description: "Finaliser la section analyse et réviser la bibliographie.", category: 'school',
        status: 'doing', priority: 'high', due: at(5, 23, 59), estimate: 180, courseId: c1, assessmentId: 'a3', kind: 'equipe', progress: 45,
        subtasks: [
          { id: 'st1', title: 'Réviser la section analyse', done: true },
          { id: 'st2', title: 'Uniformiser les références', done: false },
          { id: 'st3', title: 'Relire le document complet', done: false }
        ],
        tags: ['équipe', 'rédaction'], notes: 'Rencontre Teams mercredi 19 h.', links: [{ id: 'tl1', label: 'Document partagé', url: 'https://docs.exemple.ca' }],
        team: [{ id: 'tm1', name: 'Sarah', role: 'Introduction' }, { id: 'tm2', name: 'Léo', role: 'Bibliographie' }, { id: 'tm3', name: 'Moi', role: 'Analyse et révision' }],
        steps: [], createdAt: at(-12, 10, 0), completedAt: null, archived: false
      },
      {
        id: 't2', title: 'Laboratoire 3 — API REST', description: 'Implémenter les routes de l\'API et documenter les endpoints.', category: 'school',
        status: 'todo', priority: 'urgent', due: at(2, 17, 0), estimate: 120, courseId: c2, assessmentId: null, kind: 'labo', progress: 10,
        subtasks: [{ id: 'st4', title: 'Créer les routes GET', done: true }, { id: 'st5', title: 'Ajouter les tests', done: false }],
        tags: ['code'], notes: '', links: [], team: [], steps: [], createdAt: at(-5, 14, 0), completedAt: null, archived: false
      },
      {
        id: 't3', title: 'Réviser le chapitre 4 — intégrales', description: '', category: 'school', status: 'todo', priority: 'normal',
        due: at(0, 18, 30), estimate: 60, courseId: c3, assessmentId: null, kind: 'etude', progress: 0, subtasks: [], tags: ['révision'],
        notes: 'Exercices 4.1 à 4.9.', links: [], team: [], steps: [], createdAt: at(-3, 9, 0), completedAt: null, archived: false
      },
      {
        id: 't4', title: 'Présentation orale — philosophie', description: 'Choisir un thème et préparer le plan.', category: 'school', status: 'waiting', priority: 'normal',
        due: at(8, 23, 59), estimate: 90, courseId: c4, assessmentId: null, kind: 'presentation', progress: 0, subtasks: [], tags: [],
        notes: 'Attendre la confirmation du sujet par l\'enseignant.', links: [], team: [], steps: [], createdAt: at(-6, 11, 0), completedAt: null, archived: false
      },
      {
        id: 't5', title: 'Intégrer la page d\'accueil', description: 'Découper la maquette en composants et intégrer la version mobile.', category: 'work',
        status: 'doing', priority: 'urgent', due: at(0, 16, 0), estimate: 240, courseId: null, projectId: p1, kind: 'autre', progress: 60,
        subtasks: [{ id: 'st6', title: 'Section héro', done: true }, { id: 'st7', title: 'Section services', done: true }, { id: 'st8', title: 'Version mobile', done: false }],
        tags: ['front-end'], notes: 'Utiliser la nouvelle palette de couleurs.', links: [{ id: 'tl2', label: 'Preview', url: 'https://exemple.ca/preview' }], team: [], steps: [], createdAt: at(-8, 10, 0), completedAt: null, archived: false
      },
      {
        id: 't6', title: 'Préparer la revue client', description: 'Sélectionner les écrans à présenter et préparer les questions.', category: 'work',
        status: 'todo', priority: 'high', due: at(3, 10, 0), estimate: 45, courseId: null, projectId: p1, kind: 'autre', progress: 0,
        subtasks: [], tags: ['client'], notes: '', links: [], team: [], steps: [], createdAt: at(-2, 15, 0), completedAt: null, archived: false
      },
      {
        id: 't7', title: 'Rédiger le guide de style', description: 'Documenter les couleurs, la typographie et les composants.', category: 'work',
        status: 'todo', priority: 'normal', due: at(7, 23, 59), estimate: 90, courseId: null, projectId: p1, kind: 'autre', progress: 0,
        subtasks: [], tags: [], notes: '', links: [], team: [], steps: [], createdAt: at(-4, 9, 0), completedAt: null, archived: false
      },
      {
        id: 't8', title: 'Cartographier les sources de données', description: '', category: 'work', status: 'todo', priority: 'low',
        due: at(10, 23, 59), estimate: 60, courseId: null, projectId: p2, kind: 'autre', progress: 0, subtasks: [], tags: [],
        notes: '', links: [], team: [], steps: [], createdAt: at(-3, 9, 0), completedAt: null, archived: false
      },
      {
        id: 't9', title: 'Prendre rendez-vous chez le dentiste', description: '', category: 'personal', status: 'todo', priority: 'urgent',
        due: at(0, 17, 0), estimate: 10, courseId: null, projectId: null, kind: 'autre', progress: 0, subtasks: [], tags: ['santé'],
        notes: '', links: [], team: [], steps: [], createdAt: at(-1, 8, 0), completedAt: null, archived: false
      },
      {
        id: 't10', title: 'Faire l\'épicerie', description: 'Liste dans la section Listes.', category: 'personal', status: 'todo', priority: 'normal',
        due: at(0, 19, 0), estimate: 45, courseId: null, projectId: null, kind: 'autre', progress: 0,
        subtasks: [{ id: 'st9', title: 'Vérifier le frigo', done: true }], tags: ['maison'], notes: '', links: [], team: [], steps: [],
        createdAt: at(-1, 8, 0), completedAt: null, archived: false
      },
      {
        id: 't11', title: 'Appeler maman', description: '', category: 'personal', status: 'todo', priority: 'normal',
        due: at(1, 20, 0), estimate: 20, courseId: null, projectId: null, kind: 'autre', progress: 0, subtasks: [], tags: ['famille'],
        notes: '', links: [], team: [], steps: [], createdAt: at(-1, 8, 0), completedAt: null, archived: false
      },
      {
        id: 't12', title: 'Renouveler la carte de bibliothèque', description: '', category: 'personal', status: 'todo', priority: 'low',
        due: at(-3, 17, 0), estimate: 15, courseId: null, projectId: null, kind: 'autre', progress: 0, subtasks: [], tags: [],
        notes: '', links: [], team: [], steps: [], createdAt: at(-9, 8, 0), completedAt: null, archived: false
      },
      {
        id: 't13', title: 'Réserver le chalet pour février', description: 'Comparer trois options et valider avec le groupe.', category: 'personal', status: 'waiting',
        priority: 'normal', due: at(12, 23, 59), estimate: 40, courseId: null, projectId: null, kind: 'autre', progress: 0, subtasks: [], tags: ['vacances'],
        notes: '', links: [], team: [], steps: [], createdAt: at(-7, 8, 0), completedAt: null, archived: false
      },
      {
        id: 't14', title: 'Maquettes des pages clés', description: '', category: 'work', status: 'done', priority: 'high',
        due: at(-1, 17, 0), estimate: 180, courseId: null, projectId: p1, kind: 'autre', progress: 100, subtasks: [], tags: ['design'],
        notes: '', links: [], team: [], steps: [], createdAt: at(-10, 9, 0), completedAt: at(-1, 16, 20), archived: false
      },
      {
        id: 't15', title: 'Analyse critique — dépôt', description: '', category: 'school', status: 'done', priority: 'normal',
        due: at(-24, 23, 59), estimate: 120, courseId: c1, assessmentId: 'a1', kind: 'devoir', progress: 100, subtasks: [], tags: [],
        notes: '', links: [], team: [], steps: [], createdAt: at(-30, 9, 0), completedAt: at(-24, 15, 0), archived: false
      },
      {
        id: 't16', title: 'Mettre à jour le CV', description: '', category: 'personal', status: 'done', priority: 'low',
        due: at(-5, 23, 59), estimate: 60, courseId: null, projectId: null, kind: 'autre', progress: 100, subtasks: [], tags: [],
        notes: '', links: [], team: [], steps: [], createdAt: at(-12, 9, 0), completedAt: at(-4, 11, 0), archived: false
      }
    ];
    s.events = [
      {
        id: 'e1', title: 'Réunion d\'équipe', category: 'work', projectId: p1, start: at(0, 10, 0), end: at(0, 10, 45),
        allDay: false, location: 'Visioconférence', notes: 'Tour de table et priorités de la semaine.', color: '#0ea5e9',
        recurrence: { freq: 'weekly', interval: 1, weekdays: [1], until: day(50) }, reminders: [10], createdAt: at(-20, 9, 0)
      },
      {
        id: 'e2', title: 'Examen mi-session — CR300', category: 'school', courseId: c1, start: at(12, 9, 0), end: at(12, 12, 0),
        allDay: false, location: 'C-245', notes: '', color: '#6366f1', recurrence: { freq: 'none' }, reminders: [60, 1440], createdAt: at(-15, 9, 0)
      },
      {
        id: 'e3', title: 'Rendez-vous dentiste', category: 'personal', start: at(4, 14, 30), end: at(4, 15, 15),
        allDay: false, location: 'Clinique du Parc', notes: 'Apporter la carte d\'assurance.', color: '#f59e0b',
        recurrence: { freq: 'none' }, reminders: [60], createdAt: at(-4, 9, 0)
      },
      {
        id: 'e4', title: 'Entraînement', category: 'personal', start: at(1, 18, 0), end: at(1, 19, 0),
        allDay: false, location: 'Centre sportif', notes: '', color: '#f59e0b',
        recurrence: { freq: 'weekly', interval: 1, weekdays: [2, 4], until: day(50) }, reminders: [15], createdAt: at(-25, 9, 0)
      },
      {
        id: 'e5', title: 'Revue client — site vitrine', category: 'work', projectId: p1, start: at(6, 11, 0), end: at(6, 12, 0),
        allDay: false, location: 'Bureau Alterego', notes: '', color: '#0ea5e9', recurrence: { freq: 'none' }, reminders: [30], createdAt: at(-3, 9, 0)
      },
      {
        id: 'e6', title: 'Atelier de révision — maths', category: 'school', courseId: c3, start: at(9, 13, 0), end: at(9, 15, 0),
        allDay: false, location: 'A-302', notes: '', color: '#10b981', recurrence: { freq: 'none' }, reminders: [30], createdAt: at(-2, 9, 0)
      },
      {
        id: 'e7', title: 'Souper chez Sarah', category: 'personal', start: at(8, 18, 30), end: at(8, 22, 0),
        allDay: false, location: 'Chez Sarah', notes: '', color: '#f59e0b', recurrence: { freq: 'none' }, reminders: [60], createdAt: at(-1, 9, 0)
      }
    ];
    s.habits = [
      {
        id: 'h1', name: 'Lecture 20 minutes', color: '#6366f1', cadence: { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] },
        log: {}, archived: false, createdAt: at(-30, 9, 0)
      },
      {
        id: 'h2', name: 'Entraînement', color: '#10b981', cadence: { type: 'custom', days: [1, 3, 5] },
        log: {}, archived: false, createdAt: at(-30, 9, 0)
      },
      {
        id: 'h3', name: 'Révision du jour', color: '#f59e0b', cadence: { type: 'custom', days: [1, 2, 3, 4, 5] },
        log: {}, archived: false, createdAt: at(-30, 9, 0)
      }
    ];
    const today = U.startOfDay(now);
    for (let i = 0; i < 14; i++) {
      const d = U.toISO(U.addDays(today, -i));
      if (i !== 3 && i !== 7) s.habits[0].log[d] = true;
      if (i !== 2 && i !== 6 && !(i === 0)) s.habits[2].log[d] = true;
    }
    [0, 2, 4, 7, 9, 11].forEach((i) => {
      const d = U.addDays(today, -i);
      if ([1, 3, 5].includes(d.getDay())) s.habits[1].log[U.toISO(d)] = true;
    });
    s.goals = [
      { id: 'g1', title: 'Courir 10 km sans arrêt', category: 'personal', target: 10, current: 6, unit: 'km', due: day(45), notes: 'Trois sorties par semaine.', createdAt: at(-20, 9, 0) },
      { id: 'g2', title: 'Lire 12 livres cette année', category: 'personal', target: 12, current: 4, unit: 'livres', due: day(120), notes: '', createdAt: at(-60, 9, 0) },
      { id: 'g3', title: 'Épargner pour le voyage', category: 'personal', target: 1500, current: 850, unit: '$', due: day(90), notes: '', createdAt: at(-40, 9, 0) }
    ];
    s.lists = [
      {
        id: 'li1', title: 'Épicerie', createdAt: at(-4, 9, 0), items: [
          { id: 'li1a', text: 'Café', done: true }, { id: 'li1b', text: 'Lait d\'avoine', done: false },
          { id: 'li1c', text: 'Légumes pour la semaine', done: false }, { id: 'li1d', text: 'Pâtes', done: false }
        ]
      },
      {
        id: 'li2', title: 'Idées cadeaux', createdAt: at(-9, 9, 0), items: [
          { id: 'li2a', text: 'Livre de cuisine pour Sarah', done: false }, { id: 'li2b', text: 'Chaussettes de randonnée pour Léo', done: false }
        ]
      }
    ];
    return s;
  }

  EP.Store = {
    KEY: STORAGE_KEY, BACKUP_KEY, VERSION,
    CATEGORIES, PRIORITIES, STATUSES, KINDS, ASSESSMENT_TYPES, ASSESSMENT_STATUSES, PROJECT_STATUSES, RECURRENCES, REMINDER_OPTIONS,
    load, saveNow, flush, get, subscribe, commit,
    add, find, put, remove, setSettings,
    saveTask, taskSeries, stopTaskSeries, ensureTaskOccurrences,
    exportJSON, importJSON, reset, loadDemo,
    normalize, demoData, autoArchive,
    cat, catColor, priority, status, assessmentType, assessmentStatus,
    storageOk: () => storageOk
  };

  EP.Select = {
    openTasks, overdueTasks, todayTasks, upcomingTasks, recentlyCompleted, taskBucket, priorityScore, priorityTasks,
    dayProgress, weekProgress,
    expandEvent, courseSessions, eventsInRange, calendarTasksInRange, conflicts, todayEvents, upcomingEvents,
    activeSession, courseAssessments, courseStats, nextAssessment, sessionSummary, schoolDeadlines, deadlines,
    projectTasks, projectStats,
    habitApplicable, habitDone, habitStats, goalProgress,
    globalSearch, dataStats,
    activeSessionId: () => (activeSession() ? activeSession().id : null)
  };
})();
