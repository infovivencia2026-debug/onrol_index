// Animated screen art. Each level has its own layout and motif, drawn on a 1024×600 canvas.
// draw(t) is called only while the screen is near the camera, so idle screens cost nothing.

export const SCREEN_W = 1024, SCREEN_H = 600;

const FONT_UI = '"IBM Plex Sans", system-ui, sans-serif';
const FONT_MONO = '"IBM Plex Mono", ui-monospace, monospace';

function palette(accent, light, frosted) {
  // frosted: the 3D glass behind the card does the blurring, so the painted panel is only a light tint
  const panel = light ? (frosted ? 'rgba(250,250,248,.72)' : 'rgba(250,250,248,.97)') : (frosted ? 'rgba(16,18,26,.72)' : 'rgb(16,18,26)');
  return light
    ? { dark:false, panel, grid:'rgba(0,0,0,.06)', word:'#111214', tag:'rgba(17,18,20,.9)', dim:'rgba(17,18,20,.62)', accent }
    : { dark:true, panel,      grid:'rgba(255,255,255,.035)', word:'#f2f3f5', tag:'rgba(242,243,245,.92)', dim:'rgba(242,243,245,.72)', accent };
}
const alpha = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
};
// deterministic pseudo-random so motifs don't change between redraws
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

function hud(g, P, w, h, t, bottom = true) {
  const f = P.dark ? 'rgba(232,234,237,' : 'rgba(17,17,17,';
  const code = 'ONR-' + String((w * 7 + h) % 97).padStart(2, '0');
  if (bottom) {
  // code label bottom-right
  g.textAlign = 'right'; g.font = `500 ${Math.max(11, w * .014)}px ${FONT_MONO}`; g.fillStyle = f + '.55)';
  g.fillText('CODE', w - 34, h - 58); g.font = `700 ${Math.max(16, w * .024)}px ${FONT_MONO}`; g.fillStyle = f + '.85)'; g.fillText(code, w - 34, h - 32);
  // barcode bottom-left
  let bx = 34; for (let i = 0; i < 26; i++) { const bw = (i * 37 % 5 === 0) ? 4 : (i % 3 ? 1.5 : 2.5); g.fillStyle = f + '.7)'; g.fillRect(bx, h - 52, bw, 26); bx += bw + 2.5; }
  // pixel cluster
  for (let i = 0; i < 9; i++) if ((i * 5) % 4) { g.fillStyle = i === 4 ? P.accent : f + '.6)'; g.fillRect(bx + 18 + (i % 3) * 9, h - 52 + Math.floor(i / 3) * 9, 6, 6); }
  }
  // expand glyph (⤡) at a chamfered corner
  g.strokeStyle = f + '.7)'; g.lineWidth = 2; const ex = w - 40, ey = 34;
  g.beginPath(); g.moveTo(ex - 8, ey - 8); g.lineTo(ex + 8, ey + 8); g.moveTo(ex - 8, ey - 8); g.lineTo(ex - 8, ey - 1); g.moveTo(ex - 8, ey - 8); g.lineTo(ex - 1, ey - 8);
  g.moveTo(ex + 8, ey + 8); g.lineTo(ex + 8, ey + 1); g.moveTo(ex + 8, ey + 8); g.lineTo(ex + 1, ey + 8); g.stroke();
  // circuit trace along the left edge with a red node
  g.strokeStyle = f + '.3)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(14, h * .3); g.lineTo(24, h * .34); g.lineTo(24, h * .58); g.lineTo(14, h * .62); g.stroke();
  g.fillStyle = P.accent; g.fillRect(21, h * .34 + 0.5 * h * .24, 6, 6);
}
function rounded(g, x, y, w, h, r) {
  // reference vibe: hard chamfered (cut) corners instead of round ones
  const c = Math.max(10, Math.min(w, h) * .09);
  g.beginPath(); g.moveTo(x + c, y); g.lineTo(x + w - c * .4, y); g.lineTo(x + w, y + c * .4); g.lineTo(x + w, y + h - c);
  g.lineTo(x + w - c, y + h); g.lineTo(x + c * .4, y + h); g.lineTo(x, y + h - c * .4); g.lineTo(x, y + c); g.closePath();
}
function frame(g, P, kicker, index) {
  g.clearRect(0, 0, SCREEN_W, SCREEN_H);
  // modern glass card: rounded, soft gradient, hairline border, small accent dot
  rounded(g, 14, 14, 996, 572, 6);
  const bg = g.createLinearGradient(0, 14, 0, 586);
  bg.addColorStop(0, P.panel); bg.addColorStop(1, P.dark ? 'rgb(10,11,16)' : 'rgb(255,255,255)');
  g.fillStyle = bg; g.fill();
  g.strokeStyle = P.dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.1)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = P.accent; g.fillRect(52, 46, g.measureText ? 14 : 14, 24);
  g.font = `500 17px ${FONT_MONO}`; g.textBaseline = 'alphabetic';
  g.textAlign = 'left'; g.fillStyle = P.tag; g.fillText(kicker, 80, 70);
  if (index) { g.textAlign = 'right'; g.fillStyle = P.dim; g.fillText(index, 972, 70); }
}
function word(g, P, text, x, y, maxW, align = 'left', size = 168, color) {
  size = Math.round(size * .5); maxW *= .7;   // calmer headline scale inside cards
  g.textAlign = align; g.textBaseline = 'alphabetic';
  do { g.font = `600 ${size}px ${FONT_UI}`; size -= 4; } while (g.measureText(text).width > maxW && size > 50);
  g.fillStyle = color || P.word; g.fillText(text, x, y);
}
function tagline(g, P, text, x, y, align = 'left') {
  g.textAlign = align; g.font = `500 27px ${FONT_UI}`; g.fillStyle = P.tag; g.fillText(text, x, y);
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

  // typing code
  const chars = Math.floor((t % 8) * 22);
  g.font = `500 20px ${FONT_MONO}`; g.textAlign = 'left';
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
  g.font = `600 25px ${FONT_UI}`; g.textAlign = 'center'; g.fillText('Apply now  ↗', 512, 444);
}

