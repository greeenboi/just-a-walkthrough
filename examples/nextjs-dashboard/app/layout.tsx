import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import WalkthroughProviderWrapper from "@/components/wt-provider-wrapper"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "KokonutUI Dashboard",
  description: "A modern dashboard with theme switching",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <WalkthroughProviderWrapper>
            {children}
          </WalkthroughProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  )
}
