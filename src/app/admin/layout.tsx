import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin - Marc Auger",
  description: "Blog admin panel",
  icons: {
    icon: "/favicon-admin.svg",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
