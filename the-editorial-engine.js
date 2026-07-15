// the-editorial-engine.js
import {
  layout,
  prepareWithSegments,
  layoutWithLines,
  layoutNextLine,
  walkLineRanges
} from "./pretext.js";
var BODY_FONT = '18px "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif';
var BODY_LINE_HEIGHT = 30;
var HEADLINE_FONT_FAMILY = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif';
var HEADLINE_TEXT = "Jason Wells — Software Engineer, Data Geek";
var GUTTER = 48;
var COL_GAP = 40;
var STATS_BAR_HEIGHT = 42;
var DROP_CAP_LINES = 3;
var MIN_SLOT_WIDTH = 50;
function carveTextLineSlots(base, blocked) {
  let slots = [base];
  for (let bi = 0; bi < blocked.length; bi++) {
    const iv = blocked[bi];
    const next = [];
    for (let si = 0; si < slots.length; si++) {
      const s = slots[si];
      if (iv.right <= s.left || iv.left >= s.right) {
        next.push(s);
        continue;
      }
      if (iv.left > s.left)
        next.push({ left: s.left, right: iv.left });
      if (iv.right < s.right)
        next.push({ left: iv.right, right: s.right });
    }
    slots = next;
  }
  return slots.filter((s) => s.right - s.left >= MIN_SLOT_WIDTH);
}
function circleIntervalForBand(cx, cy, r, bandTop, bandBottom, hPad, vPad) {
  const top = bandTop - vPad;
  const bottom = bandBottom + vPad;
  if (top >= cy + r || bottom <= cy - r)
    return null;
  const minDy = cy >= top && cy <= bottom ? 0 : cy < top ? top - cy : cy - bottom;
  if (minDy >= r)
    return null;
  const maxDx = Math.sqrt(r * r - minDy * minDy);
  return { left: cx - maxDx - hPad, right: cx + maxDx + hPad };
}
var BODY_TEXT = `Welcome to my website! This is a collection of my personal projects and some details about myself. Starting off with HOBBIES. I’ve always been interested in stats growing up. It began with Madden 12, 2k11, games that created simulations of the sports I loved watching. With a few movements of a controller or mouse, you could alter the future, think about long term strategy, analyze cap room! Playing the individual games themselves was fun too, but things like the drafts, or scouting was much more fun. This led to a focus on it in school, starting with solo projects in google sheets, xmls trying to simulate basketball like my "Bungeeball" projects. Even before I thought of coding, that desire was there. In high school this grew into coding classes, learning favicons and front end design. Javascript with card games & AP CS. By this point I was still playing those older games, working on NBA rebuilds for the local Blazers, who just couldn’t put it together in the real world, or even really getting into fictional worlds. The “Simulation Basketball League”, an online forum where users made one player and made graphics of players or articles for “points” that could be used to upgrade their player. Online DnD groups as well, games with numbers are just so much fun! Not just with min-maxing, but with enjoying others and making silly concepts try to become even somewhat functional with knowledge of an engine. In college, I began focusing on my software degree, earning the highest possible presidential scholarship for Oregon Tech and picking up a library job at the campus to help pay. My time there was incredible and it really allowed me to learn some valuable skills. Getting over some social anxiety at the front desk, while also learning how to work on a team with others, being on MS teams, communicating, taking phone calls, etc! My classes enabled me to become even more of a skilled programmer, but also still, a fan of stats. After graduating I immediately had the hardest challenge of my life, fighting cancer. But as of a few months ago (3/15/2026) I’m officially fully in remission! Hopefully whoever is reading this enjoys my site and the projects inside. Thanks for reading!




 `;
