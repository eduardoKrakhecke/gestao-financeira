import { Component, EventEmitter, inject, Output } from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  private readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @Output() menuToggle = new EventEmitter<void>();

  readonly theme = this.themeService.theme;
  readonly currentUser = this.authService.currentUser;

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  openMenu(): void {
    this.menuToggle.emit();
  }

  get userInitials(): string {
    return this.authService.getUserInitials();
  }

  logout(): void {
    this.authService.logout();
  }

}
