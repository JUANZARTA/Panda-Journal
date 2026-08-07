import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { TaskTypeService } from '../../services/taskType.service';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { DateService, formatDate, parseLocalDate } from '../../services/date.service';
import { Task } from '../../models/task.model';
import { TaskType } from '../../models/taskType.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export default class HomeComponent {
  private taskTypeService = inject(TaskTypeService);
  private taskService = inject(TaskService);
  private dateService = inject(DateService);
  private authService = inject(AuthService);

  categorias = toSignal(this.taskTypeService.getAllTaskTypes(), { initialValue: [] as TaskType[] });
  private tareas = toSignal(this.taskService.watchSelectedDayTasks(), { initialValue: [] as Task[] });

  selectedDate = toSignal(this.dateService.selectedDate$, { initialValue: this.dateService.getSelectedDate() });
  esHoy = computed(() => this.selectedDate() === formatDate(new Date()));
  fechaLegible = computed(() =>
    capitalize(format(parseLocalDate(this.selectedDate()), "EEEE d 'de' MMMM", { locale: es }))
  );

  /** 'page-turn-next' | 'page-turn-prev' | '' — se limpia solo al terminar la animación (ver (animationend) en el template). */
  pageAnimClass = signal('');

  tareasPorCategoria = computed(() => {
    const map = new Map<string, Task[]>();
    this.tareas().forEach((t) => {
      const lista = map.get(t.categoriaId) ?? [];
      lista.push(t);
      map.set(t.categoriaId, lista);
    });
    return map;
  });

  hayTareasHoy = computed(() => this.tareas().length > 0);

  /** % de tareas completadas del día que se está viendo — 0 si no hay ninguna cargada. */
  progresoDia = computed(() => {
    const total = this.tareas().length;
    if (total === 0) return 0;
    const hechas = this.tareas().filter((t) => t.estado === 'realizado').length;
    return Math.round((hechas / total) * 100);
  });

  nuevoTaskTexto: Record<string, string> = {};

  editandoTaskId = '';
  editandoTaskNombre = '';

  constructor() {
    this.authService.startAutoLogout();
  }

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
    this.taskService.toggleEstado(task).subscribe();
  }

  agregarTarea(categoriaId: string): void {
    const texto = (this.nuevoTaskTexto[categoriaId] || '').trim();
    if (!texto) return;

    this.taskService.addTask({ nombre: texto, categoriaId, estado: 'pendiente' }).subscribe();
    this.nuevoTaskTexto[categoriaId] = '';
  }

  eliminarTarea(task: Task): void {
    this.taskService.removeTask(task.id).subscribe();
  }

  empezarEdicionTask(task: Task): void {
    this.editandoTaskId = task.id;
    this.editandoTaskNombre = task.nombre;
  }

  cancelarEdicionTask(): void {
    this.editandoTaskId = '';
    this.editandoTaskNombre = '';
  }

  guardarEdicionTask(task: Task): void {
    const nombre = this.editandoTaskNombre.trim();
    if (!nombre) {
      this.cancelarEdicionTask();
      return;
    }
    if (nombre !== task.nombre) {
      this.taskService.updateTask(task.id, { nombre }).subscribe();
    }
    this.cancelarEdicionTask();
  }

  irDiaAnterior(): void {
    this.pageAnimClass.set('page-turn-prev');
    this.dateService.goToPreviousDay();
  }

  irDiaSiguiente(): void {
    this.pageAnimClass.set('page-turn-next');
    this.dateService.goToNextDay();
  }

  irHoy(): void {
    this.pageAnimClass.set('page-turn-next');
    this.dateService.goToToday();
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
