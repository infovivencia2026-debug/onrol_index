// Animated screen art. Each level has its own layout and motif, drawn on a 1024×600 canvas.
// draw(t) is called only while the screen is near the camera, so idle screens cost nothing.

export const SCREEN_W = 1024, SCREEN_H = 600;

const FONT_UI = '"Plus Jakarta Sans", system-ui, sans-serif';
const FONT_MONO = '"JetBrains Mono", monospace';

function palette(accent, light, frosted) {
  // frosted: the 3D glass behind the card does the blurring, so the painted panel is only a light tint
  const panel = light ? (frosted ? 'rgba(250,246,241,.72)' : 'rgba(250,246,241,.97)') : (frosted ? 'rgba(6,4,3,.42)' : 'rgba(6,4,3,.94)');
  return light
    ? { dark:false, panel, grid:'rgba(0,0,0,.06)', word:'#120a05', tag:'rgba(40,25,15,.9)', dim:'rgba(40,25,15,.62)', accent }
    : { dark:true, panel,      grid:'rgba(255,255,255,.035)', word:'#ece3da', tag:'rgba(236,227,218,.62)', dim:'rgba(236,227,218,.35)', accent };
}
const alpha = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
};
// deterministic pseudo-random so motifs don't change between redraws
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

function frame(g, P, kicker, index) {
  g.clearRect(0, 0, SCREEN_W, SCREEN_H);
  g.fillStyle = P.panel; g.fillRect(14, 14, 996, 572);
  g.fillStyle = P.grid; for (let y = 14; y < 586; y += 6) g.fillRect(14, y, 996, 1);
  g.strokeStyle = alpha(P.accent, .75); g.lineWidth = 2; g.strokeRect(14, 14, 996, 572);
  g.fillStyle = P.accent;
  [[14,14],[1010,14],[14,586],[1010,586]].forEach(([x,y]) => g.fillRect(x-5, y-5, 10, 10));
  g.font = `700 20px ${FONT_MONO}`; g.textBaseline = 'alphabetic';
  g.textAlign = 'left'; g.fillStyle = P.accent; g.fillText(kicker, 52, 70);
  if (index) { g.textAlign = 'right'; g.fillStyle = P.dim; g.fillText(index, 972, 70); }
}
function word(g, P, text, x, y, maxW, align = 'left', size = 168, color) {
  g.textAlign = align; g.textBaseline = 'alphabetic';
  do { g.font = `800 ${size}px ${FONT_UI}`; size -= 4; } while (g.measureText(text).width > maxW && size > 50);
  g.fillStyle = color || P.word; g.fillText(text, x, y);
}
function tagline(g, P, text, x, y, align = 'left') {
  g.textAlign = align; g.font = `600 30px ${FONT_UI}`; g.fillStyle = P.tag; g.fillText(text, x, y);
  g.fillStyle = P.accent;
  const w = 64; g.fillRect(align === 'left' ? x : align === 'right' ? x - w : x - w/2, y - 54, w, 3);
}

// ---------- motifs ----------
function rings(g, P, t, cx, cy) {
  for (let i = 0; i < 4; i++) {
    const r = 120 + i * 46, a0 = t * (0.4 + i * 0.15) * (i % 2 ? -1 : 1);
    g.strokeStyle = alpha(P.accent, .5 - i * .1); g.lineWidth = 3 - i * .5;
    g.beginPath(); g.arc(cx, cy, r, a0, a0 + Math.PI * (1.1 - i * .15)); g.stroke();
  }
  const sy = 120 + ((t * 120) % 360);                       // scan line
  g.fillStyle = alpha(P.accent, .12); g.fillRect(14, sy, 996, 2);
}

