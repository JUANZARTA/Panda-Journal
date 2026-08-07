import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { TaskTypeService } from '../../services/taskType.service';
import { TaskService } from '../../services/task.service';
import { TaskType } from '../../models/taskType.model';
import { Task } from '../../models/task.model';

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

  toggleTask(task: Task): void {
    this.taskService.toggleLostEstado(task).subscribe();
  }

  eliminarTarea(task: Task): void {
    this.taskService.removeLostTask(task.id).subscribe();
  }

  abrirAsignarFecha(task: Task): void {
    this.asignandoFechaId = task.id;
    this.fechaElegida = '';
  }

  cancelarAsignarFecha(): void {
    this.asignandoFechaId = '';
    this.fechaElegida = '';
  }

  confirmarAsignarFecha(task: Task): void {
    if (!this.fechaElegida) return;
    this.taskService.reassignLost(task, this.fechaElegida).subscribe({
      next: () => this.cancelarAsignarFecha(),
      error: (err) => console.error('[ERROR] Al reasignar fecha:', err),
    });
  }
}
