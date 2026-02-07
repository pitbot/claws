// Game Constants
const GRID_SIZE = 20;
const CELL_SIZE = 40;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_WIDTH = Math.floor(CANVAS_WIDTH / CELL_SIZE);
const GRID_HEIGHT = Math.floor(CANVAS_HEIGHT / CELL_SIZE);

// Cell Types
const CELL_EMPTY = 0;
const CELL_WALL = 1;
const CELL_DESTRUCTIBLE = 2;
const CELL_WINDOW = 3;

// Game State
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.grid = [];
        this.player = null;
        this.bombs = [];
        this.explosions = [];
        this.breaches = [];
        this.particles = [];
        this.gameOver = false;
        this.lives = 3;
        this.maxBombs = 1;
        this.bombRange = 2;
        this.keys = {};

        this.init();
        this.setupControls();
        this.gameLoop();
    }

    init() {
        this.createGrid();
        this.player = new Player(1, 1);
        this.bombs = [];
        this.explosions = [];
        this.breaches = [];
        this.particles = [];
        this.gameOver = false;
        this.updateUI();
    }

    createGrid() {
        this.grid = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            this.grid[y] = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                // Outer walls
                if (x === 0 || x === GRID_WIDTH - 1 || y === 0 || y === GRID_HEIGHT - 1) {
                    // Add windows on outer walls (20% chance)
                    if (Math.random() < 0.2) {
                        this.grid[y][x] = CELL_WINDOW;
                    } else {
                        this.grid[y][x] = CELL_WALL;
                    }
                }
                // Permanent walls (grid pattern)
                else if (x % 2 === 0 && y % 2 === 0) {
                    this.grid[y][x] = CELL_WALL;
                }
                // Destructible walls (40% chance, but not near spawn)
                else if ((x > 2 || y > 2) && Math.random() < 0.4) {
                    this.grid[y][x] = CELL_DESTRUCTIBLE;
                }
                else {
                    this.grid[y][x] = CELL_EMPTY;
                }
            }
        }

        // Clear spawn area
        this.grid[1][1] = CELL_EMPTY;
        this.grid[1][2] = CELL_EMPTY;
        this.grid[2][1] = CELL_EMPTY;
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;

            if (e.key === ' ' && !this.gameOver) {
                e.preventDefault();
                this.player.placeBomb();
            }

            if (e.key === 'r' || e.key === 'R') {
                this.init();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    update() {
        if (this.gameOver) return;

        // Update player
        this.player.update(this.keys);

        // Update bombs
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            this.bombs[i].update();
            if (this.bombs[i].exploded) {
                this.bombs.splice(i, 1);
            }
        }

        // Update explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            this.explosions[i].update();
            if (this.explosions[i].finished) {
                this.explosions.splice(i, 1);
            }
        }

        // Update vacuum breaches
        for (let breach of this.breaches) {
            breach.update();
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Check if player is affected by vacuum
        this.checkVacuumEffects();

        // Check if player is in explosion
        this.checkExplosionCollision();
    }

    checkVacuumEffects() {
        for (let breach of this.breaches) {
            const dx = breach.x - this.player.x;
            const dy = breach.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= 3) {
                // Instant death - sucked into space
                this.playerDeath("SUCKED INTO SPACE!");
                return;
            } else if (distance <= 10) {
                // Progressive pull based on distance
                // Distance 4-10: Pull strength from 0.7 down to 0.1
                const pullStrength = (10 - distance) / 10;
                const angle = Math.atan2(dy, dx);

                // Apply vacuum pull
                this.player.x += Math.cos(angle) * pullStrength * 0.15;
                this.player.y += Math.sin(angle) * pullStrength * 0.15;

                // Show warning
                if (distance <= 5) {
                    this.showWarning("VACUUM BREACH! RUN!");
                }
            }
        }
    }

    checkExplosionCollision() {
        for (let explosion of this.explosions) {
            for (let cell of explosion.cells) {
                const playerGridX = Math.floor(this.player.x);
                const playerGridY = Math.floor(this.player.y);

                if (cell.x === playerGridX && cell.y === playerGridY) {
                    this.playerDeath("CAUGHT IN EXPLOSION!");
                    return;
                }
            }
        }
    }

    playerDeath(message) {
        this.lives--;
        this.updateUI();

        // Create death particles
        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(
                this.player.x * CELL_SIZE + CELL_SIZE / 2,
                this.player.y * CELL_SIZE + CELL_SIZE / 2,
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5,
                '#ff6600'
            ));
        }

        if (this.lives <= 0) {
            this.gameOver = true;
            this.showWarning("GAME OVER! Press R to restart");
        } else {
            this.player.x = 1;
            this.player.y = 1;
            this.showWarning(`${message} ${this.lives} lives remaining`);
        }
    }

    showWarning(text) {
        const warningDiv = document.getElementById('warnings');
        warningDiv.textContent = text;

        setTimeout(() => {
            if (warningDiv.textContent === text) {
                warningDiv.textContent = '';
            }
        }, 3000);
    }

    updateUI() {
        document.getElementById('player1-lives').textContent = `Lives: ${this.lives}`;
        document.getElementById('player1-bombs').textContent = `Bombs: ${this.maxBombs}`;
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw grid
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const cellType = this.grid[y][x];
                const px = x * CELL_SIZE;
                const py = y * CELL_SIZE;

                // Draw floor
                this.ctx.fillStyle = '#1a1a2e';
                this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

                // Draw grid lines
                this.ctx.strokeStyle = '#0f0f1a';
                this.ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);

                // Draw cells
                if (cellType === CELL_WALL) {
                    this.drawWall(px, py);
                } else if (cellType === CELL_DESTRUCTIBLE) {
                    this.drawDestructibleWall(px, py);
                } else if (cellType === CELL_WINDOW) {
                    this.drawWindow(px, py);
                }
            }
        }

        // Draw breaches
        for (let breach of this.breaches) {
            breach.render(this.ctx);
        }

        // Draw explosions
        for (let explosion of this.explosions) {
            explosion.render(this.ctx);
        }

        // Draw bombs
        for (let bomb of this.bombs) {
            bomb.render(this.ctx);
        }

        // Draw particles
        for (let particle of this.particles) {
            particle.render(this.ctx);
        }

        // Draw player
        if (!this.gameOver) {
            this.player.render(this.ctx);
        }
    }

    drawWall(x, y) {
        // Metal wall
        this.ctx.fillStyle = '#4a4a5a';
        this.ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        // Highlights
        this.ctx.fillStyle = '#6a6a7a';
        this.ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, 4);

        // Panel lines
        this.ctx.strokeStyle = '#2a2a3a';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x + CELL_SIZE / 2, y + 2);
        this.ctx.lineTo(x + CELL_SIZE / 2, y + CELL_SIZE - 2);
        this.ctx.stroke();
    }

    drawDestructibleWall(x, y) {
        // Crate/box
        this.ctx.fillStyle = '#5a4a3a';
        this.ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);

        // Box details
        this.ctx.strokeStyle = '#3a2a1a';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);

        // Cross pattern
        this.ctx.beginPath();
        this.ctx.moveTo(x + 4, y + 4);
        this.ctx.lineTo(x + CELL_SIZE - 4, y + CELL_SIZE - 4);
        this.ctx.moveTo(x + CELL_SIZE - 4, y + 4);
        this.ctx.lineTo(x + 4, y + CELL_SIZE - 4);
        this.ctx.stroke();
    }

    drawWindow(x, y) {
        // Window frame
        this.ctx.fillStyle = '#3a3a4a';
        this.ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        // Window glass with stars
        const gradient = this.ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
        gradient.addColorStop(0, '#1a1a3a');
        gradient.addColorStop(1, '#0a0a2a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x + 6, y + 6, CELL_SIZE - 12, CELL_SIZE - 12);

        // Stars
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 3; i++) {
            const sx = x + 10 + (i * 8);
            const sy = y + 10 + ((i * 7) % 15);
            this.ctx.fillRect(sx, sy, 2, 2);
        }

        // Frame cross
        this.ctx.strokeStyle = '#5a5a6a';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x + CELL_SIZE / 2, y + 4);
        this.ctx.lineTo(x + CELL_SIZE / 2, y + CELL_SIZE - 4);
        this.ctx.moveTo(x + 4, y + CELL_SIZE / 2);
        this.ctx.lineTo(x + CELL_SIZE - 4, y + CELL_SIZE / 2);
        this.ctx.stroke();
    }

    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Player Class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 0.15;
        this.color = '#00ff88';
    }

    update(keys) {
        const oldX = this.x;
        const oldY = this.y;

        // Movement
        if (keys['ArrowUp']) this.y -= this.speed;
        if (keys['ArrowDown']) this.y += this.speed;
        if (keys['ArrowLeft']) this.x -= this.speed;
        if (keys['ArrowRight']) this.x += this.speed;

        // Collision detection
        if (this.checkCollision()) {
            this.x = oldX;
            this.y = oldY;
        }

        // Keep in bounds
        this.x = Math.max(0.1, Math.min(GRID_WIDTH - 1.1, this.x));
        this.y = Math.max(0.1, Math.min(GRID_HEIGHT - 1.1, this.y));
    }

    checkCollision() {
        const gridX = Math.floor(this.x);
        const gridY = Math.floor(this.y);

        // Check current cell and adjacent cells
        const cellsToCheck = [
            [gridX, gridY],
            [Math.ceil(this.x), gridY],
            [gridX, Math.ceil(this.y)],
            [Math.ceil(this.x), Math.ceil(this.y)]
        ];

        for (let [cx, cy] of cellsToCheck) {
            if (cy >= 0 && cy < GRID_HEIGHT && cx >= 0 && cx < GRID_WIDTH) {
                const cell = game.grid[cy][cx];
                if (cell === CELL_WALL || cell === CELL_DESTRUCTIBLE || cell === CELL_WINDOW) {
                    return true;
                }
            }
        }

        return false;
    }

    placeBomb() {
        const gridX = Math.floor(this.x);
        const gridY = Math.floor(this.y);

        // Check if there's already a bomb here
        for (let bomb of game.bombs) {
            if (bomb.x === gridX && bomb.y === gridY) {
                return;
            }
        }

        // Check bomb limit
        if (game.bombs.length >= game.maxBombs) {
            return;
        }

        game.bombs.push(new Bomb(gridX, gridY, game.bombRange));
    }

    render(ctx) {
        const px = this.x * CELL_SIZE;
        const py = this.y * CELL_SIZE;
        const size = CELL_SIZE * 0.7;
        const offset = (CELL_SIZE - size) / 2;

        // Astronaut body
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + offset + size * 0.2, py + offset + size * 0.4, size * 0.6, size * 0.5);

        // Helmet
        ctx.fillStyle = '#88ccff';
        ctx.beginPath();
        ctx.arc(px + CELL_SIZE / 2, py + offset + size * 0.3, size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Helmet rim
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Visor
        ctx.fillStyle = '#001133';
        ctx.beginPath();
        ctx.arc(px + CELL_SIZE / 2, py + offset + size * 0.3, size * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + offset, py + offset, size, size);
    }
}

