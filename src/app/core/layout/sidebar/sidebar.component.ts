import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

interface SidebarItem {
  label: string;
  route: string;
  icon: string;
  exact?: boolean;
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {

  @Input() mobileOpen = false;
  @Output() closeMenu = new EventEmitter<void>();

  private readonly authService = inject(AuthService);
  readonly currentUser = this.authService.currentUser;

  get userInitials(): string {
    return this.authService.getUserInitials();
  }

  logout(): void {
    this.authService.logout();
  }

  readonly groups: SidebarGroup[] = [
    {
      title: 'VISÃO GERAL',
      items: [
        {
          label: 'Dashboard',
          route: '/dashboard',
          icon: 'dashboard',
          exact: true
        }
      ]
    },
    {
      title: 'FINANCEIRO',
      items: [
        { label: 'Transações', route: '/transactions', icon: 'transactions' },
        { label: 'Contas', route: '/accounts', icon: 'accounts' },
        { label: 'Categorias', route: '/categories', icon: 'categories' },
        { label: 'Transferências', route: '/transfers', icon: 'transfers' }
      ]
    },
    {
      title: 'PLANEJAMENTO',
      items: [
        { label: 'Orçamentos', route: '/budgets', icon: 'budgets' },
        { label: 'Metas financeiras', route: '/goals', icon: 'goals' },
        { label: 'Relatórios', route: '/reports', icon: 'reports' }
      ]
    },
    {
      title: 'PREFERÊNCIAS',
      items: [
        { label: 'Configurações', route: '/settings', icon: 'settings' }
      ]
    }
  ];

  onNavigate(): void {
    this.closeMenu.emit();
  }

}
