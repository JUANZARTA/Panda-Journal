import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { TaskTypeService } from '../../services/taskType.service';
import { TaskService } from '../../services/task.service';
import { TaskType } from '../../models/taskType.model';
import { Task, TaskConFecha } from '../../models/task.model';

type Origen = 'cuaderno' | 'otras' | 'perdidas';

interface Fila {
  task: Task;
  origen: Origen;
  /** null solo para 'otras' (todavía no tiene fecha). */
  fecha: string | null;
}

@Component({
  selector: 'app-todas-las-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './todas-las-tareas.component.html',
  styleUrl: './todas-las-tareas.component.css',
})
export default class TodasLasTareasComponent {
  private taskTypeService = inject(TaskTypeService);
  private taskService = inject(TaskService);

  categorias = toSignal(this.taskTypeService.getAllTaskTypes(), { initialValue: [] as TaskType[] });
  private cuaderno = toSignal(this.taskService.watchAllDatedTasks(), { initialValue: [] as TaskConFecha[] });
  private otras = toSignal(this.taskService.watchUndatedTasks(), { initialValue: [] as Task[] });
  private perdidas = toSignal(this.taskService.watchLostTasks(), { initialValue: [] as Task[] });

  // Filtro por origen
  mostrarCuaderno = signal(true);
  mostrarOtras = signal(true);
  mostrarPerdidas = signal(true);

  // Filtro por fecha (aplica a 'cuaderno' y 'perdidas' — 'otras' no tiene fecha)
  // Por defecto: mes actual
  fechaDesde = signal(this.obtenerPrimerDiaDelMes());
  fechaHasta = signal(this.obtenerUltimoDiaDelMes());

  // Filtro por estado
  filtroEstado = signal<'todas' | 'completas' | 'incompletas'>('todas');

  // Filtro por categoría (dropdown)
  categoriasSeleccionadas = signal<Set<string>>(new Set());
  mostrarDropdownCategorias = false;

  filas = computed<Fila[]>(() => {
    const filas: Fila[] = [];

    if (this.mostrarCuaderno()) {
      this.cuaderno()
        .filter((t) => this.dentroDelRango(t.fecha))
        .forEach((t) => filas.push({ task: t, origen: 'cuaderno', fecha: t.fecha }));
    }
    if (this.mostrarOtras()) {
      this.otras().forEach((t) => filas.push({ task: t, origen: 'otras', fecha: null }));
    }
    if (this.mostrarPerdidas()) {
      this.perdidas()
        .filter((t) => this.dentroDelRango(t.fechaOriginal ?? ''))
        .forEach((t) => filas.push({ task: t, origen: 'perdidas', fecha: t.fechaOriginal ?? null }));
    }

    return filas
      .filter((f) => {
        const estado = this.filtroEstado();
        if (estado === 'completas') return f.task.estado === 'realizado';
        if (estado === 'incompletas') return f.task.estado !== 'realizado';
        return true;
      })
      .filter((f) => {
        // Si no hay categorías seleccionadas, mostrar todas
        const categoriasSeleccionadas = this.categoriasSeleccionadas();
        if (categoriasSeleccionadas.size === 0) return true;
        return categoriasSeleccionadas.has(f.task.categoriaId);
      })
      .sort((a, b) => {
        if (a.fecha === b.fecha) return 0;
        if (!a.fecha) return -1;
        if (!b.fecha) return 1;
        return a.fecha < b.fecha ? -1 : 1;
      });
  });

  progreso = computed(() => {
    const total = this.filas().length;
    if (total === 0) return 0;
    const hechas = this.filas().filter((f) => f.task.estado === 'realizado').length;
    return Math.round((hechas / total) * 100);
  });

  reasignandoId = '';
  fechaNueva = '';

  // -------- Selector "Cambiar mes" (año → mes), estilo Kontrol Cash --------
  // Nota: Angular no permite "ñ" en identificadores usados dentro de expresiones
  // de template — por eso las variables van sin ñ aunque el texto que se muestra sí la tenga.
  mostrarSelectorMes = false;
  anioElegido: number | null = null;
  anios: number[] = Array.from({ length: 2050 - 2020 + 1 }, (_, i) => 2020 + i);
  meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  abrirSelectorMes(): void {
    this.mostrarSelectorMes = true;
    // Arranca directo en el mes del año actual — si quiere otro año, tiene el
    // link "Cambiar año" arriba. Antes forzaba a elegir año primero siempre.
    this.anioElegido = new Date().getFullYear();
  }

