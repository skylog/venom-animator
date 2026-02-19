import type { KeyframeProperty } from '$lib/types/vanim';

class SelectionState {
  /** ID выбранной ноды (или null) */
  nodeId = $state<string | null>(null);

  /** ID выбранной частицы (или null) */
  particleId = $state<string | null>(null);

  /** Выбранное свойство в keyframes */
  keyframeProp = $state<KeyframeProperty | null>(null);

  /** Индекс выбранного keyframe в треке */
  keyframeIndex = $state<number | null>(null);

  selectNode(id: string | null): void {
    this.nodeId = id;
    this.particleId = null;
    this.keyframeProp = null;
    this.keyframeIndex = null;
  }

  selectParticle(id: string | null): void {
    this.particleId = id;
    this.nodeId = null;
    this.keyframeProp = null;
    this.keyframeIndex = null;
  }

  selectKeyframe(prop: KeyframeProperty, index: number): void {
    this.keyframeProp = prop;
    this.keyframeIndex = index;
  }

  clearKeyframe(): void {
    this.keyframeProp = null;
    this.keyframeIndex = null;
  }

  clear(): void {
    this.nodeId = null;
    this.particleId = null;
    this.keyframeProp = null;
    this.keyframeIndex = null;
  }
}

export const selectionState = new SelectionState();
