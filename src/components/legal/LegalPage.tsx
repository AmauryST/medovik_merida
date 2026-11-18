import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export function Pending({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-rosa-suave px-1 text-cacao">[{children}]</mark>;
}

export function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="m-0 text-xl font-bold sm:text-2xl text-cacao">
        <span className="mr-2 text-rosa">{String(n).padStart(2, "0")}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-base leading-relaxed font-light text-cacao-suave [&_li]:mt-1.5 [&_strong]:font-bold [&_strong]:text-cacao [&_ul]:m-0 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

interface LegalPageProps {
  title: ReactNode;
  updated: string;
  children: ReactNode;
}

export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-crema">
      <Navbar />

      <main className="mx-auto max-w-[760px] px-5 pt-12 pb-20 sm:px-8">
        <p className="m-0 text-xs font-bold uppercase tracking-widest text-rosa">Legal</p>
        <h1 className="mt-3 mb-0 text-3xl font-extrabold sm:text-4xl text-cacao leading-tight">{title}</h1>
        <p className="mt-3 mb-0 text-sm text-cacao-tenue">Última actualización: {updated}</p>
        {children}
      </main>

      <Footer />
    </div>
  );
}
