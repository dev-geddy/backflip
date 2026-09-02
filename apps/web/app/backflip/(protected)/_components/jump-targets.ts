/** Quick-jump destinations — real routes + action shortcuts, rendered by the
 *  header search (the only palette entry point). */
export const JUMP_GROUPS: {
  heading: string
  items: { label: string; href: string; keywords: string }[]
}[] = [
  {
    heading: "Pages",
    items: [
      { label: "Overview", href: "/backflip", keywords: "dashboard home" },
      {
        label: "Members",
        href: "/backflip/users",
        keywords: "users people team",
      },
      {
        label: "Account",
        href: "/backflip/account",
        keywords: "profile email password my account",
      },
      {
        label: "Docs",
        href: "/backflip/docs",
        keywords: "documentation constitution contracts notes spec l1 l2 l3",
      },
      {
        label: "UI samples",
        href: "/backflip/ui-samples",
        keywords: "components gallery reference shadcn design system",
      },
      {
        label: "Integrations",
        href: "/backflip/settings",
        keywords:
          "settings ai providers email resend keys clickup slack webhooks n8n connectors",
      },
    ],
  },
  {
    heading: "Actions",
    items: [
      {
        label: "Add member",
        href: "/backflip/users",
        keywords: "new user invite create",
      },
      {
        label: "Change password",
        href: "/backflip/account",
        keywords: "security reset",
      },
    ],
  },
]
