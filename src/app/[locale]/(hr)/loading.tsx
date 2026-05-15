export default function Loading() {
  return (
    <div className="fi flex-1 min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-[rgba(255,255,255,0.065)] bg-[#0D1028] px-5">
        <div className="flex-1" />
        <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.05)] animate-pulse" />
        <div className="w-16 h-6 rounded-md bg-[rgba(255,255,255,0.05)] animate-pulse" />
      </header>
      <main className="flex-1 p-7">
        <div className="animate-pulse space-y-6">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-md bg-[rgba(255,255,255,0.05)]" />
            <div className="h-4 w-72 rounded-md bg-[rgba(255,255,255,0.03)]" />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]" />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
