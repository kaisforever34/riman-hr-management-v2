export default function Loading() {
  return (
    <div className="fi animate-pulse">
      {/* Page title skeleton */}
      <div className="mb-7 space-y-2">
        <div className="h-7 w-48 rounded-lg bg-[rgba(255,255,255,0.05)]" />
        <div className="h-4 w-64 rounded-md bg-[rgba(255,255,255,0.03)]" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] p-5">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-[10px] bg-[rgba(255,255,255,0.05)]" />
              <div className="h-4 w-12 rounded-full bg-[rgba(255,255,255,0.03)]" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-8 w-24 rounded-md bg-[rgba(255,255,255,0.05)]" />
              <div className="h-3 w-32 rounded bg-[rgba(255,255,255,0.03)]" />
            </div>
          </div>
        ))}
      </div>

      {/* Content cards skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] p-5">
            <div className="flex justify-between items-center mb-5">
              <div className="space-y-1.5">
                <div className="h-5 w-32 rounded bg-[rgba(255,255,255,0.05)]" />
                <div className="h-3 w-40 rounded bg-[rgba(255,255,255,0.03)]" />
              </div>
              <div className="h-6 w-20 rounded-full bg-[rgba(255,255,255,0.03)]" />
            </div>
            <div className="h-[175px] rounded-lg bg-[rgba(255,255,255,0.02)]" />
          </div>
        ))}
      </div>
    </div>
  )
}