// ---------- intro card as a video player ----------
function videoCard(g, P, t, art) {
  const v = art.video, x = 14, y = 14, w = 996, h = 572;
  g.clearRect(0, 0, SCREEN_W, SCREEN_H);
  // cover-fit the video into the frame
  const vr = v.videoWidth / v.videoHeight, fr = w / h;
  let sw = v.videoWidth, sh = v.videoHeight, sx = 0, sy = 0;
  if (vr > fr) { sw = sh * fr; sx = (v.videoWidth - sw) / 2; } else { sh = sw / fr; sy = (v.videoHeight - sh) / 2; }
  g.drawImage(v, sx, sy, sw, sh, x, y, w, h);
  // bottom caption strip
  const grd = g.createLinearGradient(0, y + h - 150, 0, y + h);
  grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.78)');
  g.fillStyle = grd; g.fillRect(x, y + h - 150, w, 150);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = `600 39px ${FONT_UI}`; g.fillStyle = '#f2f3f5'; g.fillText('About ONROL', 52, y + h - 46);
  g.font = `500 17px ${FONT_MONO}`; g.fillStyle = P.accent; g.fillText('AI EXECUTION SCHOOL · HYDERABAD', 52, y + h - 18);
  // progress bar
  const p = v.duration ? v.currentTime / v.duration : 0;
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, y + h - 4, w, 4);
  g.fillStyle = P.accent; g.fillRect(x, y + h - 4, w * p, 4);
  // sound chip (top-right)
  const label = v.muted ? 'SOUND OFF' : (v.paused ? 'PLAY' : 'SOUND ON');
  g.font = `500 17px ${FONT_MONO}`; const cw = g.measureText(label).width + 36;
  const pulse = v.muted ? .55 + .45 * Math.sin(t * 3) : 1;
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(SCREEN_W - 52 - cw, 40, cw, 44);
  g.strokeStyle = alpha(P.accent, pulse); g.lineWidth = 2; g.strokeRect(SCREEN_W - 52 - cw, 40, cw, 44);
  g.fillStyle = '#f2f3f5'; g.textAlign = 'left'; g.fillText(label, SCREEN_W - 52 - cw + 18, 69);
  // frame
  g.strokeStyle = alpha(P.accent, .9); g.lineWidth = 3; g.strokeRect(x, y, w, h);
  g.fillStyle = P.accent; [[14,14],[1010,14],[14,586],[1010,586]].forEach(([cx, cy]) => g.fillRect(cx - 5, cy - 5, 10, 10));
}

// ---------- the six screens ----------
// ---------- unique card formats: each level is a different kind of object ----------
function pill(g, x, y, w, h, fill, stroke) { rounded(g, x, y, w, h, h / 2); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } }
function windowChrome(g, P, title, light) {
  rounded(g, 14, 14, 996, 572, 22);
  g.fillStyle = light ? '#f4f5f7' : '#0e1016'; g.fill();
  g.strokeStyle = P.dark ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.12)'; g.lineWidth = 2; g.stroke();
  g.save(); rounded(g, 14, 14, 996, 64, 22); g.clip();
  g.fillStyle = light ? '#e7e9ed' : '#171a22'; g.fillRect(14, 14, 996, 64); g.restore();
  g.fillStyle = light ? '#e7e9ed' : '#171a22'; g.fillRect(14, 56, 996, 22);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(52 + i * 30, 46, 9, 0, 7); g.fill(); });
  g.font = `500 19px ${FONT_MONO}`; g.textAlign = 'left'; g.fillStyle = light ? '#555' : '#9aa1ad'; g.fillText(title, 160, 53);
}

