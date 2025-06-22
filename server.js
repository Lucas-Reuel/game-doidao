const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const projectiles = [];


const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const players = {};

app.use(express.static("public"));

io.on("connection", socket => {
  console.log("Novo jogador:", socket.id);

  socket.on("shoot", data => {
  // data = { x: startX, y: startY, angle: angleInRadians }
  projectiles.push({
    ownerId: socket.id,
    x: data.x,
    y: data.y,
    angle: data.angle,
    speed: 10,
    size: 5,
  });
});

  
  players[socket.id] = {
    x: Math.random() * 500,
    y: Math.random() * 500,
    id: socket.id,
  };

  socket.emit("init", players);
  socket.broadcast.emit("new-player", players[socket.id]);

  players[socket.id] = {
  x: Math.random() * 500,
  y: Math.random() * 500,
  id: socket.id,
  size: 20,
  hp: 100, // vida inicial
};


  socket.on("move", data => {
    if (players[socket.id]) {
      players[socket.id].x += data.x;
      players[socket.id].y += data.y;
      io.emit("update", players);
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("remove-player", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});

setInterval(() => {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += Math.cos(p.angle) * p.speed;
    p.y += Math.sin(p.angle) * p.speed;

    // Verificar colisão com players (exceto o dono do tiro)
    for (const id in players) {
      if (id !== p.ownerId) {
        const player = players[id];
        const dx = player.x - p.x;
        const dy = player.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.size + p.size) {
          // Tiro acertou o player
          player.hp -= 10; // dano 10

          if (player.hp <= 0) {
            // player morreu, remove do jogo
            delete players[id];
            io.emit("remove-player", id);
          }

          // Remove o projétil
          projectiles.splice(i, 1);
          break;
        }
      }
    }

    // Remover projétil fora da tela (limites 0-800 x, 0-600 y)
    if (p.x < 0 || p.x > 800 || p.y < 0 || p.y > 600) {
      projectiles.splice(i, 1);
    }
  }

  io.emit("projectiles", projectiles);
  io.emit("update", players);
}, 50);

