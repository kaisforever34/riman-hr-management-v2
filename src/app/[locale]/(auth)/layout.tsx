export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-[#07091A]">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,168,67,0.08)_0%,transparent_60%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(212,168,67,0.05)_0%,transparent_60%)]" />
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#D4A843] flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-[#0D0B07] font-syne">R</span>
            </div>
            <h1 className="font-syne text-xl font-bold text-[#E0E6F4] tracking-tight">
              Riman HR
            </h1>
            <p className="mt-1.5 text-[13px] text-[#8B93A8]">
              Fashion Trading
            </p>
          </div>
          {children}
          <p className="mt-8 text-center text-[11px] text-[#4A5168]">
            &copy; {new Date().getFullYear()} Riman Fashion Trading LLC
          </p>
        </div>
      </div>
    </div>
  )
}
