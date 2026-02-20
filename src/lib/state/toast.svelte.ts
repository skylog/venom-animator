export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  detail?: string;
  duration: number;
}

class ToastState {
  items = $state<Toast[]>([]);
  private _nextId = 0;

  show(type: ToastType, message: string, detail?: string, duration = 3000): number {
    const id = this._nextId++;
    this.items = [...this.items, { id, type, message, detail, duration }];
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  success(message: string, detail?: string) {
    return this.show('success', message, detail);
  }

  error(message: string, detail?: string) {
    return this.show('error', message, detail, 5000);
  }

  info(message: string, detail?: string) {
    return this.show('info', message, detail);
  }

  warning(message: string, detail?: string) {
    return this.show('warning', message, detail, 4000);
  }

  dismiss(id: number): void {
    this.items = this.items.filter((t) => t.id !== id);
  }
}

export const toastState = new ToastState();