// LEARN — a live class sheet: tools tick off one by one, mentor note
function learnCard(g, P, t) {
  g.clearRect(0, 0, SCREEN_W, SCREEN_H);
  rounded(g, 14, 14, 996, 572, 30); g.fillStyle = P.dark ? '#0d1a19' : '#eefaf8'; g.fill();
  g.strokeStyle = alpha(P.accent, .55); g.lineWidth = 2; g.stroke();
  // accent band
  g.save(); rounded(g, 14, 14, 996, 572, 30); g.clip(); g.fillStyle = alpha(P.accent, .16); g.fillRect(14, 14, 340, 572); g.restore();
  g.fillStyle = P.accent; g.beginPath(); g.arc(56, 62, 8 + Math.sin(t * 4) * 1.5, 0, 7); g.fill();
  g.font = `600 17px ${FONT_UI}`; g.textAlign = 'left'; g.fillStyle = P.accent; g.fillText('LIVE · DAY 03', 76, 69);
  word(g, P, 'LEARN', 48, 220, 280, 'left', 110);
  g.font = `500 23px ${FONT_UI}`; g.fillStyle = P.tag; g.fillText('the AI tools,', 50, 272); g.fillText('in a live room', 50, 306);
  // mentor bubble
  rounded(g, 46, 420, 270, 116, 18); g.fillStyle = P.dark ? 'rgba(255,255,255,.06)' : '#fff'; g.fill();
  g.fillStyle = P.accent; g.beginPath(); g.arc(78, 452, 16, 0, 7); g.fill();
  g.font = `600 15px ${FONT_UI}`; g.fillStyle = P.dark ? '#0d1a19' : '#fff'; g.textAlign = 'center'; g.fillText('M', 78, 458);
  g.textAlign = 'left'; g.font = `600 16px ${FONT_UI}`; g.fillStyle = P.word; g.fillText('Mentor', 104, 458);
  g.font = `500 15px ${FONT_UI}`; g.fillStyle = P.tag; g.fillText('Try it in two tools', 62, 494); g.fillText('and compare.', 62, 518);
  // checklist
  const tools = [['ChatGPT', 'drafting & reasoning'], ['Gemini', 'across Google tools'], ['Claude', 'long documents'], ['Perplexity', 'research with sources'], ['NotebookLM', 'study your notes']];
  const done = Math.floor((t % 7) / 1.1);
  tools.forEach(([n, d], i) => {
    const y = 110 + i * 92, ok = i < done;
    g.strokeStyle = P.dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'; g.lineWidth = 1; g.beginPath(); g.moveTo(400, y + 66); g.lineTo(966, y + 66); g.stroke();
    rounded(g, 400, y + 8, 40, 40, 10); g.fillStyle = ok ? P.accent : 'transparent'; g.fill(); g.strokeStyle = ok ? P.accent : alpha(P.accent, .5); g.lineWidth = 2; g.stroke();
    if (ok) { g.strokeStyle = P.dark ? '#0d1a19' : '#fff'; g.lineWidth = 4; g.beginPath(); g.moveTo(410, y + 28); g.lineTo(418, y + 37); g.lineTo(431, y + 19); g.stroke(); }
    g.font = `600 27px ${FONT_UI}`; g.fillStyle = ok ? P.word : P.dim; g.fillText(n, 462, y + 40);
    g.font = `500 18px ${FONT_MONO}`; g.textAlign = 'right'; g.fillStyle = P.dim; g.fillText(d, 966, y + 38); g.textAlign = 'left';
  });
}

// BUILD — a code editor: line numbers, typed code, test status bar
const BUILD_CODE = [['// my-assistant/app.py', 'c'], ['from onrol import llm, ui', 'k'], ['', ''], ['assistant = llm.agent(', 'f'], ['  goals="data analyst roles",', 's'], ['  tools=["research", "planner"])', 's'], ['', ''], ['ui.chat(assistant).serve()', 'f']];
function buildCard(g, P, t, light) {
  g.clearRect(0, 0, SCREEN_W, SCREEN_H);
  windowChrome(g, P, 'app.py · my-assistant', light);
  // sidebar
  g.fillStyle = light ? '#eceef1' : '#12141b'; g.fillRect(16, 78, 210, 470);
  g.font = `500 17px ${FONT_MONO}`; ['app.py', 'prompts.md', 'planner.py', 'tests/'].forEach((f, i) => { g.fillStyle = i === 0 ? P.accent : P.dim; g.fillText(f, 40, 122 + i * 38); });
  word(g, P, 'BUILD', 40, 470, 170, 'left', 64, alpha(P.accent, .9));
  g.font = `500 15px ${FONT_UI}`; g.fillStyle = P.tag; g.fillText('real projects', 42, 504);
  // code
  const chars = Math.floor((t % 9) * 34); let left = chars;
  const col = { c: P.dim, k: P.accent, f: P.word, s: light ? '#9a3d00' : '#ffb27a', '': P.word };
  g.font = `500 22px ${FONT_MONO}`;
  BUILD_CODE.forEach(([line, k], i) => {
    const y = 128 + i * 46;
    g.fillStyle = P.dim; g.textAlign = 'right'; g.fillText(String(i + 1), 290, y); g.textAlign = 'left';
    const shown = line.slice(0, Math.max(0, left)); left -= line.length + 1;
    g.fillStyle = col[k]; g.fillText(shown, 316, y);
    if (left < 0 && left > -line.length - 2 && Math.floor(t * 2) % 2) { g.fillStyle = P.accent; g.fillRect(316 + g.measureText(shown).width + 2, y - 20, 12, 26); }
  });
  // status bar
  const ok = left > 0;
  g.save(); rounded(g, 14, 14, 996, 572, 22); g.clip();
  g.fillStyle = ok ? P.accent : (light ? '#dfe2e6' : '#1b1e27'); g.fillRect(14, 548, 996, 38); g.restore();
  g.font = `500 17px ${FONT_MONO}`; g.fillStyle = ok ? (P.dark ? '#0b0c10' : '#fff') : P.dim;
  g.fillText(ok ? '✓ 12 tests passed · ready to ship' : '● building…', 34, 573);
}

