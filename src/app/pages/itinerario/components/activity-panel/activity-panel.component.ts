import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Activity, ScheduleBlock } from '../../../../models/schedule.model';
import { ScheduleService } from '../../../../services/schedule.service';

@Component({
  selector: 'app-activity-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-panel.component.html',
  styleUrl: './activity-panel.component.css',
})
export class ActivityPanelComponent {
  @Input() activities: Activity[] = [];
  @Input() blocks: ScheduleBlock[] = [];
  @Input() selectedActivityId: string | null = null;
  @Output() activitySelected = new EventEmitter<string | null>();

  private scheduleService = inject(ScheduleService);

  // Form state
  newActivityName = signal('');
  newActivityColor = signal('#FF6B6B');
  newActivityDescription = signal('');

  // UI state
  isCreatingNew = signal(false);
  editingActivityId = signal<string | null>(null);
  editingName = signal('');
  editingColor = signal('');
  editingDescription = signal('');

  // Modal de confirmación
  showDeleteConfirm = signal(false);
  deleteConfirmActivityId = signal<string | null>(null);
  deleteConfirmActivityName = signal('');

  // Color presets (16 colores + picker)
  colorPresets = [
    '#FF6B6B', // Rojo
    '#FF8787', // Rojo claro
    '#FFA07A', // Naranja coral
    '#FFB88C', // Naranja claro
    '#FFD93D', // Amarillo
    '#F7DC6F', // Amarillo pálido
    '#6BCB77', // Verde
    '#4D96FF', // Azul marino
    '#45B7D1', // Azul cielo
    '#85C1E2', // Azul claro
    '#4ECDC4', // Turquesa
    '#98D8C8', // Verde menta
    '#BB8FCE', // Púrpura
    '#C9ADA7', // Marrón claro
    '#9B59B6', // Púrpura oscuro
    '#E74C3C', // Rojo oscuro
  ];

  // ========== CREATE ACTIVITY ==========

  toggleNewActivityForm(): void {
    this.isCreatingNew.update((v) => !v);
    if (!this.isCreatingNew()) {
      this.resetNewActivityForm();
    }
  }

  createActivity(): void {
    const name = this.newActivityName().trim();
    if (!name) return;

    this.scheduleService
      .createActivity({
        nombre: name,
        color: this.newActivityColor(),
        descripcion: this.newActivityDescription(),
      })
      .subscribe({
        next: (id) => {
          console.log('Actividad creada:', id);
          this.resetNewActivityForm();
          this.isCreatingNew.set(false);
        },
        error: (err) => console.error('Error creando actividad:', err),
      });
  }

  resetNewActivityForm(): void {
    this.newActivityName.set('');
    this.newActivityColor.set('#FF6B6B');
    this.newActivityDescription.set('');
  }

  // ========== EDIT ACTIVITY ==========

  startEditing(activity: Activity): void {
    this.editingActivityId.set(activity.id);
    this.editingName.set(activity.nombre);
    this.editingColor.set(activity.color);
    this.editingDescription.set(activity.descripcion || '');
    this.activitySelected.emit(activity.id);
  }

  saveEdit(activity: Activity): void {
    const name = this.editingName().trim();
    if (!name) return;

    this.scheduleService
      .updateActivity(activity.id, {
        nombre: name,
        color: this.editingColor(),
        descripcion: this.editingDescription(),
      })
      .subscribe({
        error: (err) => console.error('Error actualizando actividad:', err),
      });

    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editingActivityId.set(null);
  }

  // ========== DELETE ACTIVITY ==========

  deleteActivity(activityId: string): void {
    const activity = this.activities.find((a) => a.id === activityId);
    if (!activity) return;

    this.deleteConfirmActivityId.set(activityId);
    this.deleteConfirmActivityName.set(activity.nombre);
    this.showDeleteConfirm.set(true);
  }

  confirmDeleteActivity(): void {
    const activityId = this.deleteConfirmActivityId();
    if (!activityId) return;

    // Eliminar todos los bloques que usan esta actividad
    const blocksToDelete = this.blocks.filter((b) => b.activityId === activityId);
    blocksToDelete.forEach((block) => {
      this.scheduleService.removeBlock(block.id).subscribe({
        error: (err) => console.error('Error eliminando bloque:', err),
      });
    });

    // Eliminar la actividad
    this.scheduleService.removeActivity(activityId).subscribe({
      error: (err) => console.error('Error eliminando actividad:', err),
    });

    if (this.selectedActivityId === activityId) {
      this.activitySelected.emit(null);
    }

    this.closeDeleteConfirm();
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
    this.deleteConfirmActivityId.set(null);
    this.deleteConfirmActivityName.set('');
  }

  // ========== COLOR PICKER HELPERS ==========

  setEditingColor(color: string): void {
    this.editingColor.set(color);
  }

  setNewActivityColor(color: string): void {
    this.newActivityColor.set(color);
  }

  // ========== TRACKBY ==========

  trackByActivityId(_: number, activity: Activity): string {
    return activity.id;
  }
}