// Bomb Class
class Bomb {
    constructor(x, y, range) {
        this.x = x;
        this.y = y;
        this.range = range;
        this.timer = 120; // 2 seconds at 60fps
        this.exploded = false;
    }

    update() {
        this.timer--;

        if (this.timer <= 0 && !this.exploded) {
            this.explode();
            this.exploded = true;
        }
    }

    explode() {
        const explosion = new Explosion(this.x, this.y, this.range);
        game.explosions.push(explosion);

        // Check for window destruction
        for (let cell of explosion.cells) {
            if (game.grid[cell.y] && game.grid[cell.y][cell.x] === CELL_WINDOW) {
                // Window destroyed - create breach!
                game.breaches.push(new VacuumBreach(cell.x, cell.y));
                game.grid[cell.y][cell.x] = CELL_EMPTY;

                // Create glass particles
                for (let i = 0; i < 15; i++) {
                    game.particles.push(new Particle(
                        cell.x * CELL_SIZE + CELL_SIZE / 2,
                        cell.y * CELL_SIZE + CELL_SIZE / 2,
                        (Math.random() - 0.5) * 8,
                        (Math.random() - 0.5) * 8,
                        '#88ccff'
                    ));
                }
            } else if (game.grid[cell.y] && game.grid[cell.y][cell.x] === CELL_DESTRUCTIBLE) {
                game.grid[cell.y][cell.x] = CELL_EMPTY;

                // Create debris particles
                for (let i = 0; i < 8; i++) {
                    game.particles.push(new Particle(
                        cell.x * CELL_SIZE + CELL_SIZE / 2,
                        cell.y * CELL_SIZE + CELL_SIZE / 2,
                        (Math.random() - 0.5) * 6,
                        (Math.random() - 0.5) * 6,
                        '#5a4a3a'
                    ));
                }
            }
        }
    }

