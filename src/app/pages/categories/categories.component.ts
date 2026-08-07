import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { TaskTypeService } from '../../services/taskType.service';
import { TaskType } from '../../models/taskType.model';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css',
})
export default class CategoriesComponent {
  private taskTypeService = inject(TaskTypeService);

  categorias = toSignal(this.taskTypeService.getAllTaskTypes(), { initialValue: [] as TaskType[] });

  nuevoNombre = '';
  editandoId = '';
  editandoNombre = '';
  eliminandoId = '';

  trackById(_index: number, item: TaskType): string {
    return item.id;
  }

  agregar(): void {
    if (!this.nuevoNombre.trim()) return;
    this.taskTypeService.addTaskType(this.nuevoNombre).subscribe({
      next: () => (this.nuevoNombre = ''),
      error: (err) => console.error('[ERROR] Al agregar categoría:', err),
    });
  }

  empezarEdicion(categoria: TaskType): void {
    this.editandoId = categoria.id;
    this.editandoNombre = categoria.nombre;
  }

  cancelarEdicion(): void {
    this.editandoId = '';
    this.editandoNombre = '';
  }

  guardarEdicion(): void {
    if (!this.editandoNombre.trim() || !this.editandoId) return;
    this.taskTypeService.editTaskType(this.editandoId, this.editandoNombre).subscribe({
      next: () => this.cancelarEdicion(),
      error: (err) => console.error('[ERROR] Al editar categoría:', err),
    });
  }

  pedirEliminar(id: string): void {
    this.eliminandoId = id;
  }

  cancelarEliminar(): void {
    this.eliminandoId = '';
  }

  confirmarEliminar(): void {
    if (!this.eliminandoId) return;
    this.taskTypeService.deleteTaskType(this.eliminandoId).subscribe({
      next: () => this.cancelarEliminar(),
      error: (err) => console.error('[ERROR] Al eliminar categoría:', err),
    });
  }
}
