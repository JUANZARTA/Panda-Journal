import { Component, Input, Output, EventEmitter, signal, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Activity, ScheduleBlock } from '../../../../models/schedule.model';
import { ScheduleService } from '../../../../services/schedule.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-activity-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-panel.component.html',
  styleUrl: './activity-panel.component.css',
})
export class ActivityPanelComponent implements AfterViewInit {
  @Input() activities: Activity[] = [];
  @Input() blocks: ScheduleBlock[] = [];
  @Input() selectedActivityId: string | null = null;
  @Output() activitySelected = new EventEmitter<string | null>();

  @ViewChild('statsChart') chartCanvas: ElementRef | undefined;

  private scheduleService = inject(ScheduleService);
  private chart: Chart | null = null;

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

  // Modal de estadísticas
  showStatsModal = signal(false);
  activityStats = signal<{ activity: Activity; totalHours: number; hoursByDay: number[] }[]>([]);

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

  ngAfterViewInit(): void {}

  // ========== STATISTICS ==========

  openStatsModal(): void {
    this.calculateStats();
    this.showStatsModal.set(true);
    // Dibujar gráfica después que el DOM se actualiza
    setTimeout(() => this.drawChart(), 100);
  }

  closeStatsModal(): void {
    this.showStatsModal.set(false);
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  private drawChart(): void {
    if (!this.chartCanvas) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Destruir gráfica anterior
    if (this.chart) {
      this.chart.destroy();
    }

    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const stats = this.activityStats();

    // Preparar datasets para cada actividad
    const datasets = stats.map((stat) => ({
      label: stat.activity.nombre,
      data: stat.hoursByDay,
      borderColor: stat.activity.color,
      backgroundColor: stat.activity.color + '20',
      tension: 0.4,
      fill: false,
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: stat.activity.color,
    }));

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dias,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => value + 'h',
            },
          },
        },
      },
    });
  }

  private calculateStats(): void {
    const stats = this.activities.map((activity) => {
      const blocksForActivity = this.blocks.filter((b) => b.activityId === activity.id);

      // Total de horas
      const totalHours = blocksForActivity.reduce((sum, block) => sum + block.duracion, 0);

      // Horas por día (7 días: Lunes-Domingo = índices 0-6)
      const hoursByDay = Array(7).fill(0);
      blocksForActivity.forEach((block) => {
        hoursByDay[block.dia] += block.duracion;
      });

      return { activity, totalHours, hoursByDay };
    });

    this.activityStats.set(stats.sort((a, b) => b.totalHours - a.totalHours));
  }

  // ========== TRACKBY ==========

  trackByActivityId(_: number, activity: Activity): string {
    return activity.id;
  }
}
