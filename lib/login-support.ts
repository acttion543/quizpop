// Browser hints are used only for sign-in UX, never for authorization.
export function embeddedBrowserName(userAgent: string): string | null {
  if (/\bLine\//i.test(userAgent)) return "LINE";
  if (/FBAN|FBAV/i.test(userAgent)) return "Facebook";
  if (/Instagram/i.test(userAgent)) return "Instagram";
  return null;
}

export function shouldUseRedirectLogin(
  userAgent: string,
  maxTouchPoints: number,
  hostname: string,
  authDomain: string | undefined,
): boolean {
  // Redirects require our same-origin Firebase helper proxy.
  const sameOrigin = !!authDomain && hostname.toLowerCase() === authDomain.toLowerCase();
  const mobile = /Android|iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  return sameOrigin && mobile && !embeddedBrowserName(userAgent);
}

export function loginRecoveryLink(href: string): string {
  const url = new URL(href);
  const clean = new URL(url.pathname === "/admin" ? "/admin" : "/", url.origin);
  const pin = url.searchParams.get("join");
  if (/^\d{6}$/.test(pin || "")) clean.searchParams.set("join", pin!);
  return clean.href;
}

export function loginErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "หน้าต่างเข้าสู่ระบบถูกปิด หากยังไม่สำเร็จ ลองอีกครั้งหรือเลือกเข้าสู่ระบบในแท็บนี้";
    case "auth/popup-blocked":
      return "เบราว์เซอร์บล็อกหน้าต่าง Google ลองใช้ปุ่มเข้าสู่ระบบในแท็บนี้ หรือเปิดเว็บใน Safari / Chrome";
    case "auth/web-storage-unsupported":
    case "auth/missing-initial-state":
      return "เบราว์เซอร์เก็บสถานะเข้าสู่ระบบไม่ได้ กรุณาคัดลอกลิงก์ด้านล่างไปเปิดใน Safari / Chrome แล้วเริ่มเข้าสู่ระบบจากหน้า QuizPop อีกครั้ง";
    case "auth/embedded-browser":
    case "auth/disallowed-useragent":
    case "auth/operation-not-supported-in-this-environment":
      return "กรุณาเปิดลิงก์นี้ใน Safari หรือ Chrome แล้วเข้าสู่ระบบด้วย Google อีกครั้ง";
    case "auth/unauthorized-domain":
      return "โดเมนนี้ยังไม่ได้รับอนุญาตให้เข้าสู่ระบบ กรุณาใช้ลิงก์ QuizPop หลักหรือติดต่อผู้ดูแลระบบ";
    case "auth/network-request-failed":
      return "เชื่อมต่อ Google ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง";
    default:
      return "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง หรือเปิดลิงก์นี้ใน Safari / Chrome";
  }
}
