import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyMate AI — Learn with clarity",
  description: "Your personal AI study partner. Understand concepts, practice problems, and build confidence.",
  applicationName: "StudyMate AI"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