// LAUNCH — a browser: live URL, deploy pill, the page itself
function launchCard(g, P, t, light) {
  g.clearRect(0, 0, SCREEN_W, SCREEN_H);
  windowChrome(g, P, '', light);
  pill(g, 160, 30, 600, 34, light ? '#fff' : '#0c0e14', alpha(P.accent, .35));
  g.font = `500 18px ${FONT_MONO}`; g.textAlign = 'left'; g.fillStyle = P.accent; g.fillRect(178, 41, 9, 7);
  g.fillStyle = P.word; g.fillText('https://your-name.dev', 206, 53);
  const live = (t % 6) > 1.4;
  pill(g, 820, 30, 160, 34, live ? P.accent : 'transparent', live ? null : alpha(P.accent, .5));
  g.font = `600 15px ${FONT_UI}`; g.textAlign = 'center'; g.fillStyle = live ? (P.dark ? '#0b0c10' : '#fff') : P.accent;
  g.fillText(live ? '● LIVE' : 'deploying…', 900, 53);
  // the page: gradient hero
  g.save(); rounded(g, 14, 14, 996, 572, 22); g.clip();
  const gr = g.createLinearGradient(0, 78, 0, 586); gr.addColorStop(0, alpha(P.accent, .28)); gr.addColorStop(1, alpha(P.accent, 0));
  g.fillStyle = gr; g.fillRect(14, 78, 996, 508); g.restore();
  word(g, P, 'LAUNCH', 512, 290, 760, 'center', 150);
  g.textAlign = 'center'; g.font = `500 25px ${FONT_UI}`; g.fillStyle = P.tag; g.fillText('Your project, live on the web with its own link', 512, 350);
  // deploy steps
  ['Build', 'Checks', 'Deploy', 'Live'].forEach((s, i) => {
    const on = (t % 6) > .35 * (i + 1), x = 232 + i * 186;
    pill(g, x, 420, 150, 46, on ? alpha(P.accent, .18) : 'transparent', alpha(P.accent, on ? .8 : .25));
    g.font = `500 17px ${FONT_UI}`; g.fillStyle = on ? P.word : P.dim; g.fillText((on ? '✓ ' : '') + s, x + 75, 450);
    if (i < 3) { g.strokeStyle = alpha(P.accent, .4); g.lineWidth = 2; g.beginPath(); g.moveTo(x + 152, 443); g.lineTo(x + 184, 443); g.stroke(); }
  });
}

// EARN — a portfolio board: three direction tiles
function earnCard(g, P, t) {
  g.clearRect(0, 0, SCREEN_W, SCREEN_H);
  rounded(g, 14, 14, 996, 572, 8); g.fillStyle = P.dark ? '#15120a' : '#fbf6ea'; g.fill();
  g.strokeStyle = alpha(P.accent, .7); g.lineWidth = 3; g.stroke();
  g.textAlign = 'left'; word(g, P, 'EARN', 48, 140, 300, 'left', 96);
  g.font = `500 23px ${FONT_UI}`; g.fillStyle = P.tag; g.fillText('from the skill · pick your direction', 330, 128);
  const tiles = [['Career growth', 'ATS-ready resume', 'Project to explain'], ['Freelancing', 'Live links for clients', 'Ship every week'], ['Own products', 'Your own AI tools', 'Build → launch loop']];
  const hi = Math.floor(t / 2.5) % 3;
  tiles.forEach(([h, a, b], i) => {
    const x = 48 + i * 316, y = 196, on = i === hi;
    rounded(g, x, y, 296, 340, 16); g.fillStyle = on ? alpha(P.accent, .16) : (P.dark ? 'rgba(255,255,255,.04)' : '#fff'); g.fill();
    g.strokeStyle = alpha(P.accent, on ? .9 : .25); g.lineWidth = 2; g.stroke();
    g.font = `500 16px ${FONT_MONO}`; g.fillStyle = P.accent; g.fillText('0' + (i + 1), x + 26, y + 44);
    g.font = `600 30px ${FONT_UI}`; g.fillStyle = P.word; g.fillText(h, x + 26, y + 104);
    g.fillStyle = P.accent; g.fillRect(x + 26, y + 128, 50, 3);
    g.font = `500 18px ${FONT_UI}`; g.fillStyle = P.tag; g.fillText(a, x + 26, y + 180); g.fillText(b, x + 26, y + 218);
    // small rising bars
    for (let k = 0; k < 5; k++) { const bh = 14 + k * 11 * (on ? 1 : .6); g.fillStyle = alpha(P.accent, on ? .8 : .3); g.fillRect(x + 26 + k * 24, y + 310 - bh, 16, bh); }
  });
}

