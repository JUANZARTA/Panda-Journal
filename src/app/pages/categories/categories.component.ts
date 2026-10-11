import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, take } from 'rxjs';

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

  /** Una categoría desactivada queda de solo lectura: solo se puede volver a activar. */
  esEditable(categoria: TaskType | undefined): boolean {
    return this.taskTypeService.categoriaEditable(categoria);
  }

  empezarEdicion(categoria: TaskType): void {
    if (!this.esEditable(categoria)) return;
    this.editandoId = categoria.id;
    this.editandoNombre = categoria.nombre;
  }

  cancelarEdicion(): void {
    this.editandoId = '';
    this.editandoNombre = '';
  }

  guardarEdicion(): void {
    if (!this.editandoNombre.trim() || !this.editandoId) return;
    if (!this.esEditable(this.categorias().find((c) => c.id === this.editandoId))) return;
    this.taskTypeService.editTaskType(this.editandoId, this.editandoNombre).subscribe({
      next: () => this.cancelarEdicion(),
      error: (err) => console.error('[ERROR] Al editar categoría:', err),
    });
  }

  pedirEliminar(id: string): void {
    if (!this.esEditable(this.categorias().find((c) => c.id === id))) return;
    // take(1): lectura puntual — el stream en vivo nunca completa y re-ejecutaría esto ante cualquier cambio de tareas.
    combineLatest([
      this.taskService.watchAllDatedTasks(),
      this.taskService.watchUndatedTasks()
    ]).pipe(take(1)).subscribe(([tareasDated, tareasUndated]) => {
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

  /**
   * Activa/desactiva la categoría. Al desactivar se guarda la fecha de hoy en desactivadaDesde
   * (el cuaderno oculta la sección desde ese día y la deja de solo lectura antes); al activar se borra.
   * No se borra ninguna tarea, así que no hace falta bloquear si hay pendientes.
   */
  toggleActiva(categoria: TaskType): void {
    const nuevaActiva = !this.esEditable(categoria);
    this.taskTypeService.setActiva(categoria.id, nuevaActiva).subscribe({
      error: (err) => console.error('[ERROR] Al cambiar estado de categoría:', err),
    });
  }

  puedeSubir(index: number): boolean {
    return index > 0;
  }

  puedeBajar(index: number): boolean {
    return index < this.categorias().length - 1;
  }

  moverArriba(index: number): void {
    const cats = this.categorias();
    if (index <= 0) return;

    const actual = cats[index];
    const anterior = cats[index - 1];

    const ordenActual = actual.orden ?? index;
    const ordenAnterior = anterior.orden ?? index - 1;

    this.taskTypeService.updateOrder(actual.id, ordenAnterior).subscribe();
    this.taskTypeService.updateOrder(anterior.id, ordenActual).subscribe();
  }

  moverAbajo(index: number): void {
    const cats = this.categorias();
    if (index >= cats.length - 1) return;

    const actual = cats[index];
    const siguiente = cats[index + 1];

    const ordenActual = actual.orden ?? index;
    const ordenSiguiente = siguiente.orden ?? index + 1;

    this.taskTypeService.updateOrder(actual.id, ordenSiguiente).subscribe();
    this.taskTypeService.updateOrder(siguiente.id, ordenActual).subscribe();
  }
}
