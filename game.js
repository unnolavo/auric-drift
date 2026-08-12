const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const chainEl = document.querySelector("#chain");
const stageEl = document.querySelector("#stage");
const bestEl = document.querySelector("#best");
const objectiveEl = document.querySelector("#objective");
const objectiveProgressEl = document.querySelector("#objectiveProgress");
const vaultBar = document.querySelector("#vaultBar");
const shieldBar = document.querySelector("#shieldBar");
const pulseButton = document.querySelector("#pulseButton");
const overlay = document.querySelector("#overlay");
const upgradeChoices = document.querySelector("#upgradeChoices");
const startButton = document.querySelector("#startButton");

const roman = ["I", "II", "III", "VAULT"];
const stages = [
  { name: "Steal 12 gold caches", goal: "gold", target: 12, duration: 42 },
  { name: "Thread 6 security gates", goal: "gates", target: 6, duration: 44 },
  { name: "Survive the laser storm", goal: "survive", target: 38, duration: 38 },
  { name: "Crack the vault core", goal: "vault", target: 100, duration: 60 },
];

const upgrades = [
  {
    id: "magnet",
    title: "Magnet Wake",
    text: "Gold and prisms bend toward your ship.",
    apply: () => (state.upgrades.magnet += 1),
  },
  {
    id: "regen",
    title: "Shield Siphon",
    text: "Successful pickups repair a little shield.",
    apply: () => (state.upgrades.regen += 1),
  },
  {
    id: "pulse",
    title: "Faster Pulse",
    text: "Pulse recharges sooner and hits wider.",
    apply: () => (state.upgrades.pulse += 1),
  },
  {
    id: "chain",
    title: "Chain Engine",
    text: "Combos climb faster and pay more.",
    apply: () => (state.upgrades.chain += 1),
  },
  {
    id: "armor",
    title: "Ceramic Hull",
    text: "Mines and lasers hurt less.",
    apply: () => (state.upgrades.armor += 1),
  },
  {
    id: "dash",
    title: "Slipstream Dash",
    text: "Pulse also grants a short invulnerable burst.",
    apply: () => (state.upgrades.dash += 1),
  },
];

const state = {
  mode: "menu",
  width: 0,
  height: 0,
  dpr: 1,
  time: 0,
  last: 0,
  stage: 0,
  stageTime: 0,
  score: 0,
  best: Number(localStorage.getItem("auric-drift-best") || 0),
  chain: 1,
  shield: 1,
  speed: 300,
  spawn: 0,
  hazardSpawn: 2.5,
  shake: 0,
  flash: 0,
  message: "",
  messageTime: 0,
  pulseCooldown: 0,
  pulseFlash: 0,
  invuln: 0,
  pointer: { active: false, x: 0, y: 0 },
  player: { x: 0, y: 0, r: 17, vx: 0 },
  run: { gold: 0, gates: 0, near: 0, vault: 0 },
  upgrades: { magnet: 0, regen: 0, pulse: 0, chain: 0, armor: 0, dash: 0 },
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
  state.stars = Array.from({ length: 86 }, () => ({
    x: Math.random() * state.width,
    y: Math.random() * state.height,
    z: 0.35 + Math.random() * 1.35,
  }));
}

function resetRun() {
  state.mode = "running";
  state.time = 0;
  state.last = performance.now();
  state.stage = 0;
  state.stageTime = 0;
  state.score = 0;
  state.chain = 1;
  state.shield = 1;
  state.speed = 300;
  state.spawn = 0;
  state.hazardSpawn = 2.2;
  state.shake = 0;
  state.flash = 0;
  state.message = "STAGE I";
  state.messageTime = 1.1;
  state.pulseCooldown = 0;
  state.pulseFlash = 0;
  state.invuln = 0;
  state.run = { gold: 0, gates: 0, near: 0, vault: 0 };
  state.upgrades = { magnet: 0, regen: 0, pulse: 0, chain: 0, armor: 0, dash: 0 };
  state.items = [];
  state.sparks = [];
  state.rings = [];
  state.trail = [];
  state.player.x = state.width / 2;
  state.player.vx = 0;
  upgradeChoices.innerHTML = "";
  overlay.classList.add("hidden");
  updateHud();
  requestAnimationFrame(loop);
}

