import { Observable } from 'rxjs';
import { TaskType } from '../../models/taskType.model';

/**
 * Contrato de acceso a datos para categorías. Hoy solo hay una implementación
 * (Firebase Realtime Database), pero al ser un abstract class + DI token,
 * el día que exista un backend Spring Boot (como en Kontrol Cash) alcanza con
 * registrar una `HttpCategoryRepository` en app.config.ts — nada de esta capa
 * para arriba (servicios, componentes) se entera del cambio.
 */
export abstract class CategoryRepository {
  abstract watchAll(): Observable<TaskType[]>;
  /** Devuelve el id (push-key) de la categoría creada. */
  abstract create(nombre: string): Observable<string>;
  abstract rename(id: string, nombre: string): Observable<void>;
  abstract remove(id: string): Observable<void>;
}
