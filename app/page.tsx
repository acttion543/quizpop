"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Gamepad2,
  HelpCircle,
  Home,
  Layers3,
  LoaderCircle,
  LogOut,
  Pencil,
  Play,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { avatars } from "@/lib/avatars";
import {
  addPlayer,
  advance,
  publicRoom,
  settle,
  submitAnswer,
  validateQuestions,
} from "@/lib/engine";
import { AuthPortal } from "@/components/auth-portal";
import { authFetch } from "@/lib/firebase-client";
import type { PublicRoom, Question, Quiz, Room } from "@/lib/types";
async function api(data: Record<string, unknown>) {
  const r = await authFetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "ทำรายการไม่สำเร็จ");
  return d;
}
const shapes = ["▲", "◆", "●", "■"];
function Brand() {
  return (
    <a href="/" className="brand" aria-label="QuizPop หน้าหลัก">
      <span className="brand-mark">
        <Zap size={23} fill="currentColor" />
      </span>
      QuizPop<span className="brand-bang">!</span>
    </a>
  );
}
function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const nodes = Array.from(
          ref.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],input,textarea,select,[tabindex="0"]',
          ),
        );
        if (
          e.shiftKey &&
          (document.activeElement === nodes[0] ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          nodes.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
          e.preventDefault();
          nodes[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="ปิด">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function QuizArt({ quiz, large = false }: { quiz: Quiz; large?: boolean }) {
  return (
    <div className={"quiz-art " + quiz.theme + (large ? " large" : "")}>
      <i className="orbit one" />
      <i className="orbit two" />
      <span className="art-star a">✦</span>
      <span className="art-star b">✧</span>
      <span className="art-emoji">{quiz.emoji}</span>
      <span className="art-doodle">
        {quiz.theme === "world"
          ? "EXPLORE!"
          : quiz.theme === "space"
            ? "TO THE MOON"
            : quiz.theme === "food"
              ? "YUMMY!"
              : "LEVEL UP"}
      </span>
      <span className="art-squiggle">〰</span>
    </div>
  );
}
function QuizCard({ quiz, onClick }: { quiz: Quiz; onClick: () => void }) {
  return (
    <button className="quiz-card" onClick={onClick}>
      <div className="card-art">
        <QuizArt quiz={quiz} />
        <span className="question-badge">
          <Layers3 size={12} />
          {quiz.questions.length} คำถาม
        </span>
      </div>
      <div className="card-body">
        <span className={"category " + quiz.theme}>{quiz.category}</span>
        <h3>{quiz.title}</h3>
        <p>{quiz.description}</p>
        <div className="card-footer">
          <span>
            <Clock size={14} />
            {Math.ceil(
              quiz.questions.reduce((n, q) => n + q.seconds, 0) / 60,
            )}{" "}
            นาที
          </span>
          <span className="card-play">
            <Play size={15} fill="currentColor" />
          </span>
        </div>
      </div>
    </button>
  );
}
export default function App() {
  return (
    <AuthPortal
      renderRoom={(route, home) => (
        <GameScreen
          route={route}
          solo={null}
          setSolo={() => {}}
          onHome={home}
        />
      )}
    >
      <AdminApp />
    </AuthPortal>
  );
}
function AdminApp() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeRooms, setActiveRooms] = useState<
    {
      pin: string;
      title: string;
      phase: string;
      count: number;
      owned: boolean;
    }[]
  >([]);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const r = await authFetch("/api/game?lobbies=1");
        const d = await r.json();
        if (!stopped && d.rooms)
          setActiveRooms(d.rooms.filter((r: { owned: boolean }) => r.owned));
      } catch {}
      if (!stopped) timer = setTimeout(load, 5000);
    };
    void load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);
  const [route, setRoute] = useState<{ pin: string; role: string } | null>(
      null,
    ),
    [solo, setSolo] = useState<Room | null>(null),
    [custom, setCustom] = useState<Quiz[]>([]);
  const [view, setView] = useState("discover"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("ทั้งหมด");
  const [selected, setSelected] = useState<Quiz | null>(null),
    [editor, setEditor] = useState<Quiz | null>(null);
  const [joinOpen, setJoinOpen] = useState(false),
    [pin, setPin] = useState(""),
    [name, setName] = useState(""),
    [avatar, setAvatar] = useState(avatars[0]);
  const [help, setHelp] = useState(false),
    [setup, setSetup] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [configured, setConfigured] = useState(false);
  const closeSelected = useCallback(() => {
      setSelected(null);
      setError("");
    }, []),
    closeJoin = useCallback(() => {
      setJoinOpen(false);
      setError("");
    }, []);
  const closeEditor = useCallback(() => setEditor(null), []),
    closeHelp = useCallback(() => setHelp(false), []),
    closeSetup = useCallback(() => setSetup(false), []);
  useEffect(() => {
    const parse = () => {
      const p = new URLSearchParams(location.search),
        r = p.get("room"),
        j = p.get("join");
      setRoute(
        r && /^\d{6}$/.test(r)
          ? { pin: r, role: p.get("role") === "host" ? "host" : "player" }
          : null,
      );
      if (j && /^\d{6}$/.test(j)) {
        setPin(j);
        setJoinOpen(true);
      }
    };
    parse();
    window.addEventListener("popstate", parse);
    authFetch("/api/game?quizzes=1")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setCustom(d.quizzes);
        setQuizzes(d.catalog);
      })
      .catch((e) => setError(e.message));
    authFetch("/api/game?status=1")
      .then((r) => r.json())
      .then((d) => setConfigured(d.configured))
      .catch(() => {});
    return () => window.removeEventListener("popstate", parse);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  function enter(pin: string, role: string) {
    setSelected(null);
    setJoinOpen(false);
    setError("");
    history.pushState({}, "", `/admin?room=${pin}&role=${role}`);
    setRoute({ pin, role });
  }
  function home() {
    history.pushState({}, "", "/admin");
    setRoute(null);
    setSolo(null);
    setError("");
  }
  async function host(q: Quiz) {
    setBusy(true);
    setError("");
    try {
      const d = await api({
        action: "create",
        quizId: q.id,
        title: q.title,
        questions: q.questions,
      });
      enter(d.pin, "host");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await api({ action: "join", pin, name, avatar });
      enter(d.pin, "player");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function practice(q: Quiz) {
    const now = Date.now();
    const r: Room = {
      pin: "DEMO",
      title: q.title,
      hostHash: "demo",
      questions: structuredClone(q.questions),
      phase: "lobby",
      index: 0,
      startedAt: 0,
      createdAt: now,
      expiresAt: now + 21600000,
      players: {},
      answers: {},
    };
    addPlayer(r, "me", "demo", "คุณ", avatar, now);
    advance(r, now);
    setSolo(r);
    closeSelected();
  }
  function blank(): Quiz {
    return {
      id: "custom-" + crypto.randomUUID(),
      title: "",
      description: "ควิซที่สร้างด้วยความสนุก",
      category: "ควิซของฉัน",
      theme: "digital",
      emoji: "✨",
      questions: [
        { text: "", options: ["", "", "", ""], correct: 0, seconds: 20 },
      ],
    };
  }
  async function save(q: Quiz) {
    if (!q.title.trim()) throw new Error("ตั้งชื่อควิซก่อนบันทึกนะ");
    const cleaned = {
      ...q,
      title: q.title.trim(),
      questions: validateQuestions(q.questions),
    };
    const next = [...custom.filter((v) => v.id !== q.id), cleaned];
    await api({ action: "saveQuiz", quiz: cleaned });
    setCustom(next);
    setEditor(null);
    setSelected(cleaned);
    setToast("บันทึกควิซในฐานข้อมูลแล้ว");
  }
  async function remove(q: Quiz) {
    try {
      const next = custom.filter((v) => v.id !== q.id);
      await api({ action: "deleteQuiz", quiz: q });
      setCustom(next);
      setSelected(null);
      setToast("ลบควิซแล้ว");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const primaryQuiz =
    custom.find((q) => q.id === "custom-dear-boss-vocabulary") ||
    custom[0] ||
    quizzes[0];
  const visible = (
    view === "library" ? custom : [...custom, ...quizzes]
  ).filter(
    (q) =>
      (filter === "ทั้งหมด" || q.category === filter) &&
      (q.title + q.description + q.category)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (route || solo)
    return (
      <GameScreen route={route} solo={solo} setSolo={setSolo} onHome={home} />
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">LET’S MAKE IT FUN</div>
        <nav aria-label="เมนูหลัก">
          <button
            className={view === "discover" ? "nav-item active" : "nav-item"}
            onClick={() => {
              setView("discover");
              setFilter("ทั้งหมด");
            }}
          >
            <Home size={20} />
            ค้นพบควิซ
            <span className="nav-active-dot" />
          </button>
          <button
            className={view === "library" ? "nav-item active" : "nav-item"}
            onClick={() => {
              setView("library");
              setFilter("ทั้งหมด");
            }}
          >
            <BookOpen size={20} />
            ควิซของฉัน<span className="nav-count">{custom.length}</span>
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setPin("");
              setJoinOpen(true);
            }}
          >
            <Gamepad2 size={20} />
            เข้าร่วมเกม
          </button>
        </nav>
        <div className="sidebar-callout">
          <div className="callout-icon">
            <Sparkles size={24} />
          </div>
          <h3>ไอเดียคุณ เกมของคุณ</h3>
          <p>
            สร้างควิซในแบบที่ใช่
            <br />
            แล้วชวนทุกคนมาสนุกกัน
          </p>
          <button onClick={() => setEditor(blank())}>
            <Plus size={16} />
            สร้างควิซแรก
          </button>
          <span className="callout-star">✧</span>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setHelp(true)}>
            <HelpCircle size={19} />
            เริ่มต้นใช้งาน
          </button>
          <span className="sidebar-footnote">
            Made for curious minds. <span>✦</span>
          </span>
        </div>
      </aside>
      <main className="dashboard">
        <header className="topbar">
          <div>
            <span className="eyebrow">YOUR DAILY DOSE OF FUN</span>
            <p>
              พร้อมให้ความสนุกเริ่มต้นหรือยัง? <span>👋</span>
            </p>
          </div>
          <div className="top-actions">
            <button className="mode-tag" onClick={() => setSetup(true)}>
              <span
                className={configured ? "status-dot online" : "status-dot"}
              />
              {configured ? "พร้อมเปิดห้องออนไลน์" : "โหมดทดลอง"}
            </button>
            <button
              className="icon-button help-top"
              aria-label="วิธีเล่น"
              onClick={() => setHelp(true)}
            >
              <HelpCircle size={22} />
            </button>
            <div className="profile-avatar">😎</div>
          </div>
        </header>
        {error && !selected && !joinOpen && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {view === "discover" ? (
          <>
            <section className="hero">
              <div className="hero-text">
                <span className="hero-kicker">
                  <span />
                  TURN QUESTIONS INTO CONNECTIONS
                </span>
                <h1>
                  คำถามธรรมดา
                  <br />
                  ความสนุก
                  <span className="hero-underline">
                    ไม่ธรรมดา
                    <svg viewBox="0 0 270 16" preserveAspectRatio="none">
                      <path
                        d="M3 11Q130 -2 267 8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <span className="hero-exclamation">!</span>
                </h1>
                <p>
                  ชวนเพื่อนมาประลองไหวพริบ ตอบให้ไว เก็บแต้มให้ทัน
                  <br className="desktop-break" />
                  แล้วเปลี่ยนทุกช่วงเวลาให้เป็นเกมที่น่าจดจำ
                </p>
                <div className="hero-actions">
                  <button
                    className="button dark"
                    disabled={!primaryQuiz}
                    onClick={() => setSelected(primaryQuiz)}
                  >
                    <Play size={17} fill="currentColor" />
                    เริ่มจัดเกม
                  </button>
                  <button
                    className="hero-demo"
                    disabled={!primaryQuiz}
                    onClick={() => practice(primaryQuiz)}
                  >
                    ลองเล่นคนเดียว
                    <ArrowUpRight size={18} />
                  </button>
                </div>
                <div className="hero-note">
                  <span className="mini-avatars">
                    🦊<span>🐸</span>
                    <span>🐼</span>
                  </span>
                  <span>ห้องเรียนก็ได้ ปาร์ตี้ก็ดี สนุกได้ทุกคน</span>
                </div>
              </div>
              <div className="hero-visual" aria-hidden="true">
                <span className="visual-star star-top">✦</span>
                <span className="visual-star star-bottom">✦</span>
                <div className="float-tag">
                  <span>🔥</span> ตอบไว ได้แต้มเพิ่ม!
                </div>
                <div className="game-illustration">
                  <div className="illustration-top">
                    <span>QUIZ TIME!</span>
                    <span>01 / 10</span>
                  </div>
                  <div className="illustration-question">
                    พร้อมเป็น
                    <br />
                    <strong>แชมป์คนต่อไป?</strong>
                    <span>🤔</span>
                  </div>
                  <div className="illustration-options">
                    {shapes.map((s, i) => (
                      <div key={s} className={"choice-" + i}>
                        {s}
                        {i === 2 && <Check size={24} />}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="trophy-float">
                  🏆<span>YOU GOT THIS!</span>
                </div>
                <span className="visual-dash">〰</span>
              </div>
            </section>
            <section className="join-strip">
              <div className="join-intro">
                <span className="join-icon">
                  <Gamepad2 size={27} />
                </span>
                <div>
                  <h2>มีรหัสเกมแล้ว?</h2>
                  <p>เข้าห้อง แล้วเจอกันบนกระดานคะแนน</p>
                </div>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setJoinOpen(true);
                  setError("");
                }}
              >
                <label className="sr-only" htmlFor="quick-pin">
                  รหัสห้อง 6 หลัก
                </label>
                <input
                  id="quick-pin"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="ใส่รหัสเกม 6 หลัก"
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  pattern="[0-9]{6}"
                  required
                />
                <button className="button primary" type="submit">
                  เข้าร่วมเกม
                </button>
              </form>
            </section>
          </>
        ) : (
          <section className="library-hero">
            <span className="eyebrow">YOUR IDEAS, YOUR QUIZZES</span>
            <h1>
              คลังความสนุกของคุณ <span>✦</span>
            </h1>
            <p>ควิซที่บันทึกไว้ในฐานข้อมูล พร้อมเปิดเกมได้ทุกเมื่อ</p>
            <button
              className="button primary"
              onClick={() => setEditor(blank())}
            >
              <Plus size={18} />
              สร้างควิซใหม่
            </button>
          </section>
        )}
        {activeRooms.length > 0 && (
          <section className="admin-rooms">
            <div className="section-title">
              <Users size={19} />
              <h2>ห้องสอบที่คุณเปิดไว้</h2>
            </div>
            <div>
              {activeRooms.map((r) => (
                <button key={r.pin} onClick={() => enter(r.pin, "host")}>
                  <span>
                    <strong>{r.title}</strong>
                    <small>
                      PIN {r.pin} · {r.count} คน ·{" "}
                      {r.phase === "lobby"
                        ? "รอเริ่มสอบ"
                        : r.phase === "finished"
                          ? "จบแล้ว"
                          : "กำลังสอบ"}
                    </small>
                  </span>
                  <Play size={18} />
                </button>
              ))}
            </div>
          </section>
        )}
        <section className="quiz-section">
          <div className="section-heading">
            <div>
              <div className="section-title">
                <span>{view === "library" ? "📚" : "✨"}</span>
                <h2>
                  {view === "library" ? "ควิซที่คุณสร้าง" : "หยิบควิซที่ใช่ แล้วไปสนุกกัน"}
                </h2>
              </div>
              <p>
                {view === "library"
                  ? "เพิ่ม แก้ไข และนำควิซไปใช้จัดเกม"
                  : "เลือกจากควิซพร้อมเล่น หรือปล่อยไอเดียสร้างควิซของคุณเอง"}
              </p>
            </div>
            <button
              className="button white create-top"
              onClick={() => setEditor(blank())}
            >
              <Plus size={17} />
              สร้างควิซ
            </button>
          </div>
          <div className="filter-bar">
            <div className="filters">
              {["ทั้งหมด", "ความรู้ทั่วไป", "วิทยาศาสตร์", "ไลฟ์สไตล์", "เทคโนโลยี"].map(
                (f) => (
                  <button
                    className={filter === f ? "filter active" : "filter"}
                    onClick={() => setFilter(f)}
                    key={f}
                  >
                    {f}
                  </button>
                ),
              )}
            </div>
            <label className="search-field">
              <Search size={17} />
              <input
                aria-label="ค้นหาควิซ"
                placeholder="ค้นหาควิซ..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <div className="quiz-grid">
            {visible.map((q) => (
              <QuizCard
                key={q.id}
                quiz={q}
                onClick={() => {
                  setSelected(q);
                  setError("");
                }}
              />
            ))}
          </div>
          {!visible.length && (
            <div className="empty-state">
              <BookOpen size={40} />
              <h3>{query ? "ยังไม่เจอควิซที่ค้นหา" : "พื้นที่สำหรับไอเดียใหม่ของคุณ"}</h3>
              <p>
                {query
                  ? "ลองเปลี่ยนคำค้นหาหรือหมวดหมู่"
                  : "เริ่มจากคำถามแรก แล้วสร้างความสนุกในแบบคุณ"}
              </p>
              <button
                className="button primary"
                onClick={() => (query ? setQuery("") : setEditor(blank()))}
              >
                {query ? "ล้างคำค้นหา" : "สร้างควิซแรก"}
              </button>
            </div>
          )}
        </section>
        <section className="bottom-banner">
          <span className="banner-sparkle">✳</span>
          <p>
            <strong>ทุกคนมีด้านที่รู้เยอะกว่าที่คิด</strong>
            <span>ถึงเวลาให้เพื่อน ๆ ได้เห็นแล้ว!</span>
          </p>
          <button onClick={() => setEditor(blank())}>
            สร้างควิซของคุณ
            <Plus size={18} />
          </button>
        </section>
        <footer className="footer">
          <span>QuizPop! · ความรู้คู่ความสนุก</span>
          <span>
            เล่นด้วยกัน เรียนรู้ไปด้วยกัน <span className="purple">✦</span>
          </span>
        </footer>
      </main>
      <button
        className="mobile-create"
        onClick={() => setEditor(blank())}
        aria-label="สร้างควิซ"
      >
        <Plus size={24} />
      </button>

      {selected && (
        <Modal title="พร้อมเปิดความสนุก?" onClose={closeSelected}>
          <QuizArt quiz={selected} large />
          <div className="detail-info">
            <span className={"category " + selected.theme}>
              {selected.category}
            </span>
            <h2>{selected.title}</h2>
            <p>{selected.description}</p>
            <div className="detail-meta">
              <span>
                <Layers3 size={17} />
                {selected.questions.length} คำถาม
              </span>
              <span>
                <Users size={17} />
                สูงสุด 50 คน
              </span>
            </div>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              className="button primary full"
              disabled={busy}
              onClick={() => host(selected)}
            >
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <Users size={18} />
              )}
              เปิดห้องเล่นกับเพื่อน
            </button>
            <button
              className="button soft full"
              onClick={() => practice(selected)}
            >
              <Play size={17} />
              ทดลองเล่นคนเดียว
            </button>
          </div>
          <details className="question-preview">
            <summary>
              ดูคำถามในควิซนี้
              <ChevronDown size={17} />
            </summary>
            <ol>
              {selected.questions.map((q, i) => (
                <li key={i}>{q.text}</li>
              ))}
            </ol>
          </details>
          {selected.id.startsWith("custom-") && (
            <div className="custom-actions">
              <button
                onClick={() => {
                  setEditor(structuredClone(selected));
                  setSelected(null);
                }}
              >
                <Settings2 size={16} />
                แก้ไขควิซ
              </button>
              <button onClick={() => remove(selected)}>
                <Trash2 size={16} />
                ลบควิซ
              </button>
            </div>
          )}
        </Modal>
      )}
      {joinOpen && (
        <Modal title="เข้าร่วมความสนุก" onClose={closeJoin}>
          <div className="join-modal-icon">🎮</div>
          <p className="modal-subtitle">ใส่รหัสจากโฮสต์ แล้วเลือกตัวตนของคุณ</p>
          <form onSubmit={join} className="join-form">
            <label>
              รหัสเกม
              <input
                inputMode="numeric"
                pattern="[0-9]{6}"
                required
                placeholder="000000"
                maxLength={6}
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="pin-input"
              />
            </label>
            <label>
              ชื่อเล่น
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เพื่อน ๆ เรียกคุณว่าอะไร?"
                required
                maxLength={20}
              />
            </label>
            <fieldset>
              <legend>เลือกเพื่อนคู่ใจ</legend>
              <div className="avatar-picker">
                {avatars.map((a) => (
                  <button
                    type="button"
                    aria-label={"เลือก " + a}
                    aria-pressed={avatar === a}
                    className={avatar === a ? "selected" : ""}
                    onClick={() => setAvatar(a)}
                    key={a}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </fieldset>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary full"
              disabled={busy}
              type="submit"
            >
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <Zap size={18} />
              )}
              ไปสนุกกัน!
            </button>
          </form>
        </Modal>
      )}
      {editor && (
        <QuizEditor initial={editor} onClose={closeEditor} onSave={save} />
      )}
      {help && (
        <Modal title="ความสนุกเริ่มง่าย ๆ" onClose={closeHelp}>
          <div className="help-steps">
            {[
              {
                icon: "🎯",
                title: "เลือกควิซที่ชอบ",
                text: "เลือกชุดคำถามสำเร็จรูป หรือสร้างคำถาม 4 ตัวเลือกของคุณเอง",
              },
              {
                icon: "🎮",
                title: "เปิดห้องแล้วชวนเพื่อน",
                text: "โฮสต์แชร์รหัส 6 หลัก ผู้เล่นเข้าห้องด้วยชื่อเล่น ไม่ต้องสมัครสมาชิก",
              },
              {
                icon: "⚡",
                title: "ตอบไว เก็บแต้มให้ทัน",
                text: "คำตอบถูกได้ 500–1,000 คะแนน ยิ่งตอบเร็ว คะแนนยิ่งมาก โฮสต์กดไปข้อถัดไปหลังเฉลย",
              },
            ].map((s) => (
              <div key={s.title}>
                <span>{s.icon}</span>
                <section>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </section>
              </div>
            ))}
          </div>
          <p className="info-note">
            ทดลองเล่นคนเดียวได้ทันที ห้องออนไลน์ต้องเชื่อมฐานข้อมูลก่อน
            ควิซที่สร้างจะบันทึกในฐานข้อมูลสำหรับผู้ดูแล
          </p>
          <button className="button primary full" onClick={closeHelp}>
            เข้าใจแล้ว ไปเล่นกัน
          </button>
        </Modal>
      )}
      {setup && (
        <Modal
          title={configured ? "พร้อมสำหรับความสนุกออนไลน์" : "เปิดโหมดเล่นกับเพื่อน"}
          onClose={closeSetup}
        >
          <div className="join-modal-icon">{configured ? "🚀" : "🔌"}</div>
          <p className="modal-subtitle">
            {configured
              ? "ตั้งค่าการเชื่อมต่อฐานข้อมูลแล้ว ลองเปิดห้องเพื่อเริ่มเล่นกับเพื่อน"
              : "ตอนนี้คุณทดลองเล่นคนเดียวและสร้างควิซได้แล้ว การเปิดห้องออนไลน์ต้องเชื่อม Firebase ของเจ้าของเว็บก่อน"}
          </p>
          <p className="info-note">
            สำหรับเจ้าของเว็บ: มีขั้นตอนเชื่อม Firebase และ deploy บน Vercel ในไฟล์
            README ที่มาพร้อมโปรเจกต์
          </p>
          <button className="button primary full" onClick={closeSetup}>
            เข้าใจแล้ว
          </button>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
        </div>
      )}
    </div>
  );
}
function QuizEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: Quiz;
  onClose: () => void;
  onSave: (q: Quiz) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState(initial),
    [index, setIndex] = useState(0),
    [error, setError] = useState("");
  const q = quiz.questions[index];
  function update(p: Partial<Question>) {
    setQuiz((v) => ({
      ...v,
      questions: v.questions.map((q, i) => (i === index ? { ...q, ...p } : q)),
    }));
  }
  function remove() {
    if (quiz.questions.length <= 1) return;
    setQuiz((v) => ({
      ...v,
      questions: v.questions.filter((_, i) => i !== index),
    }));
    setIndex(Math.max(0, index - 1));
  }
  return (
    <Modal title="สร้างควิซของคุณ" onClose={onClose} wide>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await onSave(quiz);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="editor-meta">
          <label>
            ชื่อควิซ
            <input
              placeholder="ตั้งชื่อให้ควิซนี้กัน"
              required
              maxLength={100}
              value={quiz.title}
              onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
            />
          </label>
          <label>
            คำอธิบาย
            <input
              placeholder="ควิซนี้เกี่ยวกับอะไร?"
              maxLength={150}
              value={quiz.description}
              onChange={(e) =>
                setQuiz({ ...quiz, description: e.target.value })
              }
            />
          </label>
        </div>
        <div className="editor-body">
          <aside className="question-tabs">
            {quiz.questions.map((_, i) => (
              <button
                type="button"
                className={i === index ? "active" : ""}
                key={i}
                onClick={() => setIndex(i)}
              >
                ข้อ {i + 1}
              </button>
            ))}
            <button
              type="button"
              disabled={quiz.questions.length >= 30}
              onClick={() => {
                setQuiz({
                  ...quiz,
                  questions: [
                    ...quiz.questions,
                    {
                      text: "",
                      options: ["", "", "", ""],
                      correct: 0,
                      seconds: 20,
                    },
                  ],
                });
                setIndex(quiz.questions.length);
              }}
            >
              <Plus size={16} />
              เพิ่มข้อ
            </button>
          </aside>
          <section className="question-edit">
            <div className="question-edit-header">
              <h3>คำถามข้อ {index + 1}</h3>
              <button
                className="icon-button danger"
                type="button"
                aria-label="ลบคำถาม"
                disabled={quiz.questions.length === 1}
                onClick={remove}
              >
                <Trash2 size={17} />
              </button>
            </div>
            <label>
              โจทย์
              <textarea
                rows={3}
                placeholder="พิมพ์คำถามที่นี่..."
                maxLength={240}
                value={q.text}
                onChange={(e) => update({ text: e.target.value })}
              />
            </label>
            <fieldset className="answer-editor">
              <legend>
                ตัวเลือกคำตอบ <span>· เลือกวงกลมหน้าข้อที่ถูก</span>
              </legend>
              {q.options.map((o, i) => (
                <div key={i} className={"answer-edit choice-" + i}>
                  <input
                    type="radio"
                    name="correct"
                    checked={q.correct === i}
                    onChange={() => update({ correct: i })}
                    aria-label={"ตั้งข้อ " + (i + 1) + " เป็นเฉลย"}
                  />
                  <span>{shapes[i]}</span>
                  <input
                    aria-label={"ตัวเลือก " + (i + 1)}
                    placeholder={"คำตอบ " + (i + 1)}
                    maxLength={100}
                    value={o}
                    onChange={(e) =>
                      update({
                        options: q.options.map((a, j) =>
                          j === i ? e.target.value : a,
                        ),
                      })
                    }
                  />
                </div>
              ))}
            </fieldset>
            <label className="timer-select">
              <Clock size={16} />
              เวลาตอบ
              <select
                value={q.seconds}
                onChange={(e) => update({ seconds: Number(e.target.value) })}
              >
                {[10, 15, 20, 30, 45, 60].map((s) => (
                  <option value={s} key={s}>
                    {s} วินาที
                  </option>
                ))}
              </select>
            </label>
          </section>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-footer">
          <p>
            <Layers3 size={16} />
            {quiz.questions.length} / 30 คำถาม · บันทึกในฐานข้อมูล
          </p>
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Check size={18} />
            )}
            บันทึกควิซ
          </button>
        </div>
      </form>
    </Modal>
  );
}

