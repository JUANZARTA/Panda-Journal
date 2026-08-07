import { Injectable, inject } from '@angular/core';
import {
  Database,
  ref,
  push,
  set,
  get,
  query,
  orderByKey,
  startAt,
  endBefore,
  update as dbUpdate,
  remove as dbRemove,
} from '@angular/fire/database';
import { Observable, of, from, map, switchMap } from 'rxjs';

import { TaskRepository } from './task.repository';
import { Task, TaskConFecha, TaskInput } from '../../models/task.model';
import { PeriodPathService } from '../period-path.service';
import { watchValue } from '../watch-value';

interface RawTask {
  nombre: string;
  nota?: string;
  categoriaId: string;
  estado: Task['estado'];
  fechaOriginal?: string;
}

/** Cuántos días hacia atrás mira migratePastDue — evita escanear años de historial. */
const VENTANA_MIGRACION_DIAS = 30;

@Injectable()
export class FirebaseTaskRepository extends TaskRepository {
  private db = inject(Database);
  private periodPath = inject(PeriodPathService);

  watchByDate(fecha: string): Observable<Task[]> {
    const path = this.periodPath.tasksForDatePath(fecha);
    if (!path) return of([]);

    return watchValue<Record<string, RawTask> | null>(ref(this.db, path)).pipe(
      map((tareas) => flattenTasks(tareas))
    );
  }

  create(fecha: string, input: TaskInput): Observable<string> {
    const path = this.periodPath.tasksForDatePath(fecha);
    if (!path) throw new Error('No hay usuario o fecha activa');
    return this.push(path, input);
  }

  update(fecha: string, taskId: string, changes: Partial<TaskInput>): Observable<void> {
    const path = this.periodPath.tasksForDatePath(fecha);
    if (!path) throw new Error('No hay usuario o fecha activa');
    return from(dbUpdate(ref(this.db, `${path}/${taskId}`), stripUndefined(changes)));
  }

  remove(fecha: string, taskId: string): Observable<void> {
    const path = this.periodPath.tasksForDatePath(fecha);
    if (!path) throw new Error('No hay usuario o fecha activa');
    return from(dbRemove(ref(this.db, `${path}/${taskId}`)));
  }

  // Escucha TODO el árbol de tareas por fecha — usado por "Todas las tareas".
  // Para uso personal esto anda bien por mucho tiempo; si algún día se siente
  // pesado (años de historial), ahí se acota con una ventana como en migratePastDue.
  watchAllDated(): Observable<TaskConFecha[]> {
    const rootPath = this.periodPath.tasksRootPath();
    if (!rootPath) return of([]);

    return watchValue<Record<string, Record<string, RawTask>> | null>(ref(this.db, rootPath)).pipe(
      map((dias) => {
        if (!dias) return [];
        return Object.entries(dias).flatMap(([fecha, tareas]) =>
          flattenTasks(tareas).map((task) => ({ ...task, fecha }))
        );
      })
    );
  }

  moveToDate(task: Task, fechaActual: string, fechaNueva: string): Observable<void> {
    const uid = this.periodPath.uid();
    if (!uid) throw new Error('No hay usuario activo');
    if (fechaActual === fechaNueva) return of(undefined);

    const { id, ...data } = task;
    const updates: Record<string, unknown> = {
      [`tareas/${fechaActual}/${id}`]: null,
      [`tareas/${fechaNueva}/${id}`]: stripUndefined(data),
    };

    return from(dbUpdate(ref(this.db, uid), updates));
  }

  // -------- Sin fecha ("Otras tareas") --------

  watchUndated(): Observable<Task[]> {
    const path = this.periodPath.undatedTasksPath();
    if (!path) return of([]);

    return watchValue<Record<string, RawTask> | null>(ref(this.db, path)).pipe(
      map((tareas) => flattenTasks(tareas))
    );
  }

  createUndated(input: TaskInput): Observable<string> {
    const path = this.periodPath.undatedTasksPath();
    if (!path) throw new Error('No hay usuario activo');
    return this.push(path, input);
  }

  updateUndated(taskId: string, changes: Partial<TaskInput>): Observable<void> {
    const path = this.periodPath.undatedTasksPath();
    if (!path) throw new Error('No hay usuario activo');
    return from(dbUpdate(ref(this.db, `${path}/${taskId}`), stripUndefined(changes)));
  }

  removeUndated(taskId: string): Observable<void> {
    const path = this.periodPath.undatedTasksPath();
    if (!path) throw new Error('No hay usuario activo');
    return from(dbRemove(ref(this.db, `${path}/${taskId}`)));
  }

