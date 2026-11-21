"use client";
import { useEffect, useRef, useState } from "react";
import { Copy, Smartphone } from "lucide-react";
import { loginRecoveryLink } from "@/lib/login-support";

export function LoginBrowserHelp({
  browserName,
  expanded,
}: {
  browserName: string | null;
  expanded: boolean;
}) {
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setLink(loginRecoveryLink(location.href));
  }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setMessage("คัดลอกแล้ว นำไปวางใน Safari หรือ Chrome ได้เลย");
    } catch {
      input.current?.focus();
      input.current?.select();
      setMessage("แตะค้างที่ลิงก์เพื่อคัดลอก แล้วนำไปวางใน Safari หรือ Chrome");
    }
  }
  return (
    <details className="login-browser-help" open={!!browserName || expanded}>
      <summary><Smartphone size={17} /> เปิดจาก LINE หรือเข้าสู่ระบบไม่ได้?</summary>
      <div className="login-browser-help-content">
        <strong>{browserName ? `กำลังเปิดผ่าน ${browserName}` : "ลองเปิดใน Safari หรือ Chrome"}</strong>
        <p>ในแอป LINE ให้กดเมนู ⋯ แล้วเลือก “เปิดในเบราว์เซอร์” หรือคัดลอกลิงก์นี้ไปวางใน Safari / Chrome</p>
        <p>หากเจอหน้า “missing initial state” ให้กลับมาเริ่มจากลิงก์นี้ และใช้เบราว์เซอร์เดิมตลอดการเข้าสู่ระบบ</p>
        <label htmlFor="login-recovery-link">ลิงก์กลับเข้า QuizPop</label>
        <div className="login-copy-link">
          <input id="login-recovery-link" ref={input} value={link} readOnly onFocus={(e) => e.target.select()} />
          <button type="button" onClick={copy} disabled={!link}><Copy size={16} /> คัดลอก</button>
        </div>
        <p className="login-copy-status" role="status">{message}</p>
      </div>
    </details>
  );
}
