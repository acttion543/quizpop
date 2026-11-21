import { getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { embeddedBrowserName, shouldUseRedirectLogin } from "./login-support";

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
export function canRedirectLogin() {
  return typeof location !== "undefined" &&
    location.hostname === process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
}
export async function googleLogin(mode?: "redirect") {
  if (embeddedBrowserName(navigator.userAgent)) {
    throw Object.assign(new Error("Open in your browser"), { code: "auth/embedded-browser" });
  }
  const redirect = mode === "redirect" || shouldUseRedirectLogin(
    navigator.userAgent, navigator.maxTouchPoints,
    location.hostname, process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  );
  if (redirect) {
    if (!canRedirectLogin()) throw Object.assign(new Error("Same-origin auth required"), { code: "auth/unauthorized-domain" });
    try {
      const key = "quizpop:storage-check";
      sessionStorage.setItem(key, "1");
      sessionStorage.removeItem(key);
    } catch {
      throw Object.assign(new Error("Session storage unavailable"), { code: "auth/web-storage-unsupported" });
    }
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  if (redirect) return signInWithRedirect(clientAuth(), provider);
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
