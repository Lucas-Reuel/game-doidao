const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const crypto = require("crypto"); // necessário para gerar IDs únicos

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

const players = {};
const projectiles = [];
const trees = [];

// Spawna uma árvore mantendo distância mínima
function spawnTree() {
  const minDistance = 100;
  const maxTrees = 30;
  if (trees.length >= maxTrees) return;

  const newTree = {
  id: crypto.randomUUID(),
  x: Math.random() * 800,
  y: Math.random() * 600,
  hp: 3, // 🪓 vida da árvore
};


  for (const tree of trees) {
    const dx = newTree.x - tree.x;
    const dy = newTree.y - tree.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDistance) return;
  }

  trees.push(newTree);
}

setInterval(spawnTree, 3000); // Tenta spawnar árvores a cada 3s

// Atualização do jogo (tiros, players, árvores)
setInterval(() => {
  // Atualiza projéteis
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += Math.cos(p.angle) * p.speed;
    p.y += Math.sin(p.angle) * p.speed;

    // Colisão com players
    for (const id in players) {
      if (id !== p.ownerId) {
        const player = players[id];
        const dx = player.x - p.x;
        const dy = player.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.size + p.size) {
          player.hp -= 10;
          if (player.hp <= 0) {
            delete players[id];
            io.emit("remove-player", id);
          }
          projectiles.splice(i, 1);
          break;
        }
      }
    }

    // Fora da tela
    if (p.x < 0 || p.x > 800 || p.y < 0 || p.y > 600) {
      projectiles.splice(i, 1);
    }
  }

  io.emit("projectiles", projectiles);
  io.emit("trees", trees);
  io.emit("update", players);
}, 50);

// Conexão de jogadores
io.on("connection", socket => {
  console.log("Novo jogador:", socket.id);

  players[socket.id] = {
    x: Math.random() * 500,
    y: Math.random() * 500,
    id: socket.id,
    size: 20,
    hp: 100,
    wood: 0,
    selectedSlot: 0,
  };

  socket.emit("init", players);
  socket.broadcast.emit("new-player", players[socket.id]);

  // Movimento
  socket.on("move", data => {
    const player = players[socket.id];
    if (player) {
      player.x += data.x;
      player.y += data.y;
    }
  });

  // Tiro
  socket.on("shoot", data => {
    projectiles.push({
      ownerId: socket.id,
      x: data.x,
      y: data.y,
      angle: data.angle,
      speed: 10,
      size: 5,
    });
  });

  // Trocar slot da hotbar
  socket.on("select-slot", slot => {
    if (players[socket.id]) {
      players[socket.id].selectedSlot = slot;
    }
  });

  // Cortar árvore com machado
  socket.on("chop", ({ x, y }) => {
  const player = players[socket.id];
  if (!player || player.selectedSlot !== 1) return;

  for (let i = 0; i < trees.length; i++) {
    const tree = trees[i];
    const dx = tree.x - player.x;
    const dy = tree.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);


    if (dist < 50) { // 🔸 distância permitida para cortar
      tree.hp = (tree.hp || 3) - 1;

      if (tree.hp <= 0) {
        trees.splice(i, 1);
        player.wood += 1;
      }
      break;
    }
  }
});

  // Desconexão
  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("remove-player", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
