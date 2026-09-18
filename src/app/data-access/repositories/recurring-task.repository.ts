import { Observable } from 'rxjs';
import { RecurringTask } from '../../models/recurring-task.model';

export abstract class RecurringTaskRepository {
  abstract getAll(): Observable<RecurringTask[]>;
  abstract getActive(): Observable<RecurringTask[]>;
  abstract create(task: Omit<RecurringTask, 'id' | 'createdAt'>): Observable<RecurringTask>;
  abstract update(id: string, updates: Partial<RecurringTask>): Observable<void>;
  abstract delete(id: string): Observable<void>;
  abstract toggleActive(id: string, activo: boolean): Observable<void>;
}
