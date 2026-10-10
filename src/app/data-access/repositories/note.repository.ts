import { Observable } from 'rxjs';

export interface DayNote {
  texto: string;
  actualizado: string;
}

/** Contrato de acceso a datos para la "Nota del día" ($uid/notas/{fecha}). */
export abstract class NoteRepository {
  abstract watchByDate(fecha: string): Observable<DayNote | null>;
  /** Un texto vacío borra la nota. */
  abstract save(fecha: string, texto: string): Observable<void>;
}
