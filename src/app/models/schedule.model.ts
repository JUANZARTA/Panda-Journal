/** Actividad reutilizable con color personalizado */
export interface Activity {
  id: string;
  nombre: string;
  color: string; // hex color: #FF5733
  descripcion?: string;
  uid?: string; // user ID, para multi-user en el futuro
}

export type ActivityInput = Omit<Activity, 'id'>;

/** Bloque de tiempo en el itinerario (una actividad asignada a día + horas) */
export interface ScheduleBlock {
  id: string;
  activityId: string;
  dia: number; // 0-6 (lunes-domingo)
  horaInicio: number; // 0-23
  duracion: number; // horas que ocupa (1-24)
  uid?: string; // user ID
}

export type ScheduleBlockInput = Omit<ScheduleBlock, 'id'>;
