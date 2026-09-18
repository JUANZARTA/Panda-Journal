import { Component, inject } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { RouterOutlet } from '@angular/router';
import { TaskService } from '../../../services/task.service';
import { RecurringTaskService } from '../../../services/recurring-task.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [HeaderComponent, SidebarComponent, RouterOutlet],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent {
  private taskService = inject(TaskService);
  private recurringTaskService = inject(RecurringTaskService);

  constructor() {
    // Una vez por sesión, al entrar a la zona protegida: migra lo que quedó
    // vencido de días anteriores a "Tareas perdidas". No hay backend corriendo
    // a medianoche — este es el momento más simple y confiable de chequearlo.
    this.taskService.migratePastDueTasks().subscribe({
      error: (err) => console.error('[ERROR] Al migrar tareas vencidas:', err),
    });

    // Genera las tareas recurrentes activas para HOY
    this.recurringTaskService.generateTodayRecurringTasks().subscribe({
      error: (err) => console.error('[ERROR] Al generar tareas recurrentes:', err),
    });
  }
}
