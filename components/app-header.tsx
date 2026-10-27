import Image from "next/image"
import Link from "next/link"
import { APP_TITLE, LOGO_SRC } from "@/lib/constants"
import { ThemeToggle } from "@/components/theme-toggle"

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background text-foreground">
      <div className="w-full px-4 h-14 flex items-center gap-3">
        {LOGO_SRC && (
          <Image src={LOGO_SRC} alt={`${APP_TITLE} logo`} width={28} height={28} className="shrink-0" />
        )}
        <Link href="/" className="text-sm font-semibold tracking-tight hover:text-primary transition-colors">
          {APP_TITLE}
        </Link>
        <nav className="flex items-center gap-4 ml-4">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Home</Link>
          <Link href="/search" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Search</Link>
          <Link href="/documents" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Documents</Link>
          <Link href="/extract" className="text-xs text-muted-foreground hover:text-foreground transition-colors">AI Extract</Link>
          <Link href="/parse" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Live Parse</Link>
        </nav>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
