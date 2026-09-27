// ============================================
// Firebase Configuration
// ============================================
// 1. Зайди на https://console.firebase.google.com
// 2. Создай новый проект (например ForgeCS)
// 3. Добавь Web App
// 4. Скопируй конфиг сюда
// 5. В Authentication → Sign-in method включи Email/Password
// 6. В Firestore Database создай базу (production mode или test)
// 7. В Firestore Rules поставь временные правила (см. README)

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Инициализация (не трогай, если конфиг правильный)
let app, auth, db;

try {
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  console.log("Firebase initialized");
} catch (e) {
  console.warn("Firebase не настроен. Работает демо-режим с localStorage.", e.message);
  // Демо-режим будет использовать localStorage
  window.DEMO_MODE = true;
}
