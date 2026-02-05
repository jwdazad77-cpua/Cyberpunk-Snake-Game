import { CELL_SIZE, GRID_WIDTH, GRID_HEIGHT, COLORS, GameMode, PowerUpType, PowerUp, Particle, Point } from './constants';

export class SnakeEngine {
  // State
  snake!: Point[];
  direction!: Point;
  nextDirection!: Point;
  food!: Point | null;
  powerUps!: PowerUp[];
  particles!: Particle[];
  enemies!: { body: Point[]; dir: Point; color: string }[];
  
  score!: number;
  gameOver!: boolean;
  paused!: boolean;
  
  // Timers & Cooldowns
  shieldActive!: boolean;
  shieldTime!: number;
  magnetActive!: boolean;
  magnetTime!: number;
  dashActive!: boolean;
  dashTime!: number;
  slowActive!: boolean;
  slowTime!: number;
  
  speed!: number;
  lastMoveTime!: number;
  gameMode: GameMode;
  gameTime!: number;
  
  constructor(mode: GameMode = GameMode.CLASSIC) {
    this.gameMode = mode;
    this.reset();
  }
  
  reset() {
    // 1. Initialize State Logic Containers First
    this.powerUps = [];
    this.particles = [];
    this.enemies = [];
    this.score = 0;
    this.gameOver = false;
    this.paused = false;

    // 2. Initialize Timers
    this.shieldActive = false;
    this.shieldTime = 0;
    this.magnetActive = false;
    this.magnetTime = 0;
    this.dashActive = false;
    this.dashTime = 0;
    this.slowActive = false;
    this.slowTime = 0;
    
    // 3. Initialize Snake
    const startX = Math.floor(GRID_WIDTH / 2);
    const startY = Math.floor(GRID_HEIGHT / 2);
    this.snake = [{ x: startX, y: startY }, { x: startX, y: startY + 1}, { x: startX, y: startY + 2}];
    this.direction = { x: 0, y: -1 };
    this.nextDirection = { x: 0, y: -1 };

    // 4. Spawn Entities (now safe because containers exist)
    if (this.gameMode === GameMode.SURVIVAL) {
      this.spawnEnemy();
      this.spawnEnemy();
    }
    
    // Spawn food last (checks collision against snake and enemies)
    this.food = this.spawnFood();

    // 5. Game Loop State
    this.speed = this.gameMode === GameMode.TIME_ATTACK ? 80 : 
                 this.gameMode === GameMode.SURVIVAL ? 100 : 120;
    this.lastMoveTime = 0;
    this.gameTime = 0;
  }
  
  spawnFood(): Point {
    let position: Point;
    let attempts = 0;
    // Safety: Ensure enemies is initialized before this is called
    if (!this.enemies) this.enemies = [];
    if (!this.snake) return { x: 0, y: 0 }; // Should not happen given order

    do {
      position = {
        x: Math.floor(Math.random() * GRID_WIDTH),
        y: Math.floor(Math.random() * GRID_HEIGHT),
      };
      attempts++;
    } while (this.isCollision(position) && attempts < 100);
    return position;
  }
  
