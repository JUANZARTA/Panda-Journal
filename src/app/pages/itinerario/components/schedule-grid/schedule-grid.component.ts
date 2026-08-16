import { Component, Input, Output, EventEmitter, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Activity, ScheduleBlock } from '../../../../models/schedule.model';
import { Task } from '../../../../models/task.model';
import { ScheduleService } from '../../../../services/schedule.service';

const HORAS = Array.from({ length: 24 }, (_, i) => i);
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_KEYS = [0, 1, 2, 3, 4, 5, 6];

@Component({
  selector: 'app-schedule-grid',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './schedule-grid.component.html',
  styleUrl: './schedule-grid.component.css',
})
export class ScheduleGridComponent implements OnInit {
  @Input() activities: Activity[] = [];
  @Input() blocks: ScheduleBlock[] = [];
  @Input() tasks: Task[] = [];
  @Output() blockCreated = new EventEmitter<string>();

  private scheduleService = inject(ScheduleService);

  // State
  selectedBlock = signal<ScheduleBlock | null>(null);
  isResizing = signal(false);
  clipboard = signal<ScheduleBlock | null>(null);

  // Modal para crear bloque
  showCreateModal = signal(false);
  createModalDia = signal<number | null>(null);
  createModalHora = signal<number | null>(null);
  createModalActivityId = signal<string | null>(null);
  createModalDuracion = signal(1);

  // Modal de error por conflicto
  showConflictModal = signal(false);
  conflictMessage = signal('');

  // Constants
  HORAS = HORAS;
  DIAS = DIAS;
  DIAS_KEYS = DIAS_KEYS;

  // Mapeo rápido de actividades (getter para reaccionar a cambios en input)
  get activityMap(): Map<string, Activity> {
    const map = new Map();
    this.activities.forEach((a) => map.set(a.id, a));
    return map;
  }

  ngOnInit(): void {}

  // ========== GRID LOGIC ==========

  /** Devuelve los bloques que INICIAN en esta celda (dia, hora) */
  getBlocksAtCell(dia: number, hora: number): ScheduleBlock[] {
    return this.blocks.filter((b) => {
      const isInDay = b.dia === dia;
      const isStartingAtHour = hora === b.horaInicio;
      return isInDay && isStartingAtHour;
    });
  }

  /** Obtiene el color de una actividad */
  getActivityColor(activityId: string): string {
    return this.activityMap.get(activityId)?.color || '#cccccc';
  }

  /** Obtiene el nombre de una actividad */
  getActivityName(activityId: string): string {
    return this.activityMap.get(activityId)?.nombre || 'Sin actividad';
  }

  /** Calcula si un color es claro u oscuro (para contraste de texto) */
  isLightColor(hex: string): boolean {
    // Remover # si existe
    hex = hex.replace('#', '');

    // Convertir a RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Usar la fórmula de luminancia perceived (más precisa para colores)
    // Basada en la fórmula de Luma BT.709
    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

    // Si la luminancia es > 0.55, es un color claro
    return luma > 0.55;
  }

  /** Obtiene la clase de color de texto adaptativo */
  getTextColorClass(activityId: string): string {
    const color = this.getActivityColor(activityId);
    return this.isLightColor(color) ? 'text-ink' : 'text-white';
  }

  // ========== BLOCK OPERATIONS ==========

  selectBlock(block: ScheduleBlock): void {
    this.selectedBlock.set(block);
  }

  deselectBlock(): void {
    this.selectedBlock.set(null);
  }

  deleteBlock(block: ScheduleBlock): void {
    this.scheduleService.removeBlock(block.id).subscribe({
      error: (err) => console.error('Error eliminando bloque:', err),
    });
    this.deselectBlock();
  }

  copyBlock(block: ScheduleBlock): void {
    this.clipboard.set(block);
  }

  pasteBlock(): void {
    const original = this.clipboard();
    if (!original) return;

    // Crear bloque nuevo sin ID (destructuring correcto)
    const newBlock: any = {
      activityId: original.activityId,
      dia: original.dia,
      horaInicio: original.horaInicio,
      duracion: original.duracion,
    };

    this.scheduleService.createBlock(newBlock).subscribe({
      next: (id) => {
        console.log('Bloque pegado:', id);
      },
      error: (err) => console.error('Error pegando bloque:', err),
    });
  }

  // ========== DRAG-DROP OPERATIONS ==========

