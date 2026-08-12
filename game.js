const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const chainEl = document.querySelector("#chain");
const bestEl = document.querySelector("#best");
const phaseEl = document.querySelector("#phase");
const shieldBar = document.querySelector("#shieldBar");
const overlay = document.querySelector("#overlay");
const startButton = document.querySelector("#startButton");

const state = {
  running: false,
  width: 0,
  height: 0,
  dpr: 1,
  time: 0,
  last: 0,
  score: 0,
  best: Number(localStorage.getItem("auric-drift-best") || 0),
  chain: 1,
  phase: 1,
  message: "",
  messageTime: 0,
  shield: 1,
  speed: 290,
  spawn: 0,
  shake: 0,
  flash: 0,
  pointer: { active: false, x: 0, y: 0 },
  player: { x: 0, y: 0, r: 17, vx: 0 },
  items: [],
  sparks: [],
  rings: [],
  trail: [],
  stars: [],
};

bestEl.textContent = state.best;

function resize() {
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  state.width = Math.floor(rect.width);
  state.height = Math.floor(rect.height);
  canvas.width = Math.floor(state.width * state.dpr);
  canvas.height = Math.floor(state.height * state.dpr);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  state.player.x ||= state.width / 2;
  state.player.y = state.height * 0.76;
  state.stars = Array.from({ length: 70 }, () => ({
    x: Math.random() * state.width,
    y: Math.random() * state.height,
    z: 0.35 + Math.random() * 1.2,
  }));
}

function reset() {
  state.running = true;
  state.time = 0;
  state.last = performance.now();
  state.score = 0;
  state.chain = 1;
  state.phase = 1;
  state.message = "";
  state.messageTime = 0;
  state.shield = 1;
  state.speed = 290;
  state.spawn = 0;
  state.shake = 0;
  state.flash = 0;
  state.items = [];
  state.sparks = [];
  state.rings = [];
  state.trail = [];
  state.player.x = state.width / 2;
  state.player.vx = 0;
  overlay.querySelector(".brand").textContent = "AURIC DRIFT";
  overlay.querySelector("p").textContent =
    "Drag anywhere to steer. Collect gold, skim danger, hit prisms, and keep your shield alive.";
  startButton.textContent = "Launch";
  overlay.classList.add("hidden");
  requestAnimationFrame(loop);
}

function addSpark(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 70 + Math.random() * 210;
    state.sparks.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0.38 + Math.random() * 0.32,
      color,
      r: 1.5 + Math.random() * 3.5,
    });
  }
}

function addRing(x, y, color, size = 42) {
  state.rings.push({ x, y, color, size, life: 0.42, age: 0 });
}

function showMessage(text) {
  state.message = text;
  state.messageTime = 0.9;
}

function spawnItem() {
  const roll = Math.random();
  const lane = 34 + Math.random() * (state.width - 68);
  if (roll < 0.46) {
    state.items.push({ type: "gold", x: lane, y: -24, r: 12, spin: Math.random() * 6, seen: false });
  } else if (roll < 0.68) {
    state.items.push({ type: "gate", x: lane, y: -42, r: 24, spin: 0, seen: false });
  } else if (roll < 0.82) {
    state.items.push({ type: "shield", x: lane, y: -24, r: 13, spin: 0, seen: false });
  } else if (roll < 0.9) {
    state.items.push({ type: "prism", x: lane, y: -28, r: 15, spin: Math.random() * 6, seen: false });
  } else {
    state.items.push({ type: "mine", x: lane, y: -34, r: 18 + Math.random() * 9, spin: 0, seen: false });
  }
}

function collide(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const rr = a.r + b.r;
  return dx * dx + dy * dy < rr * rr;
}

