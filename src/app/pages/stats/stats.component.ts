import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { TaskService } from '../../services/task.service';
import { formatDate, parseLocalDate } from '../../services/date.service';
import { Task, TaskConFecha } from '../../models/task.model';

interface DayCount {
  total: number;
  hechas: number;
}

interface DayBar {
  label: string;
  fecha: string;
  pct: number;
  total: number;
  hechas: number;
  future: boolean;
  today: boolean;
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface SeriePoint {
  fecha: string;
  label: string;
  dow: number;
  hechas: number;
  total: number;
  x: number;
  y: number;
}

function niceMax(v: number): number {
  if (v <= 5) return 5;
  return Math.ceil(v / 5) * 5;
}

// Curva monótona (Fritsch–Carlson): suave como una spline pero sin pasarse por debajo de 0 ni inventar picos.
function monotonePath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    m[i] = (pts[i + 1].y - pts[i].y) / dx[i];
  }
  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i].x + h},${pts[i].y + t[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - t[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  return r;
}

function pct(c: DayCount): number {
  return c.total === 0 ? 0 : Math.round((c.hechas / c.total) * 100);
}

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './stats.component.html',
})
export default class StatsComponent {
  private taskService = inject(TaskService);

  private dated = toSignal(this.taskService.watchAllDatedTasks(), { initialValue: [] as TaskConFecha[] });
  private lost = toSignal(this.taskService.watchLostTasks(), { initialValue: [] as Task[] });
  private lostHistory = toSignal(this.taskService.watchLostHistory(), {
    initialValue: {} as Record<string, Record<string, string>>,
  });

  /** Perdidas de todos los tiempos (historial + las que siguen en la bandeja) y cuántas ya se reprogramaron. */
  perdidas = computed(() => {
    const enBandeja = new Set(this.lost().map((t) => t.id));
    const historicas = new Set<string>();
    Object.values(this.lostHistory()).forEach((dia) => Object.keys(dia ?? {}).forEach((id) => historicas.add(id)));
    const total = new Set([...historicas, ...enBandeja]).size;
    const reprogramadas = [...historicas].filter((id) => !enBandeja.has(id)).length;
    return { total, reprogramadas, pendientes: enBandeja.size };
  });

  private byDay = computed(() => {
    const map = new Map<string, DayCount>();
    const add = (fecha: string, hecha: boolean) => {
      const c = map.get(fecha) ?? { total: 0, hechas: 0 };
      c.total++;
      if (hecha) c.hechas++;
      map.set(fecha, c);
    };
    this.dated().forEach((t) => add(t.fecha, t.estado === 'realizado'));
    // las perdidas cuentan en su día original, ahí fueron "no cumplidas"
    this.lost().forEach((t) => {
      if (t.fechaOriginal) add(t.fechaOriginal, t.estado === 'realizado');
    });
    // Las ya reprogramadas no están en la bandeja, pero su día original sigue siendo "no cumplido".
    const enBandeja = new Set(this.lost().map((t) => t.id));
    Object.entries(this.lostHistory()).forEach(([fecha, dia]) =>
      Object.keys(dia ?? {}).forEach((id) => {
        if (!enBandeja.has(id)) add(fecha, false);
      })
    );
    return map;
  });

  private isDone(map: Map<string, DayCount>, fecha: string): boolean {
    const c = map.get(fecha);
    return !!c && c.total > 0 && c.hechas === c.total;
  }

  rachaActual = computed(() => {
    const map = this.byDay();
    const hoy = new Date();
    let cursor = this.isDone(map, formatDate(hoy)) ? hoy : addDays(hoy, -1);
    let n = 0;
    while (this.isDone(map, formatDate(cursor))) {
      n++;
      cursor = addDays(cursor, -1);
    }
    return n;
  });

  mejorRacha = computed(() => {
    const map = this.byDay();
    const dias = [...map.keys()].filter((f) => this.isDone(map, f)).sort();
    let best = 0;
    let run = 0;
    let prev: string | null = null;
    for (const f of dias) {
      run = prev && formatDate(addDays(parseLocalDate(prev), 1)) === f ? run + 1 : 1;
      best = Math.max(best, run);
      prev = f;
    }
    return best;
  });

