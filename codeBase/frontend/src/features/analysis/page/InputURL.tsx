import { useState } from "react";

const InputURL = () => {
  const [repoInput, setRepoInput] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!repoInput.trim()) return;
    console.log("Analyzing repo:", repoInput.trim());
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12 text-slate-100">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-[0_30px_80px_rgba(15,23,42,0.8)] backdrop-blur-xl">
        <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
          <section className="border-b border-white/10 bg-slate-950/60 p-8 md:border-b-0 md:border-r md:p-12">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium tracking-[0.2em] text-cyan-300 uppercase">
              Codebase intelligence
            </div>

            <h1 className="max-w-md text-4xl font-bold tracking-tight text-white md:text-5xl">
              Scan any repo and understand it instantly.
            </h1>

            <p className="mt-4 max-w-xl text-base text-slate-300 md:text-lg">
              Analyze architecture, dependencies, and project structure before making your next technical decision.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <label htmlFor="repo-url" className="block text-sm font-medium text-slate-200">
                Repository URL
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="repo-url"
                  type="url"
                  value={repoInput}
                  onChange={(event) => setRepoInput(event.target.value)}
                  placeholder="https://github.com/owner/repository"
                  className="h-14 flex-1 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-base text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
                />
                <button
                  type="submit"
                  className="h-14 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-base font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:brightness-110"
                >
                  Analyze
                </button>
              </div>
            </form>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Architecture</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Dependencies</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Code insights</span>
            </div>
          </section>

          <aside className="flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-8 md:p-12">
            <div className="w-full max-w-md rounded-3xl border border-cyan-400/20 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/40">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Overview</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Repository Health</h2>
                </div>
                <div className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                  Healthy
                </div>
              </div>

              <div className="space-y-4">
                {[
                  ["Modules", "18"],
                  ["Dependencies", "42"],
                  ["Risk score", "Low"],
                  ["Review time", "2 min"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-sm text-slate-300">{label}</span>
                    <span className="text-base font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default InputURL;
