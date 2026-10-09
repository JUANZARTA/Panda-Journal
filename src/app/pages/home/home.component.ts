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
import { UiStateService } from '../../core/ui-state.service';
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
  uiState = inject(UiStateService);

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

  /** Divide categorías en izquierda y derecha para layout de cuaderno abierto */
  categoriasPartidas = computed(() => {
    const cats = this.categorias();
    const tareasMap = this.tareasPorCategoria();
    const totalTareas = this.tareas().length;
    const mitad = Math.ceil(totalTareas / 2);

    let acumulado = 0;
    const izquierda: string[] = [];

    for (const cat of cats) {
      const tareasDeCategoria = tareasMap.get(cat.id)?.length ?? 0;
      if (acumulado < mitad) {
        izquierda.push(cat.id);
        acumulado += tareasDeCategoria;
      }
    }

    const derecha = cats.filter((cat) => !izquierda.includes(cat.id)).map((cat) => cat.id);

    return { izquierda, derecha };
  });

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

  tareaAMover = signal<Task | null>(null);
  fechaMoverString = '';

  constructor() {}

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
    return this.categorias().find((c) => c.id === categoriaId)?.nombre ?? '';
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

  abrirMoverTarea(task: Task): void {
    this.tareaAMover.set(task);
    this.fechaMoverString = this.selectedDate();
  }

  cancelarMover(): void {
    this.tareaAMover.set(null);
    this.fechaMoverString = '';
  }

  irDiaAnteriorModal(): void {
    const fecha = parseLocalDate(this.fechaMoverString);
    fecha.setDate(fecha.getDate() - 1);
    this.fechaMoverString = formatDate(fecha);
  }

  irDiaSiguienteModal(): void {
    const fecha = parseLocalDate(this.fechaMoverString);
    fecha.setDate(fecha.getDate() + 1);
    this.fechaMoverString = formatDate(fecha);
  }

  fechaMoverLegible = computed(() => {
    if (!this.fechaMoverString) return '';
    return capitalize(format(parseLocalDate(this.fechaMoverString), "EEEE d 'de' MMMM", { locale: es }));
  });

  confirmarMover(): void {
    const task = this.tareaAMover();
    if (!task) return;

    this.taskService.moveTaskToDate(task, this.selectedDate(), this.fechaMoverString).subscribe(() => {
      this.cancelarMover();
    });
  }

  puedeSubir(task: Task, categoriaId: string): boolean {
    const tareas = this.tareasDe(categoriaId);
    const index = tareas.findIndex((t) => t.id === task.id);
    return index > 0;
  }

  puedeJajar(task: Task, categoriaId: string): boolean {
    const tareas = this.tareasDe(categoriaId);
    const index = tareas.findIndex((t) => t.id === task.id);
    return index < tareas.length - 1;
  }

  moverTareaArriba(task: Task, categoriaId: string): void {
    const tareas = this.tareasDe(categoriaId);
    const index = tareas.findIndex((t) => t.id === task.id);
    if (index <= 0) return;

    const taskAnterior = tareas[index - 1];

    // Intercambiar nombre, nota y estado entre las dos tareas
    const tempNombre = task.nombre;
    const tempNota = task.nota;
    const tempEstado = task.estado;

    this.taskService.updateTask(task.id, { nombre: taskAnterior.nombre, nota: taskAnterior.nota, estado: taskAnterior.estado }).subscribe();
    this.taskService.updateTask(taskAnterior.id, { nombre: tempNombre, nota: tempNota, estado: tempEstado }).subscribe();
  }

  moverTareaAbajo(task: Task, categoriaId: string): void {
    const tareas = this.tareasDe(categoriaId);
    const index = tareas.findIndex((t) => t.id === task.id);
    if (index >= tareas.length - 1) return;

    const taskSiguiente = tareas[index + 1];

    // Intercambiar nombre, nota y estado entre las dos tareas
    const tempNombre = task.nombre;
    const tempNota = task.nota;
    const tempEstado = task.estado;

    this.taskService.updateTask(task.id, { nombre: taskSiguiente.nombre, nota: taskSiguiente.nota, estado: taskSiguiente.estado }).subscribe();
    this.taskService.updateTask(taskSiguiente.id, { nombre: tempNombre, nota: tempNota, estado: tempEstado }).subscribe();
  }

}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
