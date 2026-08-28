import { ExampleCounter } from "@/components/example-counter";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-8 py-24">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
            Agentic Workflows Hackathon
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            laundry3
          </h1>
          <p className="max-w-md text-zinc-600 dark:text-zinc-400">
            Project infrastructure is ready: Next.js App Router, TypeScript, Tailwind CSS v4, and
            MobX are wired up. Replace this page with the real product.
          </p>
        </div>
        <ExampleCounter />
      </main>
    </div>
  );
}
