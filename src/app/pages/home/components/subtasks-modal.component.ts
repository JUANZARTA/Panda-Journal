import { Component, input, output, signal, inject, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskInput } from '../../../models/task.model';
import { TaskService } from '../../../services/task.service';
import { delay } from 'rxjs';

@Component({
  selector: 'app-subtasks-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subtasks-modal.component.html',
  styleUrl: './subtasks-modal.component.css',
})
export class SubtasksModalComponent {
  parentTask = input.required<Task>();
  fecha = input.required<string>();
  closeModal = output<void>();

  private taskService = inject(TaskService);

  subtasks = signal<Task[]>([]);
  nuevoTexto = signal('');
  editandoId = signal('');
  editandoNombre = signal('');

  constructor() {
    effect(() => {
      const parent = this.parentTask();
      const fecha = this.fecha();
      if (parent && fecha) {
        this.loadSubtasks();
      }
    });
  }

  private loadSubtasks(): void {
    this.taskService.getSubtasks(this.parentTask().id, this.fecha()).pipe(
      delay(100)
    ).subscribe((subs) => {
      this.subtasks.set(subs);
    });
  }

  agregarSubtarea(): void {
    const nombre = this.nuevoTexto().trim();
    if (!nombre) return;

    this.taskService.createSubtask(this.parentTask().id, this.fecha(), {
      nombre,
      categoriaId: this.parentTask().categoriaId,
      estado: 'pendiente',
    }).subscribe(() => {
      this.nuevoTexto.set('');
      this.loadSubtasks();
    });
  }

  empezarEdicion(subtask: Task): void {
    this.editandoId.set(subtask.id);
    this.editandoNombre.set(subtask.nombre);
  }

  guardarEdicion(subtask: Task): void {
    const nombre = this.editandoNombre().trim();
    if (!nombre) return;

    this.taskService.updateSubtaskName(this.parentTask().id, subtask.id, this.fecha(), nombre).subscribe(() => {
      this.editandoId.set('');
      this.loadSubtasks();
    });
  }

  cancelarEdicion(): void {
    this.editandoId.set('');
  }

  eliminarSubtarea(subtask: Task): void {
    this.taskService.deleteSubtask(this.parentTask().id, subtask.id, this.fecha()).subscribe(() => {
      this.loadSubtasks();
    });
  }

  toggleCompleta(subtask: Task): void {
    this.taskService.toggleSubtaskComplete(this.parentTask().id, subtask.id, this.fecha(), subtask.estado).subscribe(() => {
      this.loadSubtasks();
    });
  }

  moverArriba(subtask: Task): void {
    const subs = this.subtasks();
    const idx = subs.findIndex((s) => s.id === subtask.id);
    if (idx <= 0) return;

    const anterior = subs[idx - 1];
    const tempNombre = subtask.nombre;
    const tempEstado = subtask.estado;

    this.taskService.updateSubtaskName(this.parentTask().id, subtask.id, this.fecha(), anterior.nombre).subscribe(() => {
      this.taskService.updateSubtaskEstado(this.parentTask().id, subtask.id, this.fecha(), anterior.estado).subscribe(() => {
        this.taskService.updateSubtaskName(this.parentTask().id, anterior.id, this.fecha(), tempNombre).subscribe(() => {
          this.taskService.updateSubtaskEstado(this.parentTask().id, anterior.id, this.fecha(), tempEstado).subscribe(() => {
            this.loadSubtasks();
          });
        });
      });
    });
  }

  moverAbajo(subtask: Task): void {
    const subs = this.subtasks();
    const idx = subs.findIndex((s) => s.id === subtask.id);
    if (idx >= subs.length - 1) return;

    const siguiente = subs[idx + 1];
    const tempNombre = subtask.nombre;
    const tempEstado = subtask.estado;

    this.taskService.updateSubtaskName(this.parentTask().id, subtask.id, this.fecha(), siguiente.nombre).subscribe(() => {
      this.taskService.updateSubtaskEstado(this.parentTask().id, subtask.id, this.fecha(), siguiente.estado).subscribe(() => {
        this.taskService.updateSubtaskName(this.parentTask().id, siguiente.id, this.fecha(), tempNombre).subscribe(() => {
          this.taskService.updateSubtaskEstado(this.parentTask().id, siguiente.id, this.fecha(), tempEstado).subscribe(() => {
            this.loadSubtasks();
          });
        });
      });
    });
  }

  puedeSubir(subtask: Task): boolean {
    return this.subtasks().findIndex((s) => s.id === subtask.id) > 0;
  }

  puedeJajar(subtask: Task): boolean {
    const idx = this.subtasks().findIndex((s) => s.id === subtask.id);
    return idx >= 0 && idx < this.subtasks().length - 1;
  }

  todasCompletas(): boolean {
    const subs = this.subtasks();
    return subs.length > 0 && subs.every((s) => s.estado === 'realizado');
  }

  marcarTodasCompletas(): void {
    const subs = this.subtasks();
    subs.forEach((subtask) => {
      if (subtask.estado !== 'realizado') {
        this.taskService.toggleSubtaskComplete(this.parentTask().id, subtask.id, this.fecha(), subtask.estado).subscribe();
      }
    });
    // Recargar después de un pequeño delay
    setTimeout(() => this.loadSubtasks(), 200);
  }

  private verificarYCompletarPadre(): void {
    const todasCompletas = this.todasCompletas();
    const estadoPadre = this.parentTask().estado;

    if (todasCompletas && estadoPadre !== 'realizado') {
      // Si todas están completas pero el padre no, marcarlo
      this.taskService.updateTask(this.parentTask().id, { estado: 'realizado' }).subscribe();
    } else if (!todasCompletas && estadoPadre === 'realizado') {
      // Si no todas están completas pero el padre está marcado, desmarcarlo
      this.taskService.updateTask(this.parentTask().id, { estado: 'pendiente' }).subscribe();
    }
  }

  onCerrar(): void {
    this.verificarYCompletarPadre();
    this.closeModal.emit();
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.onCerrar();
  }
}
