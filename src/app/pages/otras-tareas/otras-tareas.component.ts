import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { TaskTypeService } from '../../services/taskType.service';
import { TaskService } from '../../services/task.service';
import { TaskType } from '../../models/taskType.model';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-otras-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './otras-tareas.component.html',
  styleUrl: './otras-tareas.component.css',
})
export default class OtrasTareasComponent {
  private taskTypeService = inject(TaskTypeService);
  private taskService = inject(TaskService);

  categorias = toSignal(this.taskTypeService.getAllTaskTypes(), { initialValue: [] as TaskType[] });
  private tareas = toSignal(this.taskService.watchUndatedTasks(), { initialValue: [] as Task[] });

  tareasPorCategoria = computed(() => {
    const map = new Map<string, Task[]>();
    this.tareas().forEach((t) => {
      const lista = map.get(t.categoriaId) ?? [];
      lista.push(t);
      map.set(t.categoriaId, lista);
    });
    return map;
  });

  nuevoTaskTexto: Record<string, string> = {};
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

  toggleTask(task: Task): void {
    this.taskService.toggleUndatedEstado(task).subscribe();
  }

  agregarTarea(categoriaId: string): void {
    const texto = (this.nuevoTaskTexto[categoriaId] || '').trim();
    if (!texto) return;

    this.taskService.addUndatedTask({ nombre: texto, categoriaId, estado: 'pendiente' }).subscribe();
    this.nuevoTaskTexto[categoriaId] = '';
  }

  eliminarTarea(task: Task): void {
    this.taskService.removeUndatedTask(task.id).subscribe();
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
    this.taskService.assignDate(task, this.fechaElegida).subscribe({
      next: () => this.cancelarAsignarFecha(),
      error: (err) => console.error('[ERROR] Al asignar fecha:', err),
    });
  }
}
