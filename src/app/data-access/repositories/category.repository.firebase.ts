import { Injectable, inject } from '@angular/core';
import { Database, ref, push, set, update as dbUpdate, remove as dbRemove } from '@angular/fire/database';
import { Observable, of, from, map } from 'rxjs';

import { CategoryRepository } from './category.repository';
import { TaskType } from '../../models/taskType.model';
import { PeriodPathService } from '../period-path.service';
import { watchValue } from '../watch-value';

interface RawCategory {
  nombre: string;
}

@Injectable()
export class FirebaseCategoryRepository extends CategoryRepository {
  private db = inject(Database);
  private periodPath = inject(PeriodPathService);

  watchAll(): Observable<TaskType[]> {
    const path = this.periodPath.categoriesPath();
    if (!path) return of([]);

    return watchValue<Record<string, RawCategory> | null>(ref(this.db, path)).pipe(
      map((categorias) => flattenCategories(categorias))
    );
  }

  create(nombre: string): Observable<string> {
    const path = this.periodPath.categoriesPath();
    if (!path) throw new Error('No hay usuario activo');

    const newRef = push(ref(this.db, path));
    if (!newRef.key) throw new Error('Firebase no devolvió una key para la nueva categoría');

    return from(set(newRef, { nombre: nombre.trim() }).then(() => newRef.key as string));
  }

  rename(id: string, nombre: string): Observable<void> {
    const path = this.periodPath.categoriesPath();
    if (!path) throw new Error('No hay usuario activo');

    return from(dbUpdate(ref(this.db, `${path}/${id}`), { nombre: nombre.trim() }));
  }

  remove(id: string): Observable<void> {
    const path = this.periodPath.categoriesPath();
    if (!path) throw new Error('No hay usuario activo');

    return from(dbRemove(ref(this.db, `${path}/${id}`)));
  }
}

function flattenCategories(categorias: Record<string, RawCategory> | null): TaskType[] {
  if (!categorias) return [];
  return Object.entries(categorias).map(([id, categoria]) => ({ id, nombre: categoria.nombre }));
}
