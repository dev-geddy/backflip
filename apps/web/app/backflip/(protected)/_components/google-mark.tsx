/**
 * Small Google "G" mark (design 1a sign-in badge). Shared by the member detail
 * and the user's own account page, so an operator reading someone else's
 * record and a user reading their own see the same glyph.
 */
export function GoogleMark() {
  return (
    <span
      title="Signs in with Google"
      className="inline-flex size-[18px] flex-none items-center justify-center rounded-full border bg-background text-[10px] font-bold text-[#4285f4]"
    >
      G
    </span>
  )
}
