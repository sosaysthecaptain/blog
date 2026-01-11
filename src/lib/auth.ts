import {
  signInWithPopup,
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

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
