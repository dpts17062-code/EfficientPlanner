/* Efficient Planner — calendrier global et vues jour / semaine / mois */
(function () {
  'use strict';
  const EP = window.EP;
  const U = EP.U;
  const Store = EP.Store;
  const Select = EP.Select;
  const UI = EP.UI;
  const S = EP.Views.shared;
  const esc = U.esc;
  const Views = EP.Views;

  const HOUR_START = 6;
  const HOUR_END = 23;
  const HOUR_H = 48;
  const HOURS = HOUR_END - HOUR_START;

  function calState() {
    if (!EP.ui.calendar) {
      EP.ui.calendar = {
        mode: 'month',
        cursor: U.todayKey(),
        cats: { school: true, work: true, personal: true },
        schedules: true,
        scroll: null
      };
    }
    return EP.ui.calendar;
  }

  function rangeFor(state) {
    const cursor = U.parseDate(state.cursor) || new Date();
    if (state.mode === 'month') {
      const start = U.startOfWeek(U.startOfMonth(cursor), Store.get().settings.weekStartsOn);
      return { start: start, end: U.addDays(start, 41) };
    }
    if (state.mode === 'week') {
      const start = U.startOfWeek(cursor, Store.get().settings.weekStartsOn);
      return { start: start, end: U.addDays(start, 6) };
    }
    return { start: U.startOfDay(cursor), end: U.startOfDay(cursor) };
  }

  function titleFor(state) {
    const cursor = U.parseDate(state.cursor) || new Date();
    if (state.mode === 'month') return U.fmtMonthYear(cursor);
    if (state.mode === 'day') return U.fmtDateLong(cursor);
    const r = rangeFor(state);
    if (r.start.getMonth() === r.end.getMonth()) {
      return r.start.getDate() + ' – ' + U.fmtDate(r.end, { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return U.fmtDate(r.start, { day: 'numeric', month: 'short' }) + ' – ' + U.fmtDate(r.end, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function shiftDate(state, dir) {
    const cursor = U.parseDate(state.cursor) || new Date();
    if (state.mode === 'month') state.cursor = U.toISO(U.addMonths(U.startOfMonth(cursor), dir));
    else if (state.mode === 'week') state.cursor = U.toISO(U.addDays(cursor, dir * 7));
    else state.cursor = U.toISO(U.addDays(cursor, dir));
  }

  function layoutDay(events) {
    const sorted = events.slice().sort((a, b) => String(a.start).localeCompare(String(b.start)) || String(b.end).localeCompare(String(a.end)));
    const out = [];
    let cluster = [];
    let clusterEnd = null;
    function flush() {
      if (!cluster.length) return;
      const lanes = [];
      cluster.forEach((ev) => {
        const s = U.parseDate(ev.start), e = U.parseDate(ev.end);
        let lane = lanes.findIndex((end) => end <= s);
        if (lane < 0) { lane = lanes.length; lanes.push(e); }
        else lanes[lane] = e;
        ev.lane = lane;
      });
      const count = lanes.length || 1;
      cluster.forEach((ev) => { ev.lanes = count; out.push(ev); });
      cluster = [];
      clusterEnd = null;
    }
    sorted.forEach((ev) => {
      const s = U.parseDate(ev.start), e = U.parseDate(ev.end);
      if (cluster.length && s >= clusterEnd) flush();
      cluster.push(ev);
      clusterEnd = clusterEnd && clusterEnd > e ? clusterEnd : e;
    });
    flush();
    return out;
  }

  function weekEventHtml(occ) {
    const start = U.parseDate(occ.start);
    const minutes = start.getHours() * 60 + start.getMinutes();
    let top = ((minutes - HOUR_START * 60) / 60) * HOUR_H;
    let height = Math.max(24, (U.durationMin(occ.start, occ.end) / 60) * HOUR_H - 2);
    if (top < 0) { height += top; top = 0; }
    const width = 100 / (occ.lanes || 1);
    const left = (occ.lane || 0) * width;
    const color = occ.color || (occ.courseId && Store.find('courses', occ.courseId) ? Store.find('courses', occ.courseId).color : Store.catColor(occ.category));
    const draggable = occ.source === 'event' && !occ.isRecurring;
    const action = occ.source === 'course' ? 'course:open' : 'event:edit';
    const id = occ.source === 'course' ? occ.courseId : occ.id;
    return '<button type="button" class="week-event" style="--c:' + esc(color) + ';top:' + top.toFixed(1) + 'px;height:' + Math.max(18, height).toFixed(1) + 'px;left:calc(' + left.toFixed(2) + '% + 2px);width:calc(' + width.toFixed(2) + '% - 4px)"' +
      ' data-action="' + action + '" data-id="' + esc(id) + '"' +
      (draggable ? ' draggable="true" data-drag-id="' + esc(occ.id) + '" data-drag-start="' + esc(occ.start) + '"' : '') +
      ' title="' + esc(occ.title + ' · ' + U.fmtRange(occ.start, occ.end)) + '">' +
      '<span class="week-event-time">' + esc(U.fmtTime(occ.start)) + '</span>' +
      '<span class="week-event-title">' + esc(occ.title) + '</span>' +
      (occ.location && height > 42 ? '<span class="week-event-loc">' + esc(occ.location) + '</span>' : '') +
    '</button>';
  }

  function monthView(state, occs, days) {
    const byDay = {};
    occs.forEach((occ) => {
      const key = U.dateKey(occ.start);
      (byDay[key] = byDay[key] || []).push(occ);
    });
    const today = U.todayKey();
    const weekdays = Array.from({ length: 7 }, (_, i) => U.weekdayName((Store.get().settings.weekStartsOn + i) % 7, true));
    return '<div class="cal-month card">' +
      '<div class="cal-weekdays">' + weekdays.map((d) => '<span>' + esc(d) + '</span>').join('') + '</div>' +
      '<div class="cal-grid">' +
        days.map((d) => {
          const key = U.dateKey(d);
          const events = (byDay[key] || []).slice().sort((a, b) => String(a.start).localeCompare(String(b.start)));
          const isOther = d.getMonth() !== (U.parseDate(state.cursor) || new Date()).getMonth();
          return '<div class="cal-cell' + (isOther ? ' is-other' : '') + (key === today ? ' is-today' : '') + '" data-drop-date="' + key + '">' +
            '<div class="cal-cell-head"><span class="cal-daynum">' + d.getDate() + '</span>' +
              (events.length > 3 ? '<button type="button" class="cal-more" data-action="cal:day" data-date="' + key + '">+' + (events.length - 3) + '</button>' : '') +
            '</div>' +
            '<div class="cal-cell-events">' +
              events.slice(0, 3).map((occ) => UI.eventChip(occ, { showTime: !occ.allDay })).join('') +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  function weekView(state, occs, days) {
    const today = U.todayKey();
    const weekdays = days.map((d) => {
      const items = occs.filter((o) => U.sameDay(o.start, d));
      return '<div class="cal-day-head' + (U.dateKey(d) === today ? ' is-today' : '') + '">' +
        '<span>' + esc(U.weekdayShort(d)) + '</span><strong>' + d.getDate() + '</strong>' +
      '</div>';
    }).join('');

    const allDayCells = days.map((d) => {
      const items = occs.filter((o) => U.sameDay(o.start, d) && (o.allDay || U.durationMin(o.start, o.end) >= 24 * 60));
      return '<div class="allday-cell">' + items.map((o) => UI.eventChip(o, { showTime: false })).join('') + '</div>';
    }).join('');

    const cols = days.map((d) => {
      const timed = layoutDay(occs.filter((o) => U.sameDay(o.start, d) && !o.allDay && U.durationMin(o.start, o.end) < 24 * 60));
      const isToday = U.dateKey(d) === today;
      const now = new Date();
      const nowTop = ((now.getHours() * 60 + now.getMinutes() - HOUR_START * 60) / 60) * HOUR_H;
      return '<div class="week-col' + (isToday ? ' is-today' : '') + '" data-drop-date="' + U.dateKey(d) + '" data-week-col="' + U.dateKey(d) + '">' +
        '<div class="week-lines">' + Array.from({ length: HOURS }, () => '<span></span>').join('') + '</div>' +
        (isToday && nowTop >= 0 && nowTop <= HOURS * HOUR_H ? '<div class="now-line" style="top:' + nowTop.toFixed(1) + 'px"></div>' : '') +
        timed.map(weekEventHtml).join('') +
      '</div>';
    }).join('');

    const axis = '<div class="time-axis">' + Array.from({ length: HOURS + 1 }, (_, i) => '<span style="height:' + HOUR_H + 'px">' + U.pad(HOUR_START + i) + ':00</span>').join('') + '</div>';
    const template = 'grid-template-columns:56px repeat(' + days.length + ',minmax(0,1fr))';

    return '<div class="cal-week card">' +
      '<div class="cal-week-head" style="' + template + '"><div class="week-head-gutter"></div>' + weekdays + '</div>' +
      '<div class="cal-allday" style="' + template + '"><div class="allday-label">Jour</div>' + allDayCells + '</div>' +
      '<div class="week-scroll" id="week-scroll">' +
        '<div class="week-canvas" style="' + template + ';height:' + (HOURS * HOUR_H) + 'px">' +
          axis + cols +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function bindInteractions(state) {
    const scroll = document.getElementById('week-scroll');
    if (scroll) {
      if (state.scroll == null) state.scroll = 8 * HOUR_H;
      scroll.scrollTop = state.scroll;
      scroll.addEventListener('scroll', U.debounce(() => { state.scroll = scroll.scrollTop; }, 120));
    }

    U.qsa('[data-cal-nav]').forEach((btn) => {
      btn.addEventListener('click', () => { shiftDate(state, Number(btn.dataset.calNav)); EP.App.render(); });
    });
    const todayBtn = document.querySelector('[data-cal-today]');
    if (todayBtn) todayBtn.addEventListener('click', () => { state.cursor = U.todayKey(); EP.App.render(); });
    U.qsa('[data-cal-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.calMode;
        if (mode === state.mode) return;
        if (state.mode === 'month' && mode !== 'month') {
          const c = U.parseDate(state.cursor);
          if (c) state.cursor = U.toISO(U.startOfWeek(c, Store.get().settings.weekStartsOn));
        }
        state.mode = mode;
        EP.App.render();
      });
    });
    U.qsa('[data-cal-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.calCat;
        const active = Object.values(state.cats).filter(Boolean).length;
        if (state.cats[key] && active === 1) return;
        state.cats[key] = !state.cats[key];
        EP.App.render();
      });
    });
    const schedToggle = document.getElementById('cal-schedules');
    if (schedToggle) schedToggle.addEventListener('change', () => { state.schedules = schedToggle.checked; EP.App.render(); });

    // Clic sur une case du mois
    U.qsa('.cal-cell').forEach((cell) => {
      cell.addEventListener('click', (e) => {
        if (e.target.closest('.event-chip') || e.target.closest('button')) return;
        EP.Forms.event(null, { date: cell.dataset.dropDate });
      });
    });
    // Clic sur une colonne horaire
    U.qsa('[data-week-col]').forEach((col) => {
      col.addEventListener('click', (e) => {
        if (e.target.closest('.week-event') || e.target.closest('button')) return;
        const rect = col.getBoundingClientRect();
        let minutes = HOUR_START * 60 + ((e.clientY - rect.top) / HOUR_H) * 60;
        minutes = Math.round(minutes / 15) * 15;
        minutes = U.clamp(minutes, HOUR_START * 60, (HOUR_END - 1) * 60);
        const h = Math.floor(minutes / 60), m = minutes % 60;
        EP.Forms.event(null, { date: col.dataset.dropDate, time: U.pad(h) + ':' + U.pad(m) });
      });
    });

    // Glisser-déposer
    let drag = null;
    U.qsa('[data-drag-id]').forEach((chip) => {
      chip.addEventListener('dragstart', (e) => {
        drag = { id: chip.dataset.dragId, start: chip.dataset.dragStart };
        try {
          e.dataTransfer.setData('text/plain', JSON.stringify(drag));
          e.dataTransfer.effectAllowed = 'move';
        } catch (err) { /* ignore */ }
        chip.classList.add('is-dragging');
      });
      chip.addEventListener('dragend', () => { chip.classList.remove('is-dragging'); drag = null; });
    });
    U.qsa('[data-drop-date]').forEach((target) => {
      target.addEventListener('dragover', (e) => {
        if (!drag) return;
        e.preventDefault();
        target.classList.add('drop-target');
      });
      target.addEventListener('dragleave', () => target.classList.remove('drop-target'));
      target.addEventListener('drop', (e) => {
        e.preventDefault();
        target.classList.remove('drop-target');
        if (!drag) return;
        const ev = Store.find('events', drag.id);
        if (!ev) return;
        const oldStart = U.parseDate(drag.start);
        const oldEnd = U.parseDate(ev.end);
        const duration = Math.max(15, Math.round((oldEnd - oldStart) / 60000));
        let newStart;
        if (target.classList.contains('week-col')) {
          const rect = target.getBoundingClientRect();
          let minutes = HOUR_START * 60 + ((e.clientY - rect.top) / HOUR_H) * 60;
          minutes = Math.round(minutes / 15) * 15;
          minutes = U.clamp(minutes, HOUR_START * 60, (HOUR_END * 60) - duration);
          newStart = new Date(oldStart);
          const date = U.parseDate(target.dataset.dropDate);
          newStart.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
          newStart.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
        } else {
          const date = U.parseDate(target.dataset.dropDate);
          newStart = new Date(oldStart);
          newStart.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        }
        const newEnd = U.addMinutes(newStart, duration);
        const patch = { start: U.toISOdt(newStart), end: U.toISOdt(newEnd) };
        const conflicts = Select.conflicts(Object.assign({ id: ev.id }, patch));
        const previous = { start: ev.start, end: ev.end };
        Store.put('events', ev.id, patch);
        drag = null;
        if (conflicts.length) {
          UI.toast('Événement déplacé, mais conflit avec « ' + conflicts[0].title + ' ».', {
            type: 'error',
            action: { label: 'Annuler', onClick: () => Store.put('events', ev.id, previous) }
          });
        } else {
          UI.toast('Événement déplacé au ' + U.fmtDate(newStart, { weekday: 'short', day: 'numeric', month: 'short' }) + ' à ' + U.fmtTime(newStart) + '.', { type: 'success' });
        }
      });
    });
  }

  Views.calendar = function () {
    const state = calState();
    const range = rangeFor(state);
    const occs = Select.eventsInRange(range.start, range.end, { includeSchedules: state.schedules, categories: state.cats });
    const days = state.mode === 'month' ? U.monthGrid((U.parseDate(state.cursor) || new Date()).getFullYear(), (U.parseDate(state.cursor) || new Date()).getMonth(), Store.get().settings.weekStartsOn)
      : Array.from({ length: state.mode === 'week' ? 7 : 1 }, (_, i) => U.addDays(range.start, i));
    const deadlines = Select.deadlines(10).slice(0, 4);
    const catChips = Object.values(Store.CATEGORIES).map((c) => {
      const active = state.cats[c.key];
      return '<button type="button" class="filter-chip' + (active ? ' is-active' : '') + '" data-cal-cat="' + c.key + '" style="--c:' + Store.catColor(c.key) + '">' +
        UI.icon(c.icon, 14) + esc(c.label) + '</button>';
    }).join('');

    const html =
      '<div class="view-inner calendar-view">' +
        '<div class="page-head">' +
          '<div><p class="eyebrow">Planification</p><h1>Calendrier</h1><p class="page-sub">Tous vos événements réunis — sans doublon entre les espaces.</p></div>' +
          '<button type="button" class="btn btn-primary" data-action="event:new">' + UI.icon('plus', 16) + ' Nouvel événement</button>' +
        '</div>' +

        '<section class="card cal-toolbar">' +
          '<div class="cal-nav-group">' +
            '<button type="button" class="icon-btn" data-cal-nav="-1" aria-label="Précédent">' + UI.icon('chevron-left', 18) + '</button>' +
            '<button type="button" class="btn btn-soft btn-sm" data-cal-today>Aujourd\'hui</button>' +
            '<button type="button" class="icon-btn" data-cal-nav="1" aria-label="Suivant">' + UI.icon('chevron-right', 18) + '</button>' +
          '</div>' +
          '<h2 class="cal-title">' + esc(titleFor(state)) + '</h2>' +
          '<div class="seg seg-sm cal-modes">' +
            [['day', 'Jour'], ['week', 'Semaine'], ['month', 'Mois']].map((m) =>
              '<button type="button" class="seg-btn' + (state.mode === m[0] ? ' is-active' : '') + '" data-cal-mode="' + m[0] + '">' + m[1] + '</button>').join('') +
          '</div>' +
        '</section>' +

        '<div class="cal-filterbar">' +
          '<div class="filter-chips">' + catChips + '</div>' +
          '<label class="switch-field switch-inline"><input type="checkbox" id="cal-schedules"' + (state.schedules ? ' checked' : '') + '><span class="switch"></span><span>Horaire des cours</span></label>' +
        '</div>' +

        '<div class="cal-surface' + (state.mode === 'month' ? ' month-surface' : '') + '">' +
          (state.mode === 'month' ? monthView(state, occs, days) : weekView(state, occs, days)) +
        '</div>' +

        '<section class="card cal-footer-card">' +
          '<div class="card-head"><div><h2>' + UI.icon('flag', 17) + ' Échéances à venir</h2><p>Les prochaines remises et évaluations.</p></div><a class="card-link" href="#/school">Voir l\'école ' + UI.icon('arrow-right', 14) + '</a></div>' +
          (deadlines.length ? '<div class="deadline-list">' + deadlines.map(S.deadlineRow).join('') + '</div>' : '<div class="quiet-empty">' + UI.icon('check', 18) + '<span>Aucune échéance dans les prochains jours.</span></div>') +
        '</section>' +
      '</div>';

    return {
      title: 'Calendrier',
      html: html,
      mount: function () { bindInteractions(state); }
    };
  };
})();
