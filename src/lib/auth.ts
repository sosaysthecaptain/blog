import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "./firebase";
import { getUserByEmail, createUser, updateUser } from "./users";
import { Timestamp } from "firebase/firestore";

// Whitelist of admin emails
const ADMIN_EMAILS = ["sosaysthecaptain@gmail.com"];

export function isAdminEmail(email: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function signInWithGoogle(): Promise<User | null> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    if (!isAdminEmail(result.user.email)) {
      await firebaseSignOut(auth);
      throw new Error("Unauthorized email address");
    }

    // Auto-register/update user in Firestore
    const email = result.user.email!;
    const existingUser = await getUserByEmail(email);

    if (existingUser?.id) {
      // Update last login
      await updateUser(existingUser.id, { lastLogin: Timestamp.now() });
    } else {
      // Create new user profile
      await createUser({
        email,
        displayName: result.user.displayName || email.split("@")[0],
        role: isAdminEmail(email) ? "admin" : "user",
        photoURL: result.user.photoURL || undefined,
        lastLogin: Timestamp.now(),
      });
    }

    return result.user;
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User | null> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);

    // Update last login in Firestore
    const existingUser = await getUserByEmail(email);
    if (existingUser?.id) {
      await updateUser(existingUser.id, { lastLogin: Timestamp.now() });
    }

    return result.user;
  } catch (error) {
    console.error("Email sign in error:", error);
    throw error;
  }
}

export async function signUpWithEmail(email: string, password: string, displayName?: string): Promise<User | null> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Create user profile in Firestore
    await createUser({
      email,
      displayName: displayName || email.split("@")[0],
      role: isAdminEmail(email) ? "admin" : "user",
      lastLogin: Timestamp.now(),
    });

    return result.user;
  } catch (error) {
    console.error("Email sign up error:", error);
    throw error;
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
