// v3: una tarea vive en $uid/tareas/{fecha}/{taskId} — la fecha la da el path,
// no hace falta guardarla adentro del objeto. "estado" se reduce a check/sin
// check (como en un cuaderno de papel): ya no hay "vencida"/"para hoy"
// derivados por comparación de fechas, porque cada página del cuaderno
// muestra un solo día a la vez.
export type TaskEstado = 'pendiente' | 'realizado';

export interface Task {
  id: string;
  nombre: string;
  nota?: string;
  categoriaId: string;
  estado: TaskEstado;
  /** Solo presente en tareas que viven en la bandeja "Tareas perdidas" — de qué día era. */
  fechaOriginal?: string;
}

export type TaskInput = Omit<Task, 'id'>;

/** Una tarea del cuaderno (con fecha) tal como se ve en "Todas las tareas". */
export type TaskConFecha = Task & { fecha: string };
