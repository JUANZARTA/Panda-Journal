import { Observable } from 'rxjs';
import { onValue, type DatabaseReference } from '@angular/fire/database';

/**
 * onValue -> Observable, SIN pasar por objectVal/listVal de rxfire.
 * Con rxfire de por medio, escribir en un path mientras hay un listener activo
 * sobre ese mismo path disparaba un RangeError interno del SDK de Firebase
 * (ChildrenNode.equals). Escuchando onValue tal cual lo expone el SDK, no pasa.
 */
export function watchValue<T>(dbRef: DatabaseReference): Observable<T> {
  return new Observable<T>((subscriber) => {
    const unsubscribe = onValue(
      dbRef,
      (snapshot) => subscriber.next(snapshot.val() as T),
      (error) => subscriber.error(error)
    );
    return () => unsubscribe();
  });
}
