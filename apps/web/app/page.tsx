import Link from "next/link"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8">
      <h1 className="text-[9vw] leading-none font-bold tracking-tight text-muted-foreground/20 select-none">
        backflip
      </h1>
      <nav className="flex gap-6 text-sm">
        <Link href="/backflip" className="underline underline-offset-4 hover:text-foreground">
          Admin
        </Link>
        <Link href="/ui-samples" className="underline underline-offset-4 hover:text-foreground">
          UI Samples
        </Link>
      </nav>
    </div>
  )
}
