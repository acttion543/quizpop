import type { Metadata } from "next";
import "./globals.css";
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
      <body>{children}</body>
    </html>
  );
}
