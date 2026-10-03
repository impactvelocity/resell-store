import { Column, Link, Row, Section, Text } from "react-email";
import {
  Actions,
  Button,
  EmailLayout,
  Lead,
  NotifyFooter,
  Stats,
  Tag,
  Thumb,
  Title,
  styles,
} from "../src/components";
import { asset } from "../src/config";
import { color, font, radius } from "../src/theme";

/* To the seller, each evening: what their agent did today and what's waiting on them. */

export type AgentSummaryEmailProps = {
  /** "Thursday" */
  day: string;
  /** One sentence, written by the agent. */
  summary: string;
  stats: { label: string; value: string }[];
  needsYou: { title: string; body: string; url: string; imageUrl?: string | null }[];
  handled: { text: string; time: string }[];
  inboxUrl: string;
};

export const agentSummarySubject = ({ day, needsYou }: AgentSummaryEmailProps) =>
  needsYou.length
    ? `Your ${day}: ${needsYou.length} ${needsYou.length === 1 ? "thing needs" : "things need"} you`
    : `Your ${day}: all handled`;

export default function AgentSummaryEmail({
  day,
  summary,
  stats,
  needsYou,
  handled,
  inboxUrl,
}: AgentSummaryEmailProps) {
  return (
    <EmailLayout
      preview={summary}
      footer={<NotifyFooter reason="your agent does something for you" />}
    >
      <Tag tone="leaf">From your agent</Tag>
      <Title>Here's your {day}</Title>
      <Lead>{summary}</Lead>

      <Stats items={stats} />

      {needsYou.length > 0 && (
        <>
          <Text style={sectionLabel}>Needs you</Text>
          {needsYou.map((item) => (
            <Link key={item.url} href={item.url} style={{ textDecoration: "none" }}>
              <Section style={needsCard}>
                <Row>
                  <Column style={{ width: 60, verticalAlign: "middle" }}>
                    <Thumb src={item.imageUrl} alt={item.title} size={48} />
                  </Column>
                  <Column style={{ verticalAlign: "middle" }}>
                    <Text style={{ ...styles.listingTitle, fontSize: 16 }}>{item.title}</Text>
                    <Text style={{ ...styles.small, margin: "2px 0 0", color: color.text }}>
                      {item.body}
                    </Text>
                  </Column>
                  <Column style={{ width: 24, verticalAlign: "middle" }} align="right">
                    <Text style={arrow}>→</Text>
                  </Column>
                </Row>
              </Section>
            </Link>
          ))}
        </>
      )}

      {handled.length > 0 && (
        <>
          <Text style={sectionLabel}>Handled for you</Text>
          {handled.map((item) => (
            <Row key={item.text} style={{ marginBottom: 10 }}>
              <Column style={{ width: 32, verticalAlign: "top" }}>
                <div style={check}>✓</div>
              </Column>
              <Column style={{ verticalAlign: "top" }}>
                <Text style={{ margin: "1px 0 0", fontSize: 15, lineHeight: "22px", color: color.text }}>
                  {item.text}
                </Text>
              </Column>
              <Column style={{ width: 72, verticalAlign: "top" }} align="right">
                <Text style={{ ...styles.small, margin: "2px 0 0" }}>{item.time}</Text>
              </Column>
            </Row>
          ))}
        </>
      )}

      <Actions>
        <Button href={inboxUrl}>Open your inbox</Button>
      </Actions>
    </EmailLayout>
  );
}

AgentSummaryEmail.PreviewProps = {
  day: "Thursday",
  summary: "I answered 4 questions, talked 2 buyers up and turned down 1 lowball. One offer is waiting on you.",
  stats: [
    { label: "Views", value: "128" },
    { label: "Questions", value: "4" },
    { label: "Offers", value: "3" },
  ],
  needsYou: [
    {
      title: "Jess offered $20",
      body: "Linen wrap dress. It's your lowest, with $5 down. I'd take it.",
      url: "https://resell.store/inbox/jess-linen-dress",
      imageUrl: asset("dress.png"),
    },
    {
      title: "Would you ship to Canada?",
      body: "Priya asked about the dutch oven. Your listing doesn't say.",
      url: "https://resell.store/listings/dutch-oven",
      imageUrl: asset("oven.png"),
    },
  ],
  handled: [
    { text: "Told Ben the dutch oven lid has the stainless steel knob", time: "9:14 am" },
    { text: "Countered Sam at $175 on the dutch oven", time: "11:02 am" },
    { text: "Turned down $120 from Ana. It's well under your lowest", time: "1:40 pm" },
    { text: "Sent Priya tracking for the bud vase", time: "4:25 pm" },
  ],
  inboxUrl: "https://resell.store/inbox",
} satisfies AgentSummaryEmailProps;

const sectionLabel = {
  margin: "28px 0 10px",
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: color.textMuted,
};

const needsCard = {
  marginBottom: 8,
  padding: "10px 12px",
  background: color.pink100,
  borderRadius: radius.md,
};

const arrow = {
  margin: 0,
  fontFamily: font.display,
  fontWeight: 800,
  fontSize: 20,
  color: color.pink600,
};

const check = {
  width: 22,
  height: 22,
  borderRadius: radius.full,
  background: color.leaf100,
  color: color.leaf600,
  textAlign: "center" as const,
  lineHeight: "22px",
  fontSize: 12,
  fontWeight: 700,
};