  // Multi-path update atómico: borra de tareas_sin_fecha y crea en tareas/{fecha}
  // en la MISMA escritura — no hay estado intermedio donde la tarea no exista
  // en ningún lado, ni donde exista duplicada en los dos.
  assignDate(task: Task, fecha: string): Observable<void> {
    const uid = this.periodPath.uid();
    if (!uid) throw new Error('No hay usuario activo');

    const { id, ...data } = task;
    const updates: Record<string, unknown> = {
      [`tareas_sin_fecha/${id}`]: null,
      [`tareas/${fecha}/${id}`]: stripUndefined(data),
    };

    return from(dbUpdate(ref(this.db, uid), updates));
  }

  // -------- Tareas perdidas --------

  watchLost(): Observable<Task[]> {
    const path = this.periodPath.lostTasksPath();
    if (!path) return of([]);

    return watchValue<Record<string, RawTask> | null>(ref(this.db, path)).pipe(
      map((tareas) => flattenTasks(tareas))
    );
  }

  updateLost(taskId: string, changes: Partial<TaskInput>): Observable<void> {
    const path = this.periodPath.lostTasksPath();
    if (!path) throw new Error('No hay usuario activo');
    return from(dbUpdate(ref(this.db, `${path}/${taskId}`), stripUndefined(changes)));
  }

  removeLost(taskId: string): Observable<void> {
    const path = this.periodPath.lostTasksPath();
    if (!path) throw new Error('No hay usuario activo');
    return from(dbRemove(ref(this.db, `${path}/${taskId}`)));
  }

  reassignLost(task: Task, fecha: string): Observable<void> {
    const uid = this.periodPath.uid();
    if (!uid) throw new Error('No hay usuario activo');

    const { id, fechaOriginal, ...data } = task;
    const updates: Record<string, unknown> = {
      [`tareas_perdidas/${id}`]: null,
      [`tareas/${fecha}/${id}`]: stripUndefined(data),
    };

    return from(dbUpdate(ref(this.db, uid), updates));
  }

  // Escanea tareas/{fecha} para fecha < hoy (ventana acotada hacia atrás) y migra
  // en UN solo update() atómico lo que no esté "realizado". Es un chequeo de una
  // sola vez (get, no listener) — se llama al abrir la app, no corre solo.
  migratePastDue(hoy: string): Observable<void> {
    const uid = this.periodPath.uid();
    const rootPath = this.periodPath.tasksRootPath();
    if (!uid || !rootPath) return of(undefined);

    const desde = subtractDays(hoy, VENTANA_MIGRACION_DIAS);
    const q = query(ref(this.db, rootPath), orderByKey(), startAt(desde), endBefore(hoy));

    return from(get(q)).pipe(
      switchMap((snapshot) => {
        const dias = (snapshot.val() ?? {}) as Record<string, Record<string, RawTask>>;
        const updates: Record<string, unknown> = {};
        let huboAlgo = false;

        for (const [fecha, tareas] of Object.entries(dias)) {
          for (const [taskId, tarea] of Object.entries(tareas ?? {})) {
            if (tarea.estado === 'realizado') continue;
            updates[`tareas/${fecha}/${taskId}`] = null;
            updates[`tareas_perdidas/${taskId}`] = stripUndefined({ ...tarea, fechaOriginal: fecha });
            huboAlgo = true;
          }
        }

        return huboAlgo ? from(dbUpdate(ref(this.db, uid), updates)) : of(undefined);
      })
    );
  }

  private push(path: string, input: TaskInput): Observable<string> {
    const newRef = push(ref(this.db, path));
    if (!newRef.key) throw new Error('Firebase no devolvió una key para la nueva tarea');
    return from(set(newRef, stripUndefined(input)).then(() => newRef.key as string));
  }
}

function flattenTasks(tareas: Record<string, RawTask> | null): Task[] {
  if (!tareas) return [];
  return Object.entries(tareas).map(([id, tarea]) => {
    const task: Task = {
      id,
      nombre: tarea.nombre,
      categoriaId: tarea.categoriaId,
      estado: tarea.estado ?? 'pendiente',
    };
    if (tarea.nota !== undefined) task.nota = tarea.nota;
    if (tarea.fechaOriginal !== undefined) task.fechaOriginal = tarea.fechaOriginal;
    return task;
  });
}

// Firebase rechaza cualquier escritura que tenga `undefined` en algún campo (ej.
// nota: undefined cuando la tarea no tiene nota) — lo saca antes de escribir en
// vez de mandarlo tal cual y que el SDK tire error.
function stripUndefined<T extends object>(obj: T): Partial<T> {
  const clean: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) clean[key] = obj[key];
  }
  return clean;
}

function subtractDays(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - dias);
  const yy = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
