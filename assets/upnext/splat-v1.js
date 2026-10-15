/* splat-v1.js — Splat (copied from wcn-pressroom/src/assets/js/splat-v1.js for /upnext/). Same drawing as the office TV, the Note to Self
   overlay and the Reels (the Coach's splat). Any <svg data-splat viewBox="-50 -50 100 100">
   gets an animated Splat: breathing, blinking, a slow turn. Static marks use
   <svg><use href="#splat"/></svg> against the <defs> this file injects.
   Versioned filename: /assets/ is cached immutable for a year (see ops/build.py). */
(function () {
  const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <path id="splat" d="M23.89 6.33 11.62 7.17H10.19L11.04 8.6Q12.46 11.39 13.37 12.43Q13.44 12.95 13.67 14.18Q13.89 15.42 14.02 16.26Q14.15 17.11 14.22 17.11V17.04Q18.83 21.39 18.83 31.13Q15 31.52 13.5 32.49Q12.01 33.47 11.04 33.47Q6.69 33.47 0.19 16Q0.06 17.04 -0.36 19.35Q-0.78 21.65 -0.97 23.08Q-1.69 24.44 -2.92 28.79Q-4.15 33.14 -6.88 37.49Q-9.87 32.75 -10.13 32.82Q-10.71 32.95 -11.49 31.78L-12.4 32.17L-13.24 32.04L-17.92 34.44Q-15.65 23.73 -12.98 20.03Q-13.11 19.57 -13.11 19.12L-11.82 17.69Q-11.62 12.5 -9.41 6.98Q-11.3 7.17 -13.89 7.17Q-16.49 7.17 -28.43 6.65L-28.3 4.12L-31.29 1.92L-29.15 -0.42V-1.46Q-29.86 -1.79 -29.86 -2.24L-29.73 -3.6L-30.45 -8.99Q-29.02 -8.8 -24.21 -8.08Q-15.13 -6.72 -11.75 -6.72H-11.1Q-12.2 -9.12 -14.61 -16.33V-16.13Q-16.68 -22.3 -18.37 -25.22V-29.96L-14.87 -31.58L-14.61 -32.88Q-12.4 -33.6 -9.54 -36.32L-5.91 -29.57Q-1.36 -21.07 -0.06 -16.52L7.53 -31.58Q7.47 -31.97 7.47 -33.01Q7.47 -34.05 7.73 -34.57L7.86 -40.35L10.13 -38.79L12.79 -42.1V-37.23L13.89 -36.32Q14.93 -35.41 15.71 -35.02Q16.04 -35.02 17.79 -35.22L18.5 -27.43Q14.22 -18.47 14.22 -13.67L10.19 -6.91Q14.74 -6.91 17.46 -8.08Q21.81 -6.85 23.63 -6.98Q26.68 -7.17 33.69 -3.93L29.21 -1.46L28.56 0.36L29.99 1.92L27.85 6.78Z"/>
    <clipPath id="w0"><polygon points="0,0 -171.1,-103.6 -139.4,-143.5 -98.5,-174.0 -51.3,-193.3 -0.8,-200.0"/></clipPath>
    <clipPath id="w1"><polygon points="0,0 -0.8,-200.0 47.7,-194.2 93.3,-176.9 133.4,-149.0 165.5,-112.3"/></clipPath>
    <clipPath id="w2"><polygon points="0,0 165.5,-112.3 191.4,-57.9 200.0,1.7 190.4,61.2 163.6,115.1"/></clipPath>
    <clipPath id="w3"><polygon points="0,0 163.6,115.1 132.1,150.2 93.2,176.9 49.2,193.9 2.4,200.0"/></clipPath>
    <clipPath id="w4"><polygon points="0,0 2.4,200.0 -44.4,195.0 -88.8,179.2 -128.3,153.4 -160.7,119.1"/></clipPath>
    <clipPath id="w5"><polygon points="0,0 -160.7,119.1 -188.4,67.1 -199.8,9.4 -193.8,-49.2 -171.1,-103.6"/></clipPath>
  </defs></svg>`;
  document.body.insertAdjacentHTML('afterbegin', DEFS);

  const lerp = (a, b, k) => a + (b - a) * k;
  // Builds one Splat into an <svg viewBox="-50 -50 100 100">; returns draw(pose).
  // pose: { t (s), open 0..1, yawn 0..1, bloom 0..1, lookX, lookY, rot (deg) }
  window.makeSplat = function (svg) {
    svg.innerHTML = `
      <g class="sp-body" fill="#E76F51"><circle r="7.03"/>
        ${[0, 1, 2, 3, 4, 5].map(i => `<g class="sp-arm"><use href="#splat" clip-path="url(#w${i})"/></g>`).join('')}</g>
      <g class="sp-face">
        <g class="sp-eyes"><ellipse cx="-3" cy="0.2" rx="1.05" ry="1.5" fill="#000"/><ellipse cx="3" cy="0.2" rx="1.05" ry="1.5" fill="#000"/></g>
        <g class="sp-half"><path fill="#E76F51"/><path fill="#E76F51"/>
          <path fill="none" stroke="#000" stroke-width="0.6" stroke-linecap="round"/><path fill="none" stroke="#000" stroke-width="0.6" stroke-linecap="round"/></g>
        <path class="sp-lids" d="M-4.6 0.6q1.6 1.5 3.2 0M1.4 0.6q1.6 1.5 3.2 0" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round" opacity="0"/>
        <ellipse class="sp-mouth" cx="0" cy="4.1" rx="0" ry="0" fill="#000"/>
      </g>`;
    const q = s => svg.querySelector(s), qa = s => [...svg.querySelectorAll(s)];
    const body = q('.sp-body'), arms = qa('.sp-arm'), face = q('.sp-face'), eyes = qa('.sp-eyes ellipse');
    const eyesG = q('.sp-eyes'), half = q('.sp-half'), hp = qa('.sp-half path'), lids = q('.sp-lids'), mouth = q('.sp-mouth');
    function halfLid(cx, o) {
      const top = -1.4, y = (top + (1 - o) * 3.2).toFixed(2), yb = (top + (1 - o) * 3.2 + 0.45).toFixed(2);
      return [`M${cx - 1.6} ${top - 1}H${cx + 1.6}V${y}Q${cx} ${yb} ${cx - 1.6} ${y}Z`, `M${cx - 1.25} ${y}Q${cx} ${yb} ${cx + 1.25} ${y}`];
    }
    return function draw(p) {
      body.setAttribute('transform', `rotate(${((12 + p.t * 1.2) % 360).toFixed(2)})`);
      arms.forEach((g, i) => g.setAttribute('transform',
        `scale(${(1 + 0.025 * Math.sin(2 * Math.PI * (p.t - i * 0.09) / 3) + 0.07 * (p.yawn || 0) + 0.12 * (p.bloom || 0)).toFixed(4)})`));
      face.setAttribute('transform', `rotate(${-(p.rot || 0)}) scale(1.3)`);
      const awake = p.open > 0.06;
      eyesG.setAttribute('opacity', awake ? 1 : 0);
      half.setAttribute('opacity', awake && p.open < 0.98 ? 1 : 0);
      [[0, 2, -3], [1, 3, 3]].forEach(([f, l, cx]) => { const [a, b] = halfLid(cx, p.open); hp[f].setAttribute('d', a); hp[l].setAttribute('d', b); });
      lids.setAttribute('opacity', awake ? 0 : 1);
      eyes.forEach((e, i) => { e.setAttribute('cx', ((i ? 3 : -3) + (p.lookX || 0)).toFixed(2)); e.setAttribute('cy', (0.2 + (p.lookY || 0)).toFixed(2)); });
      mouth.setAttribute('rx', (1.3 * (p.yawn || 0)).toFixed(2)); mouth.setAttribute('ry', (2.0 * (p.yawn || 0)).toFixed(2));
    };
  };

  // Deterministic blinks (a pure function of t, so the bumper renders identically every time):
  // a blink roughly every 3-7 s, sometimes a double.
  window.blinkAt = function (t, seed = 1) {
    let o = 1, k = 0, at = 1.2;
    const rnd = i => { const x = Math.sin((i + 1) * 12.9898 * seed) * 43758.5453; return x - Math.floor(x); };
    while (at < t + 1) {
      for (const b of rnd(k) < 0.2 ? [at, at + 0.32] : [at]) { const d = Math.abs(t - b); if (d < 0.09) o *= d / 0.09; }
      at += 3 + rnd(k + 100) * 4; k++;
    }
    return o;
  };
  window.lerp = lerp;
})();

(function () {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const all = [...document.querySelectorAll('svg[data-splat]')].map((svg, i) => ({ draw: makeSplat(svg), seed: 1.3 + i }));
  const t0 = performance.now();
  (function frame() {
    const t = still ? 0 : (performance.now() - t0) / 1000;
    all.forEach(s => s.draw({ t, open: still ? 1 : blinkAt(t, s.seed), rot: 0, lookX: 0, lookY: 0 }));
    if (!still) requestAnimationFrame(frame);
  })();
})();
