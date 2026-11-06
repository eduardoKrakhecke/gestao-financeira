import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

export interface AppNotification {
  message: string;
  type: NotificationType;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly current = signal<AppNotification | null>(null);

  show(message: string, type: NotificationType = 'info'): void {
    this.current.set({ message, type });
  }

  clear(): void {
    this.current.set(null);
  }
}
