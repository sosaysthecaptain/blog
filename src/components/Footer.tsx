import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 pt-8 pb-8 border-t border-[--border]">
      <div className="flex flex-col items-center gap-1.5 text-[--muted]">
        <div className="flex items-center gap-2 text-xs">
          <a href="mailto:contact@marcauger.com" className="hover:text-[--foreground] transition-colors">
            contact
          </a>
          <span>·</span>
          <Link href="/" className="hover:text-[--foreground] transition-colors">
            home
          </Link>
        </div>
        <p className="text-xs">© 2025 Marc Auger</p>
      </div>
    </footer>
  );
}