  cerrarSelectorMes(): void {
    this.mostrarSelectorMes = false;
  }

  elegirAnio(anio: number): void {
    this.anioElegido = anio;
  }

  elegirMes(indiceMes: number): void {
    if (!this.anioElegido) return;

    const anio = this.anioElegido;
    const mes = indiceMes + 1;
    const ultimoDia = new Date(anio, mes, 0).getDate();

    this.fechaDesde.set(`${anio}-${String(mes).padStart(2, '0')}-01`);
    this.fechaHasta.set(`${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`);
    this.cerrarSelectorMes();
  }

  trackByFila(_index: number, fila: Fila): string {
    return fila.origen + ':' + fila.task.id;
  }

  nombreCategoria(categoriaId: string): string {
    return this.categorias().find((c) => c.id === categoriaId)?.nombre ?? 'Sin categoría';
  }

  etiquetaOrigen(origen: Origen): string {
    return origen === 'cuaderno' ? 'Cuaderno' : origen === 'otras' ? 'Otras tareas' : 'Perdida';
  }

  toggle(fila: Fila): void {
    switch (fila.origen) {
      case 'cuaderno':
        this.taskService.toggleEstadoOnDate(fila.task, fila.fecha as string).subscribe();
        break;
      case 'otras':
        this.taskService.toggleUndatedEstado(fila.task).subscribe();
        break;
      case 'perdidas':
        this.taskService.toggleLostEstado(fila.task).subscribe();
        break;
    }
  }

  eliminar(fila: Fila): void {
    switch (fila.origen) {
      case 'cuaderno':
        this.taskService.removeTaskOnDate(fila.fecha as string, fila.task.id).subscribe();
        break;
      case 'otras':
        this.taskService.removeUndatedTask(fila.task.id).subscribe();
        break;
      case 'perdidas':
        this.taskService.removeLostTask(fila.task.id).subscribe();
        break;
    }
  }

  abrirReasignar(fila: Fila): void {
    this.reasignandoId = this.trackByFila(0, fila);
    this.fechaNueva = fila.fecha ?? '';
  }

  cancelarReasignar(): void {
    this.reasignandoId = '';
    this.fechaNueva = '';
  }

  confirmarReasignar(fila: Fila): void {
    if (!this.fechaNueva) return;

    const obs =
      fila.origen === 'cuaderno'
        ? this.taskService.moveTaskToDate(fila.task, fila.fecha as string, this.fechaNueva)
        : fila.origen === 'otras'
          ? this.taskService.assignDate(fila.task, this.fechaNueva)
          : this.taskService.reassignLost(fila.task, this.fechaNueva);

    obs.subscribe({
      next: () => this.cancelarReasignar(),
      error: (err) => console.error('[ERROR] Al reasignar fecha:', err),
    });
  }

  private dentroDelRango(fecha: string): boolean {
    if (this.fechaDesde() && fecha < this.fechaDesde()) return false;
    if (this.fechaHasta() && fecha > this.fechaHasta()) return false;
    return true;
  }

  private obtenerPrimerDiaDelMes(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth() + 1;
    return `${anio}-${String(mes).padStart(2, '0')}-01`;
  }

  private obtenerUltimoDiaDelMes(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth() + 1;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    return `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  }

  abrirDropdownCategorias(): void {
    this.mostrarDropdownCategorias = !this.mostrarDropdownCategorias;
  }

  cerrarDropdownCategorias(): void {
    this.mostrarDropdownCategorias = false;
  }

  toggleCategoriaFiltro(categoriaId: string): void {
    const actual = this.categoriasSeleccionadas();
    const nuevo = new Set(actual);
    if (nuevo.has(categoriaId)) {
      nuevo.delete(categoriaId);
    } else {
      nuevo.add(categoriaId);
    }
    this.categoriasSeleccionadas.set(nuevo);
  }

  estaCategoriaSeleccionada(categoriaId: string): boolean {
    return this.categoriasSeleccionadas().has(categoriaId);
  }

  limpiarFiltrocategorias(): void {
    this.categoriasSeleccionadas.set(new Set());
  }
}
