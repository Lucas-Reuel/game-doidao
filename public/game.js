const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const socket = io();

let players = {};
let myId = null;
let projectiles = [];
let trees = [];
let selectedSlot = 0;
const keys = {};
const speed = 2;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// 🎮 Eventos de teclado
window.addEventListener("keydown", e => {
  keys[e.key] = true;

  // Troca de slot da hotbar
  if (["1", "2", "3", "4"].includes(e.key)) {
    selectedSlot = parseInt(e.key) - 1;
    socket.emit("select-slot", selectedSlot);
    if (typeof updateHotbar === "function") updateHotbar();
  }
});

window.addEventListener("keyup", e => keys[e.key] = false);

// 📦 Eventos do socket
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

socket.on("projectiles", data => {
  projectiles = data;
});

socket.on("trees", data => {
  trees = data;
});

// 🖱️ Clique para atirar ou cortar
canvas.addEventListener("click", e => {
  const player = players[myId];
  if (!player) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const angle = Math.atan2(mouseY - player.y, mouseX - player.x);

  if (selectedSlot === 0) {
    socket.emit("shoot", {
      x: player.x,
      y: player.y,
      angle: angle,
    });
  } else if (selectedSlot === 1) {
    socket.emit("chop", { x: mouseX, y: mouseY });
  }
});

// 🔁 Atualização de movimento
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

// 🖼️ Renderização
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Desenhar jogadores
  for (let id in players) {
    const p = players[id];
    ctx.fillStyle = id === myId ? "lime" : "white";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size || 10, 0, Math.PI * 2);
    ctx.fill();

    // Arma na mão do player (se for você e slot 0)
    if (id === myId && selectedSlot === 0) {
      ctx.fillStyle = "gray";
      ctx.fillRect(p.x + 15, p.y - 2, 10, 4);
    }

    // Barra de vida do player
    ctx.fillStyle = "red";
    ctx.fillRect(p.x - (p.size || 10), p.y - (p.size || 10) - 10, ((p.hp || 100) / 100) * ((p.size || 10) * 2), 5);
  }

  // Desenhar árvores
  trees.forEach(tree => {
    ctx.fillStyle = "#4CAF50"; // verde-folha
    ctx.beginPath();
    ctx.arc(tree.x, tree.y, 15, 0, Math.PI * 2);
    ctx.fill();

    // Barra de vida da árvore
    const hpRatio = (tree.hp || 3) / 3;
    const barWidth = 30;
    const barHeight = 4;

    ctx.fillStyle = "black";
    ctx.fillRect(tree.x - barWidth / 2, tree.y - 25, barWidth, barHeight);

    ctx.fillStyle = "red";
    ctx.fillRect(tree.x - barWidth / 2, tree.y - 25, barWidth * hpRatio, barHeight);
  });

  // Desenhar projéteis
  ctx.fillStyle = "yellow";
  projectiles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // Exibir madeira
  if (players[myId]) {
    ctx.fillStyle = "white";
    ctx.font = "16px sans-serif";
    ctx.fillText("Madeira: " + (players[myId].wood || 0), 20, 30);
  }
}

// Loop principal
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
