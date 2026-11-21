"use client";
import { useCallback, useEffect, useState } from "react";
import { getRedirectResult, onAuthStateChanged, type User } from "firebase/auth";
import { LoginBrowserHelp } from "@/components/login-browser-help";
import { embeddedBrowserName, loginErrorMessage } from "@/lib/login-support";
import {
  ArrowUpRight,
  CheckCircle2,
  Gamepad2,
  LoaderCircle,
  LogOut,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import {
  authConfigured,
  authFetch,
  clientAuth,
  canRedirectLogin,
  googleLogin,
  logout,
} from "@/lib/firebase-client";
type Route = { pin: string; role: string };
type Lobby = {
  pin: string;
  title: string;
  phase: string;
  count: number;
  total: number;
  joined: boolean;
  owned: boolean;
};
function Logo() {
  return (
    <a href="/" className="brand">
      <span className="brand-mark">
        <Zap size={23} fill="currentColor" />
      </span>
      QuizPop<span className="brand-bang">!</span>
    </a>
  );
}
export function AuthPortal({
  children,
  renderRoom,
}: {
  children: React.ReactNode;
  renderRoom: (r: Route, home: () => void) => React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [admin, setAdmin] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [adminPath, setAdminPath] = useState(false);
  const [browserName, setBrowserName] = useState<string | null>(null);
  useEffect(() => {
    setAdminPath(location.pathname === "/admin");
    setBrowserName(embeddedBrowserName(navigator.userAgent));
    if (!authConfigured()) {
      setLoading(false);
      return;
    }
    let disposed = false;
    let unsubscribe = () => {};
    async function observeAuth() {
      try {
        await getRedirectResult(clientAuth());
      } catch (e) {
        if (!disposed) setError(loginErrorMessage(e));
      }
      if (disposed) return;
      unsubscribe = onAuthStateChanged(clientAuth(), async (u) => {
        setLoading(true);
        if (u) setError("");
        setUser(u);
        setAdmin(false);
        if (u) {
          try {
            const r = await authFetch("/api/account");
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            if (!disposed) setAdmin(d.admin);
          } catch (e) {
            if (!disposed) setError((e as Error).message);
          }
        }
        if (!disposed) setLoading(false);
      });
    }
    void observeAuth();
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);
  async function login(mode?: "redirect") {
    setBusy(true);
    setError("");
    try {
      await googleLogin(mode);
    } catch (e) {
      setError(loginErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="auth-loading">
        <Logo />
        <LoaderCircle className="spin" size={34} />
        <p>กำลังตรวจสอบการเข้าสู่ระบบ...</p>
      </div>
    );
  if (!user)
    return (
      <main className="login-page">
        <section className="login-story">
          <Logo />
          <div className="login-story-content">
            <span className="login-kicker">
              <Sparkles size={17} />
              LEARN TOGETHER. PLAY TOGETHER.
            </span>
            <h1>
              พร้อมไหม
              <br />
              ที่จะ
              <span>
                รู้ให้สุด
                <br />
                สนุกให้เต็มที่
              </span>
              <b>?</b>
            </h1>
            <p>
              เปลี่ยนทุกคำถามเป็นความท้าทาย
              <br />
              แล้วมาลุ้นตำแหน่งแชมป์ไปด้วยกัน
            </p>
            <div className="login-tiles">
              <div>
                ▲<small>THINK</small>
              </div>
              <div>
                ◆<small>PLAY</small>
              </div>
              <div>
                ●<small>LEARN</small>
              </div>
              <div>
                ■<small>WIN</small>
              </div>
            </div>
            <div className="login-foot">
              ห้องเรียนก็ได้ ปาร์ตี้ก็ดี <span>✦</span>
            </div>
          </div>
          <span className="login-star">✦</span>
          <span className="login-ring" />
        </section>
        <section className="login-panel">
          <div className="login-mobile-logo">
            <Logo />
          </div>
          <div className="login-form-card">
            <span className="login-welcome-icon">
              {adminPath ? "🛠️" : "👋"}
            </span>
            <span className="eyebrow">LET THE GOOD TIMES BEGIN</span>
            <h2>{adminPath ? "พื้นที่สำหรับแอดมิน" : "ยินดีต้อนรับเข้าเกม!"}</h2>
            <p>
              {adminPath
                ? "เข้าสู่ระบบเพื่อสร้างคำถามและจัดการห้องสอบ"
                : "เข้าสู่ระบบ แล้วเข้าห้องรอเพื่อน ๆ กัน"}
            </p>
            <button className="google-button" disabled={busy || !!browserName} onClick={() => void login()}>
              {busy ? (
                <LoaderCircle className="spin" size={22} />
              ) : (
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5C29.1 35.3 26.8 36 24 36a12 12 0 0 1-11.3-8.3H6v5.2A20.3 20.3 0 0 0 24 44Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M12.7 27.7a12 12 0 0 1 0-7.4v-5.2H6a20.1 20.1 0 0 0 0 17.8l6.7-5.2Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M24 12c3 0 5.6 1 7.7 3l5.8-5.7A19.3 19.3 0 0 0 24 4 20.3 20.3 0 0 0 6 15.1l6.7 5.2A12 12 0 0 1 24 12Z"
                  />
                </svg>
              )}
              {browserName ? "เปิดใน Safari / Chrome เพื่อเข้าสู่ระบบ" : "เข้าสู่ระบบด้วย Google"}
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {error && !browserName && canRedirectLogin() && (
              <button className="login-redirect-button" disabled={busy} onClick={() => void login("redirect")}>
                เข้าสู่ระบบในแท็บนี้
              </button>
            )}
            <LoginBrowserHelp browserName={browserName} expanded={!!error} />
            <div className="login-divider">
              <span>เชื่อมต่อด้วยบัญชีของคุณ</span>
            </div>
            <div className="login-benefits">
              <p>
                <CheckCircle2 size={18} />
                ใช้บัญชี Google ไม่ต้องจำรหัสผ่านเพิ่ม
              </p>
              <p>
                <CheckCircle2 size={18} />
                เข้าห้องสอบและเริ่มพร้อมกันกับทุกคน
              </p>
              <p>
                <ShieldCheck size={18} />
                แยกสิทธิ์ผู้ดูแลและผู้ตอบคำถาม
              </p>
            </div>
            <div className="login-role-link">
              {adminPath ? "มาเล่นเกมใช่ไหม?" : "เป็นผู้จัดสอบใช่ไหม?"}
              <a href={adminPath ? "/" : "/admin"}>
                {adminPath ? "หน้าผู้ตอบคำถาม" : "เข้าสู่หน้าแอดมิน"}
                <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
          <p className="login-bottom">QuizPop! · เล่นด้วยกัน เรียนรู้ไปด้วยกัน</p>
        </section>
      </main>
    );
  if (error)
    return (
      <div className="auth-loading">
        <Logo />
        <h2>ตรวจสอบบัญชีไม่ได้</h2>
        <p className="error" role="alert">
          {error}
        </p>
        <button className="button primary" onClick={() => location.reload()}>
          ลองอีกครั้ง
        </button>
        <button className="button white" onClick={logout}>
          เข้าสู่ระบบใหม่
        </button>
      </div>
    );
  if (adminPath && !admin)
    return (
      <div className="auth-loading">
        <ShieldCheck size={46} />
        <h2>พื้นที่สำหรับผู้ดูแลระบบ</h2>
        <p>บัญชี {user.email} ไม่มีสิทธิ์แอดมิน</p>
        <a className="button primary" href="/">
          ไปหน้ารอสอบ
        </a>
        <button className="button white" onClick={logout}>
          เปลี่ยนบัญชี
        </button>
      </div>
    );
  if (adminPath)
    return (
      <>
        <div className="admin-account-bar">
          <ShieldCheck size={15} />
          <span>ผู้ดูแล · {user.email}</span>
          <a href="/">หน้าผู้ตอบคำถาม</a>
          <button onClick={logout}>ออกจากระบบ</button>
        </div>
        {children}
      </>
    );
  return <StudentLobby user={user} admin={admin} renderRoom={renderRoom} />;
}
function StudentLobby({
  user,
  admin,
  renderRoom,
}: {
  user: User;
  admin: boolean;
  renderRoom: (r: Route, home: () => void) => React.ReactNode;
}) {
  const [route, setRoute] = useState<Route | null>(null),
    [rooms, setRooms] = useState<Lobby[]>([]),
    [pin, setPin] = useState(""),
    [name, setName] = useState(user.displayName?.slice(0, 20) || ""),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false);
  const home = useCallback(() => {
    history.pushState({}, "", "/");
    setRoute(null);
  }, []);
  useEffect(() => {
    const parse = () => {
      const p = new URLSearchParams(location.search),
        r = p.get("room");
      if (r && /^\d{6}$/.test(r)) setRoute({ pin: r, role: "player" });
      else setRoute(null);
      if (p.get("join")) setPin(p.get("join")!.replace(/\D/g, "").slice(0, 6));
    };
    parse();
    window.addEventListener("popstate", parse);
    return () => window.removeEventListener("popstate", parse);
  }, []);
  useEffect(() => {
    if (route) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const abort = new AbortController();
    const load = async () => {
      try {
        const r = await authFetch("/api/game?lobbies=1", {
          signal: abort.signal,
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (!stop) {
          setRooms(d.rooms);
          setError("");
        }
      } catch (e) {
        if (!stop) setError((e as Error).message);
      } finally {
        if (!stop) {
          setLoaded(true);
          timer = setTimeout(load, 4000);
        }
      }
    };
    void load();
    return () => {
      stop = true;
      clearTimeout(timer);
      abort.abort();
    };
  }, [route]);
  async function join(code: string) {
    if (!/^\d{6}$/.test(code)) {
      setError("กรอกรหัสห้อง 6 หลัก");
      return;
    }
    if (!name.trim()) {
      setError("กรุณาใส่ชื่อเล่นก่อนเข้าห้อง");
      return;
    }
    setBusy(code);
    setError("");
    try {
      const r = await authFetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", pin: code, name, avatar: "🦊" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      history.pushState({}, "", `/?room=${code}&role=player`);
      setRoute({ pin: code, role: "player" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (route) return renderRoom(route, home);
  return (
    <div className="student-shell">
      <header className="game-header">
        <Logo />
        <span className="student-account">
          {user.displayName || user.email}
        </span>
        {admin && (
          <a className="button soft" href="/admin">
            <ShieldCheck size={17} />
            จัดการข้อสอบ
          </a>
        )}
        <button
          className="icon-button"
          onClick={logout}
          aria-label="ออกจากระบบ"
        >
          <LogOut size={20} />
        </button>
      </header>
      <main className="student-main">
        <section className="student-welcome">
          <span className="lobby-kicker">
            <Sparkles size={18} />
            YOUR NEXT CHALLENGE STARTS HERE
          </span>
          <h1>
            สวัสดี {user.displayName?.split(" ")[0] || "ผู้ท้าชิง"} <span>👋</span>
            <br />
            พร้อม<span className="purple">ประลองความรู้</span>หรือยัง?
          </h1>
          <p>
            เข้าห้องสอบ แล้วรอเริ่มพร้อมกันกับเพื่อน ๆ<br />
            แอดมินจะเป็นคนกดเริ่มเกมให้ทุกคน
          </p>
          <div className="student-welcome-art" aria-hidden="true">
            🏆<span>✦</span>
          </div>
        </section>
        <section className="student-join">
          <div className="section-title">
            <Gamepad2 size={23} />
            <h2>เข้าห้องด้วยรหัสเกม</h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void join(pin);
            }}
          >
            <label>
              ชื่อที่ใช้ในเกม
              <input
                maxLength={20}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ชื่อเล่นของคุณ"
              />
            </label>
            <label>
              รหัสเกม
              <input
                inputMode="numeric"
                pattern="[0-9]{6}"
                required
                maxLength={6}
                placeholder="000000"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
              />
            </label>
            <button className="button primary" type="submit" disabled={!!busy}>
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <Play size={18} />
              )}
              เข้าห้องรอสอบ
            </button>
          </form>
        </section>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <section className="available-rooms">
          <div className="section-heading">
            <div>
              <h2>ห้องสอบของคุณ</h2>
              <p>เลือกห้องที่แอดมินเปิดไว้ หรือกลับเข้าห้องที่คุณเข้าร่วมแล้ว</p>
            </div>
            <span className="refresh-note">
              <span className="status-dot online" />
              อัปเดตอัตโนมัติ
            </span>
          </div>
          {!loaded ? (
            <div className="empty-state">
              <LoaderCircle className="spin" size={30} />
              <p>กำลังค้นหาห้องสอบ...</p>
            </div>
          ) : !rooms.length ? (
            <div className="empty-state">
              <span className="empty-emoji">🛋️</span>
              <h3>นั่งพักก่อน เดี๋ยวความสนุกก็มา</h3>
              <p>ยังไม่มีห้องเปิดอยู่ เมื่อแอดมินเปิดห้องจะแสดงที่นี่อัตโนมัติ</p>
            </div>
          ) : (
            <div className="lobby-list">
              {rooms.map((r) => (
                <article key={r.pin}>
                  <span className="room-card-icon">🎯</span>
                  <div>
                    <span className="room-state">
                      {r.phase === "lobby"
                        ? "เปิดรับผู้เข้าร่วม"
                        : r.phase === "finished"
                          ? "ดูผลคะแนน"
                          : "กำลังสอบ"}
                    </span>
                    <h3>{r.title}</h3>
                    <p>
                      PIN {r.pin} · {r.total} คำถาม · <Users size={14} />
                      {r.count} คน
                    </p>
                  </div>
                  <button
                    className="button primary"
                    disabled={!!busy}
                    onClick={() => join(r.pin)}
                  >
                    {busy === r.pin ? (
                      <LoaderCircle className="spin" size={18} />
                    ) : null}
                    {r.joined ? "กลับเข้าห้อง" : "เข้าร่วม"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
        <footer className="footer">
          <span>เข้าสู่ระบบด้วย {user.email}</span>
          <span>QuizPop! · ทุกคำถามคือโอกาสเรียนรู้ ✦</span>
        </footer>
      </main>
    </div>
  );
}
