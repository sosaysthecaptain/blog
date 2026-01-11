import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notes - Marc Auger",
  description: "Personal notes",
};

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