var PULLQUOTE_TEXTS = [
  "Data can be used for so many things!",
  "Have you ever considered graphing your day, be it a calorie counter, schedule, MS project or mood tracker? It helped me immensely during classes & during chemotherapy."
];
var stage = document.getElementById("stage");
var orbDefs = [
  { fx: 0.52, fy: 0.22, r: 110, vx: 24, vy: 16, color: [196, 163, 90] },
  { fx: 0.18, fy: 0.48, r: 85, vx: -19, vy: 26, color: [100, 140, 255] },
  { fx: 0.74, fy: 0.58, r: 95, vx: 16, vy: -21, color: [232, 100, 130] },
  { fx: 0.38, fy: 0.72, r: 75, vx: -26, vy: -14, color: [80, 200, 140] },
  { fx: 0.86, fy: 0.18, r: 65, vx: -13, vy: 19, color: [150, 100, 220] }
];
function createOrbEl(c) {
  const el = document.createElement("div");
  el.className = "orb";
  el.style.background = `radial-gradient(circle at 35% 35%, rgba(${c[0]},${c[1]},${c[2]},0.35), rgba(${c[0]},${c[1]},${c[2]},0.12) 55%, transparent 72%)`;
  el.style.boxShadow = `0 0 60px 15px rgba(${c[0]},${c[1]},${c[2]},0.18), 0 0 120px 40px rgba(${c[0]},${c[1]},${c[2]},0.07)`;
  stage.appendChild(el);
  return el;
}
var W0 = window.innerWidth;
var H0 = window.innerHeight;
var orbs = orbDefs.map((d) => ({
  x: d.fx * W0,
  y: d.fy * H0,
  r: d.r,
  vx: d.vx,
  vy: d.vy,
  color: d.color,
  paused: false,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragStartOrbX: 0,
  dragStartOrbY: 0,
  el: createOrbEl(d.color)
}));
await document.fonts.ready;
var preparedBody = prepareWithSegments(BODY_TEXT, BODY_FONT);
var PQ_FONT = `italic 19px ${HEADLINE_FONT_FAMILY}`;
var PQ_LINE_HEIGHT = 27;
var preparedPQ = PULLQUOTE_TEXTS.map((t) => prepareWithSegments(t, PQ_FONT));
var DROP_CAP_SIZE = BODY_LINE_HEIGHT * DROP_CAP_LINES - 4;
var DROP_CAP_FONT = `700 ${DROP_CAP_SIZE}px ${HEADLINE_FONT_FAMILY}`;
var preparedDropCap = prepareWithSegments(BODY_TEXT[0], DROP_CAP_FONT);
var dropCapWidth = 0;
walkLineRanges(preparedDropCap, 9999, (line) => {
  dropCapWidth = line.width;
});
var DROP_CAP_TOTAL_W = Math.ceil(dropCapWidth) + 10;
var dropCapEl = document.createElement("div");
dropCapEl.className = "drop-cap";
dropCapEl.textContent = BODY_TEXT[0];
dropCapEl.style.font = DROP_CAP_FONT;
dropCapEl.style.lineHeight = DROP_CAP_SIZE + "px";
stage.appendChild(dropCapEl);
var linePool = [];
var headlinePool = [];
var pqLinePool = [];
var pqBoxPool = [];
function syncPool(pool, count, className) {
  while (pool.length < count) {
    const el = document.createElement("div");
    el.className = className;
    stage.appendChild(el);
    pool.push(el);
  }
  for (let i = 0; i < pool.length; i++) {
    pool[i].style.display = i < count ? "" : "none";
  }
}
var cachedHeadlineKey = "";
var cachedHeadlineFontSize = 24;
var cachedHeadlineLines = [];
function fitHeadline(maxWidth, maxHeight) {
  const key = `${maxWidth}:${maxHeight}`;
  if (key === cachedHeadlineKey)
    return { fontSize: cachedHeadlineFontSize, lines: cachedHeadlineLines };
  cachedHeadlineKey = key;
  let lo = 24, hi = 120, best = lo;
  let bestLines = [];
  while (lo <= hi) {
    const size = Math.floor((lo + hi) / 2);
    const font = `700 ${size}px ${HEADLINE_FONT_FAMILY}`;
    const lh = Math.round(size * 0.93);
    const prepared = prepareWithSegments(HEADLINE_TEXT, font);
    let breaksWord = false;
    let lineCount = 0;
    walkLineRanges(prepared, maxWidth, (line) => {
      lineCount++;
      if (line.end.graphemeIndex !== 0)
        breaksWord = true;
    });
    const totalH = lineCount * lh;
    if (!breaksWord && totalH <= maxHeight) {
      best = size;
      const result = layoutWithLines(prepared, maxWidth, lh);
      bestLines = result.lines.map((l, i) => ({ x: 0, y: i * lh, text: l.text, width: l.width }));
      lo = size + 1;
    } else {
      hi = size - 1;
    }
  }
  cachedHeadlineFontSize = best;
  cachedHeadlineLines = bestLines;
  return { fontSize: best, lines: bestLines };
}
function layoutColumn(prepared, startCursor, regionX, regionY, regionW, regionH, lineHeight, circleObs, rectObstacles) {
  let cursor = startCursor;
  let lineTop = regionY;
  const lines = [];
  let textExhausted = false;
  while (lineTop + lineHeight <= regionY + regionH && !textExhausted) {
    const bandTop = lineTop;
    const bandBottom = lineTop + lineHeight;
    const blocked = [];
    for (let oi = 0; oi < circleObs.length; oi++) {
      const c = circleObs[oi];
      const iv = circleIntervalForBand(c.cx, c.cy, c.r, bandTop, bandBottom, c.hPad, c.vPad);
      if (iv !== null)
        blocked.push(iv);
    }
    for (let ri = 0; ri < rectObstacles.length; ri++) {
      const r = rectObstacles[ri];
      if (bandBottom <= r.y || bandTop >= r.y + r.h)
        continue;
      blocked.push({ left: r.x, right: r.x + r.w });
    }
    const slots = carveTextLineSlots({ left: regionX, right: regionX + regionW }, blocked);
    if (slots.length === 0) {
      lineTop += lineHeight;
      continue;
    }
    slots.sort((a, b) => a.left - b.left);
    for (let si = 0; si < slots.length; si++) {
      const slot = slots[si];
      const slotWidth = slot.right - slot.left;
      const line = layoutNextLine(prepared, cursor, slotWidth);
      if (line === null) {
        textExhausted = true;
        break;
      }
      lines.push({ x: Math.round(slot.left), y: Math.round(lineTop), text: line.text, width: line.width });
      cursor = line.end;
    }
    lineTop += lineHeight;
  }
  return { lines, cursor };
}
var activeOrb = null;
var pointerX = -9999;
var pointerY = -9999;
function hitTestOrbs(px, py) {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    const dx = px - o.x, dy = py - o.y;
    if (dx * dx + dy * dy <= o.r * o.r)
      return o;
  }
  return null;
}
stage.addEventListener("pointerdown", (e) => {
  const orb = hitTestOrbs(e.clientX, e.clientY);
  if (orb) {
    activeOrb = orb;
    orb.dragging = true;
    orb.dragStartX = e.clientX;
    orb.dragStartY = e.clientY;
    orb.dragStartOrbX = orb.x;
    orb.dragStartOrbY = orb.y;
    e.preventDefault();
  }
});
window.addEventListener("pointermove", (e) => {
  pointerX = e.clientX;
  pointerY = e.clientY;
  if (activeOrb) {
    activeOrb.x = activeOrb.dragStartOrbX + (e.clientX - activeOrb.dragStartX);
    activeOrb.y = activeOrb.dragStartOrbY + (e.clientY - activeOrb.dragStartY);
  }
});
window.addEventListener("pointerup", (e) => {
  if (activeOrb) {
    const dx = e.clientX - activeOrb.dragStartX;
    const dy = e.clientY - activeOrb.dragStartY;
    if (dx * dx + dy * dy < 16) {
      activeOrb.paused = !activeOrb.paused;
      activeOrb.el.classList.toggle("paused", activeOrb.paused);
    }
    activeOrb.dragging = false;
    activeOrb = null;
  }
});
var fpsTimestamps = [];
var fpsDisplay = 60;
function updateFPS(now) {
  fpsTimestamps.push(now);
  while (fpsTimestamps.length > 0 && fpsTimestamps[0] < now - 1000)
    fpsTimestamps.shift();
  fpsDisplay = fpsTimestamps.length;
}
var elSLines = document.getElementById("sLines");
var elSReflow = document.getElementById("sReflow");
var elSDom = document.getElementById("sDom");
var elSFps = document.getElementById("sFps");
var elSCols = document.getElementById("sCols");
var lastTime = 0;
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  const pw = document.documentElement.clientWidth;
  const ph = document.documentElement.clientHeight;
  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i];
    if (o.paused || o.dragging)
      continue;
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    if (o.x - o.r < 0) {
      o.x = o.r;
      o.vx = Math.abs(o.vx);
    }
    if (o.x + o.r > pw) {
      o.x = pw - o.r;
      o.vx = -Math.abs(o.vx);
    }
    if (o.y - o.r < GUTTER * 0.5) {
      o.y = o.r + GUTTER * 0.5;
      o.vy = Math.abs(o.vy);
    }
    if (o.y + o.r > ph - STATS_BAR_HEIGHT) {
      o.y = ph - STATS_BAR_HEIGHT - o.r;
      o.vy = -Math.abs(o.vy);
    }
  }
  for (let i = 0; i < orbs.length; i++) {
    const a = orbs[i];
    for (let j = i + 1; j < orbs.length; j++) {
      const b = orbs[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = a.r + b.r + 20;
      if (dist < minDist && dist > 0.1) {
        const force = (minDist - dist) * 0.8;
        const nx = dx / dist;
        const ny = dy / dist;
        if (!a.paused && !a.dragging) {
          a.vx -= nx * force * dt;
          a.vy -= ny * force * dt;
        }
        if (!b.paused && !b.dragging) {
          b.vx += nx * force * dt;
          b.vy += ny * force * dt;
        }
      }
    }
  }
  const circleObs = [];
  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i];
    circleObs.push({ cx: o.x, cy: o.y, r: o.r, hPad: 14, vPad: 4 });
  }
  const t0 = performance.now();
  const headlineWidth = Math.min(pw - GUTTER * 2, 1000);
  const maxHeadlineH = Math.floor(ph * 0.35);
  const { fontSize: hlSize, lines: hlLines } = fitHeadline(headlineWidth, maxHeadlineH);
  const hlLineHeight = Math.round(hlSize * 0.93);
  const hlFont = `700 ${hlSize}px ${HEADLINE_FONT_FAMILY}`;
  const hlHeight = hlLines.length * hlLineHeight;
  syncPool(headlinePool, hlLines.length, "headline-line");
  for (let i = 0; i < hlLines.length; i++) {
    const el = headlinePool[i];
    const line = hlLines[i];
    el.textContent = line.text;
    el.style.left = GUTTER + "px";
    el.style.top = GUTTER + line.y + "px";
    el.style.font = hlFont;
    el.style.lineHeight = hlLineHeight + "px";
  }
  const bodyTop = GUTTER + hlHeight + 20;
  const bodyHeight = ph - bodyTop - STATS_BAR_HEIGHT - 8;
  const colCount = pw > 1000 ? 3 : pw > 640 ? 2 : 1;
  const totalGutter = GUTTER * 2 + COL_GAP * (colCount - 1);
  const maxContentW = Math.min(pw, 1500);
  const colWidth = Math.floor((maxContentW - totalGutter) / colCount);
  const contentLeft = Math.round((pw - (colCount * colWidth + (colCount - 1) * COL_GAP)) / 2);
  const col0X = contentLeft;
  const dropCapRect = { x: col0X - 2, y: bodyTop - 2, w: DROP_CAP_TOTAL_W, h: DROP_CAP_LINES * BODY_LINE_HEIGHT + 2 };
  dropCapEl.style.left = col0X + "px";
  dropCapEl.style.top = bodyTop + "px";
  const pqPlacements = [
    { colIdx: 0, yFrac: 0.48, wFrac: 0.52, side: "right" },
    { colIdx: Math.min(1, colCount - 1), yFrac: 0.32, wFrac: 0.5, side: "left" }
  ];
  const pqRects = [];
  for (let pi = 0; pi < pqPlacements.length; pi++) {
    const p = pqPlacements[pi];
    if (p.colIdx >= colCount)
      continue;
    const pqW = Math.round(colWidth * p.wFrac);
    const prepared = preparedPQ[pi];
    const result = layout(prepared, pqW - 20, PQ_LINE_HEIGHT);
    const pqH = result.height + 16;
    const colX = contentLeft + p.colIdx * (colWidth + COL_GAP);
    const pqX = p.side === "right" ? colX + colWidth - pqW : colX;
    const pqY = Math.round(bodyTop + bodyHeight * p.yFrac);
    const pqLayoutLines = layoutWithLines(prepared, pqW - 20, PQ_LINE_HEIGHT);
    const pqPosLines = pqLayoutLines.lines.map((l, i) => ({
      x: pqX + 20,
      y: pqY + 8 + i * PQ_LINE_HEIGHT,
      text: l.text,
      width: l.width
    }));
    pqRects.push({ x: pqX, y: pqY, w: pqW, h: pqH, lines: pqPosLines, colIdx: p.colIdx });
  }
  const allBodyLines = [];
  let cursor = { segmentIndex: 0, graphemeIndex: 1 };
  for (let col = 0; col < colCount; col++) {
    const colX = contentLeft + col * (colWidth + COL_GAP);
    const rects = [];
    if (col === 0)
      rects.push(dropCapRect);
    for (let pi = 0; pi < pqRects.length; pi++) {
      if (pqRects[pi].colIdx === col) {
        const pq = pqRects[pi];
        rects.push({ x: pq.x, y: pq.y, w: pq.w, h: pq.h });
      }
    }
    const result = layoutColumn(preparedBody, cursor, colX, bodyTop, colWidth, bodyHeight, BODY_LINE_HEIGHT, circleObs, rects);
    allBodyLines.push(...result.lines);
    cursor = result.cursor;
  }
  const reflowTime = performance.now() - t0;
  syncPool(linePool, allBodyLines.length, "line");
  for (let i = 0; i < allBodyLines.length; i++) {
    const el = linePool[i];
    const line = allBodyLines[i];
    el.textContent = line.text;
    el.style.left = line.x + "px";
    el.style.top = line.y + "px";
    el.style.font = BODY_FONT;
    el.style.lineHeight = BODY_LINE_HEIGHT + "px";
  }
  let totalPQLines = 0;
  for (let pi = 0; pi < pqRects.length; pi++)
    totalPQLines += pqRects[pi].lines.length;
  syncPool(pqBoxPool, pqRects.length, "pullquote-box");
  syncPool(pqLinePool, totalPQLines, "pullquote-line");
  let pqLineIdx = 0;
  for (let pi = 0; pi < pqRects.length; pi++) {
    const pq = pqRects[pi];
    const boxEl = pqBoxPool[pi];
    boxEl.style.left = pq.x + "px";
    boxEl.style.top = pq.y + "px";
    boxEl.style.width = pq.w + "px";
    boxEl.style.height = pq.h + "px";
    for (let li = 0; li < pq.lines.length; li++) {
      const el = pqLinePool[pqLineIdx];
      const line = pq.lines[li];
      el.textContent = line.text;
      el.style.left = line.x + "px";
      el.style.top = line.y + "px";
      el.style.font = PQ_FONT;
      el.style.lineHeight = PQ_LINE_HEIGHT + "px";
      pqLineIdx++;
    }
  }
  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i];
    o.el.style.left = o.x - o.r + "px";
    o.el.style.top = o.y - o.r + "px";
    o.el.style.width = o.r * 2 + "px";
    o.el.style.height = o.r * 2 + "px";
  }
  const hovered = hitTestOrbs(pointerX, pointerY);
  document.body.style.cursor = activeOrb ? "grabbing" : hovered ? "grab" : "";
  updateFPS(now);
  elSLines.textContent = String(allBodyLines.length);
  elSReflow.textContent = reflowTime.toFixed(1) + "ms";
  elSDom.textContent = "0";
  elSFps.textContent = String(fpsDisplay);
  elSCols.textContent = String(colCount);
}
lastTime = performance.now();
requestAnimationFrame(animate);