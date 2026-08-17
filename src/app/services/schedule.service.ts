import { Injectable, inject } from '@angular/core';
import {
  Database,
  ref,
  push,
  set,
  update as dbUpdate,
  remove as dbRemove,
} from '@angular/fire/database';
import { Observable, from, of, map, switchMap } from 'rxjs';

import { Activity, ActivityInput, ScheduleBlock, ScheduleBlockInput } from '../models/schedule.model';
import { AuthService } from './auth.service';
import { watchValue } from '../data-access/watch-value';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private db = inject(Database);
  private authService = inject(AuthService);

  private getUid(): string {
    const uid = this.authService.getUser()?.id;
    if (!uid) throw new Error('No hay usuario autenticado');
    return uid;
  }

  // ========== ACTIVITIES ==========

  watchActivities(): Observable<Activity[]> {
    const uid = this.getUid();
    const path = `${uid}/itinerario/activities`;

    return watchValue<Record<string, Omit<Activity, 'id'>> | null>(ref(this.db, path)).pipe(
      map((data) =>
        data
          ? Object.entries(data).map(([id, activity]) => ({ ...activity, id }))
          : []
      )
    );
  }

  createActivity(input: ActivityInput): Observable<string> {
    const uid = this.getUid();
    const path = `${uid}/itinerario/activities`;

    return from(
      push(ref(this.db, path), {
        nombre: input.nombre.trim(),
        color: input.color,
        descripcion: input.descripcion || '',
      }).then((ref) => ref.key || '')
    );
  }

  updateActivity(id: string, changes: Partial<ActivityInput>): Observable<void> {
    const uid = this.getUid();
    const path = `${uid}/itinerario/activities/${id}`;

    const updates: Partial<Omit<Activity, 'id'>> = {};
    if (changes.nombre) updates.nombre = changes.nombre.trim();
    if (changes.color) updates.color = changes.color;
    if (changes.descripcion !== undefined) updates.descripcion = changes.descripcion;

    return from(dbUpdate(ref(this.db, path), updates));
  }

  removeActivity(id: string): Observable<void> {
    const uid = this.getUid();
    const path = `${uid}/itinerario/activities/${id}`;
    return from(dbRemove(ref(this.db, path)));
  }

  // ========== SCHEDULE BLOCKS ==========

  watchScheduleBlocks(): Observable<ScheduleBlock[]> {
    const uid = this.getUid();
    const path = `${uid}/itinerario/blocks`;

    return watchValue<Record<string, Omit<ScheduleBlock, 'id'>> | null>(ref(this.db, path)).pipe(
      map((data) =>
        data
          ? Object.entries(data).map(([id, block]) => ({ ...block, id }))
          : []
      )
    );
  }

  createBlock(input: ScheduleBlockInput): Observable<string> {
    const uid = this.getUid();
    const path = `${uid}/itinerario/blocks`;

    return from(
      push(ref(this.db, path), {
        activityId: input.activityId,
        dia: input.dia,
        horaInicio: input.horaInicio,
        duracion: input.duracion,
      }).then((ref) => ref.key || '')
    );
  }

  updateBlock(id: string, changes: Partial<ScheduleBlockInput>): Observable<void> {
    const uid = this.getUid();
    const path = `${uid}/itinerario/blocks/${id}`;
    return from(dbUpdate(ref(this.db, path), changes));
  }

  removeBlock(id: string): Observable<void> {
    const uid = this.getUid();
    const path = `${uid}/itinerario/blocks/${id}`;
    return from(dbRemove(ref(this.db, path)));
  }

  // ========== CURRENT ACTIVITY ==========

  /** Devuelve el bloque que está ocurriendo ahora mismo */
  getCurrentBlock(): Observable<{ block: ScheduleBlock | null; activity: Activity | null }> {
    return this.watchScheduleBlocks().pipe(
      switchMap((blocks) => {
        const now = new Date();
        const hoy = now.getDay() === 0 ? 6 : now.getDay() - 1; // Convertir a 0=Lunes
        const horaActual = now.getHours();

        // Buscar el bloque que contiene la hora actual en el día de hoy
        const currentBlock = blocks.find(
          (b) =>
            b.dia === hoy &&
            horaActual >= b.horaInicio &&
            horaActual < b.horaInicio + b.duracion
        );

        if (!currentBlock) {
          return of({ block: null, activity: null });
        }

        // Obtener la actividad del bloque
        return this.watchActivities().pipe(
          map((activities) => {
            const activity = activities.find((a) => a.id === currentBlock.activityId) || null;
            return { block: currentBlock, activity };
          })
        );
      })
    );
  }
}
