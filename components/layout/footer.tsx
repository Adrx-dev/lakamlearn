import Link from "next/link"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="border-t bg-gradient-to-r from-background to-muted/50">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-3">
              <Image
                src="/images/lakambini-logo.png"
                alt="Lakambini Learn Logo"
                width={32}
                height={32}
                className="rounded-full"
              />
              <div className="flex flex-col">
                <span className="text-lg font-bold lakambini-text-gradient">Lakambini Learn</span>
                <span className="text-xs text-muted-foreground">Grade XI • 2025-2026</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground">
              A modern education blog platform celebrating Filipino culture and academic excellence.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-primary">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/write" className="text-muted-foreground hover:text-primary transition-colors">
                  Write
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-primary">Community</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-primary">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Adrx.Solutions. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">Made with 💜 for Grade XI Lakambini students</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
