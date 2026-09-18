import { Injectable, inject } from '@angular/core';
import { Database, ref, push, set, update as dbUpdate, remove as dbRemove } from '@angular/fire/database';
import { Observable, of, from, map } from 'rxjs';

import { RecurringTaskRepository } from './recurring-task.repository';
import { RecurringTask } from '../../models/recurring-task.model';
import { PeriodPathService } from '../period-path.service';
import { watchValue } from '../watch-value';

interface RawRecurringTask {
  nombre: string;
  categoriaId: string;
  activo: boolean;
  createdAt: string;
}

@Injectable()
export class FirebaseRecurringTaskRepository extends RecurringTaskRepository {
  private db = inject(Database);
  private periodPath = inject(PeriodPathService);

  getAll(): Observable<RecurringTask[]> {
    const path = this.recurringTasksPath();
    if (!path) return of([]);

    return watchValue<Record<string, RawRecurringTask> | null>(ref(this.db, path)).pipe(
      map((tasks) => flattenRecurringTasks(tasks))
    );
  }

  getActive(): Observable<RecurringTask[]> {
    return this.getAll().pipe(
      map((tasks) => tasks.filter((t) => t.activo))
    );
  }

  create(task: Omit<RecurringTask, 'id' | 'createdAt'>): Observable<RecurringTask> {
    const path = this.recurringTasksPath();
    if (!path) throw new Error('No hay usuario activo');

    const newTask: RawRecurringTask = {
      ...task,
      createdAt: new Date().toISOString(),
    };

    return this.pushRecurringTask(path, newTask).pipe(
      map((id) => ({ id, ...newTask }))
    );
  }

  update(id: string, updates: Partial<RecurringTask>): Observable<void> {
    const path = this.recurringTasksPath();
    if (!path) throw new Error('No hay usuario activo');

    const { createdAt, id: _, ...cleanUpdates } = updates as any;
    return from(dbUpdate(ref(this.db, `${path}/${id}`), cleanUpdates));
  }

  delete(id: string): Observable<void> {
    const path = this.recurringTasksPath();
    if (!path) throw new Error('No hay usuario activo');
    return from(dbRemove(ref(this.db, `${path}/${id}`)));
  }

  toggleActive(id: string, activo: boolean): Observable<void> {
    const path = this.recurringTasksPath();
    if (!path) throw new Error('No hay usuario activo');
    return from(dbUpdate(ref(this.db, `${path}/${id}`), { activo }));
  }

  private recurringTasksPath(): string | null {
    const uid = this.periodPath.uid();
    return uid ? `${uid}/tareas-recurrentes` : null;
  }

  private pushRecurringTask(path: string, task: RawRecurringTask): Observable<string> {
    const newRef = push(ref(this.db, path));
    if (!newRef.key) throw new Error('Firebase no devolvió una key para la nueva tarea recurrente');
    return from(set(newRef, task).then(() => newRef.key as string));
  }
}

function flattenRecurringTasks(tasks: Record<string, RawRecurringTask> | null): RecurringTask[] {
  if (!tasks) return [];
  return Object.entries(tasks).map(([id, task]) => ({
    id,
    ...task,
  }));
}
