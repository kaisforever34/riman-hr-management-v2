import './globals.css'
import type { Metadata } from 'next'
import { Syne, DM_Sans } from 'next/font/google'

const syne = Syne({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Riman HR',
  description: 'Riman Fashion HR Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className={`${syne.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="bg-[#07091A] text-[#E0E6F4] antialiased">
        {children}
      </body>
    </html>
  )
}
