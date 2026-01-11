import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface UserProfile {
  id?: string;
  email: string;
  displayName: string;
  role: "admin" | "user";
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLogin?: Timestamp;
  notes?: string;
}

const USERS_COLLECTION = "users";

// Get all users
export async function getAllUsers(): Promise<UserProfile[]> {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as UserProfile))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

// Get user by email
export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const q = query(collection(db, USERS_COLLECTION), where("email", "==", email.toLowerCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as UserProfile;
}

// Get user by ID
export async function getUserById(id: string): Promise<UserProfile | null> {
  const docRef = doc(db, USERS_COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as UserProfile;
}

// Create user
export async function createUser(
  user: Omit<UserProfile, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, USERS_COLLECTION), {
    ...user,
    email: user.email.toLowerCase(),
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

// Update user
export async function updateUser(
  id: string,
  user: Partial<Omit<UserProfile, "id" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, id);
  await updateDoc(docRef, {
    ...user,
    updatedAt: Timestamp.now(),
  });
}

// Delete user
export async function deleteUser(id: string): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, id);
  await deleteDoc(docRef);
}

// Record user login (updates lastLogin timestamp)
export async function recordUserLogin(email: string): Promise<void> {
  const user = await getUserByEmail(email);
  if (user?.id) {
    await updateDoc(doc(db, USERS_COLLECTION, user.id), {
      lastLogin: Timestamp.now(),
    });
  }
}
