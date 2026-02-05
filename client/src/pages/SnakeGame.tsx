import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SnakeEngine } from '@/game/engine';
import { CELL_SIZE, GRID_WIDTH, GRID_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, GameMode } from '@/game/constants';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Volume2, Trophy, Settings, Play, Skull, Clock, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnakeEngine | null>(null);
  const requestRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0); // In a real app, load from localStorage
  const [gameOver, setGameOver] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.CLASSIC);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePowerUps, setActivePowerUps] = useState<string[]>([]);
  
  // Settings State
  const [volume, setVolume] = useState([50]);
  const [useScanlines, setUseScanlines] = useState(true);

  // Initialize Engine
  useEffect(() => {
    engineRef.current = new SnakeEngine(gameMode);
    
    // Input Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
        // Prevent default scrolling for arrow keys
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
            e.preventDefault();
        }
        engineRef.current?.handleInput(e.key);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameMode]);

  // Game Loop
  const animate = useCallback((time: number) => {
    if (!canvasRef.current || !engineRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const engine = engineRef.current;
    
    // Update Logic
    if (isPlaying) {
        engine.update(time, 16.6); // Assuming ~60fps for delta
    }

    // Sync React State (Throttled ideally, but for now every frame is ok for simple states)
    if (engine.score !== score) setScore(engine.score);
    if (engine.gameOver !== gameOver) {
        setGameOver(engine.gameOver);
        if (engine.gameOver) setIsPlaying(false);
    }
    
    // Sync Powerup State for UI
    const active = [];
    if (engine.shieldActive) active.push('SHIELD');
    if (engine.magnetActive) active.push('MAGNET');
    if (engine.dashActive) active.push('DASH');
    if (engine.slowActive) active.push('SLOW');
    // Simple equality check to avoid re-renders if same
    if (active.join(',') !== activePowerUps.join(',')) setActivePowerUps(active);

    // --- RENDER ---
    
    // clear
    ctx.fillStyle = COLORS.DARK_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Grid
    ctx.strokeStyle = COLORS.GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= GRID_WIDTH; x++) {
        ctx.moveTo(x * CELL_SIZE, 0);
        ctx.lineTo(x * CELL_SIZE, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
        ctx.moveTo(0, y * CELL_SIZE);
        ctx.lineTo(CANVAS_WIDTH, y * CELL_SIZE);
    }
    ctx.stroke();
    
    // Draw Snake
    engine.snake.forEach((seg, i) => {
        const isHead = i === 0;
        ctx.fillStyle = isHead ? '#FFFFFF' : (engine.shieldActive ? COLORS.BLUE : COLORS.CYAN);
        
        // Neon Glow
        ctx.shadowBlur = isHead ? 20 : 10;
        ctx.shadowColor = COLORS.CYAN;
        
        const x = seg.x * CELL_SIZE;
        const y = seg.y * CELL_SIZE;
        
        // Slightly smaller than cell for style
        ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        
        ctx.shadowBlur = 0; // Reset
    });
    
    // Draw Food
    if (engine.food) {
        const x = engine.food.x * CELL_SIZE + CELL_SIZE/2;
        const y = engine.food.y * CELL_SIZE + CELL_SIZE/2;
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = COLORS.YELLOW;
        ctx.fillStyle = COLORS.YELLOW;
        
        ctx.beginPath();
        ctx.arc(x, y, CELL_SIZE/3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    // Draw Powerups
    engine.powerUps.forEach(p => {
        const x = p.x * CELL_SIZE + CELL_SIZE/2;
        const y = p.y * CELL_SIZE + CELL_SIZE/2;
        
        let color = COLORS.PINK;
        if (p.type === 'shield') color = COLORS.BLUE;
        if (p.type === 'magnet') color = COLORS.PURPLE;
        if (p.type === 'dash') color = COLORS.GREEN;
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        // Pulsing effect
        const pulse = Math.sin(time / 200) * 2;
        ctx.arc(x, y, CELL_SIZE/3 + pulse, 0, Math.PI * 2);
        ctx.stroke();
        
        // Icon (simplified)
        ctx.fillStyle = color;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.type[0].toUpperCase(), x, y);
        
        ctx.shadowBlur = 0;
    });
    
    // Draw Particles
    engine.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, score, gameOver, activePowerUps]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  // Controls
  const startGame = () => {
    engineRef.current?.reset();
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);
  };

  const changeMode = (mode: GameMode) => {
      setGameMode(mode);
      engineRef.current = new SnakeEngine(mode);
      setIsPlaying(false);
      setScore(0);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative font-display text-foreground">
      
      {/* Scanline Overlay */}
      {useScanlines && <div className="absolute inset-0 scanline z-50 pointer-events-none opacity-20"></div>}
      
      {/* Header / HUD */}
      <div className="w-full max-w-[800px] flex justify-between items-end mb-4 z-10">
        <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-purple text-glow italic">
                ULTRA SNAKE
            </h1>
            <div className="text-sm text-neon-blue font-body tracking-widest opacity-80">CYBERPUNK EDITION</div>
        </div>
        
        <div className="flex gap-8">
            <div className="text-right">
                <div className="text-xs text-muted-foreground uppercase">Score</div>
                <div className="text-3xl font-bold text-neon-yellow">{score.toString().padStart(6, '0')}</div>
            </div>
            <div className="text-right hidden md:block">
                <div className="text-xs text-muted-foreground uppercase">High Score</div>
                <div className="text-3xl font-bold text-neon-pink">{highScore.toString().padStart(6, '0')}</div>
            </div>
        </div>
      </div>
      
      {/* Active Powerups HUD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2">
          {activePowerUps.map(p => (
              <div key={p} className="bg-background/80 border border-neon-cyan px-3 py-1 rounded-full text-xs font-bold text-neon-cyan animate-pulse shadow-[0_0_10px_var(--color-neon-cyan)]">
                  {p} ACTIVE
              </div>
          ))}
      </div>

      {/* Main Game Area */}
      <div className="relative group">
          {/* Neon Border Container */}
          <div className="absolute -inset-1 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink rounded-lg opacity-75 blur group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          
          <div className="relative bg-black rounded-lg p-1 border border-white/10 shadow-2xl">
            <canvas 
                ref={canvasRef} 
                width={CANVAS_WIDTH} 
                height={CANVAS_HEIGHT}
                className="block bg-black/50 cursor-crosshair"
                style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
            />
            
            {/* Game Over / Menu Overlay */}
            {(!isPlaying || gameOver) && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                    <div className="bg-card/90 border border-neon-purple p-8 rounded-xl max-w-md w-full shadow-[0_0_50px_rgba(157,0,255,0.3)] text-center">
                        {gameOver ? (
                            <>
                                <h2 className="text-5xl font-black text-destructive mb-2 text-glow-pink">SYSTEM FAILURE</h2>
                                <p className="text-muted-foreground mb-8 font-body">CONNECTION TERMINATED. SCORE: {score}</p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">READY PLAYER ONE</h2>
                                <p className="text-neon-cyan mb-8 font-body uppercase tracking-widest text-sm">Select Protocol</p>
                            </>
                        )}
                        
                        <div className="grid grid-cols-1 gap-4 mb-8">
                           <Button 
                                size="lg" 
                                onClick={startGame}
                                className="bg-neon-cyan text-black hover:bg-white hover:text-neon-cyan font-bold text-xl h-14 border-none shadow-[0_0_20px_rgba(0,255,255,0.5)] transition-all hover:scale-105"
                            >
                                {gameOver ? 'REBOOT SYSTEM' : 'INITIALIZE'}
                           </Button>
                        </div>
                        
                        <div className="flex justify-center gap-4">
                            <ModeButton 
                                active={gameMode === GameMode.CLASSIC} 
                                onClick={() => changeMode(GameMode.CLASSIC)}
                                icon={<Play size={16} />}
                                label="Classic"
                            />
                            <ModeButton 
                                active={gameMode === GameMode.SURVIVAL} 
                                onClick={() => changeMode(GameMode.SURVIVAL)}
                                icon={<Skull size={16} />}
                                label="Survival"
                            />
                            <ModeButton 
                                active={gameMode === GameMode.TIME_ATTACK} 
                                onClick={() => changeMode(GameMode.TIME_ATTACK)}
                                icon={<Clock size={16} />}
                                label="Time Atk"
                            />
                        </div>
                    </div>
                </div>
            )}
          </div>
      </div>
      
      {/* Controls & Settings Footer */}
      <div className="w-full max-w-[800px] mt-6 flex justify-between items-center text-muted-foreground">
        <div className="flex gap-6 text-sm font-body">
            <div className="flex items-center gap-2">
                <span className="bg-white/10 px-2 py-1 rounded text-white font-mono">WASD</span>
                <span>MOVE</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="bg-white/10 px-2 py-1 rounded text-white font-mono">ARROWS</span>
                <span>MOVE</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="bg-white/10 px-2 py-1 rounded text-white font-mono">SPACE</span>
                <span>DASH / RESTART</span>
            </div>
        </div>
        
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:text-neon-cyan hover:bg-neon-cyan/10">
                    <Settings />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-neon-purple text-foreground font-display">
                <DialogHeader>
                    <DialogTitle className="text-neon-purple">SYSTEM SETTINGS</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Master Volume</Label>
                            <div className="text-xs text-muted-foreground font-body">Adjust system audio levels</div>
                        </div>
                        <div className="w-1/2">
                            <Slider defaultValue={volume} max={100} step={1} onValueChange={setVolume} className="[&>.relative>.absolute]:bg-neon-cyan" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">CRT Scanlines</Label>
                            <div className="text-xs text-muted-foreground font-body">Retro visual artifacting</div>
                        </div>
                        <Switch checked={useScanlines} onCheckedChange={setUseScanlines} className="data-[state=checked]:bg-neon-pink" />
                    </div>
                    
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <h4 className="text-sm text-neon-blue mb-2">INPUT DIAGNOSTICS</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground">
                            <div className="flex justify-between"><span>WASD INPUT</span> <span className="text-green-500">ONLINE</span></div>
                            <div className="flex justify-between"><span>ARROW INPUT</span> <span className="text-green-500">ONLINE</span></div>
                            <div className="col-span-2 text-[10px] mt-1 opacity-70">
                                * Both input methods are simultaneously active to prevent conflict.
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button 
            onClick={onClick}
            className={`
                flex flex-col items-center justify-center w-20 h-20 rounded-lg border transition-all duration-300
                ${active 
                    ? 'bg-neon-purple/20 border-neon-purple text-white shadow-[0_0_15px_rgba(157,0,255,0.4)] scale-110' 
                    : 'bg-black/40 border-white/10 text-muted-foreground hover:bg-white/5 hover:border-white/30'
                }
            `}
        >
            <div className={`mb-2 ${active ? 'text-neon-pink' : ''}`}>{icon}</div>
            <span className="text-xs font-bold uppercase">{label}</span>
        </button>
    );
}
