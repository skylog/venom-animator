const MIN_PX_PER_MS = 0.05;
const MAX_PX_PER_MS = 5.0;
const ZOOM_FACTOR = 1.2;

class TimelineState {
  pxPerMs = $state(0.5);
  readonly labelWidth = 120;

  zoomIn(): void {
    this.pxPerMs = Math.min(this.pxPerMs * ZOOM_FACTOR, MAX_PX_PER_MS);
  }

  zoomOut(): void {
    this.pxPerMs = Math.max(this.pxPerMs / ZOOM_FACTOR, MIN_PX_PER_MS);
  }

  setZoom(level: number): void {
    this.pxPerMs = Math.max(MIN_PX_PER_MS, Math.min(level, MAX_PX_PER_MS));
  }
}

export const timelineState = new TimelineState();
