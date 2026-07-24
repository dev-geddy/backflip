import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

export type WelcomeEmailProps = {
  /** Recipient display name; falls back to a neutral greeting when absent. */
  name?: string | null
  /** Absolute URL to the admin sign-in page. */
  loginUrl: string
  /** Product/brand name shown in the copy (from Resend "from name"). */
  appName?: string
}

/**
 * Transactional welcome email sent when an owner adds a new user. GitHub-style:
 * neutral grays, system font stack, a bordered white card on a soft canvas, and
 * a single green primary action. Rendered to HTML server-side (see `send.tsx`).
 * Inline styles only — the only styling email clients reliably honor.
 */
export function WelcomeEmail({
  name,
  loginUrl,
  appName = "Backflip",
}: WelcomeEmailProps) {
  const greetingName = name?.trim() || "there"

  return (
    <Html lang="en">
      <Head />
      <Preview>Your {appName} account is ready — sign in to get started.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Welcome to {appName}</Heading>
          </Section>

          <Section style={content}>
            <Text style={text}>Hi {greetingName},</Text>
            <Text style={text}>
              An account has just been created for you on <strong>{appName}</strong>.
              You now have access to the admin dashboard — sign in to get started.
            </Text>

            <Section style={buttonWrap}>
              <Button style={button} href={loginUrl}>
                Sign in to {appName}
              </Button>
            </Section>

            <Text style={mutedText}>
              If the button above doesn&rsquo;t work, copy and paste this URL into
              your browser:
            </Text>
            <Link href={loginUrl} style={link}>
              {loginUrl}
            </Link>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            You&rsquo;re receiving this email because an account was created for
            you on {appName}. If you weren&rsquo;t expecting it, you can safely
            ignore this message.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default WelcomeEmail

/* GitHub-flavored palette + system font stack. Inline styles only. */
const fontStack =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"'

const main: React.CSSProperties = {
  backgroundColor: "#f6f8fa",
  fontFamily: fontStack,
  margin: 0,
  padding: "24px 0",
}

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #d0d7de",
  borderRadius: "6px",
  maxWidth: "544px",
  margin: "0 auto",
  overflow: "hidden",
}

const header: React.CSSProperties = {
  borderBottom: "1px solid #d0d7de",
  padding: "24px 32px",
}

const h1: React.CSSProperties = {
  color: "#1f2328",
  fontSize: "20px",
  fontWeight: 600,
  lineHeight: "1.25",
  margin: 0,
}

const content: React.CSSProperties = {
  padding: "24px 32px 8px",
}

const text: React.CSSProperties = {
  color: "#1f2328",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 16px",
}

const mutedText: React.CSSProperties = {
  color: "#656d76",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: "0 0 4px",
}

const buttonWrap: React.CSSProperties = {
  padding: "8px 0 20px",
}

const button: React.CSSProperties = {
  backgroundColor: "#1f883d",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: "1",
  padding: "12px 20px",
  textDecoration: "none",
}

const link: React.CSSProperties = {
  color: "#0969da",
  fontSize: "13px",
  textDecoration: "none",
  wordBreak: "break-all",
}

const hr: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #d0d7de",
  margin: "24px 0 0",
}

const footer: React.CSSProperties = {
  color: "#656d76",
  fontSize: "12px",
  lineHeight: "1.5",
  padding: "16px 32px 24px",
  margin: 0,
}
