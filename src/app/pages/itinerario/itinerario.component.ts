import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';

import { ScheduleService } from '../../services/schedule.service';
import { TaskService } from '../../services/task.service';
import { Activity, ScheduleBlock } from '../../models/schedule.model';
import { Task } from '../../models/task.model';
import { ScheduleGridComponent } from './components/schedule-grid/schedule-grid.component';
import { ActivityPanelComponent } from './components/activity-panel/activity-panel.component';

@Component({
  selector: 'app-itinerario',
  standalone: true,
  imports: [CommonModule, ScheduleGridComponent, ActivityPanelComponent],
  templateUrl: './itinerario.component.html',
  styleUrl: './itinerario.component.css',
})
export class ItinerarioComponent {
  private scheduleService = inject(ScheduleService);
  private taskService = inject(TaskService);

  // Señales reactivas
  activities = toSignal(this.scheduleService.watchActivities(), { initialValue: [] as Activity[] });
  blocks = toSignal(this.scheduleService.watchScheduleBlocks(), { initialValue: [] as ScheduleBlock[] });
  tasks = toSignal(this.taskService.watchSelectedDayTasks(), { initialValue: [] as Task[] });

  // Actividad seleccionada (para el panel)
  selectedActivityId = signal<string | null>(null);

  selectActivity(activityId: string | null): void {
    this.selectedActivityId.set(activityId);
  }
}
