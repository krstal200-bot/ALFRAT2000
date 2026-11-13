import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCHhvS00S-v4S6viz8DIpDYibnH7cKxe5E",
  authDomain: "alfrat2000-69882.firebaseapp.com",
  projectId: "alfrat2000-69882",
  storageBucket: "alfrat2000-69882.firebasestorage.app",
  messagingSenderId: "680232786154",
  appId: "1:680232786154:web:01155257438f8ceb641f93",
  measurementId: "G-QXFEBR3724"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);