// WATCH — a film frame with sprocket holes and a play button
function watchCard(g, P, t) {
  g.clearRect(0, 0, SCREEN_W, SCREEN_H);
  g.fillStyle = '#050506'; g.fillRect(14, 14, 996, 572);
  for (let x = 30; x < 1000; x += 46) { g.fillStyle = '#1d1d22'; rounded(g, x, 26, 26, 18, 4); g.fill(); rounded(g, x, 556, 26, 18, 4); g.fill(); }
  const pr = 1 + Math.sin(t * 2.5) * .04;
  g.fillStyle = alpha(P.accent, .18); g.beginPath(); g.arc(512, 270, 96 * pr, 0, 7); g.fill();
  g.fillStyle = '#f7f8fa'; g.beginPath(); g.arc(512, 270, 64, 0, 7); g.fill();
  g.fillStyle = '#0b0c10'; g.beginPath(); g.moveTo(496, 240); g.lineTo(496, 300); g.lineTo(546, 270); g.closePath(); g.fill();
  g.textAlign = 'center'; g.font = `600 46px ${FONT_UI}`; g.fillStyle = '#f7f8fa'; g.fillText('Meet ONROL', 512, 432);
  g.font = `500 21px ${FONT_MONO}`; g.fillStyle = P.accent; g.fillText('THE FOUNDER · 2:45', 512, 476);
}

export const SCREENS = {
  intro:  { kicker:'AI EXECUTION SCHOOL', index:'00 / 04', draw(g, P, t, art) { if (art && art.video && art.video.readyState >= 2) return videoCard(g, P, t, art); frame(g, P, this.kicker, this.index); rings(g, P, t, 512, 300); word(g, P, 'ONROL', 512, 330, 760, 'center', 190); g.textAlign='center'; g.font=`500 27px ${FONT_UI}`; g.fillStyle=P.tag; g.fillText('Build your first AI product in 21 days', 512, 430); } },
  watch:  { draw(g, P, t) { watchCard(g, P, t); } },
  learn:  { draw(g, P, t) { learnCard(g, P, t); } },
  build:  { draw(g, P, t) { buildCard(g, P, t, !P.dark); } },
  launch: { draw(g, P, t) { launchCard(g, P, t, !P.dark); } },
  earn:   { draw(g, P, t) { earnCard(g, P, t); } },
  apply:  { kicker:'NO PAYMENT TO APPLY', index:'', draw(g, P, t) { frame(g, P, this.kicker, this.index); cta(g, P, t); word(g, P, 'START HERE', 512, 300, 820, 'center', 150); g.textAlign='center'; g.font=`500 25px ${FONT_UI}`; g.fillStyle=P.tag; g.fillText('Your first AI product, 21 days from now', 512, 360); } },
};

export function createArt(key, accentHex, light, frosted = false) {
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_W; canvas.height = SCREEN_H;
  const g = canvas.getContext('2d');
  const art = { canvas, accent: accentHex, light, key, frosted };
  art.draw = (t) => { const P = palette(art.accent, art.light, art.frosted); SCREENS[key].draw(g, P, t, art); if (!(art.video && art.video.readyState >= 2)) hud(g, P, SCREEN_W, SCREEN_H, t, !['build', 'launch'].includes(key)); };
  art.draw(0);
  return art;
}

