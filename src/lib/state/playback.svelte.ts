class PlaybackState {
  currentTime = $state(0);
  playing = $state(false);
  loop = $state(false);
  speed = $state(1);

  private _rafId: number | null = null;
  private _lastTimestamp: number | null = null;
  private _duration = 1000;
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
    this.currentTime = 0;
    this._onFrame?.(0);
  }

  togglePlay(): void {
    if (this.playing) {
      this.pause();
    } else {
      // Если в конце и не loop — сбрасываем
      if (this.currentTime >= this._duration && !this.loop) {
        this.currentTime = 0;
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

      if (this.currentTime >= this._duration) {
        if (this.loop) {
          this.currentTime = this.currentTime % this._duration;
        } else {
          this.currentTime = this._duration;
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
