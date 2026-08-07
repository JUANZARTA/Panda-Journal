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
  apiKey: 'AIzaSyCXaTov5g6_qWHoxHdI39tLzEH7VQx5ttw',
  authDomain: 'misdeberes-fac01.firebaseapp.com',
  databaseURL: 'https://misdeberes-fac01-default-rtdb.firebaseio.com',
  projectId: 'misdeberes-fac01',
  storageBucket: 'misdeberes-fac01.appspot.com',
  messagingSenderId: 'TU_MESSAGING_SENDER_ID', // TODO: completar desde Firebase Console
  appId: 'TU_APP_ID', // TODO: completar desde Firebase Console
};
