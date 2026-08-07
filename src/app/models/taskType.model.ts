// Modelo para representar un tipo de tarea (a nivel de negocio: "categoría").
// El nombre de archivo/interfaz se mantiene por ahora para no romper imports en
// toda la app; el rename completo a "category" queda pendiente como limpieza aparte.
export interface TaskType {
  /** Push-key de Firebase. Antes se derivaba del nombre — causaba colisiones. */
  id: string;
  nombre: string;
}
