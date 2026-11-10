
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { CategoriesService } from '../../services/categories.service';
import {
  Category,
  CategoryCreate,
  CategoryType
} from '../../models/category.model';

import { CategoryFormComponent } from '../../components/category-form/category-form.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, CategoryFormComponent],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss'
})
export class CategoriesComponent {
  private readonly categoriesService = inject(CategoriesService);

  readonly categories = signal<Category[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly search = signal('');
  readonly filterType = signal<'all' | CategoryType>('all');

  readonly formVisible = signal(false);
  readonly selectedCategory = signal<Category | null>(null);
  readonly deletingCategory = signal<Category | null>(null);
  readonly deleting = signal(false);

  readonly filteredCategories = computed(() => {
    const search = this.search().trim().toLocaleLowerCase('pt-BR');
    const type = this.filterType();

    return this.categories().filter(category => {
      const matchesName = category.name
        .toLocaleLowerCase('pt-BR')
        .includes(search);

      const matchesType = type === 'all' || category.type === type;

      return matchesName && matchesType;
    });
  });

  readonly incomeCount = computed(
    () => this.categories().filter(category => category.type === 'income').length
  );

  readonly expenseCount = computed(
    () => this.categories().filter(category => category.type === 'expense').length
  );

  readonly iconLabels: Record<string, string> = {
    wallet: 'Carteira',
    utensils: 'Alimentação',
    house: 'Moradia',
    car: 'Transporte',
    heart: 'Saúde',
    'graduation-cap': 'Educação',
    'shopping-bag': 'Compras',
    gamepad: 'Lazer',
    briefcase: 'Trabalho',
    gift: 'Presentes',
    'chart-line': 'Investimentos',
    'circle-dollar-sign': 'Outros'
  };

  constructor() {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading.set(true);
    this.error.set('');

    this.categoriesService.getCategories().subscribe({
      next: categories => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: error => {
        this.error.set(
          error?.message || 'Não foi possível carregar as categorias.'
        );
        this.loading.set(false);
      }
    });
  }

  setSearch(value: string): void {
    this.search.set(value);
  }

  setFilter(value: string): void {
    if (value === 'all' || value === 'income' || value === 'expense') {
      this.filterType.set(value);
    }
  }

  openCreate(): void {
    this.clearMessages();
    this.selectedCategory.set(null);
    this.formVisible.set(true);
  }

  openEdit(category: Category): void {
    this.clearMessages();
    this.selectedCategory.set(category);
    this.formVisible.set(true);
  }

  closeForm(): void {
    if (this.saving()) {
      return;
    }

    this.formVisible.set(false);
    this.selectedCategory.set(null);
  }

  saveCategory(data: CategoryCreate): void {
    this.clearMessages();
    this.saving.set(true);

    const category = this.selectedCategory();

    const request = category
      ? this.categoriesService.updateCategory(category.id, data)
      : this.categoriesService.createCategory(data);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.formVisible.set(false);
        this.selectedCategory.set(null);

        this.success.set(
          category
            ? 'Categoria atualizada com sucesso.'
            : 'Categoria criada com sucesso.'
        );

        this.loadCategories();
      },
      error: error => {
        this.saving.set(false);
        this.error.set(
          error?.error?.message ||
          error?.message ||
          'Não foi possível salvar a categoria.'
        );
      }
    });
  }

  askDelete(category: Category): void {
    this.clearMessages();
    this.deletingCategory.set(category);
  }

  cancelDelete(): void {
    if (!this.deleting()) {
      this.deletingCategory.set(null);
    }
  }

  confirmDelete(): void {
    const category = this.deletingCategory();

    if (!category || this.deleting()) {
      return;
    }

    this.deleting.set(true);
    this.clearMessages();

    this.categoriesService.deleteCategory(category.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deletingCategory.set(null);
        this.success.set('Categoria excluída com sucesso.');
        this.loadCategories();
      },
      error: error => {
        this.deleting.set(false);
        this.deletingCategory.set(null);
        this.error.set(
          error?.error?.message ||
          error?.message ||
          'Não foi possível excluir a categoria.'
        );
      }
    });
  }

  getIconLabel(icon: string): string {
    return this.iconLabels[icon] || 'Categoria';
  }

  private clearMessages(): void {
    this.error.set('');
    this.success.set('');
  }
}
