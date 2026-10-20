// /founder/: the weave (one thread per person, months down the page) and the globe (the trip, in the order
// I first went, with the passport filling as it goes). Reads data.json, world.json and land.json beside this
// file. No library. Reduced motion: the globe and the passport are drawn finished, nothing plays.
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MON = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  const fmt = (n) => n.toLocaleString("en-US");
  const monthName = (ym) => `${MON[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;
  const PAL = { "Seattle": "#5cc2ff", "40th Birthday": "#ffd166", "Lansing": "#ff8f85", "Drexel": "#c3a6ff",
                "What Comes Next?": "#8af0b8" };
  const BETWEEN = "#f4f4f4", BEFORE = "#9fb3b0";

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // ── the weave ──────────────────────────────────────────────────────────────────────────────────────────
  function weave(D) {
    const months = D.months, N = months.length, RH = 9, W = 390, idx = {};
    months.forEach((m, i) => { idx[m.ym] = i; });
    const first = months[0].ym, last = months[N - 1].ym;
    const ry = (ym, end) => { const c = ym < first ? first : ym > last ? last : ym; return (idx[c] + (end ? 1 : 0)) * RH; };
    const WX = 66, WW = W - WX;
    const rows = D.weave.filter((r) => r.months.some((m) => m[0] in idx));
    const TW = WW / Math.max(rows.length, 1);
    const colorOf = (r) => PAL[r.season] || (r.season === null && r.first >= D.start ? BETWEEN : BEFORE);
    const metIn = (r) => r.season ? `in ${r.season}` : r.first >= D.start ? "between Seasons" : "before 2015";

    const svg = $("weave");
    svg.setAttribute("viewBox", `0 0 ${W} ${N * RH + 2}`);
    months.forEach((m, i) => {                                   // years
      if (m.ym.endsWith("-01")) {
        el("line", { class: "yr", x1: 0, x2: W, y1: i * RH, y2: i * RH }, svg);
        el("text", { class: "ax", x: 0, y: i * RH + 11 }, svg).textContent = m.ym.slice(0, 4);
      }
    });
    months.forEach((m, i) => { if (m.dark) el("rect", { class: "dark", x: WX, y: i * RH, width: WW, height: RH }, svg); });

    const seasons = D.seasons.filter((s) => s.kind === "season" && (s.end || last) >= first);
    seasons.forEach((s, k) => {                                 // the Season rail, two lanes
      const lane = 32 + (k % 2) * 15, y0 = ry(s.start), y1 = ry(s.end || last, true);
      el("rect", { class: s.name.startsWith("What") ? "season next" : "season", x: lane, y: y0 + 1, width: 13, height: Math.max(y1 - y0 - 2, 2), rx: 3 }, svg);
      el("text", { class: "slab", transform: `translate(${lane + 9.5},${y0 + 5}) rotate(90)` }, svg).textContent = s.name;
    });

    const g = el("g", { class: "threads" }, svg), OP = { 1: 0.45, 2: 0.75, 3: 1 };
    rows.forEach((r, j) => {
      const col = colorOf(r), x = (WX + j * TW).toFixed(2), w = Math.max(TW, 0.5).toFixed(2);
      const on = r.months.filter((m) => m[0] in idx);
      const y0 = ry(on[0][0]), y1 = ry(on[on.length - 1][0], true);
      el("rect", { x, y: y0, width: w, height: y1 - y0, fill: col, opacity: 0.12 }, g);          // the thread, even in silence
      for (const [ym, lv] of on) el("rect", { x, y: ry(ym), width: w, height: RH, fill: col, opacity: OP[lv] }, g);
    });

    D.seasons.filter((s) => s.kind === "move" && (s.end || last) >= first).forEach((s) => {
      const end = s.end || last, y0 = ry(s.start), y1 = ry(end, true);
      el("rect", { class: "move", x: WX - 2, y: y0, width: WW + 2, height: y1 - y0 }, svg);
      el("text", { class: "mlab", x: W - 3, y: y0 + 13 }, svg).textContent = s.name;
      el("text", { class: "mspan", x: W - 3, y: y0 + 24 }, svg).textContent = `${monthName(s.start)} – ${monthName(end)}`;
    });
    const hl = el("g", {}, svg);

    $("wtitle").textContent = `${rows.length} people, one thread each, in the order we first talked`;
    const legend = Object.entries(PAL).map(([n, c]) => [`Met in ${n}`, c]).concat([["Met between Seasons", BETWEEN], ["Met before 2015", BEFORE]]);
    $("legend").innerHTML = legend.map(([t, c]) => `<span><i style="background:${c}"></i>${t}</span>`).join("") +
      `<span><i style="background:rgba(14,22,20,.32)"></i>No record</span><span><i style="background:transparent;border:1.2px solid var(--coral)"></i>A move</span>`;

    // Tap: the nearest thread lit in that month (a fingertip covers ~10 threads), else the nearest live one.
    const mo = (ym) => +ym.slice(0, 4) * 12 + +ym.slice(5, 7) - 1;
    svg.addEventListener("click", (e) => {
      const b = svg.getBoundingClientRect(), x = (e.clientX - b.left) * W / b.width, y = (e.clientY - b.top) * (N * RH + 2) / b.height;
      const row = months[Math.max(0, Math.min(N - 1, Math.floor(y / RH)))].ym, at = (x - WX) / TW, reach = 22 / TW;
      if (x < WX) return;
      let best = -1, bestD = Infinity;
      rows.forEach((r, j) => {
        const d = Math.abs(j + 0.5 - at); if (d > reach) return;
        const lit = r.months.some((m) => Math.abs(mo(m[0]) - mo(row)) <= 1);
        const live = r.months[0][0] <= row && row <= r.months[r.months.length - 1][0];
        const score = d - (lit ? 1000 : live ? 500 : 0);
        if (score < bestD) { bestD = score; best = j; }
      });
      while (hl.firstChild) hl.removeChild(hl.firstChild);
      if (best < 0) { svg.classList.remove("picked"); $("pick").innerHTML = "&nbsp;"; return; }
      const r = rows[best], x0 = WX + best * TW, ms = r.months.map((m) => m[0]).filter((ym) => ym in idx);
      svg.classList.add("picked");
      el("rect", { class: "hlbox", x: x0 - 2, y: ry(ms[0]) - 2, width: Math.max(TW, 0.5) + 4, height: ry(ms[ms.length - 1], true) - ry(ms[0]) + 4 }, hl);
      for (const ym of ms) el("rect", { class: "hl", x: x0 - 0.5, y: ry(ym), width: Math.max(TW, 0.5) + 1, height: RH }, hl);
      let gap = 0;
      for (let i = 1; i < ms.length; i++) gap = Math.max(gap, mo(ms[i]) - mo(ms[i - 1]) - 1);
      $("pick").textContent = `Someone I met ${metIn(r)} (${r.first.slice(0, 4)}) · talked in ${ms.length} month${ms.length === 1 ? "" : "s"} since 2015` +
        (gap >= 12 ? ` · longest quiet ${Math.floor(gap / 12)} yr ${gap % 12} mo` : "");
    });
  }

  function intro(D, world) {
    const h = D.hero;
    $("tiles").innerHTML = [[fmt(h.messages), "messages"], [fmt(h.people), "people"], [fmt(h.conv[0] + h.conv[1]), "conversations"],
      [fmt(world.stats.countries), "countries"], [fmt(D.weave.length), "threads below"], ["6", "moves"]]
      .map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join("");
    const pre = D.seasons.filter((s) => s.kind === "season" && s.end && s.end < D.start && s.messages > 100);
    $("before").innerHTML = "Before 2015: " + pre.map((s) => `${s.name} ${s.start.slice(0, 4)}&ndash;${s.end.slice(0, 4)}, ${fmt(s.messages)} messages with ${fmt(s.people)} people`).join(" &middot; ") +
      ".<br>Moves <i>1</i> and <i>2</i> (1998, 1999) came before any of it.";
  }

  // ── the globe ──────────────────────────────────────────────────────────────────────────────────────────
  // Math lifted from wcn-presentcompany viewer/web/world.html: orthographic projection, land drawn per pixel
  // from a flat mask (so no rotation can flood a continent across the front).
  function globe(W0, LAND) {
    const D2R = Math.PI / 180, stage = $("stage"), cv = $("globe"), ctx = cv.getContext("2d");
    const C = W0.countries, N = C.length, SEC = 1.15;
    const rot = { lon: -40, lat: 22 };
    let W = 0, R = 0, CX = 0, CY = 0, dirty = true, drag = null, idle = 0;
    let k = REDUCED ? N : 0, playing = false, target = null;

    function resize() {
      const b = stage.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(b.width * dpr); cv.height = Math.round(b.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      W = b.width; CX = W / 2; CY = b.height / 2; R = W * 0.42; dirty = true;
    }
    function project(lat, lon) {
      const f = lat * D2R, dl = (lon - rot.lon) * D2R, f0 = rot.lat * D2R;
      const x = Math.cos(f) * Math.sin(dl);
      const y = Math.cos(f0) * Math.sin(f) - Math.sin(f0) * Math.cos(f) * Math.cos(dl);
      const z = Math.sin(f0) * Math.sin(f) + Math.cos(f0) * Math.cos(f) * Math.cos(dl);
      return [CX + R * x, CY - R * y, z];
    }
    const MW = 2048, MH = 1024;
    const MASK = (() => {
      const c = document.createElement("canvas"); c.width = MW; c.height = MH;
      const x = c.getContext("2d"); x.fillStyle = "#fff";
      for (const ring of LAND) {
        const pts = []; let prev = null;
        for (let [lon, lat] of ring) { if (prev !== null) { while (lon - prev > 180) lon -= 360; while (lon - prev < -180) lon += 360; } pts.push([lon, lat]); prev = lon; }
        if (Math.abs(pts[pts.length - 1][0] - pts[0][0]) > 180) { const pole = pts.reduce((a, p) => a + p[1], 0) < 0 ? -90 : 90; pts.push([pts[pts.length - 1][0], pole], [pts[0][0], pole]); }
        for (const off of [-360, 0, 360]) { x.beginPath(); pts.forEach(([lon, lat], i) => { const X = (lon + off + 180) / 360 * MW, Y = (90 - lat) / 180 * MH; i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.fill(); }
      }
      const a = x.getImageData(0, 0, MW, MH).data, m = new Uint8Array(MW * MH);
      for (let i = 0; i < m.length; i++) m[i] = a[i * 4 + 3];
      return m;
    })();
    const OFF = document.createElement("canvas"), octx = OFF.getContext("2d");
    function raster() {
      const q = Math.min(window.devicePixelRatio || 1, 1.5), Rp = Math.round(R * q), Sz = 2 * Rp;
      if (OFF.width !== Sz) { OFF.width = Sz; OFF.height = Sz; }
      const img = octx.createImageData(Sz, Sz), px = img.data, f0 = rot.lat * D2R, sf = Math.sin(f0), cf = Math.cos(f0);
      for (let py = 0; py < Sz; py++) {
        const y = (Rp - py - 0.5) / Rp;
        for (let qx = 0; qx < Sz; qx++) {
          const x = (qx + 0.5 - Rp) / Rp, rr = x * x + y * y;
          if (rr > 1) continue;
          const rho = Math.sqrt(rr), cosc = Math.sqrt(1 - rr);
          const lat = Math.asin(cosc * sf + y * cf) / D2R, lon = rot.lon + Math.atan2(x, cosc * cf - y * sf) / D2R;
          const mx = ((Math.floor((lon + 180) / 360 * MW) % MW) + MW) % MW, my = Math.min(MH - 1, Math.max(0, Math.floor((90 - lat) / 180 * MH)));
          const land = MASK[my * MW + mx] / 255, light = 0.7 + 0.3 * Math.max(0, cosc * 0.6 + (-x * 0.35 + y * 0.4)), i = (py * Sz + qx) * 4;
          px[i] = (14 + land * 30) * light; px[i + 1] = (52 + land * 62) * light; px[i + 2] = (56 + land * 52) * light;
          px[i + 3] = 255 * Math.min(1, (1 - rho) * Rp);
        }
      }
      octx.putImageData(img, 0, 0);
      return OFF;
    }
    function draw() {
      ctx.clearRect(0, 0, W, W);
      ctx.drawImage(raster(), CX - R, CY - R, 2 * R, 2 * R);
      ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R, 0, 2 * Math.PI); ctx.clip();
      ctx.globalCompositeOperation = "lighter";                 // the glow: newest brightest, older settle
      for (const d of W0.dots) {
        if (d.a > k) continue;
        const [x, y, z] = project(d.lat, d.lon);
        if (z < 0.05) continue;
        const age = k - d.a, fresh = Math.max(0, 1 - age / 1.5), seat = 1 + 1.2 * fresh, pop = Math.min(1, age / 0.25 + 0.2);
        const r = R * (0.035 + 0.02 * d.s) * (0.6 + 0.4 * pop) * (1 + 0.8 * fresh), gr = ctx.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(245,192,64,${Math.min(0.95, (0.42 + 0.14 * d.s) * seat)})`);
        gr.addColorStop(0.5, `rgba(244,162,97,${Math.min(0.5, 0.2 * seat)})`); gr.addColorStop(1, "rgba(244,162,97,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
      }
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      const front = [];
      C.forEach((c, j) => { if (j > k) return; const p = project(c.lat, c.lon); if (p[2] > 0.08) front.push([p, c, j]); });
      front.sort((a, b) => a[0][2] - b[0][2]);
      ctx.font = `${Math.max(14, R * 0.085)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textBaseline = "bottom";
      for (const [[x, y, z], c, j] of front) {
        const rise = Math.min(1, (k - j) / 0.35), h = R * 0.11 * (0.5 + 0.5 * z) * rise;
        ctx.globalAlpha = 0.4 + 0.6 * Math.min(1, z * 2);
        ctx.strokeStyle = "#f4f4f4"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
        ctx.fillStyle = "#f4f4f4"; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 2 * Math.PI); ctx.fill();
        ctx.fillText(c.flag || "⚑", x + 1, y - h + 4);
      }
      ctx.globalAlpha = 1;
    }

    stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, lon: rot.lon, lat: rot.lat, h: null }; });
    stage.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (drag.h === null && Math.hypot(dx, dy) > 6) drag.h = Math.abs(dx) > Math.abs(dy) || e.pointerType === "mouse";
      if (!drag.h) return;                                       // vertical on a phone: the page scrolls
      rot.lon = drag.lon - dx * 180 / (Math.PI * R);
      if (e.pointerType === "mouse") rot.lat = Math.max(-60, Math.min(70, drag.lat + dy * 180 / (Math.PI * R)));
      idle = performance.now(); target = null; dirty = true;
    });
    const end = () => { drag = null; idle = performance.now(); };
    ["pointerup", "pointercancel", "pointerleave"].forEach((t) => stage.addEventListener(t, end));

    const INKS = ["#f4a261", "#5cc2ff", "#ff8f85", "#c3a6ff", "#8af0b8", "#ffd166"], SH = ["r", "o", "t"];
    const stamps = C.map((c, j) => {
      const s = document.createElement("div");
      s.className = "stamp " + SH[j % 3]; s.style.color = INKS[j % INKS.length];
      s.style.setProperty("--r", `${((j * 29) % 15 - 7) * 1.3}deg`);
      const f = document.createElement("i"), n = document.createElement("b"), no = document.createElement("small");
      f.textContent = c.flag || "◌"; n.textContent = c.name; no.textContent = "No. " + String(j + 1).padStart(2, "0");
      s.append(f, n, no); $("passport").append(s); return s;
    });
    const slider = $("trip"), read = $("readout");
    let shown = -1;
    const aim = (j) => ({ lon: C[j].lon, lat: Math.max(-40, Math.min(55, C[j].lat)) });
    function sync() {
      slider.value = (k / N) * 100;
      const j = Math.min(N - 1, Math.floor(k)), key = k >= N ? N : j;
      stamps.forEach((s, i) => s.classList.toggle("on", i < k));
      if (key !== shown) {
        shown = key;
        read.textContent = k >= N ? `${N} countries. All of them in the order I first went.` : `No. ${String(j + 1).padStart(2, "0")} of ${N} · ${C[j].name}`;
        if (playing) target = aim(j);
      }
      dirty = true;
    }
    slider.addEventListener("input", () => {
      playing = false; k = (slider.value / 100) * N; shown = -1; sync();
      target = aim(Math.min(N - 1, Math.floor(k))); idle = performance.now();
    });
    $("replay").addEventListener("click", () => { k = 0; shown = -1; playing = !REDUCED; if (REDUCED) k = N; sync(); });

    let lastT = 0;
    function tick(t) {
      const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
      if (playing && !drag) { k = Math.min(N, k + dt / SEC); if (k >= N) { playing = false; idle = t; } sync(); }
      if (target && !drag) {
        const dl = ((target.lon - rot.lon + 540) % 360) - 180, df = target.lat - rot.lat;
        rot.lon += dl * Math.min(1, dt * 3); rot.lat += df * Math.min(1, dt * 3); dirty = true;
        if (Math.abs(dl) < 0.05 && Math.abs(df) < 0.05) target = null;
      } else if (!REDUCED && !drag && !playing && t - idle > 2500) { rot.lon += (t - lastT) * 0.004; dirty = true; }
      lastT = t;
      if (dirty) { draw(); dirty = false; }
      requestAnimationFrame(tick);
    }
    window.addEventListener("resize", resize);
    resize(); sync(); requestAnimationFrame(tick);
    if (!REDUCED) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { playing = true; o.disconnect(); } }, { threshold: 0.5 }).observe(stage);

    const s = W0.stats;
    $("gstats").innerHTML = `<div><b>${s.countries}</b><span>countries</span></div><div><b>${s.places}</b><span>places</span></div>` +
      `<div><b>${fmt(s.apart_km)} km</b><span>farthest apart</span></div>`;
  }

  const get = (f) => fetch(f).then((r) => { if (!r.ok) throw new Error(f + " " + r.status); return r.json(); });
  Promise.all([get("data.json"), get("world.json"), get("land.json")]).then(([D, world, land]) => {
    intro(D, world); weave(D); globe(world, land);
  }).catch((e) => { $("pick").textContent = "The charts didn't load (" + e.message + ")."; });
})();
