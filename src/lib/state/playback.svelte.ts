class PlaybackState {
  currentTime = $state(0);
  playing = $state(false);
  loop = $state(false);
  speed = $state(1);

  // Регион-плейбэк (null = вся анимация)
  regionStart = $state<number | null>(null);
  regionEnd = $state<number | null>(null);

  private _rafId: number | null = null;
  private _lastTimestamp: number | null = null;
  private _duration = $state(1000);
  private _onFrame: ((time: number) => void) | null = null;

  /** Устанавливает callback для каждого кадра (вызывается из CanvasPanel) */
  setFrameCallback(cb: (time: number) => void): void {
    this._onFrame = cb;
  }

  setDuration(ms: number): void {
    this._duration = ms;
  }

  get duration(): number {
    return this._duration;
  }

  get hasRegion(): boolean {
    return this.regionStart !== null && this.regionEnd !== null;
  }

  /** Эффективные границы плейбэка (регион или вся анимация) */
  get effectiveStart(): number {
    return this.regionStart ?? 0;
  }

  get effectiveEnd(): number {
    return this.regionEnd ?? this._duration;
  }

  setRegion(start: number, end: number): void {
    this.regionStart = start;
    this.regionEnd = end;
    // Перемещаем playhead в начало региона
    this.seek(start);
  }

  clearRegion(): void {
    this.regionStart = null;
    this.regionEnd = null;
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this._lastTimestamp = null;
    this._rafId = requestAnimationFrame(this._tick);
  }

  pause(): void {
    this.playing = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  stop(): void {
    this.pause();
    this.currentTime = this.effectiveStart;
    this._onFrame?.(this.currentTime);
  }

  togglePlay(): void {
    if (this.playing) {
      this.pause();
    } else {
      // Если в конце региона/анимации и не loop — сбрасываем к началу
      if (this.currentTime >= this.effectiveEnd && !this.loop) {
        this.currentTime = this.effectiveStart;
      }
      this.play();
    }
  }

  seek(timeMs: number): void {
    this.currentTime = Math.max(0, Math.min(timeMs, this._duration));
    this._onFrame?.(this.currentTime);
  }

  private _tick = (timestamp: number): void => {
    if (!this.playing) return;

    if (this._lastTimestamp !== null) {
      const deltaMs = (timestamp - this._lastTimestamp) * this.speed;
      this.currentTime += deltaMs;

      const end = this.effectiveEnd;
      const start = this.effectiveStart;

      if (this.currentTime >= end) {
        if (this.loop) {
          const range = end - start;
          this.currentTime = start + ((this.currentTime - start) % range);
        } else {
          this.currentTime = end;
          this.playing = false;
          this._onFrame?.(this.currentTime);
          return;
        }
      }
    }

    this._lastTimestamp = timestamp;
    this._onFrame?.(this.currentTime);
    this._rafId = requestAnimationFrame(this._tick);
  };

  destroy(): void {
    this.pause();
    this._onFrame = null;
  }
}

export const playbackState = new PlaybackState();
