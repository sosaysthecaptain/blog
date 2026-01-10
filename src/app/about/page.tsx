import Link from "next/link";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[--background]">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/"
          className="text-[--muted] hover:text-[--accent] text-sm"
        >
          ← back
        </Link>

        <article className="mt-8">
          <header className="mb-8 pb-4 border-b border-[--border]">
            <h1 className="text-2xl font-bold text-[--foreground]">About</h1>
          </header>

          <div className="prose-terminal font-serif">

            <p className="text-[--foreground] text-base my-4 leading-relaxed">
              Marc builds hardware and software, specializing in 3D printing. He does application software, robotics, machine design, firmware, electronics, CAD, and manufacturing. He is occasionally available for consulting and freelance work. He can be reached at marc g auger [at] gmail dot com.
            </p>
            <p className="text-[--foreground] text-base my-4 leading-relaxed">
              He is cofounder and CTO at <a href="https://tickerbot.io" target="_blank" rel="noopener noreferrer" className="text-[--accent] hover:underline">Tickerbot</a>, was previously the first engineering hire at <a href="https://bubble.io" target="_blank" rel="noopener noreferrer" className="text-[--accent] hover:underline">Bubble</a>, and studied music at the University of Chicago.
            </p>
          </div>
        </article>

        <Footer />
      </main>
    </div>
  );
}