function addSpark(x, y, color, count = 12, power = 1) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (80 + Math.random() * 230) * power;
    state.sparks.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0.34 + Math.random() * 0.34,
      color,
      r: 1.4 + Math.random() * 3.6,
    });
  }
}

function addRing(x, y, color, size = 54) {
  state.rings.push({ x, y, color, size, life: 0.46, age: 0 });
}

function showMessage(text, seconds = 0.95) {
  state.message = text;
  state.messageTime = seconds;
}

function spawnItem() {
  const stage = state.stage;
  const roll = Math.random();
  const x = 34 + Math.random() * (state.width - 68);
  if (stage === 3 && roll < 0.2) {
    state.items.push({ type: "core", x, y: -30, r: 17, spin: Math.random() * 6, seen: false });
    return;
  }
  if (roll < 0.42) {
    state.items.push({ type: "gold", x, y: -24, r: 12, spin: Math.random() * 6, seen: false });
  } else if (roll < 0.64) {
    state.items.push({ type: "gate", x, y: -44, r: 25, spin: 0, seen: false });
  } else if (roll < 0.77) {
    state.items.push({ type: "shield", x, y: -24, r: 13, spin: 0, seen: false });
  } else if (roll < 0.88) {
    state.items.push({ type: "prism", x, y: -28, r: 15, spin: Math.random() * 6, seen: false });
  } else {
    state.items.push({ type: "mine", x, y: -34, r: 18 + Math.random() * 9, spin: 0, seen: false });
  }
}

function spawnHazard() {
  if (state.stage < 1) return;
  if (Math.random() < 0.55) {
    const gap = 88 + Math.random() * 46;
    state.items.push({
      type: "wall",
      x: state.width / 2,
      y: -28,
      r: 18,
      gapX: 54 + Math.random() * (state.width - 108),
      gapW: gap,
      spin: 0,
      seen: false,
    });
  } else {
    state.items.push({
      type: "laser",
      x: Math.random() < 0.5 ? 0 : state.width,
      y: -24,
      r: 18,
      dir: Math.random() < 0.5 ? 1 : -1,
      spin: 0,
      seen: false,
    });
  }
}

function collideCircle(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const rr = a.r + b.r;
  return dx * dx + dy * dy < rr * rr;
}

function hitWall(item) {
  return (
    Math.abs(state.player.y - item.y) < 15 + state.player.r &&
    Math.abs(state.player.x - item.gapX) > item.gapW * 0.5
  );
}

function hitLaser(item) {
  return Math.abs(state.player.y - item.y) < 9 + state.player.r && Math.abs(state.player.x - item.x) < 78;
}

function hurt(amount, x, y) {
  if (state.invuln > 0) return;
  const reduction = 1 - Math.min(0.45, state.upgrades.armor * 0.16);
  state.shield -= amount * reduction;
  state.chain = 1;
  state.shake = 10;
  state.flash = 1;
  addSpark(x, y, "#ff6678", 22);
  addRing(x, y, "#ff6678", 76);
  showMessage("HULL HIT");
}

function collect(item) {
  const chainBonus = 1 + state.upgrades.chain * 0.2;
  const regen = 0.025 + state.upgrades.regen * 0.045;
  let value = 0;
  let color = "#ffd45f";
  if (item.type === "gold") {
    value = 12;
    state.run.gold += 1;
  } else if (item.type === "gate") {
    value = 30;
    state.run.gates += 1;
    color = "#47d8ff";
  } else if (item.type === "shield") {
    value = 18;
    state.shield = Math.min(1, state.shield + 0.25 + state.upgrades.regen * 0.05);
    color = "#3ee6a6";
  } else if (item.type === "prism") {
    value = 52;
    state.run.vault = Math.min(100, state.run.vault + (state.stage === 3 ? 9 : 3));
    color = "#ff8bd2";
    showMessage("PRISM SURGE");
  } else if (item.type === "core") {
    value = 70;
    state.run.vault = Math.min(100, state.run.vault + 14);
    color = "#ffd45f";
    showMessage("CORE BREACH");
  }

  state.score += value * state.chain * chainBonus;
  state.chain = Math.min(15, state.chain + 1 + state.upgrades.chain);
  if (state.upgrades.regen > 0 && item.type !== "shield") state.shield = Math.min(1, state.shield + regen);
  addSpark(item.x, item.y, color, item.type === "core" ? 28 : 14);
  addRing(item.x, item.y, color, item.type === "core" ? 90 : 50);
}

