import { Observable } from 'rxjs';
import { Task, TaskConFecha, TaskInput } from '../../models/task.model';

export abstract class TaskRepository {
  abstract watchByDate(fecha: string): Observable<Task[]>;
  abstract create(fecha: string, input: TaskInput): Observable<string>;
  abstract update(fecha: string, taskId: string, changes: Partial<TaskInput>): Observable<void>;
  abstract remove(fecha: string, taskId: string): Observable<void>;
  /** Todas las tareas con fecha, de todo el historial — para "Todas las tareas". */
  abstract watchAllDated(): Observable<TaskConFecha[]>;
  /** Mueve una tarea de una fecha a otra en una sola escritura atómica. */
  abstract moveToDate(task: Task, fechaActual: string, fechaNueva: string): Observable<void>;

  // "Otras tareas": bandeja sin fecha, por categoría. No vive bajo ninguna
  // fecha — cuando se le asigna una, se muda con assignDate().
  abstract watchUndated(): Observable<Task[]>;
  abstract createUndated(input: TaskInput): Observable<string>;
  abstract updateUndated(taskId: string, changes: Partial<TaskInput>): Observable<void>;
  abstract removeUndated(taskId: string): Observable<void>;
  /** Mueve la tarea de la bandeja sin fecha a un día puntual, en una sola escritura atómica. */
  abstract assignDate(task: Task, fecha: string): Observable<void>;

  // "Tareas perdidas": tareas que tenían fecha y el día pasó sin completarse.
  abstract watchLost(): Observable<Task[]>;
  abstract updateLost(taskId: string, changes: Partial<TaskInput>): Observable<void>;
  abstract removeLost(taskId: string): Observable<void>;
  /** Reasigna una tarea perdida a un día nuevo — vuelve a vivir bajo tareas/{fecha}. */
  abstract reassignLost(task: Task, fecha: string): Observable<void>;
  /**
   * Revisa los días anteriores a `hoy` (con una ventana acotada hacia atrás) y
   * migra en un solo update() atómico las tareas no completadas a "tareas perdidas".
   * Se llama una vez al abrir la app — no hay backend corriendo a medianoche.
   */
  abstract migratePastDue(hoy: string): Observable<void>;
}