    render(ctx) {
        const px = this.x * CELL_SIZE;
        const py = this.y * CELL_SIZE;
        const size = CELL_SIZE * 0.6;
        const offset = (CELL_SIZE - size) / 2;

        // Bomb body
        const pulse = Math.sin(this.timer / 10) * 0.1 + 0.9;
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, size / 2 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Fuse
        ctx.strokeStyle = this.timer < 30 ? '#ff0000' : '#ff6600';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px + CELL_SIZE / 2, py + offset);
        ctx.lineTo(px + CELL_SIZE / 2, py + offset - 8);
        ctx.stroke();

        // Fuse spark
        if (this.timer % 10 < 5) {
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(px + CELL_SIZE / 2, py + offset - 8, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Explosion Class
class Explosion {
    constructor(x, y, range) {
        this.x = x;
        this.y = y;
        this.range = range;
        this.cells = [];
        this.timer = 30;
        this.finished = false;

        this.calculateCells();
    }

    calculateCells() {
        this.cells.push({x: this.x, y: this.y});

        // Spread in four directions
        const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];

        for (let [dx, dy] of directions) {
            for (let i = 1; i <= this.range; i++) {
                const nx = this.x + dx * i;
                const ny = this.y + dy * i;

                if (nx < 0 || nx >= GRID_WIDTH || ny < 0 || ny >= GRID_HEIGHT) break;

                this.cells.push({x: nx, y: ny});

                const cell = game.grid[ny][nx];
                if (cell === CELL_WALL || cell === CELL_DESTRUCTIBLE || cell === CELL_WINDOW) {
                    break;
                }
            }
        }
    }

    update() {
        this.timer--;
        if (this.timer <= 0) {
            this.finished = true;
        }
    }

    render(ctx) {
        const alpha = this.timer / 30;

        for (let cell of this.cells) {
            const px = cell.x * CELL_SIZE;
            const py = cell.y * CELL_SIZE;

            // Outer glow
            ctx.fillStyle = `rgba(255, 100, 0, ${alpha * 0.3})`;
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

            // Inner core
            ctx.fillStyle = `rgba(255, 200, 0, ${alpha * 0.8})`;
            const innerSize = CELL_SIZE * 0.6;
            const innerOffset = (CELL_SIZE - innerSize) / 2;
            ctx.fillRect(px + innerOffset, py + innerOffset, innerSize, innerSize);

            // White hot center
            if (this.timer > 20) {
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                const coreSize = CELL_SIZE * 0.3;
                const coreOffset = (CELL_SIZE - coreSize) / 2;
                ctx.fillRect(px + coreOffset, py + coreOffset, coreSize, coreSize);
            }
        }
    }
}

// Vacuum Breach Class
class VacuumBreach {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particleTimer = 0;
    }

    update() {
        // Spawn particles being sucked out
        this.particleTimer++;
        if (this.particleTimer % 3 === 0) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 2 + Math.random() * 5;
            const startX = this.x + Math.cos(angle) * distance;
            const startY = this.y + Math.sin(angle) * distance;

            game.particles.push(new VacuumParticle(
                startX * CELL_SIZE + CELL_SIZE / 2,
                startY * CELL_SIZE + CELL_SIZE / 2,
                this.x * CELL_SIZE + CELL_SIZE / 2,
                this.y * CELL_SIZE + CELL_SIZE / 2
            ));
        }
    }