  onBlockDragEnd(event: any): void {
    if (!event.item || !event.item.data) return;

    const data = event.item.data;
    const dropZone = event.container?.element?.nativeElement?.dataset;

    if (!dropZone || dropZone.dia === undefined || dropZone.hora === undefined) return;

    const newDia = parseInt(dropZone.dia, 10);
    const newHora = parseInt(dropZone.hora, 10);

    // Si es un bloque, mover (con validación)
    if (data.id && data.activityId && data.duracion !== undefined) {
      const block = data as ScheduleBlock;

      // Validar que no haya conflictos (excluyendo el bloque actual)
      if (!this.canPlaceBlock(newDia, newHora, block.duracion, block.id)) {
        console.warn('No se puede mover: hay conflicto con otro bloque');
        return;
      }

      this.scheduleService.updateBlock(block.id, {
        dia: newDia,
        horaInicio: newHora,
      }).subscribe({
        error: (err) => console.error('Error moviendo bloque:', err),
      });
    }
    // Si es una actividad, crear bloque con esa actividad
    else if (data.id && data.color && !data.estado && !data.duracion) {
      const activity = data as Activity;
      this.createBlockFromActivity(activity, newDia, newHora);
    }
    // Si es una tarea, crear bloque automáticamente
    else if (data.nombre && data.estado) {
      const task = data as Task;
      this.createBlockFromTask(task, newDia, newHora);
    }
  }

  /** Crea un bloque a partir de una actividad existente (drag-drop desde panel) */
  private createBlockFromActivity(activity: Activity, dia: number, horaInicio: number): void {
    // Validar que no haya conflictos
    if (!this.canPlaceBlock(dia, horaInicio, 1)) {
      console.warn('No se puede crear bloque: hay conflicto con otro bloque');
      return;
    }

    this.scheduleService.createBlock({
      activityId: activity.id,
      dia,
      horaInicio,
      duracion: 1,
    }).subscribe({
      error: (err) => console.error('Error creando bloque:', err),
    });
  }

  /** Crea automáticamente una actividad + bloque a partir de una tarea */
  private createBlockFromTask(task: Task, dia: number, horaInicio: number): void {
    // Validar que no haya conflictos
    if (!this.canPlaceBlock(dia, horaInicio, 1)) {
      console.warn('No se puede crear bloque: hay conflicto con otro bloque');
      return;
    }

    // Crear actividad con el nombre de la tarea (color por defecto: azul)
    this.scheduleService.createActivity({
      nombre: task.nombre,
      color: '#45B7D1',
      descripcion: `De: ${task.nombre}`,
    }).subscribe({
      next: (activityId) => {
        // Crear bloque con duración de 1 hora
        this.scheduleService.createBlock({
          activityId,
          dia,
          horaInicio,
          duracion: 1,
        }).subscribe({
          error: (err) => console.error('Error creando bloque:', err),
        });
      },
      error: (err) => console.error('Error creando actividad:', err),
    });
  }

  // ========== HELPER: Detectar conflictos ==========

  /** Verifica si hay otro bloque que ocupa una hora específica en un día */
  private hasConflict(dia: number, hora: number, excludeBlockId: string): boolean {
    return this.blocks.some((b) => {
      if (b.id === excludeBlockId) return false; // Ignorar el bloque que estamos redimensionando
      if (b.dia !== dia) return false; // Debe ser el mismo día
      // Verificar si la hora está dentro del rango del bloque
      return hora >= b.horaInicio && hora < b.horaInicio + b.duracion;
    });
  }

  /** Verifica si se puede colocar un bloque sin conflictos */
  private canPlaceBlock(dia: number, horaInicio: number, duracion: number, excludeBlockId: string = ''): boolean {
    for (let h = horaInicio; h < horaInicio + duracion; h++) {
      if (this.hasConflict(dia, h, excludeBlockId)) {
        return false;
      }
    }
    return true;
  }

  // ========== RESIZE OPERATIONS ==========

