(function (root) {
  "use strict";
  const D = root.WarData,
    { W, H, T, COLS, ROWS, F, U, B } = D,
    clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  class Renderer {
    constructor(canvas, mini) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: false });
      this.mini = mini;
      this.mc = mini.getContext("2d");
      this.camera = { x: 720, y: 550, zoom: 0.85 };
      this.width = innerWidth;
      this.height = innerHeight;
      this.selection = new Set();
      this.hover = null;
      this.pointer = { x: 0, y: 0 };
      this.mode = null;
      this.drag = null;
      this.fogCanvas = document.createElement("canvas");
      this.fogCanvas.width = COLS;
      this.fogCanvas.height = ROWS;
      this.fogCtx = this.fogCanvas.getContext("2d");
      this.resize();
      this.loadSprites();
    }
    loadSprites() {
      this.sprites = {};
      for (const k of [
        "tank",
        "tank_usa",
        "tank_rus",
        "tank_chn",
        "tank_ind",
        "tank_kor",
        "tank_imp",
        "destroyer",
        "fighter",
        "satellite",
        "orbital",
        "defense",
      ]) {
        const img = new Image();
        img.src = "assets/sprites/" + k + ".png";
        this.sprites[k] = img;
      }
    }
    sprite(g, k, angle, size) {
      const img = this.sprites?.[k];
      if (!img?.complete || !img.naturalWidth) return false;
      let frame = ((Math.round((angle / (Math.PI * 2)) * 16) % 16) + 16) % 16;
      g.drawImage(
        img,
        frame * 192,
        0,
        192,
        192,
        -size / 2,
        -size * 0.58,
        size,
        size,
      );
      return true;
    }
    resize() {
      this.width = innerWidth;
      this.height = innerHeight;
      const dpr = Math.min(2, devicePixelRatio || 1);
      this.canvas.width = Math.round(this.width * dpr);
      this.canvas.height = Math.round(this.height * dpr);
      this.dpr = dpr;
    }
    toWorld(x, y) {
      return {
        x: (x - this.width / 2) / this.camera.zoom + this.camera.x,
        y: (y - this.height / 2) / this.camera.zoom + this.camera.y,
      };
    }
    toScreen(x, y) {
      return {
        x: (x - this.camera.x) * this.camera.zoom + this.width / 2,
        y: (y - this.camera.y) * this.camera.zoom + this.height / 2,
      };
    }
    pan(dx, dy) {
      this.camera.x = clamp(this.camera.x + dx, 0, W);
      this.camera.y = clamp(this.camera.y + dy, 0, H);
    }
    zoomAt(factor, x, y) {
      const before = this.toWorld(x, y);
      this.camera.zoom = clamp(this.camera.zoom * factor, 0.38, 1.8);
      const after = this.toWorld(x, y);
      this.pan(before.x - after.x, before.y - after.y);
    }
    prepare(game) {
      this.mapId = game.map.id;
      const m = game.map,
        def = D.MAPS.find((d) => d.id === m.id),
        r = root.WarSim.rng(m.seed);
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d");
      g.fillStyle = def.palette[0];
      g.fillRect(0, 0, W, H);
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++) {
          const id = m.tiles[y * COLS + x];
          g.fillStyle = id === 1 ? def.palette[1] : def.palette[0];
          g.fillRect(x * T, y * T, T, T);
        }
      // Ground grain and irregular grass patches baked once, never regenerated in frame loop.
      for (let i = 0; i < 20000; i++) {
        const x = r() * W,
          y = r() * H;
        g.fillStyle = r() > 0.5 ? "#d5d1a610" : "#152d2515";
        g.fillRect(x, y, 2 + r() * 10, 1 + r() * 4);
      }
      g.strokeStyle = m.id === "desert" ? "#8b7e5b" : "#667563";
      g.lineWidth = 88;
      g.beginPath();
      g.moveTo(100, 1056);
      g.lineTo(2970, 1056);
      g.moveTo(720, 60);
      g.lineTo(720, 2050);
      g.moveTo(2352, 60);
      g.lineTo(2352, 2050);
      g.stroke();
      g.strokeStyle = m.id === "desert" ? "#aa9a72" : "#77816e";
      g.lineWidth = 60;
      g.stroke();
      if (m.id === "industry") {
        g.strokeStyle = "#424f4c";
        g.lineWidth = 72;
        g.beginPath();
        g.moveTo(80, 1056);
        g.lineTo(2980, 1056);
        g.moveTo(720, 60);
        g.lineTo(720, 2050);
        g.moveTo(2352, 60);
        g.lineTo(2352, 2050);
        g.stroke();
        g.strokeStyle = "#c5c5a244";
        g.lineWidth = 2;
        g.setLineDash([20, 22]);
        g.stroke();
        g.setLineDash([]);
      }
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++) {
          const id = m.tiles[y * COLS + x],
            px = x * T,
            py = y * T;
          if (id === 3 || id === 6) {
            g.fillStyle = "#365c65";
            g.fillRect(px, py, T, T);
            g.strokeStyle = "#93afb222";
            g.lineWidth = 1;
            for (let k = 0; k < 3; k++) {
              g.beginPath();
              g.moveTo(px + 5, py + k * 16 + 7);
              g.lineTo(px + 28 + r() * 12, py + k * 16 + 4);
              g.stroke();
            }
          }
          if (id === 4) {
            g.fillStyle = "#8f9380";
            g.fillRect(px, py, T, T);
            g.strokeStyle = "#555e53";
            g.lineWidth = 2;
            g.strokeRect(px + 2, py + 2, T - 4, T - 4);
            g.strokeStyle = "#c2bba855";
            for (let k = 10; k < 48; k += 12) {
              g.beginPath();
              g.moveTo(px + k, py);
              g.lineTo(px + k, py + 48);
              g.stroke();
            }
          }
          if (id === 2) {
            g.fillStyle = "#4d4a3d44";
            g.beginPath();
            g.ellipse(px + 32, py + 34, 25, 17, 0, 0, 7);
            g.fill();
            g.fillStyle = "#77765f";
            this.poly(g, [
              [px + 4, py + 29],
              [px + 13, py + 5],
              [px + 35, py + 8],
              [px + 45, py + 27],
              [px + 27, py + 38],
            ]);
            g.fillStyle = "#a29b79";
            this.poly(g, [
              [px + 13, py + 5],
              [px + 35, py + 8],
              [px + 24, py + 21],
              [px + 4, py + 29],
            ]);
          }
          if (id === 5) {
            g.fillStyle = "#17272c66";
            g.fillRect(px + 9, py + 10, 44, 41);
            g.fillStyle = "#4b5552";
            g.fillRect(px + 3, py + 3, 42, 42);
            g.fillStyle = "#838c7d";
            g.fillRect(px + 3, py + 3, 42, 8);
            g.fillStyle = "#596963";
            g.fillRect(px + 8, py + 15, 31, 20);
            g.strokeStyle = "#b1b4a14d";
            g.strokeRect(px + 8, py + 15, 31, 20);
          }
        }
      for (let i = 0; i < 220; i++) {
        let x = r() * W,
          y = r() * H,
          idx = Math.floor(y / T) * COLS + Math.floor(x / T);
        if (
          m.tiles[idx] > 1 ||
          m.spawns.some((p) => Math.hypot(x - p.x, y - p.y) < 330) ||
          m.nodes.some((p) => Math.hypot(x - p.x, y - p.y) < 130) ||
          Math.abs(y - 1056) < 75 ||
          Math.abs(x - 720) < 70 ||
          Math.abs(x - 2352) < 70
        )
          continue;
        if (m.id === "desert") {
          g.fillStyle = "#5d5f4533";
          g.fillRect(x, y, 4, 9);
        } else {
          const rad = 9 + r() * 16;
          g.fillStyle = "#12291e40";
          g.beginPath();
          g.ellipse(x + 8, y + 7, rad, rad * 0.65, 0, 0, 7);
          g.fill();
          g.fillStyle = "#304a36";
          g.beginPath();
          g.arc(x, y, rad, 0, 7);
          g.fill();
          g.fillStyle = "#506344";
          g.beginPath();
          g.arc(x - 4, y - 4, rad * 0.7, 0, 7);
          g.fill();
          g.fillStyle = "#6c7b4c";
          g.beginPath();
          g.arc(x - 7, y - 6, rad * 0.35, 0, 7);
          g.fill();
        }
      }
      for (const [i, p] of m.spawns.entries()) {
        g.strokeStyle = "#c5c4a14a";
        g.lineWidth = 2;
        g.setLineDash([14, 10]);
        g.strokeRect(p.x - 210, p.y - 165, 420, 420);
        g.setLineDash([]);
        g.fillStyle = "#d1d0af77";
        g.font = "14px Consolas";
        g.fillText("SECTOR 0" + (i + 1), p.x - 195, p.y - 180);
      }
      this.terrain = c;
      this.miniTerrain = document.createElement("canvas");
      this.miniTerrain.width = 246;
      this.miniTerrain.height = 168;
      this.miniTerrain.getContext("2d").drawImage(c, 0, 0, 246, 168);
    }
    poly(g, pts, stroke) {
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p)));
      g.closePath();
      g.fill();
      if (stroke) g.stroke();
    }
    rect(g, x, y, w, h, color) {
      g.fillStyle = color;
      g.fillRect(x, y, w, h);
    }
    drawBuilding(g, e, game, time, ghost = false) {
      const d = B[e.kind],
        f = F[game.teams[e.team].faction],
        col = f.color,
        r = e.r;
      g.save();
      g.translate(e.x, e.y);
      if (ghost) g.globalAlpha = 0.6;
      g.fillStyle = "#0b1e244f";
      g.fillRect(-r + 8, -r + 12, r * 2 + 8, r * 2 + 7);
      g.fillStyle = "#414e4b";
      g.fillRect(-r - 4, -r + 6, r * 2 + 8, r * 2 + 4);
      g.strokeStyle = "#acaf9766";
      g.lineWidth = 2;
      g.strokeRect(-r - 4, -r + 6, r * 2 + 8, r * 2 + 4);
      const base = "#748078",
        light = "#919b8b",
        shade = "#465952";
      if (e.kind === "navalyard") {
        this.rect(g, -35, -32, 70, 67, "#8b9585");
        this.rect(g, -20, -23, 40, 57, "#345964");
        this.rect(g, -34, -34, 68, 7, col);
        g.strokeStyle = "#b3b8a0";
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(-28, 20);
        g.lineTo(-28, -52);
        g.lineTo(25, -52);
        g.lineTo(25, -28);
        g.stroke();
      } else if (e.kind === "spaceport") {
        this.rect(g, -39, -30, 78, 65, "#53676b");
        g.strokeStyle = "#a8b7aa";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, 0, 25, 0, 7);
        g.stroke();
        this.rect(g, -6, -55, 12, 75, "#c4cbbb");
        this.polyColor(
          g,
          [
            [-6, -55],
            [0, -70],
            [6, -55],
          ],
          col,
        );
        this.polyColor(
          g,
          [
            [-6, 5],
            [-19, 22],
            [-6, 17],
          ],
          "#91a3a1",
        );
        this.polyColor(
          g,
          [
            [6, 5],
            [19, 22],
            [6, 17],
          ],
          "#91a3a1",
        );
        this.rect(g, -30, -48, 6, 70, "#546b66");
      } else if (
        e.kind === "laser" &&
        this.sprite(g, "defense", e.turret || 0, 118)
      ) {
      } else if (d.defense) {
        this.rect(g, -r, -r + 7, r * 2, r * 2 - 4, "#6c7f75");
        this.rect(g, -r, -r + 7, r * 2, 5, col);
        g.strokeStyle = "#c4c8ac";
        g.lineWidth = 2;
        if (e.kind === "radar") {
          g.save();
          g.rotate(time);
          g.beginPath();
          g.ellipse(0, -8, 22, 10, 0, 0, 7);
          g.stroke();
          g.beginPath();
          g.moveTo(0, -8);
          g.lineTo(25, -8);
          g.stroke();
          g.restore();
        } else if (e.kind === "shield") {
          g.fillStyle = "#7293a1";
          g.beginPath();
          g.arc(0, -7, 17, 0, 7);
          g.fill();
          g.strokeStyle = col;
          g.beginPath();
          g.arc(0, -7, 11, 0, 7);
          g.stroke();
        } else if (e.kind === "repairhub") {
          this.rect(g, -5, -21, 10, 28, "#d5d4b3");
          this.rect(g, -14, -12, 28, 9, "#d5d4b3");
        } else if (e.kind === "bunker") {
          this.rect(g, -25, -16, 50, 31, "#a0a18b");
          this.rect(g, -19, -7, 38, 7, "#233e42");
          this.rect(g, 0, -4, 30, 4, "#535f52");
        } else {
          g.rotate(e.turret || 0);
          this.rect(g, -13, -11, 26, 22, "#465f5d");
          this.rect(
            g,
            0,
            -3,
            e.kind === "laser" ? 37 : 29,
            6,
            e.kind === "laser" ? "#99dcf5" : "#c2c6a8",
          );
          if (e.kind === "sam") {
            this.rect(g, -8, -18, 30, 7, "#aeb9a0");
            this.rect(g, -8, 11, 30, 7, "#aeb9a0");
          }
          if (e.kind === "jammer") {
            g.strokeStyle = "#b2def2";
            g.beginPath();
            g.arc(0, 0, 19, 0, 7);
            g.stroke();
          }
        }
      } else if (e.kind === "hq") {
        this.rect(g, -43, -26, 86, 68, shade);
        this.rect(g, -43, -36, 86, 58, base);
        this.rect(g, -43, -36, 86, 9, light);
        this.rect(g, -31, -25, 62, 30, "#415953");
        this.rect(g, -27, -20, 54, 17, "#293e43");
        for (let x = -22; x < 27; x += 13)
          this.rect(g, x, -19, 2, 14, "#94b6ad");
        this.rect(g, -10, 8, 20, 34, "#283c40");
        this.rect(g, -43, 21, 86, 5, col);
        this.rect(g, -38, 28, 20, 8, "#59655e");
        g.strokeStyle = "#b4bbaa";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(27, -31);
        g.lineTo(27, -73);
        g.stroke();
        g.fillStyle = col;
        this.poly(g, [
          [27, -73],
          [48, -68],
          [27, -59],
        ]);
        g.strokeStyle = "#b2b8aa";
        g.beginPath();
        g.ellipse(-18, -42, 13, 7, -0.5, Math.PI, Math.PI * 2);
        g.lineTo(-18, -36);
        g.stroke();
        g.fillStyle = col;
        g.font = "bold 10px Consolas";
        g.textAlign = "center";
        g.fillText(f.flag, 0, -41);
      } else if (e.kind === "factory") {
        this.rect(g, -43, -28, 86, 65, shade);
        this.rect(g, -43, -37, 86, 51, base);
        for (let x = -32; x < 38; x += 20) {
          this.rect(g, x, -37, 12, 51, light);
          this.rect(g, x + 2, -30, 8, 26, "#6b796c");
        }
        this.rect(g, -23, 14, 46, 23, "#1c3037");
        this.rect(g, -24, 12, 48, 5, col);
        this.rect(g, 26, -45, 11, 60, "#515f58");
        this.rect(g, 25, -48, 13, 5, "#a0a68e");
        this.rect(g, -44, 37, 88, 6, "#c5b570");
        for (let x = -40; x < 43; x += 13) this.rect(g, x, 37, 6, 6, "#4a534e");
      } else if (e.kind === "power") {
        this.rect(g, -27, -11, 54, 37, shade);
        this.rect(g, -27, -20, 54, 35, base);
        for (let x = -16; x < 20; x += 29) {
          g.fillStyle = "#2b4144";
          g.beginPath();
          g.ellipse(x, -18, 10, 6, 0, 0, 7);
          g.fill();
          this.rect(g, x - 10, -18, 20, 28, "#9ba48b");
          g.fillStyle = "#c2c7ad";
          g.beginPath();
          g.ellipse(x, -18, 10, 6, 0, 0, 7);
          g.fill();
          this.rect(g, x - 3, -37, 6, 20, "#4a5c52");
          g.fillStyle = "#c8d3be33";
          g.beginPath();
          g.arc(
            x - 2 + Math.sin(time + x) * 4,
            -46 - ((time * 7) % 12),
            6,
            0,
            7,
          );
          g.fill();
        }
        this.rect(g, -27, 12, 54, 5, col);
      } else if (e.kind === "refinery") {
        this.rect(g, -35, -28, 70, 56, shade);
        this.rect(g, -35, -35, 70, 43, base);
        this.rect(g, -35, -35, 70, 7, light);
        g.fillStyle = "#879184";
        g.beginPath();
        g.ellipse(-16, -16, 14, 21, 0, 0, 7);
        g.fill();
        g.strokeStyle = "#bac1a2";
        g.stroke();
        this.rect(g, 7, -21, 24, 34, "#3c5357");
        for (let y = -15; y < 10; y += 9) this.rect(g, 10, y, 17, 3, col);
        this.rect(g, -33, 20, 64, 7, "#b4ac78");
      } else if (e.kind === "barracks") {
        this.rect(g, -29, -25, 58, 57, shade);
        this.rect(g, -29, -31, 58, 48, "#7b8573");
        this.polyColor(
          g,
          [
            [-31, -31],
            [0, -45],
            [31, -31],
            [0, -17],
          ],
          light,
        );
        this.rect(g, -9, 6, 18, 26, "#2a4144");
        this.rect(g, -28, 18, 56, 4, col);
        this.rect(g, 16, -14, 8, 8, "#bdc6b0");
      } else if (e.kind === "airfield") {
        this.rect(g, -44, -37, 88, 79, "#3b5155");
        g.strokeStyle = "#b8bea1";
        g.lineWidth = 2;
        g.strokeRect(-39, -32, 78, 68);
        g.beginPath();
        g.arc(0, 0, 25, 0, 7);
        g.stroke();
        g.font = "bold 37px Consolas";
        g.textAlign = "center";
        g.fillStyle = "#bcc5a8";
        g.fillText("H", 0, 12);
        this.rect(g, -43, 35, 86, 5, col);
        this.rect(g, -36, -37, 18, 8, "#c6b975");
      } else if (e.kind === "turret") {
        g.fillStyle = base;
        g.beginPath();
        g.arc(0, 0, 22, 0, 7);
        g.fill();
        g.strokeStyle = light;
        g.lineWidth = 3;
        g.stroke();
        g.rotate(e.turret || 0);
        this.rect(g, -12, -11, 26, 22, shade);
        this.rect(g, 0, -4, 39, 7, "#a6ad96");
        this.rect(g, -9, -9, 16, 18, base);
        this.rect(g, -9, -11, 16, 4, col);
      }
      if (e.disabled > game.time) {
        g.strokeStyle = "#9bd7ef";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, -10, r + 7, 0, 7);
        g.stroke();
      }
      g.restore();
    }
    polyColor(g, p, color) {
      g.fillStyle = color;
      this.poly(g, p);
    }
    drawUnit(g, e, game, time) {
      const d = U[e.kind],
        f = F[game.teams[e.team].faction],
        col = f.color,
        base = f.dark,
        light = e.team === 0 ? "#879278" : "#879082";
      g.save();
      g.translate(e.x, e.y);
      if (d.air) {
        g.save();
        g.translate(22, 25);
        g.rotate(e.angle);
        g.globalAlpha = 0.28;
        g.fillStyle = "#091d23";
        g.beginPath();
        g.ellipse(0, 0, 28, 17, 0, 0, 7);
        g.fill();
        g.restore();
        g.translate(0, -14 - Math.sin(time * 3 + e.anim) * 2);
      } else {
        g.fillStyle = "#11251c66";
        g.beginPath();
        g.ellipse(5, 7, e.r + 3, e.r * 0.7, 0, 0, 7);
        g.fill();
      }
      const spriteKey =
        e.kind === "tank"
          ? "tank_" + game.teams[e.team].faction
          : e.kind === "fighter" || e.kind === "jet"
            ? "fighter"
            : e.kind === "destroyer" || e.kind === "carrier"
              ? "destroyer"
              : e.kind === "satellite"
                ? "satellite"
                : e.kind === "orbital"
                  ? "orbital"
                  : null;
      if (
        spriteKey &&
        this.sprite(
          g,
          spriteKey,
          e.angle,
          e.kind === "tank"
            ? 96
            : e.kind === "carrier"
              ? 180
              : e.kind === "destroyer"
                ? 145
                : e.kind === "orbital"
                  ? 160
                  : 108,
        )
      ) {
        g.fillStyle = col;
        g.fillRect(-6, 17, 12, 2);
        g.restore();
        return;
      }
      g.rotate(e.angle);
      g.lineWidth = 1;
      if (d.space) {
        g.save();
        g.rotate(-e.angle);
        g.strokeStyle = col + "88";
        g.setLineDash([4, 7]);
        g.beginPath();
        g.ellipse(0, 0, e.r + 15, (e.r + 15) * 0.6, 0, 0, 7);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = col;
        g.font = "8px Consolas";
        g.textAlign = "center";
        g.fillText("ORBIT", 0, -e.r - 17);
        g.restore();
        if (e.kind === "satellite") {
          this.rect(g, -30, -12, 21, 24, "#4e7394");
          this.rect(g, 9, -12, 21, 24, "#4e7394");
          g.strokeStyle = "#9eafb8";
          g.strokeRect(-30, -12, 21, 24);
          g.strokeRect(9, -12, 21, 24);
          for (let x of [-23, -16, 16, 23])
            this.rect(g, x, -12, 1, 24, "#9bafbc");
          this.rect(g, -8, -9, 16, 18, "#c1c7b5");
          this.rect(g, -3, -20, 6, 12, col);
        } else {
          this.polyColor(
            g,
            [
              [-32, 0],
              [-18, -12],
              [4, -12],
              [32, 0],
              [4, 12],
              [-18, 12],
            ],
            "#93a5a4",
          );
          this.rect(g, -16, -24, 17, 48, "#586a77");
          for (let y = -21; y < 23; y += 8) this.rect(g, -12, y, 13, 3, col);
          this.polyColor(
            g,
            [
              [0, -7],
              [23, 0],
              [0, 7],
            ],
            "#d0d8b8",
          );
        }
      } else if (d.naval) {
        g.save();
        g.rotate(-e.angle);
        g.strokeStyle = "#d0e5ce77";
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(-17, 0, e.r * 1.6, e.r * 0.65, e.angle, 1, 5);
        g.stroke();
        g.restore();
        this.polyColor(
          g,
          [
            [-e.r * 1.5, -e.r * 0.45],
            [e.r * 0.8, -e.r * 0.45],
            [e.r * 1.7, 0],
            [e.r * 0.8, e.r * 0.45],
            [-e.r * 1.5, e.r * 0.45],
          ],
          e.kind === "submarine" ? "#4c6167" : "#9aaba4",
        );
        if (e.kind === "carrier") {
          this.rect(g, -32, -12, 57, 24, "#465d61");
          g.strokeStyle = "#d0d0ac";
          g.setLineDash([4, 4]);
          g.beginPath();
          g.moveTo(-27, 0);
          g.lineTo(24, 0);
          g.stroke();
          g.setLineDash([]);
          this.rect(g, -9, -17, 19, 7, "#b6bfac");
          this.rect(g, -22, 7, 12, 4, col);
        } else {
          this.rect(g, -15, -8, 25, 16, "#687e7a");
          this.rect(g, -9, -6, 11, 12, "#b6c1af");
          this.rect(g, 17, -4, 10, 8, "#506862");
          this.rect(g, 21, -2, 17, 3, "#c4cbbb");
          for (let x = -27; x < -14; x += 5) this.rect(g, x, -5, 3, 10, col);
        }
      } else if (e.kind === "infantry") {
        g.fillStyle = base;
        g.fillRect(-6, -4, 10, 8);
        g.fillStyle = "#b5b095";
        g.beginPath();
        g.arc(3, 0, 4, 0, 7);
        g.fill();
        this.rect(g, 1, 2, 12, 2, "#253838");
        this.rect(g, -3, -5, 4, 3, col);
        if (e.path.length) {
          const t = Math.sin(time * 14 + e.anim) * 2;
          this.rect(g, -7, -5 + t, 4, 3, "#303e32");
          this.rect(g, -7, 2 - t, 4, 3, "#303e32");
        }
      } else if (e.kind === "jet" || e.kind === "fighter") {
        this.polyColor(
          g,
          [
            [-29, 0],
            [-14, -7],
            [-22, -25],
            [8, -16],
            [34, 0],
            [8, 16],
            [-22, 25],
            [-14, 7],
          ],
          "#a2b1a7",
        );
        this.polyColor(
          g,
          [
            [0, -4],
            [22, 0],
            [0, 4],
          ],
          "#354e57",
        );
        this.rect(g, -24, -5, 8, 3, col);
        this.rect(g, -24, 2, 8, 3, col);
        g.fillStyle = "#81daf2";
        g.beginPath();
        g.ellipse(-28, 0, 7 + Math.sin(time * 35) * 3, 3, 0, 0, 7);
        g.fill();
      } else if (d.air) {
        this.rect(g, -30, -2, 42, 4, base);
        this.polyColor(
          g,
          [
            [-8, -6],
            [10, -8],
            [24, -2],
            [24, 2],
            [10, 8],
            [-8, 6],
          ],
          light,
        );
        this.polyColor(
          g,
          [
            [11, -6],
            [21, -2],
            [21, 2],
            [11, 5],
          ],
          "#25434a",
        );
        this.rect(g, -3, -22, 8, 44, base);
        this.rect(g, -2, -22, 5, 5, col);
        this.rect(g, -2, 17, 5, 5, col);
        g.strokeStyle = "#dae2cb88";
        g.lineWidth = 2;
        g.save();
        g.rotate(time * 42 + e.anim);
        g.beginPath();
        g.moveTo(-31, 0);
        g.lineTo(31, 0);
        g.moveTo(0, -31);
        g.lineTo(0, 31);
        g.stroke();
        g.restore();
        g.strokeStyle = "#dae2cb44";
        g.beginPath();
        g.arc(0, 0, 30, 0, 7);
        g.stroke();
        g.fillStyle = "#c8d2b8";
        g.beginPath();
        g.arc(0, 0, 3, 0, 7);
        g.fill();
        this.rect(g, -30, -10, 4, 20, "#89917e");
      } else {
        const r = e.r,
          rocket = e.kind === "rocket",
          arty = e.kind === "arty",
          ifv = e.kind === "ifv";
        this.rect(g, -r, -r * 0.8, r * 2, r * 1.6, "#24332e");
        this.rect(g, -r + 1, -r * 0.9, r * 2 - 2, 5, "#333f37");
        this.rect(g, -r + 1, r * 0.9 - 5, r * 2 - 2, 5, "#333f37");
        for (let x = -r + 3; x < r; x += 5) {
          this.rect(g, x, -r * 0.9, 2, 5, "#757c65");
          this.rect(g, x, r * 0.9 - 5, 2, 5, "#757c65");
        }
        this.polyColor(
          g,
          [
            [-r + 2, -r * 0.55],
            [r - 4, -r * 0.55],
            [r + 2, -r * 0.3],
            [r + 2, r * 0.3],
            [r - 4, r * 0.55],
            [-r + 2, r * 0.55],
          ],
          base,
        );
        this.rect(g, -r + 3, -r * 0.48, 8, r * 0.95, light);
        for (let k = 0; k < 3; k++)
          this.rect(g, -r + 4 + k * 2, -r * 0.42, 1, r * 0.8, "#344537");
        this.rect(g, -r + 1, -r * 0.8, 8, 3, col);
        this.rect(g, -r + 1, r * 0.8 - 3, 8, 3, col);
        if (rocket) {
          g.rotate(-0.15);
          this.rect(g, -10, -11, 23, 22, "#374b44");
          for (let y = -9; y < 10; y += 6) {
            this.rect(g, -11, y, 22, 4, light);
            this.rect(g, 10, y, 3, 4, "#273b38");
          }
          this.rect(g, 14, -7, 6, 14, base);
          this.rect(g, 16, -5, 5, 10, "#233d44");
        } else {
          g.rotate((e.turret || e.angle) - e.angle);
          const size = ifv ? 8 : arty ? 12 : 11;
          this.polyColor(
            g,
            [
              [-size, -size * 0.7],
              [size - 1, -size * 0.8],
              [size + 4, -3],
              [size + 4, 4],
              [size - 2, size * 0.8],
              [-size, size * 0.7],
            ],
            light,
          );
          this.rect(g, 5, -2, arty ? 36 : ifv ? 17 : 27, 4, "#a7ad90");
          this.rect(g, arty ? 36 : ifv ? 20 : 27, -3, 5, 6, "#3b4c43");
          this.rect(g, -5, -4, 7, 8, base);
          g.fillStyle = "#adb498";
          g.beginPath();
          g.arc(-4, 0, 3, 0, 7);
          g.fill();
          if (e.kind === "aa") {
            this.rect(g, -8, -13, 17, 6, "#334b45");
            this.rect(g, -8, 7, 17, 6, "#334b45");
            for (let y of [-12, 9])
              for (let x = -6; x < 8; x += 6)
                this.rect(g, x, y, 4, 3, "#c1c4aa");
            g.strokeStyle = "#aebca3";
            g.beginPath();
            g.arc(-6, -18, 8, Math.PI, 0);
            g.stroke();
          }
        }
      }
      if (e.disabled > game.time) {
        g.strokeStyle = "#a0d7ec";
        g.beginPath();
        g.arc(0, 0, e.r + 5, 0, 7);
        g.stroke();
      }
      g.restore();
    }
    drawNode(g, n, game) {
      const col =
        n.owner < 0 ? "#c9c39d" : F[game.teams[n.owner].faction].color;
      g.save();
      g.translate(n.x, n.y);
      g.strokeStyle = col + "66";
      g.lineWidth = 2;
      g.setLineDash([5, 5]);
      g.beginPath();
      g.arc(0, 0, 61, 0, 7);
      g.stroke();
      g.setLineDash([]);
      this.rect(g, -28, -20, 56, 41, "#344a4a");
      this.rect(g, -25, -25, 50, 35, "#9b9b7a");
      this.rect(g, -25, -25, 50, 5, "#b3b294");
      for (let x = -18; x < 22; x += 13) {
        this.rect(g, x, -18, 9, 22, "#56695c");
        this.rect(g, x, -13, 9, 3, col);
      }
      this.rect(g, -7, -38, 3, 24, "#344b4b");
      this.polyColor(
        g,
        [
          [-4, -38],
          [15, -34],
          [-4, -27],
        ],
        col,
      );
      g.fillStyle = col;
      g.font = '10px "Microsoft YaHei"';
      g.textAlign = "center";
      g.fillText(
        n.owner < 0
          ? "中立补给站"
          : game.teams[n.owner].faction === game.teams[0].faction &&
              n.owner === 0
            ? "己方补给 +22/s"
            : F[game.teams[n.owner].faction].name + "补给站",
        0,
        47,
      );
      if (n.progress > 0) {
        g.strokeStyle = F[game.teams[n.claim].faction].color;
        g.lineWidth = 4;
        g.beginPath();
        g.arc(0, 0, 63, -Math.PI / 2, -Math.PI / 2 + (n.progress / 7) * 6.283);
        g.stroke();
      }
      g.restore();
    }
    draw(game, ui = {}, time = 0) {
      if (!this.terrain || this.mapId !== game.map.id) this.prepare(game);
      const g = this.ctx,
        z = this.camera.zoom;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.fillStyle = "#17282c";
      g.fillRect(0, 0, this.width, this.height);
      g.save();
      g.translate(this.width / 2, this.height / 2);
      g.scale(z, z);
      g.translate(-this.camera.x, -this.camera.y);
      const tl = this.toWorld(0, 0),
        br = this.toWorld(this.width, this.height);
      g.drawImage(this.terrain, 0, 0);
      if (game.map.id === "river") {
        g.strokeStyle = "#b8c7b71c";
        g.lineWidth = 2;
        for (let i = 0; i < 14; i++) {
          const x = 1470 + (i % 3) * 40,
            y = (time * 15 + i * 151) % H;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + 21, y - 3);
          g.stroke();
        }
      }
      for (const n of game.nodes) this.drawNode(g, n, game);
      for (const team of game.teams)
        for (const q of team.buildQueue)
          if (team.id === 0 || game.visibleAt(q.x, q.y) || ui.demo) {
            this.drawBuilding(
              g,
              { ...q, team: team.id, r: B[q.kind].r, disabled: 0 },
              game,
              time,
              true,
            );
            g.fillStyle = "#e5be71";
            g.fillRect(q.x - 30, q.y + 40, 60 * (1 - q.remaining / q.total), 4);
          }
      const sorted = game.entities
        .filter(
          (e) =>
            e.x > tl.x - 100 &&
            e.x < br.x + 100 &&
            e.y > tl.y - 100 &&
            e.y < br.y + 100,
        )
        .sort(
          (a, b) =>
            (U[a.kind]?.air ? 10000 : 0) +
            a.y -
            ((U[b.kind]?.air ? 10000 : 0) + b.y),
        );
      for (const e of sorted) {
        if (e.team !== 0 && !ui.demo && !game.visibleAt(e.x, e.y)) continue;
        const chosen = ui.selection?.has(e.id),
          hover = ui.hover === e.id;
        const col = F[game.teams[e.team].faction].color;
        if (chosen || hover) {
          g.strokeStyle = chosen ? "#f5df96" : col;
          g.lineWidth = chosen ? 2 : 1;
          g.beginPath();
          g.ellipse(e.x, e.y + e.r * 0.5, e.r + 8, e.r * 0.6 + 5, 0, 0, 7);
          g.stroke();
          if (chosen && e.order) {
            g.strokeStyle = "#e5be7150";
            g.lineWidth = 1 / z;
            g.setLineDash([5, 5]);
            g.beginPath();
            g.moveTo(e.x, e.y);
            g.lineTo(e.order.x, e.order.y);
            g.stroke();
            g.setLineDash([]);
          }
        }
        if (
          e.kind === "shield" &&
          game.power(e.team) >= 0 &&
          e.disabled <= game.time
        ) {
          g.strokeStyle = col + "55";
          g.fillStyle = col + "0a";
          g.lineWidth = 2 / z;
          g.beginPath();
          g.arc(e.x, e.y, B.shield.range, 0, 7);
          g.fill();
          g.stroke();
        }
        if (e.structure) this.drawBuilding(g, e, game, time);
        else this.drawUnit(g, e, game, time);
        if (chosen || hover || e.hp < e.maxHp) {
          const y = e.y - e.r - (e.structure ? 16 : U[e.kind]?.air ? 29 : 12),
            bw = e.structure ? 64 : 32;
          g.fillStyle = "#10242b";
          g.fillRect(e.x - bw / 2 - 1, y - 1, bw + 2, 5);
          g.fillStyle = e.hp / e.maxHp > 0.5 ? col : "#f0906b";
          g.fillRect(e.x - bw / 2, y, bw * clamp(e.hp / e.maxHp, 0, 1), 3);
        }
        if (e.structure && e.kind === "hq") {
          g.font = '11px "Microsoft YaHei"';
          g.textAlign = "center";
          g.fillStyle = col;
          g.fillText(
            F[game.teams[e.team].faction].name + " · 指挥部",
            e.x,
            e.y + e.r + 30,
          );
        }
      }
      for (const fx of game.effects) {
        if (
          !ui.demo &&
          !game.visibleAt(fx.x, fx.y) &&
          !game.visibleAt(fx.tx || fx.x, fx.ty || fx.y)
        )
          continue;
        g.save();
        const t = 1 - fx.ttl / fx.max;
        if (fx.type === "shot") {
          const x = fx.x + (fx.tx - fx.x) * t,
            y = fx.y + (fx.ty - fx.y) * t;
          g.strokeStyle = fx.rocket ? "#f8be6e" : "#f5e0a1";
          g.lineWidth = fx.rocket ? 3 : 2;
          g.beginPath();
          g.moveTo(x - (fx.tx - fx.x) * 0.07, y - (fx.ty - fx.y) * 0.07);
          g.lineTo(x, y);
          g.stroke();
          g.fillStyle = "#fff2c1";
          g.beginPath();
          g.arc(x, y, fx.rocket ? 3 : 2, 0, 7);
          g.fill();
        } else if (fx.type === "nuclear") {
          const rr = fx.r * (0.25 + t * 1.3);
          g.globalAlpha = Math.max(0, 1 - t);
          const grad = g.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, rr);
          grad.addColorStop(0, "#fff8d9");
          grad.addColorStop(0.22, "#ffe2a2");
          grad.addColorStop(0.55, "#e8945577");
          grad.addColorStop(1, "#de985500");
          g.fillStyle = grad;
          g.beginPath();
          g.arc(fx.x, fx.y, rr, 0, 7);
          g.fill();
          g.strokeStyle = "#ffe8aa";
          g.lineWidth = 8 * (1 - t) + 1;
          g.beginPath();
          g.arc(fx.x, fx.y, rr * 0.95, 0, 7);
          g.stroke();
          g.fillStyle = "#6b695a88";
          g.beginPath();
          g.ellipse(fx.x, fx.y - 100 * t, rr * 0.4, rr * 0.22, 0, 0, 7);
          g.fill();
        } else if (fx.type === "lance") {
          g.globalAlpha = 1 - t;
          g.strokeStyle = "#e6c6ff";
          g.lineWidth = 14 * (1 - t);
          g.beginPath();
          g.moveTo(fx.x, fx.y - 1200);
          g.lineTo(fx.x, fx.y);
          g.stroke();
          g.strokeStyle = "#fff8ff";
          g.lineWidth = 4;
          g.stroke();
          g.beginPath();
          g.arc(fx.x, fx.y, fx.r * t, 0, 7);
          g.stroke();
        } else if (fx.type === "explosion" || fx.type === "impact") {
          let r = fx.r * (0.3 + t);
          g.globalAlpha = 1 - t;
          g.fillStyle = t < 0.3 ? "#fff3ba" : "#e7a45b";
          g.beginPath();
          g.arc(fx.x, fx.y, r * 0.45, 0, 7);
          g.fill();
          g.strokeStyle = "#ffc879";
          g.lineWidth = 3;
          g.beginPath();
          g.arc(fx.x, fx.y, r, 0, 7);
          g.stroke();
          g.fillStyle = "#25332c77";
          g.beginPath();
          g.arc(fx.x + 10 * t, fx.y - 20 * t, r * 0.8, 0, 7);
          g.fill();
        } else {
          g.globalAlpha = 0.8 * (1 - t);
          g.strokeStyle =
            ["strike", "nuke", "bunker", "orbital"].includes(fx.type) ||
            fx.attack
              ? "#f2a07b"
              : fx.type === "emp"
                ? "#a7d4f1"
                : "#dbe8ac";
          g.lineWidth = 2 / z;
          g.beginPath();
          g.arc(fx.x, fx.y, fx.r || 15 + t * 22, 0, 7);
          g.stroke();
          if (["strike", "nuke", "bunker", "orbital"].includes(fx.type)) {
            g.fillStyle = "#f2916f22";
            g.fill();
            g.globalAlpha = 1;
            g.fillStyle = "#ffd0a3";
            g.font = "16px Consolas";
            g.textAlign = "center";
            g.fillText(
              (fx.type === "nuke"
                ? "NUCLEAR"
                : fx.type === "bunker"
                  ? "BUNKER BUSTER"
                  : fx.type === "orbital"
                    ? "ORBITAL LANCE"
                    : "FIRE MISSION") +
                " " +
                fx.ttl.toFixed(1),
              fx.x,
              fx.y - 10,
            );
          }
        }
        g.restore();
      }
      if (!ui.demo) {
        const image = this.fogCtx.createImageData(COLS, ROWS);
        for (let i = 0; i < COLS * ROWS; i++) {
          image.data[i * 4] = 10;
          image.data[i * 4 + 1] = 25;
          image.data[i * 4 + 2] = 31;
          image.data[i * 4 + 3] = game.visible[i]
            ? 0
            : game.explored[i]
              ? 145
              : 235;
        }
        this.fogCtx.putImageData(image, 0, 0);
        g.imageSmoothingEnabled = true;
        g.drawImage(this.fogCanvas, 0, 0, W, H);
      }
      if (ui.mode) {
        const p = this.toWorld(ui.pointer.x, ui.pointer.y);
        if (B[ui.mode]) {
          let good = game.canBuild(0, ui.mode, p.x, p.y);
          g.globalAlpha = 0.5;
          this.drawBuilding(
            g,
            {
              x: p.x,
              y: p.y,
              kind: ui.mode,
              team: 0,
              r: B[ui.mode].r,
              disabled: 0,
            },
            game,
            time,
          );
          g.globalAlpha = 1;
          g.strokeStyle = good ? "#b9e3a3" : "#f0806a";
          g.lineWidth = 2 / z;
          g.strokeRect(
            p.x - B[ui.mode].r - 8,
            p.y - B[ui.mode].r - 8,
            B[ui.mode].r * 2 + 16,
            B[ui.mode].r * 2 + 16,
          );
        } else {
          g.strokeStyle = ui.mode === "strike" ? "#ffb18a" : "#d3e8ab";
          g.fillStyle = ui.mode === "strike" ? "#ffa87822" : "#b6d39a15";
          g.lineWidth = 2 / z;
          g.beginPath();
          g.arc(p.x, p.y, D.ABILITIES[ui.mode]?.radius || 30, 0, 7);
          g.fill();
          g.stroke();
          g.beginPath();
          g.moveTo(p.x - 10, p.y);
          g.lineTo(p.x + 10, p.y);
          g.moveTo(p.x, p.y - 10);
          g.lineTo(p.x, p.y + 10);
          g.stroke();
        }
      }
      g.restore();
      this.rangeOverlays=root.WarRanges?.collect(game,ui,this)||[];root.WarRanges?.draw(g,this,this.rangeOverlays);
      if (ui.drag) {
        const d = ui.drag;
        g.fillStyle = "#e5be711c";
        g.strokeStyle = "#e5be71";
        g.lineWidth = 1;
        g.fillRect(d.x, d.y, ui.pointer.x - d.x, ui.pointer.y - d.y);
        g.strokeRect(d.x, d.y, ui.pointer.x - d.x, ui.pointer.y - d.y);
      }
      if (!ui.demo) this.drawMinimap(game);
    }
    drawMinimap(game) {
      const c = this.mc,
        w = this.mini.width,
        h = this.mini.height;
      c.drawImage(this.miniTerrain, 0, 0, w, h);
      c.drawImage(this.fogCanvas, 0, 0, w, h);
      for (const n of game.nodes) {
        c.fillStyle =
          n.owner < 0 ? "#e6d69a" : F[game.teams[n.owner].faction].color;
        c.fillRect((n.x / W) * w - 2, (n.y / H) * h - 2, 4, 4);
      }
      for (const e of game.entities) {
        if (e.team !== 0 && !game.visibleAt(e.x, e.y)) continue;
        c.fillStyle = F[game.teams[e.team].faction].color;
        const r = e.structure ? 3 : 1.5;
        c.fillRect((e.x / W) * w - r, (e.y / H) * h - r, r * 2, r * 2);
      }
      const p = this.toWorld(0, 60),
        q = this.toWorld(this.width - 260, this.height - 195);
      c.strokeStyle = "#f5e5bc";
      c.lineWidth = 1;
      c.strokeRect(
        (p.x / W) * w,
        (p.y / H) * h,
        ((q.x - p.x) / W) * w,
        ((q.y - p.y) / H) * h,
      );
    }
  }
  root.WarRenderer = Renderer;
})(globalThis);
