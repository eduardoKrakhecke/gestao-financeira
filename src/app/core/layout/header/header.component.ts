import { Component, EventEmitter, inject, Output } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  private readonly themeService = inject(ThemeService);

  @Output() menuToggle = new EventEmitter<void>();

  readonly theme = this.themeService.theme;

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  openMenu(): void {
    this.menuToggle.emit();
  }
}