const NET = (() => {
  const r = rng(7), layers = [3, 5, 5, 2], nodes = [];
  layers.forEach((n, li) => { for (let i = 0; i < n; i++) nodes.push({ x: 600 + li * 115, y: 150 + (i + .5) * (330 / n) + (r() - .5) * 18, l: li }); });
  const edges = [];
  nodes.forEach((a, i) => nodes.forEach((b, j) => { if (b.l === a.l + 1 && r() < .7) edges.push([i, j, r()]); }));
  return { nodes, edges };
})();
function neural(g, P, t) {
  const { nodes, edges } = NET;
  edges.forEach(([i, j, ph]) => {
    const a = nodes[i], b = nodes[j];
    // links stay clearly visible and brighten as a signal passes through them
    const live = .5 + .5 * Math.sin(t * 1.6 + ph * 6.28);
    g.strokeStyle = alpha(P.accent, .38 + .32 * live); g.lineWidth = 2 + live;
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  });
  edges.forEach(([i, j, ph]) => {                             // signals travelling along links
    const a = nodes[i], b = nodes[j], k = (t * .7 + ph) % 1;
    g.fillStyle = alpha(P.accent, .9);
    g.beginPath(); g.arc(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, 3.5, 0, 7); g.fill();
  });
  nodes.forEach((n, i) => {
    const pulse = .55 + .45 * Math.sin(t * 2 + i);
    g.fillStyle = P.panel; g.strokeStyle = alpha(P.accent, .5 + .5 * pulse); g.lineWidth = 2.5;
    g.beginPath(); g.arc(n.x, n.y, 11, 0, 7); g.fill(); g.stroke();
  });
}

const CODE = ['model = load("llm")', 'app.route("/ask", model)', 'app.ui(chat())', 'tests.run()   ✓ 12 passed', 'git push  →  build ✓'];
function blueprint(g, P, t) {
  g.strokeStyle = alpha(P.accent, .12); g.lineWidth = 1;
  for (let x = 52; x <= 500; x += 32) { g.beginPath(); g.moveTo(x, 110); g.lineTo(x, 540); g.stroke(); }
  for (let y = 110; y <= 540; y += 32) { g.beginPath(); g.moveTo(52, y); g.lineTo(500, y); g.stroke(); }
  // a wireframe "component" box being assembled
  const s = Math.min(1, (t % 6) / 2.5);
  g.strokeStyle = alpha(P.accent, .8); g.lineWidth = 2;
  g.strokeRect(84, 140, 160 * s, 96); g.strokeRect(276, 140, 190 * Math.max(0, s * 1.4 - .4), 96);
  // typing code
  const chars = Math.floor((t % 8) * 22);
  g.font = `500 21px ${FONT_MONO}`; g.textAlign = 'left';
  let left = chars;
  CODE.forEach((line, i) => {
    const shown = line.slice(0, Math.max(0, left)); left -= line.length;
    g.fillStyle = i === 4 && shown.length === line.length ? P.accent : P.tag;
    g.fillText(shown, 84, 300 + i * 46);
    if (left < 0 && left > -line.length - 1 && Math.floor(t * 2) % 2) { g.fillStyle = P.accent; g.fillRect(84 + g.measureText(shown).width + 3, 282 + i * 46, 11, 22); }
  });
}

function globe(g, P, t, cx, cy, R) {
  g.strokeStyle = alpha(P.accent, .35); g.lineWidth = 1.5;
  g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
  for (let i = -2; i <= 2; i++) {                            // latitude
    const y = cy + i * R * .33, rr = Math.sqrt(R * R - (i * R * .33) ** 2);
    g.beginPath(); g.ellipse(cx, y, rr, rr * .18, 0, 0, 7); g.stroke();
  }
  for (let i = 0; i < 6; i++) {                              // rotating longitude
    const a = (t * .35 + i / 6 * Math.PI) % Math.PI, w = Math.abs(Math.cos(a)) * R;
    g.beginPath(); g.ellipse(cx, cy, w, R, 0, 0, 7); g.stroke();
  }
  // launch arc + craft
  const k = (t % 4) / 4, x0 = cx - R * .55, y0 = cy + R * .55, x1 = cx + R * 1.05, y1 = cy - R * 1.05;
  const qx = cx - R * .2, qy = cy - R * 1.2;
  g.strokeStyle = alpha(P.accent, .9); g.lineWidth = 2.5; g.setLineDash([8, 8]);
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(qx, qy, x1, y1); g.stroke(); g.setLineDash([]);
  const bx = (1-k)**2 * x0 + 2*(1-k)*k*qx + k*k*x1, by = (1-k)**2 * y0 + 2*(1-k)*k*qy + k*k*y1;
  g.fillStyle = P.accent; g.beginPath(); g.arc(bx, by, 7, 0, 7); g.fill();
  g.fillStyle = alpha(P.accent, .25); g.beginPath(); g.arc(bx, by, 18, 0, 7); g.fill();
  g.fillStyle = P.accent; g.beginPath(); g.arc(x0, y0, 6, 0, 7); g.fill();
}

