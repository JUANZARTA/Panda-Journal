import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';

import { TaskTypeService } from '../../services/taskType.service';
import { TaskService } from '../../services/task.service';
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
  private taskService = inject(TaskService);

  categorias = toSignal(this.taskTypeService.getAllTaskTypes(), { initialValue: [] as TaskType[] });

  nuevoNombre = '';
  editandoId = '';
  editandoNombre = '';
  eliminandoId = '';
  errorEliminar = '';
  modalErrorEliminar = false;

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
    combineLatest([
      this.taskService.watchAllDatedTasks(),
      this.taskService.watchUndatedTasks()
    ]).subscribe(([tareasDated, tareasUndated]) => {
      const tienePendientesDated = tareasDated.some((t) => t.categoriaId === id && t.estado !== 'realizado');
      const tienePendientesUndated = tareasUndated.some((t) => t.categoriaId === id && t.estado !== 'realizado');
      const tienePendientes = tienePendientesDated || tienePendientesUndated;

      this.eliminandoId = id;
      this.modalErrorEliminar = tienePendientes;
    });
  }

  cancelarEliminar(): void {
    this.eliminandoId = '';
    this.errorEliminar = '';
  }

  confirmarEliminar(): void {
    console.log('confirmarEliminar llamado, id:', this.eliminandoId);
    if (!this.eliminandoId) return;
    const idAEliminar = this.eliminandoId;
    this.taskTypeService.deleteTaskType(idAEliminar).subscribe({
      next: () => {
        console.log('Categoría eliminada exitosamente');
        this.eliminandoId = '';
        this.errorEliminar = '';
      },
      error: (err) => {
        console.error('[ERROR] Al eliminar categoría:', err);
        this.errorEliminar = 'Error al eliminar la categoría';
        setTimeout(() => (this.errorEliminar = ''), 3000);
      },
    });
  }

  toggleActiva(categoria: TaskType): void {
    combineLatest([
      this.taskService.watchAllDatedTasks(),
      this.taskService.watchUndatedTasks()
    ]).subscribe(([tareasDated, tareasUndated]) => {
      const tienePendientesDated = tareasDated.some((t) => t.categoriaId === categoria.id && t.estado !== 'realizado');
      const tienePendientesUndated = tareasUndated.some((t) => t.categoriaId === categoria.id && t.estado !== 'realizado');
      const tienePendientes = tienePendientesDated || tienePendientesUndated;

      if (tienePendientes && (categoria.activa ?? true)) {
        this.errorEliminar = 'No puedes desactivar una categoría con tareas pendientes';
        setTimeout(() => (this.errorEliminar = ''), 3000);
        return;
      }

      const novaActiva = !(categoria.activa ?? true);
      this.taskTypeService.editTaskType(categoria.id, categoria.nombre, novaActiva).subscribe({
        error: (err) => console.error('[ERROR] Al cambiar estado de categoría:', err),
      });
    });
  }
}
