const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const socket = io();
let projectiles = [];


function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

let players = {};
let myId = null;

const speed = 2;

socket.on("init", data => {
  players = data;
  myId = socket.id;
});

socket.on("new-player", player => {
  players[player.id] = player;
});

socket.on("update", data => {
  players = data;
});

socket.on("remove-player", id => {
  delete players[id];
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let id in players) {
    const p = players[id];
    ctx.fillStyle = id === myId ? "lime" : "white";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
    ctx.fill();
  }
}

function update() {
  let dx = 0, dy = 0;
if (keys["w"] || keys["W"]) dy = -speed;
if (keys["s"] || keys["S"]) dy = speed;
if (keys["a"] || keys["A"]) dx = -speed;
if (keys["d"] || keys["D"]) dx = speed;

  if (dx !== 0 || dy !== 0) {
    socket.emit("move", { x: dx, y: dy });
  }
}

socket.on("projectiles", data => {
  projectiles = data;
});

const keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Desenha players
  for (let id in players) {
    const p = players[id];
    ctx.fillStyle = id === myId ? "lime" : "white";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size || 10, 0, Math.PI * 2);
    ctx.fill();

    // Desenha barra de vida
    ctx.fillStyle = "red";
    ctx.fillRect(p.x - (p.size || 10), p.y - (p.size || 10) - 10, ((p.hp || 100) / 100) * ((p.size || 10) * 2), 5);
  }

  // Desenha projéteis
  ctx.fillStyle = "yellow";
  projectiles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

canvas.addEventListener("click", e => {
  if (!players[myId]) return;

  const player = players[myId];
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // ângulo do player até o mouse
  const angle = Math.atan2(mouseY - player.y, mouseX - player.x);

  socket.emit("shoot", {
    x: player.x,
    y: player.y,
    angle: angle,
  });
});

