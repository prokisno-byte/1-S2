const firebaseConfig = {
  apiKey: "AIzaSyD4rqQ6fpcJ7A2DHNUWoTgd75CgKrG5Ifc",
  authDomain: "forgecs-2f6b4.firebaseapp.com",
  projectId: "forgecs-2f6b4",
  storageBucket: "forgecs-2f6b4.firebasestorage.app",
  messagingSenderId: "922438814995",
  appId: "1:922438814995:web:f73ddb89547d65177dee6",
  measurementId: "G-CVZS6X17XY"
};

let app, auth, db;

try {
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  console.log("Firebase initialized successfully");
  window.DEMO_MODE = false;
} catch (e) {
  console.warn("Firebase error, falling back to demo mode:", e.message);
  window.DEMO_MODE = true;
}
