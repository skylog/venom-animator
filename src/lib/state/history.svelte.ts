import type { VanimDocument } from '$lib/types/vanim';
import { projectState } from './project.svelte';

/** Снапшот документа для undo/redo */
interface Snapshot {
  doc: VanimDocument;
  label: string;
}

const MAX_HISTORY = 50;

class HistoryState {
  private undoStack = $state<Snapshot[]>([]);
  private redoStack = $state<Snapshot[]>([]);

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Сохраняет текущее состояние перед изменением.
   * Вызывать ДО применения изменений.
   */
  push(label: string): void {
    const snapshot: Snapshot = {
      doc: $state.snapshot(projectState.document) as VanimDocument,
      label,
    };
    this.undoStack = [...this.undoStack.slice(-(MAX_HISTORY - 1)), snapshot];
    this.redoStack = [];
  }

  undo(): void {
    if (this.undoStack.length === 0) return;

    const snapshot = this.undoStack[this.undoStack.length - 1];
    this.undoStack = this.undoStack.slice(0, -1);

    // Сохраняем текущее для redo
    this.redoStack = [
      ...this.redoStack,
      { doc: $state.snapshot(projectState.document) as VanimDocument, label: snapshot.label },
    ];

    projectState.setDocument($state.snapshot(snapshot.doc) as VanimDocument);
    projectState.dirty = true;
  }

  redo(): void {
    if (this.redoStack.length === 0) return;

    const snapshot = this.redoStack[this.redoStack.length - 1];
    this.redoStack = this.redoStack.slice(0, -1);

    // Сохраняем текущее для undo
    this.undoStack = [
      ...this.undoStack,
      { doc: $state.snapshot(projectState.document) as VanimDocument, label: snapshot.label },
    ];

    projectState.setDocument($state.snapshot(snapshot.doc) as VanimDocument);
    projectState.dirty = true;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

export const historyState = new HistoryState();
