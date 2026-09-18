import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { RecurringTaskService } from '../../services/recurring-task.service';
import { TaskTypeService } from '../../services/taskType.service';
import { RecurringTask } from '../../models/recurring-task.model';

@Component({
  selector: 'app-recurring-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recurring-tasks.component.html',
  styleUrls: ['./recurring-tasks.component.css'],
})
export default class RecurringTasksComponent {
  private recurringTaskService = inject(RecurringTaskService);
  private taskTypeService = inject(TaskTypeService);

  tasks = toSignal(this.recurringTaskService.getAll(), { initialValue: [] });
  categories = toSignal(this.taskTypeService.getAllTaskTypes(), { initialValue: [] });

  nuevoNombre = signal('');
  categoriaSelecionada = signal('');
  editando = signal<string | null>(null);
  editNombre = signal('');
  editCategoria = signal('');

  agregarTarea(): void {
    const nombre = this.nuevoNombre().trim();
    const categoriaId = this.categoriaSelecionada().trim();

    if (!nombre || !categoriaId) return;

    this.recurringTaskService.create(nombre, categoriaId).subscribe({
      next: () => {
        this.nuevoNombre.set('');
        this.categoriaSelecionada.set('');
      },
      error: (err) => console.error('Error al crear tarea recurrente:', err),
    });
  }

  iniciarEdicion(task: RecurringTask): void {
    this.editando.set(task.id);
    this.editNombre.set(task.nombre);
    this.editCategoria.set(task.categoriaId);
  }

  guardarEdicion(taskId: string): void {
    const nombre = this.editNombre().trim();
    const categoriaId = this.editCategoria().trim();

    if (!nombre || !categoriaId) return;

    this.recurringTaskService.updateNombre(taskId, nombre).subscribe({
      error: (err) => console.error('Error al actualizar nombre:', err),
    });

    if (this.editCategoria() !== this.tasks().find((t) => t.id === taskId)?.categoriaId) {
      this.recurringTaskService.updateCategoria(taskId, categoriaId).subscribe({
        error: (err) => console.error('Error al actualizar categoría:', err),
      });
    }

    this.editando.set(null);
  }

  cancelarEdicion(): void {
    this.editando.set(null);
  }

  toggleActivo(task: RecurringTask): void {
    this.recurringTaskService.toggleActive(task.id, !task.activo).subscribe({
      error: (err) => console.error('Error al cambiar estado:', err),
    });
  }

  eliminar(taskId: string): void {
    if (!confirm('¿Eliminar esta tarea recurrente?')) return;

    this.recurringTaskService.delete(taskId).subscribe({
      error: (err) => console.error('Error al eliminar:', err),
    });
  }

  getNombreCategoria(categoriaId: string): string {
    return this.categories().find((c) => c.id === categoriaId)?.nombre || 'Desconocida';
  }
}
