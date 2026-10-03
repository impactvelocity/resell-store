import type { Metadata } from "next";
import { CodeBlock } from "../../../../components/docs/code";
import { A, C, Callout, DocPage, H2, OL, P } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { mcpUrl, siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Connect your app · MCP" };

export default async function Connect() {
  const base = await docsBase();
  const link = mcpUrl("/u/your-private-link");
  return (
    <DocPage
      base={base}
      path="/mcp/connect"
      eyebrow="MCP"
      title="Connect your app"
      lead="Copy your private link from Your agent, then add it where your app asks for an MCP server or connector. About a minute."
      toc={[
        { id: "claude", title: "Claude" },
        { id: "chatgpt", title: "ChatGPT" },
        { id: "claude-code", title: "Claude Code" },
        { id: "editors", title: "Cursor and VS Code" },
        { id: "headers", title: "Apps that take a key" },
        { id: "try", title: "Try it" },
      ]}
    >
      <Callout tone="tip">
        Get the link on <A href={siteUrl("/tools/agent")}>resell.store/tools/agent</A>. Below, swap{" "}
        <C>your-private-link</C> for yours. For shopping, use the <C>/buy/…</C> address instead of <C>/u/…</C>.
      </Callout>

      <H2 id="claude">Claude</H2>
      <OL>
        <li>In Claude, open Settings, then Connectors.</li>
        <li>Choose Add custom connector, name it &quot;resell.store&quot; and paste your link.</li>
        <li>In a chat, turn the connector on from the tools menu and ask it something.</li>
      </OL>

      <H2 id="chatgpt">ChatGPT</H2>
      <OL>
        <li>In ChatGPT, open Settings, then Connectors (custom connectors may need developer mode turned on).</li>
        <li>Create a connector, paste your link as the server URL, and choose no authentication: the link carries it.</li>
        <li>Pick the connector in a new chat.</li>
      </OL>

      <H2 id="claude-code">Claude Code</H2>
      <CodeBlock title="Terminal" code={`claude mcp add --transport http resell-shops ${link}\nclaude mcp add --transport http resell-shopping ${mcpUrl("/buy")}`} />

      <H2 id="editors">Cursor and VS Code</H2>
      <P>
        Add it to the app&apos;s MCP settings (<C>.cursor/mcp.json</C>, or <C>.vscode/mcp.json</C> with <C>servers</C> in place of{" "}
        <C>mcpServers</C>):
      </P>
      <CodeBlock
        title="mcp.json"
        code={JSON.stringify({ mcpServers: { "resell-shops": { url: link } } }, null, 2)}
      />

      <H2 id="headers">Apps that take a key</H2>
      <P>
        If your app lets you set headers, you can keep the secret out of the address: use <C>{mcpUrl("/seller")}</C> or{" "}
        <C>{mcpUrl("/buyer")}</C> and send <C>Authorization: Bearer</C> with your agent link&apos;s token or a secret key.
      </P>
      <CodeBlock
        title="mcp.json"
        code={JSON.stringify(
          { mcpServers: { "resell-shops": { url: mcpUrl("/seller"), headers: { Authorization: "Bearer rs_live_..." } } } },
          null,
          2,
        )}
      />
      <H2 id="try">Try it</H2>
      <OL>
        <li>&quot;What needs me today?&quot;</li>
        <li>&quot;List my yellow Le Creuset dutch oven, 5.5 qt, used twice. Look up a price first.&quot;</li>
        <li>&quot;Jess offered $150 on the dutch oven. Counter at $170 and tell her the lid&apos;s included.&quot;</li>
        <li>&quot;What sold this week, and what got the most views?&quot;</li>
        <li>&quot;Find me a film camera under $150 that ships, and save the best two.&quot;</li>
      </OL>
    </DocPage>
  );
}
