import { Link, Section, Text } from "react-email";
import { Actions, Button, EmailLayout, Lead, Small, Title } from "../src/components";
import { color, font, radius } from "../src/theme";

export type SignInEmailProps = {
  url: string;
  email: string;
  /** Minutes until the link runs out. */
  expiresIn?: number;
};

export const signInSubject = () => "Your resell.store sign-in link";

export default function SignInEmail({ url, email, expiresIn = 15 }: SignInEmailProps) {
  return (
    <EmailLayout
      preview={`Tap to sign in. The link works once and runs out in ${expiresIn} minutes.`}
      footer={
        <>
          Didn't ask for this? You can ignore it. Nobody gets in without the link, and it
          stops working in {expiresIn} minutes.
        </>
      }
    >
      <Title>Tap to sign in</Title>
      <Lead>
        Here's your link for <strong>{email}</strong>. It works once and runs out in{" "}
        {expiresIn} minutes.
      </Lead>

      <Actions>
        <Button href={url}>Sign in to resell.store</Button>
      </Actions>

      <Section style={box}>
        <Small style={{ margin: 0 }}>Button not working? Paste this into your browser:</Small>
        <Text style={code}>
          <Link href={url} style={{ color: color.leaf600, textDecoration: "none" }}>
            {url}
          </Link>
        </Text>
      </Section>
    </EmailLayout>
  );
}

SignInEmail.PreviewProps = {
  url: "https://resell.store/api/auth/magic-link/verify?token=Qm9vdHMgYW5kIGNhdHMgYW5kIGJvb3Rz&callbackURL=%2Fhome",
  email: "maya.rivera@example.com",
} satisfies SignInEmailProps;

const box = {
  marginTop: 24,
  padding: "14px 16px",
  background: color.surfaceMuted,
  borderRadius: radius.md,
};

const code = {
  margin: "6px 0 0",
  fontFamily: font.mono,
  fontSize: 12,
  lineHeight: "18px",
  wordBreak: "break-all" as const,
};
