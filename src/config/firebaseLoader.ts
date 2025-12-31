import type { Auth, User, GoogleAuthProvider } from "firebase/auth";
import type {
  Database,
  ref as refType,
  set as setType,
  get as getType,
  child as childType,
  push as pushType,
  update as updateType,
  onValue as onValueType,
  off as offType,
} from "firebase/database";

let firebasePromise: Promise<{
  auth: Auth;
  database: Database;
  ref: typeof refType;
  set: typeof setType;
  get: typeof getType;
  child: typeof childType;
  push: typeof pushType;
  update: typeof updateType;
  onValue: typeof onValueType;
  off: typeof offType;
  GoogleAuthProvider: typeof GoogleAuthProvider;
  createUserWithEmailAndPassword: typeof import("firebase/auth").createUserWithEmailAndPassword;
  signInWithEmailAndPassword: typeof import("firebase/auth").signInWithEmailAndPassword;
  signInWithPopup: typeof import("firebase/auth").signInWithPopup;
  signOut: typeof import("firebase/auth").signOut;
  onAuthStateChanged: typeof import("firebase/auth").onAuthStateChanged;
}> | null = null;

export const loadFirebase = () => {
  if (!firebasePromise) {
    firebasePromise = import("./firebase");
  }
  return firebasePromise;
};

export type { User };