const SERIES = (() => { const r = rng(21), pts = []; let v = .15; for (let i = 0; i < 28; i++) { v += .03 + (r() - .35) * .06; pts.push(Math.min(.95, v)); } return pts; })();
function chart(g, P, t) {
  const x0 = 540, x1 = 970, y0 = 520, y1 = 130;
  g.strokeStyle = alpha(P.accent, .15); g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const y = y0 - (y0 - y1) * i / 4; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
  const n = Math.max(2, Math.floor(((t % 6) / 4) * SERIES.length));
  const shown = SERIES.slice(0, Math.min(n, SERIES.length));
  const X = (i) => x0 + (x1 - x0) * i / (SERIES.length - 1), Y = (v) => y0 - (y0 - y1) * v;
  // bars underneath
  shown.forEach((v, i) => { g.fillStyle = alpha(P.accent, .14); g.fillRect(X(i) - 5, Y(v), 10, y0 - Y(v)); });
  g.strokeStyle = P.accent; g.lineWidth = 3.5; g.beginPath();
  shown.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke();
  const last = shown.length - 1;
  g.fillStyle = P.accent; g.beginPath(); g.arc(X(last), Y(shown[last]), 7, 0, 7); g.fill();
  g.font = `700 22px ${FONT_MONO}`; g.textAlign = 'right'; g.fillText('▲ ' + Math.round(shown[last] * 100) + '%', x1, y1 - 18);
}

function cta(g, P, t) {
  const p = .5 + .5 * Math.sin(t * 2.4);
  for (let i = 0; i < 3; i++) {
    const r = 210 + i * 40 + p * 16;
    g.strokeStyle = alpha(P.accent, .35 - i * .1); g.lineWidth = 2;
    g.beginPath(); g.ellipse(512, 300, r * 1.9, r * .9, 0, 0, 7); g.stroke();
  }
  g.fillStyle = P.accent; g.beginPath();
  g.roundRect ? g.roundRect(372, 400, 280, 66, 33) : g.rect(372, 400, 280, 66); g.fill();
  g.fillStyle = P.dark ? '#0b0604' : '#fff';
  g.font = `800 28px ${FONT_UI}`; g.textAlign = 'center'; g.fillText('Apply now  ↗', 512, 444);
}

// ---------- the six screens ----------
export const SCREENS = {
  intro:  { kicker:'AI EXECUTION SCHOOL', index:'00 / 04', draw(g, P, t) { frame(g, P, this.kicker, this.index); rings(g, P, t, 512, 300); word(g, P, 'ONROL', 512, 330, 760, 'center', 190); g.textAlign='center'; g.font=`600 30px ${FONT_UI}`; g.fillStyle=P.tag; g.fillText('Build your first AI product in 21 days', 512, 430); } },
  learn:  { kicker:'STEP 01 · LEARN', index:'01 / 04', draw(g, P, t) { frame(g, P, this.kicker, this.index); neural(g, P, t); word(g, P, 'LEARN', 52, 330, 500); tagline(g, P, 'Learn the AI tools', 52, 420); g.font=`500 20px ${FONT_MONO}`; g.fillStyle=P.dim; g.fillText('Live · mentor-led · 1 hr a day', 52, 520); } },
  build:  { kicker:'STEP 02 · BUILD', index:'02 / 04', draw(g, P, t) { frame(g, P, this.kicker, this.index); blueprint(g, P, t); word(g, P, 'BUILD', 972, 330, 440, 'right'); tagline(g, P, 'Build real projects', 972, 420, 'right'); g.font=`500 20px ${FONT_MONO}`; g.fillStyle=P.dim; g.textAlign='right'; g.fillText('7+ projects · 5 AI systems', 972, 520); } },
  launch: { kicker:'STEP 03 · LAUNCH', index:'03 / 04', draw(g, P, t) { frame(g, P, this.kicker, this.index); globe(g, P, t, 760, 320, 170); word(g, P, 'LAUNCH', 52, 330, 480); tagline(g, P, 'Launch to the web', 52, 420); g.font=`500 20px ${FONT_MONO}`; g.fillStyle=P.dim; g.fillText('Live links · shareable portfolio', 52, 520); } },
  earn:   { kicker:'STEP 04 · EARN', index:'04 / 04', draw(g, P, t) { frame(g, P, this.kicker, this.index); chart(g, P, t); word(g, P, 'EARN', 52, 330, 440); tagline(g, P, 'Earn from the skill', 52, 420); g.font=`500 20px ${FONT_MONO}`; g.fillStyle=P.dim; g.fillText('Freelance · roles · your own product', 52, 520); } },
  apply:  { kicker:'NO PAYMENT TO APPLY', index:'', draw(g, P, t) { frame(g, P, this.kicker, this.index); cta(g, P, t); word(g, P, 'START HERE', 512, 300, 820, 'center', 150); g.textAlign='center'; g.font=`600 28px ${FONT_UI}`; g.fillStyle=P.tag; g.fillText('Your first AI product, 21 days from now', 512, 360); } },
};