function usePulse() {
  if (state.mode !== "running" || state.pulseCooldown > 0) return;
  const radius = 96 + state.upgrades.pulse * 28;
  let cleared = 0;
  for (let i = state.items.length - 1; i >= 0; i--) {
    const item = state.items[i];
    const dangerous = item.type === "mine" || item.type === "laser" || item.type === "wall";
    const dx = (item.gapX || item.x) - state.player.x;
    const dy = item.y - state.player.y;
    if (dangerous && dx * dx + dy * dy < radius * radius) {
      addSpark(item.x || item.gapX, item.y, "#47d8ff", 14, 1.25);
      state.items.splice(i, 1);
      cleared += 1;
    }
  }
  state.score += cleared * 28 * state.chain;
  state.pulseCooldown = Math.max(2.5, 5.6 - state.upgrades.pulse * 1.2);
  state.pulseFlash = 0.42;
  state.invuln = 0.28 + state.upgrades.dash * 0.42;
  state.shake = 5;
  addRing(state.player.x, state.player.y, "#47d8ff", radius);
  showMessage(cleared ? `PULSE x${cleared}` : "PULSE");
}

function objectiveStatus() {
  const stage = stages[state.stage];
  if (stage.goal === "gold") return [state.run.gold, stage.target];
  if (stage.goal === "gates") return [state.run.gates, stage.target];
  if (stage.goal === "survive") return [Math.min(stage.target, Math.floor(state.stageTime)), stage.target];
  return [state.run.vault, stage.target];
}

function objectiveComplete() {
  const [value, target] = objectiveStatus();
  return value >= target;
}

function completeStage() {
  state.mode = "upgrade";
  state.items = [];
  state.sparks = [];
  state.stageTime = 0;
  state.score += 120 + state.stage * 60;
  if (state.stage === 3) {
    winRun();
    return;
  }
  showUpgradeScreen();
}

function drawUpgradeOptions() {
  const options = [...upgrades].sort(() => Math.random() - 0.5).slice(0, 3);
  upgradeChoices.innerHTML = "";
  for (const option of options) {
    const button = document.createElement("button");
    button.className = "upgrade-card";
    button.type = "button";
    button.innerHTML = `<strong>${option.title}</strong><span>${option.text}</span>`;
    button.addEventListener("click", () => {
      option.apply();
      state.stage += 1;
      state.mode = "running";
      state.stageTime = 0;
      state.spawn = 0.25;
      state.hazardSpawn = 1.6;
      state.message = state.stage === 3 ? "VAULT CORE" : `STAGE ${roman[state.stage]}`;
      state.messageTime = 1.2;
      overlay.classList.add("hidden");
      upgradeChoices.innerHTML = "";
      state.last = performance.now();
      updateHud();
      requestAnimationFrame(loop);
    });
    upgradeChoices.append(button);
  }
}

function showUpgradeScreen() {
  overlay.querySelector(".brand").textContent = "STAGE CLEAR";
  overlay.querySelector("p").textContent = "Choose one upgrade for the next leg of the heist.";
  startButton.style.display = "none";
  drawUpgradeOptions();
  overlay.classList.remove("hidden");
}

function winRun() {
  state.mode = "won";
  const score = Math.floor(state.score + state.shield * 300);
  state.best = Math.max(state.best, score);
  localStorage.setItem("auric-drift-best", state.best);
  bestEl.textContent = state.best;
  overlay.querySelector(".brand").textContent = "VAULT OPEN";
  overlay.querySelector("p").textContent = `Heist complete. Score ${score}. Run it back for a cleaner route.`;
  upgradeChoices.innerHTML = "";
  startButton.style.display = "";
  startButton.textContent = "New Heist";
  overlay.classList.remove("hidden");
}