// ---------- home posters (USPs) ----------
const MOTIFS = {
  onair(g, P, t, cx, cy) {                                    // LIVE: broadcasting signal
    for (let i = 0; i < 4; i++) {
      const k = ((t * .6 + i / 4) % 1), r = 30 + k * 130;
      g.strokeStyle = alpha(P.accent, .75 * (1 - k)); g.lineWidth = 3;
      g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
    }
    g.fillStyle = alpha(P.accent, .25 + .2 * Math.sin(t * 4)); g.beginPath(); g.arc(cx, cy, 44, 0, 7); g.fill();
    g.fillStyle = P.accent; g.beginPath(); g.arc(cx, cy, 26, 0, 7); g.fill();
    g.font = `500 17px ${FONT_MONO}`; g.textAlign = 'center'; g.fillStyle = P.accent; g.fillText('\u25CF ON AIR', cx, cy + 150);
  },
  clock(g, P, t, cx, cy) {                                    // 1 HR: a clock face with a sweeping hand
    const R = 120;
    g.strokeStyle = alpha(P.accent, .35); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      g.strokeStyle = alpha(P.accent, i % 3 ? .35 : .9); g.lineWidth = i % 3 ? 2 : 4;
      g.beginPath(); g.moveTo(cx + Math.sin(a) * (R - 16), cy - Math.cos(a) * (R - 16)); g.lineTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R); g.stroke();
    }
    const sweep = (t * .5) % (Math.PI * 2);
    g.fillStyle = alpha(P.accent, .22); g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R - 22, -Math.PI / 2, -Math.PI / 2 + sweep); g.closePath(); g.fill();
    g.strokeStyle = P.accent; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(sweep) * (R - 26), cy - Math.cos(sweep) * (R - 26)); g.stroke();
    g.fillStyle = P.accent; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill();
  },
  ring(g, P, t, cx, cy) {                                     // 70%: progress ring filling to 70
    const R = 115, p = Math.min(.7, (t % 6) / 3);
    g.strokeStyle = alpha(P.accent, .15); g.lineWidth = 18; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
    g.strokeStyle = P.accent; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); g.stroke(); g.lineCap = 'butt';
    g.font = `600 41px ${FONT_UI}`; g.textAlign = 'center'; g.fillStyle = P.accent; g.fillText(Math.round(p * 100) + '%', cx, cy + 16);
    g.font = `500 15px ${FONT_MONO}`; g.fillStyle = P.dim; g.fillText('HANDS-ON', cx, cy + 44);
  },
  deploy(g, P, t, cx, cy) {                                   // SHIP: weekly deploys ticking up
    const n = 6, w = 40, gap = 14, x0 = cx - (n * w + (n - 1) * gap) / 2, base = cy + 110;
    const done = Math.floor((t * .9) % (n + 2));
    for (let i = 0; i < n; i++) {
      const h = 50 + i * 30, x = x0 + i * (w + gap), on = i < done;
      g.fillStyle = on ? P.accent : alpha(P.accent, .15); g.fillRect(x, base - h, w, h);
      if (on) { g.strokeStyle = P.dark ? '#0b0604' : '#fff'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 10, base - h + 22); g.lineTo(x + 18, base - h + 30); g.lineTo(x + 31, base - h + 14); g.stroke(); }
      g.font = `500 12px ${FONT_MONO}`; g.textAlign = 'center'; g.fillStyle = P.dim; g.fillText('W' + (i + 1), x + w / 2, base + 22);
    }
  },
};
export const POSTER_W = 512, POSTER_H = 768;
export const USPS = [
  { n: '01', big: 'LIVE',     motif: 'onair',  sub: ['Mentors in the room,', 'not recordings'] },
  { n: '02', big: '1 HR',     motif: 'clock',  unit: '/ DAY', sub: ['Fits around work', 'or college'] },
  { n: '03', big: '70%',      motif: 'ring',   sub: ['Hands-on', 'build time'] },
  { n: '04', big: 'SHIP',     motif: 'deploy', unit: 'WEEKLY', sub: ['Deployed work,', 'live links'] },
];
export function createPoster(usp, accentHex, light) {
  const canvas = document.createElement('canvas');
  canvas.width = POSTER_W; canvas.height = POSTER_H;
  const g = canvas.getContext('2d');
  const poster = { canvas, accent: accentHex, light, usp };
  poster.draw = (t) => {
    const usp = poster.usp, P = palette(poster.accent, poster.light, false), W2 = POSTER_W, H2 = POSTER_H;
    const ink = P.dark ? '#e8eaed' : '#111', faint = P.dark ? 'rgba(232,234,237,' : 'rgba(17,17,17,';
    g.clearRect(0, 0, W2, H2);
    // sharp editorial panel
    g.fillStyle = P.dark ? '#08090b' : '#f7f7f5'; g.fillRect(8, 8, W2 - 16, H2 - 16);
    g.strokeStyle = faint + '.22)'; g.lineWidth = 2; g.strokeRect(8, 8, W2 - 16, H2 - 16);
    // dot-scan field (point cloud)
    for (let y = 120; y < 420; y += 14) for (let x = 36; x < W2 - 36; x += 14) {
      const d = Math.hypot(x - W2 / 2, y - 270) / 190, w = Math.sin(x * .05 + t * 1.2) * Math.cos(y * .04 - t * .8);
      const a = Math.max(0, (1 - d) * (.25 + .35 * w));
      if (a > .02) { g.fillStyle = faint + a.toFixed(3) + ')'; g.fillRect(x, y, 2, 2); }
    }
    // corner crosshairs
    g.strokeStyle = faint + '.5)'; g.lineWidth = 1.5;
    [[28, 28], [W2 - 28, 28], [28, H2 - 28], [W2 - 28, H2 - 28]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x + 8, y); g.moveTo(x, y - 8); g.lineTo(x, y + 8); g.stroke(); });
    // red tag + index
    g.fillStyle = P.accent; g.fillRect(36, 52, 168, 34);
    g.font = `500 16px ${FONT_MONO}`; g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText('WHY ONROL', 48, 75);
    g.textAlign = 'right'; g.fillStyle = faint + '.6)'; g.fillText(usp.n + ' / 04', W2 - 36, 75);
    // HUD rule with ticks
    g.fillStyle = faint + '.35)'; g.fillRect(36, 448, W2 - 72, 1.5);
    for (let k = 0; k <= 10; k++) g.fillRect(36 + k * (W2 - 72) / 10, k % 5 ? 444 : 440, 1.5, k % 5 ? 4 : 8);
    g.fillStyle = P.accent; g.fillRect(36 + ((t * .15) % 1) * (W2 - 80), 444, 8, 8);
    // big stat
    g.textAlign = 'left';
    let size = 112; do { g.font = `600 ${size}px ${FONT_UI}`; size -= 4; } while (g.measureText(usp.big).width > W2 - 120 && size > 40);
    g.fillStyle = ink; g.fillText(usp.big, 34, 590);
    if (usp.unit) { g.font = `500 21px ${FONT_MONO}`; g.fillStyle = P.accent; g.fillText(usp.unit.toUpperCase(), 38, 626); }
    g.font = `500 18px ${FONT_MONO}`; g.fillStyle = faint + '.75)';
    usp.sub.forEach((line, i) => g.fillText(line.toUpperCase(), 38, (usp.unit ? 668 : 640) + i * 28));
  };
  poster.draw(0);
  return poster;
}