export function createArt(key, accentHex, light, frosted = false) {
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_W; canvas.height = SCREEN_H;
  const g = canvas.getContext('2d');
  const art = { canvas, accent: accentHex, light, key, frosted };
  art.draw = (t) => SCREENS[key].draw(g, palette(art.accent, art.light, art.frosted), t);
  art.draw(0);
  return art;
}

// ---------- home posters (USPs) ----------
export const POSTER_W = 512, POSTER_H = 768;
export const USPS = [
  { n: '01', big: 'LIVE',     sub: ['Mentors in the room,', 'not recordings'] },
  { n: '02', big: '1 HR',     unit: '/ DAY', sub: ['Fits around work', 'or college'] },
  { n: '03', big: '70%',      sub: ['Hands-on', 'build time'] },
  { n: '04', big: 'SHIP',     unit: 'WEEKLY', sub: ['Deployed work,', 'live links'] },
];
export function createPoster(usp, accentHex, light) {
  const canvas = document.createElement('canvas');
  canvas.width = POSTER_W; canvas.height = POSTER_H;
  const g = canvas.getContext('2d');
  const poster = { canvas, accent: accentHex, light, usp };
  poster.draw = (t) => {
    const usp = poster.usp;
    const P = palette(poster.accent, poster.light, false);
    g.clearRect(0, 0, POSTER_W, POSTER_H);
    g.fillStyle = P.panel; g.fillRect(10, 10, POSTER_W - 20, POSTER_H - 20);
    g.fillStyle = P.grid; for (let y = 10; y < POSTER_H - 10; y += 6) g.fillRect(10, y, POSTER_W - 20, 1);
    g.strokeStyle = alpha(P.accent, .8); g.lineWidth = 2; g.strokeRect(10, 10, POSTER_W - 20, POSTER_H - 20);
    g.fillStyle = P.accent; [[10,10],[POSTER_W-10,10],[10,POSTER_H-10],[POSTER_W-10,POSTER_H-10]].forEach(([x,y]) => g.fillRect(x-5, y-5, 10, 10));
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = `700 20px ${FONT_MONO}`; g.fillStyle = P.accent; g.fillText('WHY ONROL', 44, 70);
    g.textAlign = 'right'; g.fillStyle = P.dim; g.fillText(usp.n + ' / 04', POSTER_W - 44, 70);
    // slow orbit motif
    const cx = POSTER_W / 2, cy = 250;
    for (let i = 0; i < 3; i++) {
      const r = 70 + i * 34, a0 = t * (.5 + i * .2) * (i % 2 ? -1 : 1);
      g.strokeStyle = alpha(P.accent, .45 - i * .12); g.lineWidth = 2;
      g.beginPath(); g.arc(cx, cy, r, a0, a0 + Math.PI * 1.2); g.stroke();
    }
    g.fillStyle = P.accent; g.beginPath(); g.arc(cx + Math.cos(t * .8) * 104, cy + Math.sin(t * .8) * 104, 6, 0, 7); g.fill();
    // stat
    g.textAlign = 'left';
    let size = 150; do { g.font = `800 ${size}px ${FONT_UI}`; size -= 4; } while (g.measureText(usp.big).width > POSTER_W - 88 && size > 40);
    g.fillStyle = P.word; g.fillText(usp.big, 44, 530);
    if (usp.unit) { g.font = `800 40px ${FONT_UI}`; g.fillStyle = P.accent; g.fillText(usp.unit, 46, 580); }
    g.fillStyle = P.accent; g.fillRect(44, usp.unit ? 604 : 566, 56, 3);
    g.font = `600 30px ${FONT_UI}`; g.fillStyle = P.tag;
    usp.sub.forEach((line, i) => g.fillText(line, 44, (usp.unit ? 650 : 612) + i * 40));
  };
  poster.draw(0);
  return poster;
}