  spawnPowerUp() {
    const types: PowerUpType[] = ['shield', 'magnet', 'dash', 'slow'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let position: Point;
    let attempts = 0;
    do {
      position = {
        x: Math.floor(Math.random() * GRID_WIDTH),
        y: Math.floor(Math.random() * GRID_HEIGHT),
      };
      attempts++;
    } while (this.isCollision(position) && attempts < 100);
    
    this.powerUps.push({
      id: Math.random().toString(36).substr(2, 9),
      x: position.x,
      y: position.y,
      type,
      life: 600, 
      maxLife: 600
    });
  }
  
  spawnEnemy() {
    let x, y;
    let attempts = 0;
    do {
        x = Math.floor(Math.random() * GRID_WIDTH);
        y = Math.floor(Math.random() * GRID_HEIGHT);
        attempts++;
        // Keep trying if too close
    } while (Math.abs(x - this.snake[0].x) < 10 && Math.abs(y - this.snake[0].y) < 10 && attempts < 20);
    
    this.enemies.push({
      body: [{x, y}, {x, y: y+1}, {x, y: y+2}],
      dir: {x: 0, y: -1},
      color: COLORS.PINK
    });
  }

  handleInput(key: string) {
    if (this.gameOver) {
       if (key === 'Enter' || key === ' ') this.reset();
       return;
    }
    
    const current = this.direction;
    
    switch (key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        if (current.y !== 1) this.nextDirection = { x: 0, y: -1 };
        break;
      case 'arrowdown':
      case 's':
        if (current.y !== -1) this.nextDirection = { x: 0, y: 1 };
        break;
      case 'arrowleft':
      case 'a':
        if (current.x !== 1) this.nextDirection = { x: -1, y: 0 };
        break;
      case 'arrowright':
      case 'd':
        if (current.x !== -1) this.nextDirection = { x: 1, y: 0 };
        break;
    }
  }

  isCollision(p: Point, ignoreHead: boolean = false): boolean {
    if (p.x < 0 || p.x >= GRID_WIDTH || p.y < 0 || p.y >= GRID_HEIGHT) return true;
    
    const startIndex = ignoreHead ? 1 : 0;
    for (let i = startIndex; i < this.snake.length; i++) {
      if (p.x === this.snake[i].x && p.y === this.snake[i].y) return true;
    }
    
    if (this.enemies) {
        for (const enemy of this.enemies) {
          for (const seg of enemy.body) {
            if (p.x === seg.x && p.y === seg.y) {
              return !this.shieldActive;
            }
          }
        }
    }
    
    return false;
  }

  update(time: number, deltaTime: number) {
    if (this.gameOver || this.paused) return;

    this.gameTime += deltaTime;
    
    this.powerUps = this.powerUps.filter(p => {
      p.life--;
      return p.life > 0;
    });
    
    if (Math.random() < 0.005) this.spawnPowerUp();
    
    if (this.shieldTime > 0) this.shieldTime--;
    else this.shieldActive = false;
    
    if (this.magnetTime > 0) this.magnetTime--;
    else this.magnetActive = false;
    
    if (this.dashActive) {
        this.dashTime--;
        if (this.dashTime <= 0) this.dashActive = false;
    }

    if (this.slowActive) {
        this.slowTime--;
        if (this.slowTime <= 0) this.slowActive = false;
    }

    let moveDelay = this.speed;
    if (this.dashActive) moveDelay /= 2;
    if (this.slowActive) moveDelay *= 1.5;
    
    if (time - this.lastMoveTime > moveDelay) {
      this.lastMoveTime = time;
      this.move();
    }
    
    this.updateParticles();
  }

  move() {
    this.direction = this.nextDirection;
    const head = this.snake[0];
    const newHead = { x: head.x + this.direction.x, y: head.y + this.direction.y };
    
    if (newHead.x < 0 || newHead.x >= GRID_WIDTH || newHead.y < 0 || newHead.y >= GRID_HEIGHT) {
      this.gameOver = true;
      this.createExplosion(head.x, head.y, COLORS.CYAN);
      return;
    }
    
    if (this.isCollision(newHead, true)) {
       this.gameOver = true;
       this.createExplosion(head.x, head.y, COLORS.CYAN);
       return;
    }

    this.snake.unshift(newHead);
    
    let ate = false;
    if (this.food && newHead.x === this.food.x && newHead.y === this.food.y) {
        ate = true;
        this.score += 10;
        this.createExplosion(newHead.x, newHead.y, COLORS.YELLOW, 5);
        this.food = this.spawnFood();
        
        if (this.speed > 50) this.speed -= 1;
    }
    
    if (this.magnetActive && this.food && !ate) {
       const dist = Math.abs(this.food.x - newHead.x) + Math.abs(this.food.y - newHead.y);
       if (dist < 8) {
          if (this.food.x < newHead.x) this.food.x++;
          else if (this.food.x > newHead.x) this.food.x--;
          else if (this.food.y < newHead.y) this.food.y++;
          else if (this.food.y > newHead.y) this.food.y--;
       }
    }

    const powerUpIndex = this.powerUps.findIndex(p => p.x === newHead.x && p.y === newHead.y);
    if (powerUpIndex !== -1) {
        const p = this.powerUps[powerUpIndex];
        this.activatePowerUp(p.type);
        this.powerUps.splice(powerUpIndex, 1);
        this.createExplosion(newHead.x, newHead.y, COLORS.PINK, 10);
    }
    
    if (!ate) {
      this.snake.pop();
    }
  }
  
  activatePowerUp(type: PowerUpType) {
      switch(type) {
          case 'shield': this.shieldActive = true; this.shieldTime = 600; break;
          case 'magnet': this.magnetActive = true; this.magnetTime = 600; break;
          case 'dash': this.dashActive = true; this.dashTime = 300; break;
          case 'slow': this.slowActive = true; this.slowTime = 300; break;
      }
  }
  
  createExplosion(x: number, y: number, color: string, count: number = 15) {
      for(let i=0; i<count; i++) {
          this.particles.push({
              x: x * CELL_SIZE + CELL_SIZE/2,
              y: y * CELL_SIZE + CELL_SIZE/2,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              life: 1.0,
              decay: 0.02 + Math.random() * 0.03,
              color: color,
              size: 2 + Math.random() * 4
          });
      }
  }
  
  updateParticles() {
      for(let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= p.decay;
          p.size *= 0.95;
          
          if (p.life <= 0) {
              this.particles.splice(i, 1);
          }
      }
  }
}
