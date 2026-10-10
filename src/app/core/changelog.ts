export interface ChangelogEntry {
  version: string;
  fecha: string;
  cambios: string[];
}

/** Notas de versión, de la más nueva a la más vieja. Solo cambios notorios para el usuario. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.2.8',
    fecha: '10/10/2026',
    cambios: [
      'Nueva sección Configuración: modo claro/oscuro, color, huella y tareas recurrentes en un solo lugar.',
      'Notas de versión dentro de Configuración.',
      'El cuadrito de una tarea se va llenando a medida que completás sus subtareas.',
    ],
  },
  {
    version: '2.2.7',
    fecha: '10/10/2026',
    cambios: [
      'Ingreso con huella en el celular.',
      'La app se recupera sola si queda en blanco después de una actualización.',
    ],
  },
  {
    version: '2.2.5',
    fecha: '10/10/2026',
    cambios: [
      'Temas de color: dorado, azul y rosa, con el papel teñido en modo claro.',
      'Contador de subtareas al lado de cada tarea.',
      'Nuevo diseño de Tareas recurrentes.',
    ],
  },
  {
    version: '2.2.4',
    fecha: '09/10/2026',
    cambios: ['Arreglo del inicio de sesión que se quedaba cargando.'],
  },
  {
    version: '2.2.3',
    fecha: '09/10/2026',
    cambios: [
      'Subtareas: crear, editar, borrar, ordenar y completar desde cada tarea.',
      'Las subtareas se mueven junto con su tarea al reordenar.',
      'Gestión de categorías y reordenar tareas en el cuaderno.',
      'Inicio de sesión con Google en ventana emergente.',
      'Itinerario adaptado a celular.',
      'Arreglo de tareas recurrentes que se duplicaban.',
    ],
  },
  {
    version: '2.1.1',
    fecha: '21/09/2026',
    cambios: ['Las tareas recurrentes se generan una sola vez por día.'],
  },
  {
    version: '2.1.0',
    fecha: '18/09/2026',
    cambios: [
      'Tareas recurrentes: se generan solas cada día.',
      'Podés editar las tareas directamente en Otras tareas y Todas las tareas.',
      'Si tu sesión deja de ser válida, la app te saca sola en vez de quedarse trabada.',
    ],
  },
  {
    version: '2.0.4',
    fecha: '01/09/2026',
    cambios: [
      'Todas las tareas muestra por defecto solo el mes actual.',
      'Filtro por categoría con árbol desplegable en la lista de tareas.',
      'Gráfico de dona con tu progreso, fijo en Inicio y en Todas las tareas.',
    ],
  },
  {
    version: '2.0.3',
    fecha: '17/08/2026',
    cambios: [
      'Itinerario: bloques que se expanden en cuatro direcciones y avisan si hay conflictos de horario.',
      'Estadísticas de actividades con tabla y gráfica.',
      'La actividad actual se muestra en el menú lateral, que ahora queda fijo en todas las pantallas.',
    ],
  },
  {
    version: '2.0.2',
    fecha: '16/08/2026',
    cambios: [
      'El inicio de sesión con Google se mantiene entre visitas.',
      'Indicador de carga al ingresar.',
    ],
  },
  {
    version: '2.0.1',
    fecha: '08/08/2026',
    cambios: [
      'Panda Journal ahora es una app instalable en Android y iPhone.',
      'Botón propio para instalar la app desde el menú lateral.',
    ],
  },
  {
    version: '2.0.0',
    fecha: '07/08/2026',
    cambios: [
      'Rediseño completo con estilo de cuaderno.',
      'Nuevas secciones: Categorías, Otras tareas, Tareas perdidas y Todas las tareas.',
      'Tus datos ahora se guardan sobre Firebase con una arquitectura renovada.',
    ],
  },
  {
    version: '1.2.1',
    fecha: '08/05/2025',
    cambios: ['Logo nuevo.', 'Selector de meses mejorado.'],
  },
  {
    version: '1.2.0',
    fecha: '07/05/2025',
    cambios: ['Modo oscuro.', 'Notificaciones de tareas.'],
  },
  {
    version: '1.1.0',
    fecha: '02/05/2025',
    cambios: [
      'Inicio con tabla de resúmenes de tus tareas.',
      'Inicio de sesión renovado.',
      'Colores nuevos y carga de tareas más ágil.',
    ],
  },
  {
    version: '1.0.0',
    fecha: '01/05/2025',
    cambios: [
      'Primera versión de Panda Journal.',
      'Registro e inicio de sesión.',
      'Cuaderno con categorías y tareas.',
    ],
  },
];
