import { Container, Graphics } from 'pixi.js';
import type { VanimParticle, BlendMode } from '$lib/types/vanim';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  alphaStart: number;
  alphaEnd: number;
  graphic: Graphics;
}

const BLEND_MAP: Record<BlendMode, string> = {
  normal: 'normal',
  add: 'add',
  multiply: 'multiply',
  screen: 'screen',
};

export class ParticleSystem {
  readonly container: Container;
  private particles: Particle[] = [];
  private config: VanimParticle;
  private emitted = false;

  constructor(config: VanimParticle) {
    this.config = config;
    this.container = new Container();
    this.container.visible = false;
  }

  /**
   * Обновляет систему частиц для заданного глобального времени.
   */
  update(globalTimeMs: number): void {
    const localTime = globalTimeMs - this.config.startTime;

    if (localTime < 0) {
      this.container.visible = false;
      return;
    }

    this.container.visible = true;

    // Burst: эмитим один раз
    if (this.config.mode === 'burst' && !this.emitted) {
      this.emit();
      this.emitted = true;
    }

    // Continuous: эмитим пока duration не кончился
    if (this.config.mode === 'continuous') {
      const dur = this.config.duration ?? Infinity;
      if (localTime <= dur && this.particles.length < this.config.config.count) {
        this.emitOne();
      }
    }

    // Обновляем частицы
    const cfg = this.config.config;
    const gravity = cfg.gravity ?? 0;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;

      if (p.life > p.maxLife) {
        this.container.removeChild(p.graphic);
        p.graphic.destroy();
        this.particles.splice(i, 1);
        continue;
      }

      const t = p.life / p.maxLife;
      p.vy += gravity * 0.016; // ~60fps gravity
      p.x += p.vx;
      p.y += p.vy;

      const alpha = p.alphaStart + (p.alphaEnd - p.alphaStart) * t;
      p.graphic.x = p.x;
      p.graphic.y = p.y;
      p.graphic.alpha = Math.max(0, alpha);
    }
  }

  private emit(): void {
    const count = this.config.config.count;
    for (let i = 0; i < count; i++) {
      this.emitOne();
    }
  }

  private emitOne(): void {
    const cfg = this.config.config;

    const angle = randomRange(cfg.direction.min, cfg.direction.max);
    const speed = randomRange(cfg.speed.min, cfg.speed.max);
    const size = randomRange(cfg.size.min, cfg.size.max);
    const lifetime = cfg.lifetime / 16; // конвертируем ms в тики (~60fps)

    const g = new Graphics();
    g.circle(0, 0, size);
    g.fill({ color: cfg.color });
    if (cfg.blendMode) {
      g.blendMode = BLEND_MAP[cfg.blendMode] as any;
    }

    g.x = this.config.x;
    g.y = this.config.y;

    const particle: Particle = {
      x: this.config.x,
      y: this.config.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      life: 0,
      maxLife: lifetime,
      alphaStart: cfg.alpha.start,
      alphaEnd: cfg.alpha.end,
      graphic: g,
    };

    this.particles.push(particle);
    this.container.addChild(g);
  }

  reset(): void {
    for (const p of this.particles) {
      p.graphic.destroy();
    }
    this.particles = [];
    this.emitted = false;
    this.container.removeChildren();
    this.container.visible = false;
  }

  destroy(): void {
    this.reset();
    this.container.destroy();
  }
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
