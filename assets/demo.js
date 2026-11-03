// In-browser demo of the free Jingshan Park guide: map, highlights with audio, suggested routes, visitor info.
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const root = $('#demo');
  const viewport = $('.dm-map', root);
  const stage = $('.dm-stage', root);
  const markers = $('.dm-markers', root);
  const svg = $('.dm-route', root);
  const panel = $('.dm-panel-body', root);
  const player = $('.dm-player', root);
  const audio = new Audio();
  audio.preload = 'none';
  let data, voice = 'joanne', current = null, route = null;
  let view = { z: 1, x: 0, y: 0 };

  // ---- Map pan & zoom -------------------------------------------------------
  const size = () => ({ w: viewport.clientWidth, h: viewport.clientHeight });
  function baseScale() {
    const { w, h } = size();
    return Math.min(w / data.map.width, h / data.map.height);
  }
  function clamp() {
    const { w, h } = size();
    const s = baseScale() * view.z, mw = data.map.width * s, mh = data.map.height * s;
    view.x = mw <= w ? (w - mw) / 2 : Math.min(0, Math.max(w - mw, view.x));
    view.y = mh <= h ? (h - mh) / 2 : Math.min(0, Math.max(h - mh, view.y));
  }
  function apply() {
    clamp();
    const s = baseScale() * view.z;
    stage.style.width = data.map.width + 'px';
    stage.style.height = data.map.height + 'px';
    stage.style.transform = `translate(${view.x}px, ${view.y}px) scale(${s})`;
    markers.style.setProperty('--inv', 1 / s);
    root.classList.toggle('dm-zoomed', view.z >= 1.7);
  }
  function zoomAt(factor, cx, cy) {
    const s0 = baseScale() * view.z;
    const z = Math.min(5, Math.max(1, view.z * factor));
    const s1 = baseScale() * z;
    view.x = cx - (cx - view.x) * (s1 / s0);
    view.y = cy - (cy - view.y) * (s1 / s0);
    view.z = z;
    apply();
  }
  function focus(pos, z = Math.max(view.z, 2.2)) {
    const { w, h } = size();
    view.z = z;
    const s = baseScale() * z;
    view.x = w / 2 - pos[0] * data.map.width * s;
    view.y = h / 2 - pos[1] * data.map.height * s;
    stage.classList.add('dm-anim');
    apply();
    setTimeout(() => stage.classList.remove('dm-anim'), 450);
  }
  function fit(points) {
    const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const { w, h } = size();
    const spanW = (Math.max(...xs) - Math.min(...xs)) * data.map.width * baseScale() + 80;
    const spanH = (Math.max(...ys) - Math.min(...ys)) * data.map.height * baseScale() + 80;
    focus([cx, cy], Math.max(1, Math.min(3, Math.min(w / spanW, h / spanH))));
  }

  const pointers = new Map();
  let pinch = null, moved = false;
  viewport.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: view.z };
    }
  });
  viewport.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, cur);
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const r = viewport.getBoundingClientRect();
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((pinch.z * d / pinch.d) / view.z, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      moved = true;
    } else if (pointers.size === 1) {
      const dx = cur.x - prev.x, dy = cur.y - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      if (moved && !viewport.hasPointerCapture(e.pointerId)) viewport.setPointerCapture(e.pointerId);
      view.x += dx; view.y += dy;
      apply();
    }
  });
  const up = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; };
  viewport.addEventListener('pointerup', up);
  viewport.addEventListener('pointercancel', up);
  viewport.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = viewport.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  root.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
    const { w, h } = size();
    if (b.dataset.zoom === 'reset') { view = { z: 1, x: 0, y: 0 }; apply(); return; }
    zoomAt(b.dataset.zoom === 'in' ? 1.5 : 1 / 1.5, w / 2, h / 2);
  }));
  window.addEventListener('resize', apply);

  // ---- Markers ---------------------------------------------------------------
  const at = (pos) => `left:${pos[0] * 100}%;top:${pos[1] * 100}%`;
  function drawMarkers() {
    markers.innerHTML =
      data.entrances.map((e) => `<span class="dm-gate" style="${at(e.pos)}"><i></i><b>${esc(e.name)}</b></span>`).join('') +
      data.pois.map((p, i) => `<button class="dm-pin" data-i="${i}" style="${at(p.pos)}" aria-label="${esc(p.name)}"><i>${p.audio ? '♪' : ''}</i><b>${esc(p.name)}</b></button>`).join('') +
      '<div class="dm-stops"></div>';
    markers.querySelectorAll('.dm-pin').forEach((b) => b.addEventListener('click', () => openPoi(+b.dataset.i, true)));
  }
  function markActive() {
    markers.querySelectorAll('.dm-pin').forEach((b) => b.classList.toggle('on', current !== null && +b.dataset.i === current));
  }

  // ---- Audio -------------------------------------------------------------------
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let playing = null;
  function play(poi) {
    const clip = poi.audio[voice] || Object.values(poi.audio)[0];
    if (playing === poi && audio.src.endsWith(clip.src)) { audio.paused ? audio.play() : audio.pause(); return; }
    playing = poi;
    audio.src = clip.src;
    audio.play().catch(() => {});
    player.hidden = false;
    $('.dm-player-name', player).textContent = poi.name;
  }
  function syncAudioUI() {
    const on = !audio.paused;
    root.querySelectorAll('.dm-play').forEach((b) => {
      const mine = playing && b.dataset.id === playing.id;
      b.classList.toggle('on', mine && on);
      b.setAttribute('aria-label', mine && on ? 'Pause' : 'Play');
    });
    $('.dm-player-toggle', player).textContent = on ? 'Pause' : 'Play';
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    root.querySelectorAll('.dm-progress i').forEach((i) => { i.style.width = pct + '%'; });
    $('.dm-player-time', player).textContent = audio.duration ? `${fmt(audio.currentTime)} / ${fmt(audio.duration)}` : '';
  }
  ['play', 'pause', 'timeupdate', 'ended', 'loadedmetadata'].forEach((ev) => audio.addEventListener(ev, syncAudioUI));
  $('.dm-player-toggle', player).addEventListener('click', () => (audio.paused ? audio.play() : audio.pause()));
  $('.dm-player-close', player).addEventListener('click', () => { audio.pause(); player.hidden = true; playing = null; syncAudioUI(); });

  function playButton(p) {
    if (!p.audio) return '';
    const secs = (p.audio[voice] || Object.values(p.audio)[0]).seconds;
    return `<button class="dm-play" data-id="${esc(p.id)}" aria-label="Play"><span></span>${fmt(secs)}</button>`;
  }
  function wirePlay(scope) {
    scope.querySelectorAll('.dm-play').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      play(b.dataset.id === data.intro?.id ? data.intro : data.pois.find((p) => p.id === b.dataset.id));
    }));
    syncAudioUI();
  }

  // ---- Panel views ---------------------------------------------------------------
  let tab = 'highlights';
  function setTab(t) {
    tab = t;
    root.querySelectorAll('.dm-tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === t));
    if (t !== 'routes') clearRoute();
    current = null; markActive();
    ({ highlights: showHighlights, routes: showRoutes, info: showInfo })[t]();
    panel.scrollTop = 0;
  }
  root.querySelectorAll('.dm-tabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));

  function showHighlights() {
    const intro = data.intro;
    panel.innerHTML = `
      ${intro ? `<div class="dm-intro"><p>${esc(intro.summary)}</p>${playButton(intro)}</div>` : ''}
      <p class="dm-hint">Tap a place on the map or in the list. Drag to pan, pinch or scroll to zoom.</p>
      <ul class="dm-list">${data.pois.map((p, i) => `
        <li><button data-i="${i}">
          ${p.art ? `<img src="${p.art}" alt="" loading="lazy">` : '<span class="dm-noart"></span>'}
          <span><strong>${esc(p.name)}</strong><small>${esc(p.category)} · ${esc(p.summary)}</small></span>
        </button></li>`).join('')}
      </ul>`;
    panel.querySelectorAll('.dm-list button').forEach((b) => b.addEventListener('click', () => openPoi(+b.dataset.i, true)));
    wirePlay(panel);
  }

  function voiceSwitch() {
    return `<div class="dm-voice" role="group" aria-label="Narrator">${['joanne', 'alfred'].map((v) =>
      `<button data-v="${v}" aria-pressed="${v === voice}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div>`;
  }

  function openPoi(i, fromMap) {
    const p = data.pois[i];
    current = i; markActive();
    if (fromMap) focus(p.pos);
    if (tab === 'info') { tab = 'highlights'; root.querySelectorAll('.dm-tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === 'highlights')); }
    const back = tab === 'routes' && route ? 'Back to route' : 'All highlights';
    panel.innerHTML = `
      <button class="dm-back">← ${back}</button>
      ${p.art ? `<img class="dm-art" src="${p.art}" alt="Illustration of ${esc(p.name)}">` : ''}
      <p class="dm-cat">${esc(p.category)}</p>
      <h3>${esc(p.name)}</h3>
      <p class="dm-sum">${esc(p.summary)}</p>
      ${p.audio ? `<div class="dm-audio">${playButton(p)}<div class="dm-progress"><i></i></div>${voiceSwitch()}</div>` : ''}
      <p>${esc(p.story)}</p>
      ${p.source ? `<p class="dm-src">Source: <a href="${esc(p.source)}" rel="noopener">${esc(new URL(p.source).hostname)}</a></p>` : ''}`;
    $('.dm-back', panel).addEventListener('click', () => (tab === 'routes' && route ? showRoute(route) : setTab('highlights')));
    panel.querySelectorAll('.dm-voice button').forEach((b) => b.addEventListener('click', () => {
      voice = b.dataset.v;
      panel.querySelectorAll('.dm-voice button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      const was = playing === p && !audio.paused;
      playing = null;
      if (was) play(p);
    }));
    wirePlay(panel);
    panel.scrollTop = 0;
    if (window.matchMedia('(max-width: 899px)').matches) $('.dm-panel', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showRoutes() {
    panel.innerHTML = `
      <p class="dm-hint">Ready-made walks from the South Entrance, in the order most guides visit them.</p>
      <ul class="dm-routes">${data.routes.map((r, i) => `
        <li><button data-i="${i}"><strong>${esc(r.title)}</strong>
          <small>About ${Math.floor(r.minutes / 60) ? Math.floor(r.minutes / 60) + ' h ' : ''}${r.minutes % 60} min · ${r.stops.length} stops · ${(r.legs.reduce((a, l) => a + l.distance_m, 0) / 1000).toFixed(1)} km</small></button></li>`).join('')}
      </ul>
      <p class="dm-src">${esc(data.route_note)}</p>`;
    panel.querySelectorAll('.dm-routes button').forEach((b) => b.addEventListener('click', () => showRoute(data.routes[+b.dataset.i])));
  }

  function clearRoute() {
    route = null;
    svg.innerHTML = '';
    const st = $('.dm-stops', markers); if (st) st.innerHTML = '';
    root.classList.remove('dm-routing');
  }

  function showRoute(r) {
    route = r;
    current = null; markActive();
    root.classList.add('dm-routing');
    const W = data.map.width, H = data.map.height;
    const pts = r.legs.flatMap((l) => l.path).map(([u, v]) => `${(u * W).toFixed(1)},${(v * H).toFixed(1)}`).join(' ');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = `<polyline class="dm-line-bg" points="${pts}"/><polyline class="dm-line" points="${pts}"/>`;
    $('.dm-stops', markers).innerHTML = r.stops.map((s, i) => `<span class="dm-stop" style="${at(s.pos)}">${i + 1}</span>`).join('');
    fit(r.legs.flatMap((l) => l.path));
    const poiIndex = (id) => data.pois.findIndex((p) => p.id === id);
    panel.innerHTML = `
      <button class="dm-back">← All routes</button>
      <h3>${esc(r.title)}</h3>
      <p class="dm-sum">About ${Math.floor(r.minutes / 60) ? Math.floor(r.minutes / 60) + ' h ' : ''}${r.minutes % 60} min · ${(r.legs.reduce((a, l) => a + l.distance_m, 0) / 1000).toFixed(1)} km walking</p>
      <ol class="dm-steps">${r.stops.map((s, i) => {
        const pi = poiIndex(s.id);
        const legInfo = i < r.legs.length ? `<em>↓ ${r.legs[i].distance_m} m · ${Math.max(1, Math.round(r.legs[i].distance_m / 65))} min walk</em>` : '';
        return `<li><span class="dm-num">${i + 1}</span><div>${pi >= 0 ? `<button data-i="${pi}">${esc(s.name)}</button>${playButton(data.pois[pi])}` : `<strong>${esc(s.name)}</strong>`}${legInfo}</div></li>`;
      }).join('')}</ol>
      <p class="dm-src">${esc(data.route_note)}</p>`;
    $('.dm-back', panel).addEventListener('click', () => { clearRoute(); showRoutes(); view = { z: 1, x: 0, y: 0 }; apply(); });
    panel.querySelectorAll('.dm-steps button[data-i]').forEach((b) => b.addEventListener('click', () => openPoi(+b.dataset.i, true)));
    wirePlay(panel);
    panel.scrollTop = 0;
  }

  function showInfo() {
    const inf = data.info;
    panel.innerHTML = `
      <div class="dm-card">
        <p class="dm-cat">Show this to your taxi driver</p>
        <p class="dm-zh" lang="zh-Hans">景山公园<br><span>${esc(inf.address_chinese)}</span></p>
        <p class="dm-small">${esc(inf.address)}</p>
      </div>
      <h4>Opening hours</h4>
      ${inf.opening_hours.map((h) => `<p><strong>${esc(h.season)}</strong><br>${esc(h.hours)}${h.note ? `<br><small>${esc(h.note)}</small>` : ''}</p>`).join('')}
      <h4>Tickets</h4>
      <table class="dm-table">${inf.ticket_prices.slice(0, 3).map((t) => `<tr><td>${esc(t.label)}${t.note ? `<small>${esc(t.note)}</small>` : ''}</td><td>¥${esc(t.cny)}</td></tr>`).join('')}</table>
      <h4>Getting there</h4>
      ${inf.public_transport.map((t) => `<p><strong>${esc(t.mode)} ${esc(t.route)}</strong> · ${esc(t.stop)}${t.note ? `<br><small>${esc(t.note)}</small>` : ''}</p>`).join('')}
      <p class="dm-src">Checked by Penyola from official sources; confirm on the day.</p>`;
  }

  // ---- Boot ------------------------------------------------------------------
  fetch('assets/demo/jingshan.json').then((r) => r.json()).then((d) => {
    data = d;
    $('.dm-map-img', root).src = d.map.src;
    drawMarkers();
    apply();
    setTab('highlights');
    root.classList.add('dm-ready');
  });
})();
