import { Component, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { RecurringTaskService } from '../../services/recurring-task.service';
import { TaskTypeService } from '../../services/taskType.service';
import { RecurringTask } from '../../models/recurring-task.model';

export const DIAS_SEMANA = [
  { valor: 1, letra: 'L', corto: 'Lun' },
  { valor: 2, letra: 'M', corto: 'Mar' },
  { valor: 3, letra: 'X', corto: 'Mié' },
  { valor: 4, letra: 'J', corto: 'Jue' },
  { valor: 5, letra: 'V', corto: 'Vie' },
  { valor: 6, letra: 'S', corto: 'Sáb' },
  { valor: 0, letra: 'D', corto: 'Dom' },
];

@Component({
  selector: 'app-recurring-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
  creando = signal(false);
  diasSemana = DIAS_SEMANA;
  nuevoDias = signal<number[]>(DIAS_SEMANA.map((d) => d.valor));
  editDias = signal<number[]>([]);

  toggleDia(dias: WritableSignal<number[]>, valor: number): void {
    dias.update((actual) =>
      actual.includes(valor) ? actual.filter((d) => d !== valor) : [...actual, valor]
    );
  }

  resumenDias(dias?: number[]): string {
    const set = new Set(dias ?? []);
    if (set.size === 0 || set.size === 7) return 'Todos los días';
    if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return 'Lun a Vie';
    if (set.size === 2 && set.has(6) && set.has(0)) return 'Fines de semana';
    return DIAS_SEMANA.filter((d) => set.has(d.valor)).map((d) => d.corto).join(', ');
  }

  agregarTarea(): void {
    if (this.creando()) return;

    const nombre = this.nuevoNombre().trim();
    const categoriaId = this.categoriaSelecionada().trim();

    const dias = this.nuevoDias();

    if (!nombre || !categoriaId || dias.length === 0) return;

    this.creando.set(true);
    this.recurringTaskService.create(nombre, categoriaId, dias.length === 7 ? undefined : dias).subscribe({
      next: () => {
        this.nuevoNombre.set('');
        this.categoriaSelecionada.set('');
        this.nuevoDias.set(DIAS_SEMANA.map((d) => d.valor));
        this.creando.set(false);
      },
      error: (err) => {
        console.error('Error al crear tarea recurrente:', err);
        this.creando.set(false);
      },
    });
  }

  iniciarEdicion(task: RecurringTask): void {
    this.editando.set(task.id);
    this.editNombre.set(task.nombre);
    this.editCategoria.set(task.categoriaId);
    this.editDias.set(task.dias?.length ? [...task.dias] : DIAS_SEMANA.map((d) => d.valor));
  }

  guardarEdicion(taskId: string): void {
    const nombre = this.editNombre().trim();
    const categoriaId = this.editCategoria().trim();

    const dias = this.editDias();

    if (!nombre || !categoriaId || dias.length === 0) return;

    this.recurringTaskService.updateNombre(taskId, nombre).subscribe({
      error: (err) => console.error('Error al actualizar nombre:', err),
    });

    if (this.editCategoria() !== this.tasks().find((t) => t.id === taskId)?.categoriaId) {
      this.recurringTaskService.updateCategoria(taskId, categoriaId).subscribe({
        error: (err) => console.error('Error al actualizar categoría:', err),
      });
    }

    const original = this.tasks().find((t) => t.id === taskId)?.dias ?? [];
    const originalSet = new Set(original.length ? original : DIAS_SEMANA.map((d) => d.valor));
    if (dias.length !== originalSet.size || dias.some((d) => !originalSet.has(d))) {
      this.recurringTaskService.updateDias(taskId, dias.length === 7 ? null : dias).subscribe({
        error: (err) => console.error('Error al actualizar días:', err),
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
