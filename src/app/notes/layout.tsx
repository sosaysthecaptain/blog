import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dirigible",
  description: "Personal notes and music library",
  icons: {
    icon: "/favicon-notes.svg",
  },
};

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
