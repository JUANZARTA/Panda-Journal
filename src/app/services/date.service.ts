// Estado de "qué página del cuaderno estamos mirando" — antes era año/mes,
// ahora es UNA fecha exacta (yyyy-MM-dd), porque el schema ya no particiona
// por mes (ver PeriodPathService). Cambiar de día es instantáneo, sin cruzar
// de nodo de Firebase.
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

const STORAGE_KEY = 'selectedDate';

@Injectable({
  providedIn: 'root',
})
export class DateService {
  private dateSubject: BehaviorSubject<string>;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    const saved = this.isBrowser ? localStorage.getItem(STORAGE_KEY) : null;
    this.dateSubject = new BehaviorSubject<string>(saved || formatDate(new Date()));
  }

  get selectedDate$(): Observable<string> {
    return this.dateSubject.asObservable();
  }

  getSelectedDate(): string {
    return this.dateSubject.value;
  }

  setDate(fecha: string): void {
    this.dateSubject.next(fecha);
    if (this.isBrowser) localStorage.setItem(STORAGE_KEY, fecha);
  }

  goToToday(): void {
    this.setDate(formatDate(new Date()));
  }

  goToNextDay(): void {
    this.shiftDay(1);
  }

  goToPreviousDay(): void {
    this.shiftDay(-1);
  }

  isToday(): boolean {
    return this.getSelectedDate() === formatDate(new Date());
  }

  private shiftDay(delta: number): void {
    const current = parseLocalDate(this.getSelectedDate());
    current.setDate(current.getDate() + delta);
    this.setDate(formatDate(current));
  }
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(fecha: string): Date {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(y, m - 1, d);
}
