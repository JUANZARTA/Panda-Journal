// Configuración de Firebase — proyecto real de Panda Journal (misdeberes-fac01).
//
// ⚠️ Antes de correr la app: completá messagingSenderId y appId con los valores
// reales de tu proyecto (Firebase Console > Configuración del proyecto > Tus apps).
// apiKey y databaseURL ya están tomados del código existente (auth.service.ts /
// task.service.ts), que apuntaban correctamente a este proyecto.
//
// Este archivo NO llama a firebase.initializeApp() — la inicialización la hace
// provideFirebaseApp() en app.config.ts (SDK modular), no el SDK compat.
export const firebaseConfig = {
  apiKey: 'AIzaSyC5zxpbLbz8EuEp6PKAz9U7QkXXhqLDhhk',
  authDomain: 'misdeberes-fac01.firebaseapp.com',
  databaseURL: 'https://misdeberes-fac01-default-rtdb.firebaseio.com',
  projectId: 'misdeberes-fac01',
  storageBucket: 'misdeberes-fac01.firebasestorage.app',
  messagingSenderId: '759912985060',
  appId: '1:759912985060:web:b8d78c281fed64e3a597f1',
};
