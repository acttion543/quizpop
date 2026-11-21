import { getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
export function authConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}
export function clientAuth() {
  if (!authConfigured())
    throw new Error(
      "ยังไม่ได้เชื่อม Firebase Authentication กรุณาให้เจ้าของเว็บตั้งค่าก่อน",
    );
  const app =
    getApps()[0] ||
    initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
  return getAuth(app);
}
export async function googleLogin() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(clientAuth(), provider);
}
export async function logout() {
  await signOut(clientAuth());
  location.assign("/");
}
export async function authFetch(url: string, options: RequestInit = {}) {
  const user = clientAuth().currentUser;
  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อน");
  const token = await user.getIdToken();
  const headers = new Headers(options.headers);
  headers.set("Authorization", "Bearer " + token);
  return fetch(url, { ...options, headers });
}
