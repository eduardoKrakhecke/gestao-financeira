
import {
  Injectable,
  inject,
  signal
} from '@angular/core';

import {
  DOCUMENT,
  isPlatformBrowser
} from '@angular/common';

import { PLATFORM_ID } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly storageKey = 'finance-flow-theme';

  private readonly themeState = signal<Theme>('light');

  readonly theme = this.themeState.asReadonly();

  readonly isDark = signal(false);

  initialize(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const savedTheme = localStorage.getItem(this.storageKey);

    const theme: Theme =
      savedTheme === 'dark' ? 'dark' : 'light';

    this.setTheme(theme, false);
  }

  setTheme(theme: Theme, persist = true): void {
    this.themeState.set(theme);
    this.isDark.set(theme === 'dark');

    this.document.documentElement.setAttribute(
      'data-theme',
      theme
    );

    if (
      persist &&
      isPlatformBrowser(this.platformId)
    ) {
      localStorage.setItem(this.storageKey, theme);
    }
  }

  toggleTheme(): void {
    const nextTheme: Theme =
      this.theme() === 'light' ? 'dark' : 'light';

    this.setTheme(nextTheme);
  }
}
