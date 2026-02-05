// Core Game Constants
export const CELL_SIZE = 20;
export const GRID_WIDTH = 40; // slightly wider for modern screens
export const GRID_HEIGHT = 30;
export const CANVAS_WIDTH = GRID_WIDTH * CELL_SIZE;
export const CANVAS_HEIGHT = GRID_HEIGHT * CELL_SIZE;

export const FPS = 60;

// Colors
export const COLORS = {
  CYAN: '#00FFFF',
  PINK: '#FF00FF',
  PURPLE: '#9D00FF',
  BLUE: '#0080FF',
  YELLOW: '#FFFF00',
  GREEN: '#00FF00',
  DARK_BG: '#0a0a0f',
  GRID: 'rgba(0, 255, 255, 0.1)',
};

export type Point = { x: number; y: number };
export type Vector = { x: number; y: number };

export enum GameMode {
  CLASSIC = 'classic',
  SURVIVAL = 'survival',
  TIME_ATTACK = 'time-attack',
}

export type PowerUpType = 'shield' | 'magnet' | 'dash' | 'slow';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  color: string;
  size: number;
}

export interface PowerUp {
  id: string;
  x: number;
  y: number;
  type: PowerUpType;
  life: number;
  maxLife: number;
}

export interface GameState {
  score: number;
  highScore: number;
  gameOver: boolean;
  paused: boolean;
  mode: GameMode;
  timeLeft?: number; // For Time Attack
}