    render(ctx) {
        const px = this.x * CELL_SIZE;
        const py = this.y * CELL_SIZE;

        // Broken window frame
        ctx.fillStyle = '#2a2a3a';
        ctx.fillRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        // Space view
        ctx.fillStyle = '#000000';
        ctx.fillRect(px + 6, py + 6, CELL_SIZE - 12, CELL_SIZE - 12);

        // Danger glow
        const time = Date.now() / 100;
        const pulse = Math.sin(time) * 0.3 + 0.7;
        ctx.strokeStyle = `rgba(255, 0, 0, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);

        // Draw vacuum effect circles
        for (let i = 1; i <= 3; i++) {
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 / i})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, CELL_SIZE * i * pulse, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

// Particle Class
class Particle {
    constructor(x, y, vx, vy, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = 60;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // Gravity
        this.life--;
    }

    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 60;
        ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
        ctx.globalAlpha = 1;
    }
}

// Vacuum Particle Class
class VacuumParticle {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.life = 30;
        this.maxLife = 30;
    }

    update() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;

        this.x += dx * 0.15;
        this.y += dy * 0.15;
        this.life--;
    }

    render(ctx) {
        ctx.fillStyle = '#aaaaaa';
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillRect(this.x - 1, this.y - 1, 2, 2);
        ctx.globalAlpha = 1;
    }
}

// Start the game
let game;
window.addEventListener('load', () => {
    game = new Game();
});
