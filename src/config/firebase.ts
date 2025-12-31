import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getDatabase,
  ref,
  set,
  get,
  child,
  push,
  update,
  onValue,
  off,
  type Database,
} from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAD4piXNNzWi3z1riCEl07NHnjg2IHcFhc",
  authDomain: "decor-drapes.firebaseapp.com",
  databaseURL:
    "https://decor-drapes-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "decor-drapes",
  storageBucket: "decor-drapes.firebasestorage.app",
  messagingSenderId: "175917446618",
  appId: "1:175917446618:web:1567dfe6a9d9c43e873ce3",
  measurementId: "G-8W8BZMLVZC",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

try {
  console.info("Connected to Database");
} catch (error) {
  console.warn("Could not configure persistence");
}

export {
  auth,
  database,
  ref,
  set,
  get,
  child,
  push,
  update,
  onValue,
  off,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
};

export type { User, Database };