// ---------- satellite panels: each level gets its own spatial composition ----------
const PANEL_SIZE = { schedule: [440, 600], files: [420, 600], preview: [460, 640], pipeline: [380, 760], tile0: [440, 520], tile1: [440, 520], tile2: [440, 520], earnHead: [1024, 300] };
function panelBase(g, P, w, h, r = 26) {
  g.clearRect(0, 0, w, h);
  rounded(g, 8, 8, w - 16, h - 16, Math.min(r, 6));
  g.fillStyle = P.dark ? '#08090b' : '#f7f7f5'; g.fill();
  g.strokeStyle = P.dark ? 'rgba(232,234,237,.22)' : 'rgba(17,17,17,.2)'; g.lineWidth = 2; g.stroke();
}
const PANELS = {
  schedule(g, P, t, w, h) {                                   // LEARN: the first six days
    panelBase(g, P, w, h);
    g.textAlign = 'left'; g.font = `600 17px ${FONT_UI}`; g.fillStyle = P.accent; g.fillText('THIS WEEK', 36, 62);
    const days = ['AI-driven careers', 'Your direction', 'AI tools to know', 'Prompting', 'Research smarter', 'Learn faster'];
    const cur = 2 + (Math.floor(t / 3) % 2);
    days.forEach((d, i) => {
      const y = 112 + i * 76, on = i === cur, done = i < cur;
      if (on) { rounded(g, 24, y - 34, w - 48, 62, 14); g.fillStyle = alpha(P.accent, .16); g.fill(); }
      g.font = `500 17px ${FONT_MONO}`; g.fillStyle = on || done ? P.accent : P.dim; g.fillText('DAY ' + String(i + 1).padStart(2, '0'), 40, y + 4);
      g.font = `500 19px ${FONT_UI}`; g.fillStyle = on ? P.word : done ? P.tag : P.dim; g.fillText(d, 150, y + 4);
    });
  },
  files(g, P, t, w, h) {                                      // BUILD: tests running
    panelBase(g, P, w, h, 18);
    g.textAlign = 'left'; g.font = `500 19px ${FONT_MONO}`; g.fillStyle = P.accent; g.fillText('tests/', 34, 60);
    const tests = ['goal profile', 'prompt library', 'study planner', 'chat replies', 'error handling', 'deploy config'];
    const n = Math.floor((t % 8) / .8);
    tests.forEach((s, i) => {
      const y = 116 + i * 74, ok = i < n;
      g.font = `500 23px ${FONT_UI}`; g.fillStyle = ok ? P.accent : P.dim; g.fillText(ok ? '✓' : '○', 36, y);
      g.font = `500 20px ${FONT_MONO}`; g.fillStyle = ok ? P.word : P.dim; g.fillText(s, 76, y);
    });
  },
  preview(g, P, t, w, h) {                                    // BUILD: the assistant answering
    panelBase(g, P, w, h, 44);
    g.fillStyle = alpha(P.accent, .5); rounded(g, w / 2 - 50, 26, 100, 10, 5); g.fill();
    g.textAlign = 'left'; g.font = `600 17px ${FONT_UI}`; g.fillStyle = P.tag; g.fillText('My assistant', 40, 84);
    const k = t % 8;
    const bubble = (x, y, bw, lines, mine) => {
      rounded(g, x, y, bw, 30 + lines.length * 32, 18); g.fillStyle = mine ? P.accent : (P.dark ? 'rgba(255,255,255,.08)' : '#eef0f3'); g.fill();
      g.font = `500 17px ${FONT_UI}`; g.fillStyle = mine ? (P.dark ? '#0b0c10' : '#fff') : P.word;
      lines.forEach((l, i) => g.fillText(l, x + 18, y + 40 + i * 32));
    };
    if (k > .8) bubble(w - 330, 120, 290, ['Plan my week for a', 'data analyst interview'], true);
    if (k > 2.2) bubble(40, 250, 330, ['Mon · SQL practice', 'Tue · Excel case study', 'Wed · Portfolio walk-through'], false);
    if (k > 3.6) bubble(w - 250, 430, 210, ['Add mock interviews'], true);
  },
  pipeline(g, P, t, w, h) {                                   // LAUNCH: vertical deploy pipeline
    panelBase(g, P, w, h);
    g.textAlign = 'left'; g.font = `600 17px ${FONT_UI}`; g.fillStyle = P.accent; g.fillText('DEPLOY', 40, 64);
    const steps = ['Push', 'Build', 'Checks', 'Deploy', 'Live'], k = (t % 6) / 6 * (steps.length + .6);
    g.strokeStyle = alpha(P.accent, .3); g.lineWidth = 4; g.beginPath(); g.moveTo(70, 130); g.lineTo(70, 130 + 4 * 140); g.stroke();
    g.strokeStyle = P.accent; g.beginPath(); g.moveTo(70, 130); g.lineTo(70, 130 + Math.min(4, k) * 140); g.stroke();
    steps.forEach((s, i) => {
      const y = 130 + i * 140, on = k >= i;
      g.fillStyle = on ? P.accent : (P.dark ? 'rgb(14,16,22)' : '#fff'); g.strokeStyle = P.accent; g.lineWidth = 3;
      g.beginPath(); g.arc(70, y, 16, 0, 7); g.fill(); g.stroke();
      g.font = `600 25px ${FONT_UI}`; g.fillStyle = on ? P.word : P.dim; g.fillText(s, 110, y + 10);
    });
  },
  earnHead(g, P, t, w, h) {
    panelBase(g, P, w, h, 30);
    g.textAlign = 'left'; word(g, P, 'EARN', 50, 200, 330, 'left', 150);
    g.font = `500 30px ${FONT_UI}`; g.fillStyle = P.tag; g.fillText('from the skill', 420, 150); g.fillText('pick your direction ↓', 420, 200);
  },
};
const EARN_TILES = [['Career growth', 'ATS-ready resume', 'A project to explain'], ['Freelancing', 'Live links for clients', 'Ship every week'], ['Own products', 'Your own AI tools', 'Build → launch loop']];
EARN_TILES.forEach(([head, a, b], i) => {
  PANELS['tile' + i] = (g, P, t, w, h) => {
    const on = Math.floor(t / 2.5) % 3 === i;
    panelBase(g, P, w, h, 24);
    if (on) { rounded(g, 8, 8, w - 16, h - 16, 24); g.fillStyle = alpha(P.accent, .14); g.fill(); g.strokeStyle = P.accent; g.lineWidth = 3; g.stroke(); }
    g.textAlign = 'left'; g.font = `500 21px ${FONT_MONO}`; g.fillStyle = P.accent; g.fillText('0' + (i + 1), 40, 70);
    g.font = `600 30px ${FONT_UI}`; g.fillStyle = P.word; g.fillText(head, 40, 150);
    g.fillStyle = P.accent; g.fillRect(40, 178, 60, 4);
    g.font = `500 23px ${FONT_UI}`; g.fillStyle = P.tag; g.fillText(a, 40, 250); g.fillText(b, 40, 298);
    for (let k = 0; k < 5; k++) { const bh = 20 + k * 16 * (on ? 1 : .55); g.fillStyle = alpha(P.accent, on ? .85 : .3); g.fillRect(40 + k * 30, 460 - bh, 20, bh); }
  };
});
export function createPanel(kind, accentHex, light) {
  const [w, h] = PANEL_SIZE[kind];
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d');
  const art = { canvas, accent: accentHex, light, w, h };
  art.draw = (t) => { const P = palette(art.accent, art.light, false); PANELS[kind](g, P, t, w, h); hud(g, P, w, h, t); };
  art.draw(0);
  return art;
}