function update(dt) {
  state.time += dt;
  state.phase = Math.min(5, 1 + Math.floor(state.score / 650));
  state.speed += dt * (10 + state.phase * 1.8);
  state.spawn -= dt;
  state.shake = Math.max(0, state.shake - dt * 22);
  state.flash = Math.max(0, state.flash - dt * 3);
  state.messageTime = Math.max(0, state.messageTime - dt);

  if (state.spawn <= 0) {
    spawnItem();
    state.spawn = Math.max(0.16, 0.54 - state.time * 0.005 - state.phase * 0.026);
  }

  const targetX = state.pointer.active ? state.pointer.x : state.width / 2 + Math.sin(state.time * 1.2) * 38;
  state.player.vx += (targetX - state.player.x) * dt * 18;
  state.player.vx *= Math.pow(0.0008, dt);
  state.player.x += state.player.vx * dt;
  state.player.x = Math.max(28, Math.min(state.width - 28, state.player.x));
  state.trail.unshift({
    x: state.player.x,
    y: state.player.y + 10,
    w: 8 + Math.min(20, Math.abs(state.player.vx) * 0.055),
    life: 0.28,
  });
  state.trail = state.trail.slice(0, 18);

  for (const star of state.stars) {
    star.y += state.speed * dt * star.z * 0.28;
    if (star.y > state.height + 4) {
      star.y = -4;
      star.x = Math.random() * state.width;
    }
  }

  for (const item of state.items) {
    const itemSpeed = item.type === "gate" ? 1.08 : item.type === "prism" ? 0.92 : 1;
    item.y += state.speed * dt * itemSpeed;
    item.spin += dt * (item.type === "mine" ? 3.4 : 5);
  }

  for (let i = state.items.length - 1; i >= 0; i--) {
    const item = state.items[i];
    if (collide(state.player, item)) {
      if (item.type === "mine") {
        state.shield -= 0.34;
        state.chain = 1;
        state.shake = 9;
        state.flash = 1;
        addSpark(item.x, item.y, "#ff6678", 20);
        addRing(item.x, item.y, "#ff6678", 70);
        showMessage("SHIELD HIT");
      } else {
        const value =
          item.type === "gate" ? 35 : item.type === "shield" ? 20 : item.type === "prism" ? 70 : 10;
        state.score += value * state.chain;
        state.chain = Math.min(12, state.chain + (item.type === "prism" ? 2 : 1));
        if (item.type === "shield") state.shield = Math.min(1, state.shield + 0.28);
        if (item.type === "prism") {
          state.shield = Math.min(1, state.shield + 0.12);
          state.shake = 4;
          showMessage("PRISM SURGE");
        } else if (state.chain >= 7) {
          showMessage(`${state.chain}x CHAIN`);
        }
        const color = item.type === "shield" ? "#3ee6a6" : item.type === "prism" ? "#ff8bd2" : "#ffd45f";
        addSpark(item.x, item.y, color, item.type === "prism" ? 24 : 12);
        addRing(item.x, item.y, color, item.type === "prism" ? 82 : 46);
      }
      state.items.splice(i, 1);
    } else if (item.y > state.height + 50) {
      if (item.type !== "mine") state.chain = 1;
      state.items.splice(i, 1);
    } else if (
      item.type === "mine" &&
      !item.seen &&
      item.y > state.player.y + state.player.r &&
      Math.abs(item.x - state.player.x) < item.r + state.player.r + 24
    ) {
      item.seen = true;
      state.score += 14 * state.chain;
      state.chain = Math.min(12, state.chain + 1);
      addSpark(item.x, state.player.y, "#47d8ff", 8);
      showMessage("NEAR MISS");
    }
  }

  for (const spark of state.sparks) {
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vy += 280 * dt;
    spark.life -= dt;
  }
  state.sparks = state.sparks.filter((spark) => spark.life > 0);

  for (const ring of state.rings) {
    ring.age += dt;
    ring.life -= dt;
  }
  state.rings = state.rings.filter((ring) => ring.life > 0);

  for (const trail of state.trail) trail.life -= dt;
  state.trail = state.trail.filter((trail) => trail.life > 0);

  state.score += dt * state.chain * 2;
  state.shield -= dt * (0.021 + state.phase * 0.002);
  if (state.shield <= 0) gameOver();

  scoreEl.textContent = Math.floor(state.score);
  chainEl.textContent = `x${state.chain}`;
  phaseEl.textContent = ["I", "II", "III", "IV", "V"][state.phase - 1] || "V";
  shieldBar.style.transform = `scaleX(${Math.max(0, state.shield)})`;
}

function gameOver() {
  state.running = false;
  state.best = Math.max(state.best, Math.floor(state.score));
  localStorage.setItem("auric-drift-best", state.best);
  bestEl.textContent = state.best;
  overlay.querySelector(".brand").textContent = "DRIFT LOST";
  overlay.querySelector("p").textContent = `Score ${Math.floor(state.score)}. Tap launch and run it back.`;
  startButton.textContent = "Launch Again";
  overlay.classList.remove("hidden");
}

