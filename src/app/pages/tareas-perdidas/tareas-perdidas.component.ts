import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { TaskTypeService } from '../../services/taskType.service';
import { TaskService } from '../../services/task.service';
import { TaskType } from '../../models/taskType.model';
import { Task } from '../../models/task.model';
import { formatDate } from '../../services/date.service';

@Component({
  selector: 'app-tareas-perdidas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tareas-perdidas.component.html',
  styleUrl: './tareas-perdidas.component.css',
})
export default class TareasPerdidasComponent {
  private taskTypeService = inject(TaskTypeService);
  private taskService = inject(TaskService);

  categorias = toSignal(this.taskTypeService.getAllTaskTypes(), { initialValue: [] as TaskType[] });
  private tareas = toSignal(this.taskService.watchLostTasks(), { initialValue: [] as Task[] });

  hayTareas = computed(() => this.tareas().length > 0);

  tareasPorCategoria = computed(() => {
    const map = new Map<string, Task[]>();
    this.tareas().forEach((t) => {
      const lista = map.get(t.categoriaId) ?? [];
      lista.push(t);
      map.set(t.categoriaId, lista);
    });
    return map;
  });

  asignandoFechaId = '';
  fechaElegida = '';

  trackById(_index: number, item: TaskType): string {
    return item.id;
  }

  trackByTaskId(_index: number, item: Task): string {
    return item.id;
  }

  tareasDe(categoriaId: string): Task[] {
    return this.tareasPorCategoria().get(categoriaId) ?? [];
  }

  nombreCategoria(categoriaId: string): string {
    return this.categorias().find((c) => c.id === categoriaId)?.nombre ?? 'Sin categoría';
  }

  /** Las tareas de una categoría desactivada se ven pero no se pueden tocar. */
  editable(categoriaId: string): boolean {
    return this.taskTypeService.categoriaEditable(this.categorias().find((c) => c.id === categoriaId));
  }

  toggleTask(task: Task): void {
    if (!this.editable(task.categoriaId)) return;
    this.taskService.toggleLostEstado(task).subscribe();
  }

  eliminarTarea(task: Task): void {
    if (!this.editable(task.categoriaId)) return;
    this.taskService.removeLostTask(task.id).subscribe();
  }

  abrirAsignarFecha(task: Task): void {
    if (!this.editable(task.categoriaId)) return;
    this.asignandoFechaId = task.id;
    this.fechaElegida = '';
  }

  cancelarAsignarFecha(): void {
    this.asignandoFechaId = '';
    this.fechaElegida = '';
  }

  /** Pendientes que se pueden mover (excluye realizadas y categorías desactivadas). */
  pendientesMovibles = computed(() =>
    this.tareas().filter((t) => t.estado !== 'realizado' && this.editable(t.categoriaId))
  );

  moviendoTodas = false;

  asignarTodasHoy(): void {
    const tareas = this.pendientesMovibles();
    if (tareas.length === 0 || this.moviendoTodas) return;
    this.moviendoTodas = true;
    const hoy = formatDate(new Date());
    forkJoin(tareas.map((t) => this.taskService.reassignLost(t, hoy))).subscribe({
      next: () => (this.moviendoTodas = false),
      error: (err) => {
        this.moviendoTodas = false;
        console.error('[ERROR] Al mover todas a hoy:', err);
      },
    });
  }

  confirmarAsignarFecha(task: Task): void {
    if (!this.fechaElegida || !this.editable(task.categoriaId)) return;
    this.taskService.reassignLost(task, this.fechaElegida).subscribe({
      next: () => this.cancelarAsignarFecha(),
      error: (err) => console.error('[ERROR] Al reasignar fecha:', err),
    });
  }
}
