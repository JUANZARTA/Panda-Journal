import { Injectable, inject } from '@angular/core';
import { Database, ref, set, remove as dbRemove } from '@angular/fire/database';
import { Observable, from, of } from 'rxjs';

import { DayNote, NoteRepository } from './note.repository';
import { PeriodPathService } from '../period-path.service';
import { watchValue } from '../watch-value';

@Injectable()
export class FirebaseNoteRepository extends NoteRepository {
  private db = inject(Database);
  private periodPath = inject(PeriodPathService);

  watchByDate(fecha: string): Observable<DayNote | null> {
    const uid = this.periodPath.uid();
    if (!uid) return of(null);
    return watchValue<DayNote | null>(ref(this.db, `${uid}/notas/${fecha}`));
  }

  save(fecha: string, texto: string): Observable<void> {
    const uid = this.periodPath.uid();
    if (!uid) throw new Error('No hay usuario activo');
    const noteRef = ref(this.db, `${uid}/notas/${fecha}`);
    const limpio = texto.trim();
    if (!limpio) return from(dbRemove(noteRef));
    return from(set(noteRef, { texto: limpio, actualizado: new Date().toISOString() }));
  }
}