function drawPlayer(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(state.player.vx * 0.002);
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#47d8ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 30 + Math.sin(state.time * 7) * 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowColor = "#47d8ff";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#edf7ff";
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(18, 18);
  ctx.lineTo(0, 10);
  ctx.lineTo(-18, 18);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = "#ffd45f";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#ffd45f";
  ctx.beginPath();
  ctx.arc(0, 3, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawItem(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.spin);
  if (item.type === "gold") {
    ctx.shadowColor = "#ffd45f";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#ffd45f";
    ctx.beginPath();
    ctx.roundRect(-10, -10, 20, 20, 5);
    ctx.fill();
    ctx.fillStyle = "#8a5b00";
    ctx.fillRect(-5, -2, 10, 4);
  } else if (item.type === "gate") {
    ctx.strokeStyle = "#47d8ff";
    ctx.lineWidth = 5;
    ctx.shadowColor = "#47d8ff";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, item.r, 0.25 * Math.PI, 1.75 * Math.PI);
    ctx.stroke();
  } else if (item.type === "shield") {
    ctx.fillStyle = "#3ee6a6";
    ctx.shadowColor = "#3ee6a6";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(13, -5);
    ctx.lineTo(8, 13);
    ctx.lineTo(0, 18);
    ctx.lineTo(-8, 13);
    ctx.lineTo(-13, -5);
    ctx.closePath();
    ctx.fill();
  } else if (item.type === "prism") {
    ctx.strokeStyle = "#ff8bd2";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ff8bd2";
    ctx.shadowBlur = 22;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = i % 2 ? 9 : item.r + 3;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 139, 210, 0.42)";
    ctx.fill();
  } else {
    ctx.fillStyle = "#ff6678";
    ctx.shadowColor = "#ff6678";
    ctx.shadowBlur = 17;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? item.r * 0.56 : item.r;
      const a = (i / 10) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function draw() {
  const sx = (Math.random() - 0.5) * state.shake;
  const sy = (Math.random() - 0.5) * state.shake;
  ctx.clearRect(0, 0, state.width, state.height);
  ctx.save();
  ctx.translate(sx, sy);

  const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
  gradient.addColorStop(0, state.phase >= 4 ? "#17112b" : "#101728");
  gradient.addColorStop(0.55, "#080b12");
  gradient.addColorStop(1, "#17100b");
  ctx.fillStyle = gradient;
  ctx.fillRect(-20, -20, state.width + 40, state.height + 40);

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#3ee6a6";
  ctx.beginPath();
  ctx.ellipse(state.width * 0.15, state.height * 0.2, 95, 34, -0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd45f";
  ctx.beginPath();
  ctx.arc(state.width * 0.84, state.height * 0.12, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  for (const star of state.stars) {
    ctx.globalAlpha = 0.35 + star.z * 0.35;
    ctx.fillStyle = star.z > 1 ? "#ffd45f" : "#dff7ff";
    ctx.fillRect(star.x, star.y, 1.2 + star.z, 10 * star.z);
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(255, 212, 95, 0.18)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const x = ((state.time * state.speed * 0.16 + i * 130) % (state.width + 160)) - 80;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 130, state.height);
    ctx.stroke();
  }

  for (const trail of state.trail) {
    ctx.globalAlpha = Math.max(0, trail.life * 2.5);
    ctx.fillStyle = "#47d8ff";
    ctx.beginPath();
    ctx.ellipse(trail.x, trail.y, trail.w, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const ring of state.rings) {
    const p = ring.age / (ring.age + ring.life);
    ctx.globalAlpha = Math.max(0, ring.life * 2.1);
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.size * (0.25 + p), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const item of state.items) drawItem(item);
  drawPlayer(state.player.x, state.player.y);

  for (const spark of state.sparks) {
    ctx.globalAlpha = Math.max(0, spark.life * 2);
    ctx.fillStyle = spark.color;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 102, 120, ${state.flash * 0.18})`;
    ctx.fillRect(-20, -20, state.width + 40, state.height + 40);
  }

  if (state.messageTime > 0) {
    ctx.globalAlpha = Math.min(1, state.messageTime * 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 22px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(state.message, state.width / 2, state.height * 0.34);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function loop(now) {
  if (!state.running) return;
  const dt = Math.min(0.033, (now - state.last) / 1000);
  state.last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function setPointer(event, active = true) {
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches?.[0] || event.changedTouches?.[0] || event;
  state.pointer.active = active;
  state.pointer.x = touch.clientX - rect.left;
  state.pointer.y = touch.clientY - rect.top;
}

window.addEventListener("resize", resize);
canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  setPointer(event);
});
canvas.addEventListener("pointermove", (event) => setPointer(event));
canvas.addEventListener("pointerup", () => (state.pointer.active = false));
canvas.addEventListener("pointercancel", () => (state.pointer.active = false));
startButton.addEventListener("click", reset);

resize();
draw();