function GameScreen({
  route,
  solo,
  setSolo,
  onHome,
}: {
  route: { pin: string; role: string } | null;
  solo: Room | null;
  setSolo: React.Dispatch<React.SetStateAction<Room | null>>;
  onHome: () => void;
}) {
  const [room, setRoom] = useState<PublicRoom | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [time, setTime] = useState(Date.now()),
    [offset, setOffset] = useState(0),
    [copied, setCopied] = useState(false),
    [confirmEnd, setConfirmEnd] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const closeRename = useCallback(() => setRenameOpen(false), []);
  const refresh = useRef<() => Promise<void>>(async () => {});
  const closeEnd = useCallback(() => setConfirmEnd(false), []);
  useEffect(() => {
    if (solo) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    let requestVersion = 0;
    const load = async () => {
      const version = ++requestVersion;
      try {
        const res = await authFetch(
          `/api/game?pin=${route?.pin}&role=${route?.role}`,
          { cache: "no-store", signal: controller.signal },
        );
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "เชื่อมต่อไม่ได้");
        if (!stopped && version === requestVersion) {
          setRoom(d);
          setOffset(d.serverNow - Date.now());
          setError("");
        }
      } catch (e) {
        if (!stopped && version === requestVersion)
          setError((e as Error).message);
      }
    };
    refresh.current = load;
    const poll = async () => {
      if (!document.hidden) await load();
      if (!stopped) timer = setTimeout(poll, 1500);
    };
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [route?.pin, route?.role, solo]);
  useEffect(() => {
    const id = setInterval(() => setTime(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (
      solo?.phase === "question" &&
      time >= solo.startedAt + solo.questions[solo.index].seconds * 1000
    )
      setSolo((v) => (v ? settle(structuredClone(v), Date.now()) : v));
  }, [time, solo, setSolo]);
  const current = solo
    ? publicRoom(structuredClone(solo), false, "me", time)
    : room;
  async function action(
    action: string,
    extra: Record<string, unknown> = {},
    reportError: (message: string) => void = setError,
  ) {
    setBusy(true);
    setError("");
    try {
      if (solo) {
        const n = structuredClone(solo);
        if (action === "advance") advance(n, Date.now());
        else if (action === "answer")
          submitAnswer(n, "me", extra.choice, n.index, Date.now());
        else if (action === "end") n.phase = "finished";
        setSolo(n);
      } else {
        await api({
          action,
          pin: route?.pin,
          role: route?.role,
          index: current?.index,
          phase: current?.phase,
          ...extra,
        });
        if (action !== "leave") await refresh.current();
      }
      return true;
    } catch (e) {
      reportError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function leave() {
    if (await action("leave")) onHome();
  }
  function editName() {
    setNameDraft(
      current?.players.find((p) => p.id === current.playerId)?.name || "",
    );
    setNameError("");
    setRenameOpen(true);
  }
  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setNameError("");
    if (await action("rename", { name: nameDraft }, setNameError))
      setRenameOpen(false);
  }
  async function invite() {
    try {
      await navigator.clipboard.writeText(
        location.origin + "/?join=" + current?.pin,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("คัดลอกไม่ได้ กรุณาแชร์รหัสห้องที่แสดงให้เพื่อน");
    }
  }
  function exportScores() {
    if (!current) return;
    const csv =
      "\uFEFFอันดับ,ชื่อ,คะแนน\n" +
      current.players
        .map(
          (p, i) =>
            `${i + 1},"${p.name.replace(/"/g, '""').replace(/^[=+@-]/, "'")}",${p.score}`,
        )
        .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "quizpop-scores.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  if (!current)
    return (
      <div className="game-shell">
        <header className="game-header">
          <Brand />
          <button className="button white" onClick={onHome}>
            <Home size={18} />
            กลับหน้าหลัก
          </button>
        </header>
        <div className="game-loading">
          {error ? (
            <>
              <HelpCircle size={45} />
              <h2>ยังเข้าห้องไม่ได้</h2>
              <p role="alert">{error}</p>
              <button className="button primary" onClick={onHome}>
                กลับไปเข้าร่วมใหม่
              </button>
            </>
          ) : (
            <>
              <LoaderCircle className="spin" size={40} />
              <h2>กำลังเข้าห้อง...</h2>
            </>
          )}
        </div>
      </div>
    );
  const q = current.question,
    isHost = current.isHost,
    control = isHost || !!solo;
  const remaining = Math.max(
      0,
      Math.ceil((current.deadline - (time + offset)) / 1000),
    ),
    revealed = current.phase === "reveal" || current.phase === "finished";
  const me = current.players.find((p) => p.id === current.playerId);
  return (
    <div className="game-shell">
      <header className="game-header">
        <Brand />
        <div className="game-header-center">
          <span className="live-badge">
            {solo ? "โหมดทดลองคนเดียว" : "LIVE QUIZ"}
          </span>
          <span>{current.title}</span>
        </div>
        <button
          className="icon-button"
          disabled={busy}
          onClick={() => {
            if (current.phase === "lobby" && !isHost && !solo) void leave();
            else setConfirmEnd(true);
          }}
          aria-label={
            current.phase === "lobby" && !isHost ? "ออกจากห้องรอ" : "ออกจากเกม"
          }
        >
          <LogOut size={21} />
        </button>
      </header>
      {error && (
        <div className="game-error" role="alert">
          {error}
          <button
            onClick={() => {
              setError("");
              void refresh.current();
            }}
          >
            ลองอีกครั้ง
          </button>
        </div>
      )}
      {current.phase === "lobby" ? (
        <main className="lobby">
          <div className="lobby-kicker">
            <Sparkles size={18} />
            ห้องพร้อมแล้ว ความสนุกกำลังมา
          </div>
          <h1>{isHost ? "ชวนเพื่อนมาให้พร้อม!" : "คุณเข้าห้องแล้ว!"}</h1>
          <p>เข้าเว็บนี้ แล้วกรอกรหัสเกมด้านล่าง</p>
          <div className="pin-display">
            <span>GAME PIN</span>
            <strong>
              {current.pin.slice(0, 3)} {current.pin.slice(3)}
            </strong>
            <button onClick={invite}>
              <Copy size={17} />
              {copied ? "คัดลอกลิงก์แล้ว" : "คัดลอกลิงก์ชวนเพื่อน"}
            </button>
          </div>
          {!isHost && !solo && me && (
            <div className="lobby-profile">
              <span className="lobby-profile-avatar">{me.avatar}</span>
              <div>
                <small>ชื่อของคุณในห้องนี้</small>
                <strong>{me.name}</strong>
              </div>
              <button
                className="button white"
                disabled={busy}
                onClick={editName}
              >
                <Pencil size={16} />
                เปลี่ยนชื่อ
              </button>
            </div>
          )}
          <div className="lobby-players-heading">
            <h2>
              <Users size={20} />
              {current.players.length} คนพร้อมเล่น
            </h2>
            <span>สูงสุด 50 คน</span>
          </div>
          <div className="player-cloud">
            {current.players.map((p) => (
              <div className="player-chip" key={p.id}>
                <span>{p.avatar}</span>
                {p.name}
                {p.id === current.playerId && <small>คุณ</small>}
              </div>
            ))}
            {!current.players.length && (
              <div className="waiting-players">
                <span>🦊</span>
                <span>🐸</span>
                <span>🐼</span>
                <p>รอเพื่อนคนแรกเข้าห้อง...</p>
              </div>
            )}
          </div>
          {isHost ? (
            <button
              className="button primary start-game"
              disabled={busy || !current.players.length}
              onClick={() => action("advance")}
            >
              <Play size={20} fill="currentColor" />
              เริ่มเกมเลย
            </button>
          ) : (
            <div className="lobby-waiting-actions">
              <div className="waiting-host">
                <LoaderCircle className="spin" size={19} />
                รอโฮสต์เริ่มเกม เตรียมตัวให้พร้อมนะ
              </div>
              <button
                className="button leave-lobby-button"
                disabled={busy}
                onClick={leave}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <LogOut size={18} />
                )}
                ออกจากห้องรอ
              </button>
              <p>ออกแล้วชื่อของคุณจะถูกนำออกจากรายชื่อผู้สอบ</p>
            </div>
          )}
        </main>
      ) : current.phase === "finished" ? (
        <main className="results">
          <div className="result-confetti" aria-hidden="true">
            ✦ · ✧ · ✦
          </div>
          <span className="result-trophy">🏆</span>
          <span className="eyebrow">THAT WAS AWESOME!</span>
          <h1>{solo ? "เก่งมาก เล่นจบแล้ว!" : "แชมป์ของเกมนี้คือ..."}</h1>
          <p>
            {current.title} · {current.total} คำถาม
          </p>
          <div className="podium">
            {[1, 0, 2]
              .filter((i) => current.players[i])
              .map((i) => (
                <div
                  className={"podium-player rank-" + i}
                  key={current.players[i].id}
                >
                  <span className="podium-avatar">
                    {current.players[i].avatar}
                  </span>
                  <strong>{current.players[i].name}</strong>
                  <span>{current.players[i].score.toLocaleString()} คะแนน</span>
                  <div className="podium-block">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                    <b>{i + 1}</b>
                  </div>
                </div>
              ))}
          </div>
          <div className="results-table">
            <h2>กระดานคะแนน</h2>
            {current.players.map((p, i) => (
              <div
                className={p.id === current.playerId ? "my-row" : ""}
                key={p.id}
              >
                <span className="rank-number">{i + 1}</span>
                <span className="score-avatar">{p.avatar}</span>
                <strong>
                  {p.name}
                  {p.id === current.playerId && <small>คุณ</small>}
                </strong>
                <b>
                  {p.score.toLocaleString()}
                  <small>คะแนน</small>
                </b>
              </div>
            ))}
          </div>
          <div className="results-actions">
            <button className="button primary" onClick={onHome}>
              <Home size={18} />
              เลือกควิซใหม่
            </button>
            {control && (
              <button className="button white" onClick={exportScores}>
                <Download size={18} />
                ดาวน์โหลดคะแนน
              </button>
            )}
          </div>
        </main>
      ) : (
        <main className="play-area">
          <div className="play-topline">
            <span>
              คำถาม <strong>{current.index + 1}</strong> / {current.total}
            </span>
            <div className="question-progress">
              {Array.from({ length: current.total }, (_, i) => (
                <i key={i} className={i <= current.index ? "done" : ""} />
              ))}
            </div>
            <span>
              {solo
                ? "ฝึกความไวกัน!"
                : isHost
                  ? `ตอบแล้ว ${current.answered} / ${current.players.length}`
                  : `${me?.avatar} ${me?.name}`}
            </span>
          </div>
          <div className="question-stage">
            <div
              className={
                "timer-circle " + (remaining <= 5 && !revealed ? "urgent" : "")
              }
            >
              {revealed ? <Check size={32} /> : remaining}
              <small>{revealed ? "เฉลย" : "วินาที"}</small>
            </div>
            <h1>{q?.text}</h1>
            <span className="question-stage-decor" aria-hidden="true">
              ✦
            </span>
          </div>
          {current.phase === "question" && current.hasAnswered && !isHost ? (
            <div className="answer-submitted">
              <span>🙌</span>
              <h2>ส่งคำตอบแล้ว!</h2>
              <p>รอลุ้นคะแนนพร้อมเพื่อน ๆ หลังเฉลย</p>
              <LoaderCircle className="spin" size={24} />
            </div>
          ) : (
            <div className={"answer-grid " + (revealed ? "revealed" : "")}>
              {q?.options.map((o, i) => (
                <button
                  key={i}
                  disabled={
                    revealed ||
                    isHost ||
                    busy ||
                    current.hasAnswered ||
                    remaining === 0
                  }
                  className={
                    "answer-tile choice-" +
                    i +
                    (revealed && q.correct === i ? " correct" : "") +
                    (revealed && q.correct !== i ? " incorrect" : "")
                  }
                  onClick={() => action("answer", { choice: i })}
                >
                  <span className="answer-shape">{shapes[i]}</span>
                  <strong>
                    <span className="option-letter">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {o}
                  </strong>
                  {revealed && (
                    <span className="answer-count">
                      {current.distribution[i]} คน{" "}
                      {q.correct === i && <CheckCircle2 size={25} />}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {revealed && (
            <div className="reveal-bottom">
              {!isHost && (
                <div
                  className={
                    "answer-feedback " +
                    (current.myAnswer?.correct ? "good" : "")
                  }
                >
                  <span>
                    {current.myAnswer?.correct
                      ? "🎉"
                      : current.myAnswer
                        ? "💪"
                        : "⏰"}
                  </span>
                  <div>
                    <strong>
                      {current.myAnswer?.correct
                        ? "ถูกต้อง เยี่ยมไปเลย!"
                        : current.myAnswer
                          ? "อีกนิดเดียว ลุยข้อต่อไป!"
                          : "หมดเวลาตอบแล้ว"}
                    </strong>
                    <p>
                      {current.myAnswer?.correct
                        ? `+${current.myAnswer.points.toLocaleString()} คะแนน`
                        : `คำตอบที่ถูก: ${q?.options[q.correct ?? 0]}`}
                    </p>
                  </div>
                </div>
              )}
              <div className="mini-leaderboard">
                <Trophy size={20} />
                {current.players.slice(0, 3).map((p, i) => (
                  <span key={p.id}>
                    {i + 1}. {p.avatar} {p.name}
                    <b>{p.score.toLocaleString()}</b>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="play-footer">
            <div className="play-player-tools">
              <span>
                {isHost
                  ? "หน้าจอโฮสต์ · แชร์จอนี้ให้ผู้เล่น"
                  : `คะแนนของคุณ ${me?.score.toLocaleString() || 0}`}
              </span>
              {!isHost && !solo && me && (
                <button
                  className="button white rename-game-button"
                  disabled={busy}
                  onClick={editName}
                >
                  <Pencil size={15} />
                  เปลี่ยนชื่อ
                </button>
              )}
            </div>
            {control ? (
              <button
                className="button primary"
                disabled={busy}
                onClick={() => action("advance")}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <Play size={18} />
                )}{" "}
                {current.phase === "question"
                  ? "เฉลยคำตอบ"
                  : current.index + 1 === current.total
                    ? "ดูผลคะแนน"
                    : "คำถามถัดไป"}
              </button>
            ) : (
              <span className="muted">
                {revealed
                  ? "รอโฮสต์ไปข้อต่อไป"
                  : remaining === 0
                    ? "กำลังเฉลยคำตอบ..."
                    : "ตอบถูกและไว ยิ่งได้แต้ม!"}
              </span>
            )}
          </div>
        </main>
      )}
      {renameOpen && (
        <Modal title="เปลี่ยนชื่อเล่น" onClose={closeRename}>
          <p className="modal-subtitle">
            ชื่อใหม่จะแสดงในห้องและบนกระดานคะแนนของทุกคน คะแนนเดิมยังอยู่ครบ
          </p>
          <form className="rename-player-form" onSubmit={saveName}>
            <label htmlFor="player-nickname">
              ชื่อเล่นใหม่
              <input
                id="player-nickname"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="ชื่อที่อยากให้เพื่อน ๆ เรียก"
                maxLength={20}
                required
                autoComplete="off"
              />
            </label>
            <span className="nickname-counter">
              {nameDraft.trim().length}/20 ตัวอักษร
            </span>
            {nameError && (
              <p className="error" role="alert">
                {nameError}
              </p>
            )}
            <div className="modal-actions">
              <button
                className="button primary full"
                disabled={busy || !nameDraft.trim()}
                type="submit"
              >
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <Check size={18} />
                )}
                บันทึกชื่อ
              </button>
              <button
                className="button soft full"
                type="button"
                onClick={closeRename}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </Modal>
      )}
      {confirmEnd && (
        <Modal title="ออกจากเกมนี้?" onClose={closeEnd}>
          <p className="modal-subtitle">
            {isHost
              ? "จบเกมให้ทุกคนดูคะแนน หรือกลับหน้าหลักแล้วปล่อยให้ห้องเปิดอยู่"
              : "คุณยังกลับห้องเดิมได้ด้วยลิงก์นี้จนกว่าห้องจะหมดอายุ"}
          </p>
          <div className="modal-actions">
            {isHost && current.phase !== "finished" && (
              <button
                className="button primary full"
                disabled={busy}
                onClick={async () => {
                  if (await action("end")) setConfirmEnd(false);
                }}
              >
                จบเกมและดูคะแนน
              </button>
            )}
            <button className="button white full" onClick={onHome}>
              กลับหน้าหลัก
            </button>
            <button className="button soft full" onClick={closeEnd}>
              เล่นต่อ
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