  private weekStart(): Date {
    const hoy = new Date();
    const offset = (hoy.getDay() + 6) % 7;
    return addDays(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()), -offset);
  }

  private sumRange(start: Date, days: number): DayCount {
    const map = this.byDay();
    const total: DayCount = { total: 0, hechas: 0 };
    for (let i = 0; i < days; i++) {
      const c = map.get(formatDate(addDays(start, i)));
      if (c) {
        total.total += c.total;
        total.hechas += c.hechas;
      }
    }
    return total;
  }

  semanaActual = computed(() => {
    const dias = (new Date().getDay() + 6) % 7 + 1;
    const c = this.sumRange(this.weekStart(), dias);
    return { ...c, pct: pct(c) };
  });

  semanaPasada = computed(() => {
    const c = this.sumRange(addDays(this.weekStart(), -7), 7);
    return { ...c, pct: pct(c) };
  });

  delta = computed(() => this.semanaActual().pct - this.semanaPasada().pct);

  // -------- Tareas hechas por día --------

  rangos = [7, 30, 90];
  rango = signal(30);
  hover = signal<number | null>(null);

  serie = computed<SeriePoint[]>(() => {
    const map = this.byDay();
    const n = this.rango();
    const hoy = new Date();
    const raw = Array.from({ length: n }, (_, i) => {
      const d = addDays(hoy, -(n - 1 - i));
      const c = map.get(formatDate(d));
      return {
        fecha: formatDate(d),
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        dow: d.getDay(),
        hechas: c?.hechas ?? 0,
        total: c?.total ?? 0,
      };
    });
    const top = niceMax(Math.max(0, ...raw.map((p) => p.hechas)));
    return raw.map((p, i) => ({
      ...p,
      x: n === 1 ? 50 : (i / (n - 1)) * 100,
      y: 100 - (p.hechas / top) * 92,
    }));
  });

  chart = computed(() => {
    const s = this.serie();
    const top = niceMax(Math.max(0, ...s.map((p) => p.hechas)));
    const line = monotonePath(s);
    const area = s.length ? `${line} L100,100 L0,100 Z` : '';
    const maxIdx = s.reduce((best, p, i) => (p.hechas > s[best].hechas ? i : best), 0);
    const etiquetados = new Set<number>([s.length - 1]);
    if (s[maxIdx]?.hechas > 0) etiquetados.add(maxIdx);
    const grid = [top, top / 2, 0].map((v) => ({ valor: v, y: 100 - (v / top) * 92 }));
    const paso = Math.max(1, Math.ceil(s.length / 6));
    const ejeX = s.filter((_, i) => i % paso === 0 || i === s.length - 1);
    return { line, area, etiquetados, grid, ejeX };
  });

  puntoHover = computed(() => {
    const i = this.hover();
    return i === null ? null : this.serie()[i] ?? null;
  });

  diaCorto(p: SeriePoint): string {
    return `${DAY_SHORT[p.dow]} ${p.label}`;
  }

  mejorDia = computed(() => {
    const suma = new Array(7).fill(0);
    const cuenta = new Array(7).fill(0);
    this.serie().forEach((p) => {
      suma[p.dow] += p.hechas;
      cuenta[p.dow]++;
    });
    let best = -1;
    let bestProm = 0;
    for (let d = 0; d < 7; d++) {
      const prom = cuenta[d] ? suma[d] / cuenta[d] : 0;
      if (prom > bestProm) {
        bestProm = prom;
        best = d;
      }
    }
    return best === -1 ? null : { nombre: DAY_NAMES[best], promedio: Math.round(bestProm * 10) / 10 };
  });

  bars = computed<DayBar[]>(() => {
    const map = this.byDay();
    const start = this.weekStart();
    const hoy = formatDate(new Date());
    return DAY_LABELS.map((label, i) => {
      const fecha = formatDate(addDays(start, i));
      const c = map.get(fecha) ?? { total: 0, hechas: 0 };
      return { label, fecha, pct: pct(c), total: c.total, hechas: c.hechas, future: fecha > hoy, today: fecha === hoy };
    });
  });
}