  startResize(block: ScheduleBlock, event: any, direction: 'top' | 'bottom' | 'left' | 'right'): void {
    event.stopPropagation();
    this.isResizing.set(true);
    const startX = event.clientX;
    const startY = event.clientY;
    const startDuracion = block.duracion;
    const startHora = block.horaInicio;
    const startDia = block.dia;

    const moveListener = (e: MouseEvent) => {
      if (direction === 'bottom') {
        // Expandir/reducir hacia abajo
        const delta = Math.round((e.clientY - startY) / 40);
        let newDuracion = Math.max(1, startDuracion + delta);

        // Validar que no haya conflicto con otros bloques
        const endHour = startHora + newDuracion;
        for (let h = startHora + startDuracion; h < endHour; h++) {
          if (this.hasConflict(startDia, h, block.id)) {
            newDuracion = h - startHora;
            break;
          }
        }

        if (newDuracion !== startDuracion) {
          this.scheduleService.updateBlock(block.id, { duracion: newDuracion }).subscribe({
            error: (err) => console.error('Error redimensionando:', err),
          });
        }
      } else if (direction === 'top') {
        // Expandir/reducir hacia arriba (cambia horaInicio)
        const delta = Math.round((startY - e.clientY) / 40);
        let newHora = Math.max(0, startHora - delta);
        let newDuracion = startDuracion + (startHora - newHora);

        // Validar que no haya conflicto con otros bloques
        for (let h = newHora; h < startHora; h++) {
          if (this.hasConflict(startDia, h, block.id)) {
            newHora = h + 1;
            newDuracion = startHora + startDuracion - newHora;
            break;
          }
        }

        if (newHora !== startHora || newDuracion !== startDuracion) {
          this.scheduleService.updateBlock(block.id, { horaInicio: newHora, duracion: newDuracion }).subscribe({
            error: (err) => console.error('Error redimensionando:', err),
          });
        }
      } else if (direction === 'right') {
        // Expandir/reducir hacia la derecha (cambia día)
        const delta = Math.round((e.clientX - startX) / 130); // ~130px por columna
        const newDia = Math.min(6, startDia + delta);
        if (newDia !== startDia) {
          this.scheduleService.updateBlock(block.id, { dia: newDia }).subscribe({
            error: (err) => console.error('Error redimensionando:', err),
          });
        }
      } else if (direction === 'left') {
        // Expandir/reducir hacia la izquierda (cambia día)
        const delta = Math.round((startX - e.clientX) / 130);
        const newDia = Math.max(0, startDia - delta);
        if (newDia !== startDia) {
          this.scheduleService.updateBlock(block.id, { dia: newDia }).subscribe({
            error: (err) => console.error('Error redimensionando:', err),
          });
        }
      }
    };

    const upListener = () => {
      document.removeEventListener('mousemove', moveListener);
      document.removeEventListener('mouseup', upListener);
      this.isResizing.set(false);
    };

    document.addEventListener('mousemove', moveListener);
    document.addEventListener('mouseup', upListener);
  }

  // ========== CONTEXT MENU (copiar/pegar) ==========

  onContextMenu(event: MouseEvent, block?: ScheduleBlock): void {
    event.preventDefault();

    if (block) {
      this.selectBlock(block);
      this.copyBlock(block);
    }
  }

  // ========== MODAL: CREATE BLOCK ==========

  openCreateModal(dia: number, hora: number): void {
    this.createModalDia.set(dia);
    this.createModalHora.set(hora);
    this.createModalActivityId.set(null);
    this.createModalDuracion.set(1);
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  confirmCreateBlock(): void {
    const dia = this.createModalDia();
    const hora = this.createModalHora();
    const activityId = this.createModalActivityId();
    const duracion = this.createModalDuracion();

    if (dia === null || hora === null || !activityId) return;

    // Validar que no haya conflictos
    if (!this.canPlaceBlock(dia, hora, duracion)) {
      console.warn('No se puede crear bloque: hay conflicto con otro bloque');
      this.showConflict('Ya hay un bloque en ese horario. No se puede crear.');
      return;
    }

    this.scheduleService.createBlock({
      activityId,
      dia,
      horaInicio: hora,
      duracion,
    }).subscribe({
      next: (id) => {
        console.log('Bloque creado:', id);
        this.closeCreateModal();
      },
      error: (err) => console.error('Error creando bloque:', err),
    });
  }

  showConflict(message: string): void {
    this.conflictMessage.set(message);
    this.showConflictModal.set(true);
  }

  closeConflictModal(): void {
    this.showConflictModal.set(false);
  }

  selectActivityForBlock(activityId: string): void {
    this.createModalActivityId.set(activityId);
  }

  // ========== FORMATEO ==========

  trackByActivityId(_: number, activity: Activity): string {
    return activity.id;
  }

  formatHour(hour: number | null): string {
    return (hour ?? 0).toString().padStart(2, '0');
  }
}
