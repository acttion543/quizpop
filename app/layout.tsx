import type { Metadata } from "next";
import { GameAudioProvider } from "@/components/game-audio-provider";
import "./globals.css";
import "./game-ux.css";
import "./login-help.css";
import "./game-audio.css";
export const metadata: Metadata = {
  title: "QuizPop! — เล่น เรียนรู้ ลุ้นไปด้วยกัน",
  description: "เปลี่ยนทุกคำถามเป็นความสนุก สร้างห้องควิซ ชวนเพื่อน และแข่งกันแบบสด ๆ",
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body><GameAudioProvider>{children}</GameAudioProvider></body>
    </html>
  );
}