function gameOver() {
  state.mode = "lost";
  state.best = Math.max(state.best, Math.floor(state.score));
  localStorage.setItem("auric-drift-best", state.best);
  bestEl.textContent = state.best;
  overlay.querySelector(".brand").textContent = "HEIST LOST";
  overlay.querySelector("p").textContent = `Stage ${roman[state.stage]} failed. Score ${Math.floor(state.score)}.`;
  upgradeChoices.innerHTML = "";
  startButton.style.display = "";
  startButton.textContent = "Retry Heist";
  overlay.classList.remove("hidden");
}

function update(dt) {
  state.time += dt;
  state.stageTime += dt;
  state.speed += dt * (8 + state.stage * 4);
  state.spawn -= dt;
  state.hazardSpawn -= dt;
  state.shake = Math.max(0, state.shake - dt * 22);
  state.flash = Math.max(0, state.flash - dt * 3);
  state.messageTime = Math.max(0, state.messageTime - dt);
  state.pulseCooldown = Math.max(0, state.pulseCooldown - dt);
  state.pulseFlash = Math.max(0, state.pulseFlash - dt);
  state.invuln = Math.max(0, state.invuln - dt);

  if (state.spawn <= 0) {
    spawnItem();
    state.spawn = Math.max(0.15, 0.48 - state.stage * 0.045 - state.time * 0.002);
  }
  if (state.hazardSpawn <= 0) {
    spawnHazard();
    state.hazardSpawn = Math.max(0.85, 2.8 - state.stage * 0.42 + Math.random() * 0.6);
  }

  const targetX = state.pointer.active ? state.pointer.x : state.width / 2 + Math.sin(state.time * 1.2) * 38;
  state.player.vx += (targetX - state.player.x) * dt * 18;
  state.player.vx *= Math.pow(0.0008, dt);
  state.player.x += state.player.vx * dt;
  state.player.x = Math.max(28, Math.min(state.width - 28, state.player.x));
  state.trail.unshift({
    x: state.player.x,
    y: state.player.y + 10,
    w: 8 + Math.min(22, Math.abs(state.player.vx) * 0.055),
    life: 0.28,
  });
  state.trail = state.trail.slice(0, 20);

  for (const star of state.stars) {
    star.y += state.speed * dt * star.z * 0.28;
    if (star.y > state.height + 4) {
      star.y = -4;
      star.x = Math.random() * state.width;
    }
  }

  for (const item of state.items) {
    if (state.upgrades.magnet > 0 && ["gold", "shield", "prism", "core"].includes(item.type)) {
      const dx = state.player.x - item.x;
      const dy = state.player.y - item.y;
      const pullRange = 110 + state.upgrades.magnet * 46;
      if (dx * dx + dy * dy < pullRange * pullRange) {
        item.x += dx * dt * (1.8 + state.upgrades.magnet * 0.7);
        item.y += dy * dt * 0.8;
      }
    }
    if (item.type === "laser") {
      item.x += item.dir * (110 + state.stage * 18) * dt;
      if (item.x < 36 || item.x > state.width - 36) item.dir *= -1;
    }
    const itemSpeed = item.type === "gate" ? 1.08 : item.type === "prism" || item.type === "core" ? 0.92 : 1;
    item.y += state.speed * dt * itemSpeed;
    item.spin += dt * (item.type === "mine" ? 3.4 : 5);
  }

  for (let i = state.items.length - 1; i >= 0; i--) {
    const item = state.items[i];
    if (item.type === "mine" && collideCircle(state.player, item)) {
      hurt(0.32, item.x, item.y);
      state.items.splice(i, 1);
    } else if (item.type === "wall" && hitWall(item)) {
      hurt(0.28, state.player.x, item.y);
      state.items.splice(i, 1);
    } else if (item.type === "laser" && hitLaser(item)) {
      hurt(0.24, state.player.x, item.y);
      state.items.splice(i, 1);
    } else if (!["wall", "laser", "mine"].includes(item.type) && collideCircle(state.player, item)) {
      collect(item);
      state.items.splice(i, 1);
    } else if (item.y > state.height + 56) {
      if (!["mine", "wall", "laser"].includes(item.type)) state.chain = 1;
      state.items.splice(i, 1);
    } else if (
      item.type === "mine" &&
      !item.seen &&
      item.y > state.player.y + state.player.r &&
      Math.abs(item.x - state.player.x) < item.r + state.player.r + 24
    ) {
      item.seen = true;
      state.run.near += 1;
      state.score += 16 * state.chain;
      state.chain = Math.min(15, state.chain + 1);
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

  state.score += dt * state.chain * (2.4 + state.stage * 0.35);
  state.shield -= dt * (0.018 + state.stage * 0.003);
  if (state.shield <= 0) gameOver();
  if (state.mode === "running" && objectiveComplete()) completeStage();
  updateHud();
}

function updateHud() {
  const stage = stages[state.stage] || stages[0];
  const [value, target] = objectiveStatus();
  scoreEl.textContent = Math.floor(state.score);
  chainEl.textContent = `x${state.chain}`;
  stageEl.textContent = roman[state.stage] || "I";
  objectiveEl.textContent = stage.name;
  objectiveProgressEl.textContent = `${Math.floor(value)}/${target}`;
  shieldBar.style.transform = `scaleX(${Math.max(0, state.shield)})`;
  vaultBar.style.transform = `scaleX(${Math.max(0, Math.min(1, state.run.vault / 100))})`;
  pulseButton.disabled = state.mode !== "running" || state.pulseCooldown > 0;
  pulseButton.textContent =
    state.mode === "running" && state.pulseCooldown > 0 ? `${Math.ceil(state.pulseCooldown)}s` : "Pulse";
}

function drawPlayer(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(state.player.vx * 0.002);
  ctx.globalAlpha = state.invuln > 0 ? 0.42 + Math.sin(state.time * 34) * 0.18 : 0.28;
  ctx.strokeStyle = state.invuln > 0 ? "#ffd45f" : "#47d8ff";
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
  } else if (item.type === "prism" || item.type === "core") {
    ctx.strokeStyle = item.type === "core" ? "#ffd45f" : "#ff8bd2";
    ctx.lineWidth = 3;
    ctx.shadowColor = item.type === "core" ? "#ffd45f" : "#ff8bd2";
    ctx.shadowBlur = 22;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = i % 2 ? 9 : item.r + 3;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = item.type === "core" ? "rgba(255, 212, 95, 0.34)" : "rgba(255, 139, 210, 0.42)";
    ctx.fill();
  } else if (item.type === "wall") {
    ctx.rotate(-item.spin);
    ctx.fillStyle = "rgba(255, 102, 120, 0.82)";
    ctx.shadowColor = "#ff6678";
    ctx.shadowBlur = 14;
    ctx.fillRect(-state.width / 2 - 8, -7, item.gapX - item.gapW * 0.5 + state.width / 2 - 8, 14);
    ctx.fillRect(item.gapX + item.gapW * 0.5 - state.width / 2, -7, state.width, 14);
  } else if (item.type === "laser") {
    ctx.rotate(-item.spin);
    ctx.fillStyle = "rgba(255, 102, 120, 0.88)";
    ctx.shadowColor = "#ff6678";
    ctx.shadowBlur = 20;
    ctx.fillRect(-72, -5, 144, 10);
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
  gradient.addColorStop(0, state.stage >= 3 ? "#17112b" : "#101728");
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

  if (state.stage === 3) {
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "#ffd45f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(state.width / 2, state.height * 0.18, 48 + Math.sin(state.time * 3) * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
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

  if (state.pulseFlash > 0) {
    ctx.strokeStyle = `rgba(71, 216, 255, ${state.pulseFlash * 1.6})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, 115 - state.pulseFlash * 120, 0, Math.PI * 2);
    ctx.stroke();
  }

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
  if (state.mode !== "running") return;
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
pulseButton.addEventListener("click", usePulse);
startButton.addEventListener("click", resetRun);

resize();
updateHud();
draw();
