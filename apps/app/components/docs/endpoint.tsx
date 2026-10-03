import { LockIcon } from "@repo/ui/icons";
import { anchorFor, params, samples, type Param, type RouteLike } from "../../lib/docs/samples";
import { CodeBlock, CodeTabs } from "./code";
import { Method } from "./page";

/*
 * One API endpoint in the reference: what it does and what it takes on the
 * left, a request in three languages and an example response on the right.
 */

export type EndpointRoute = RouteLike & {
  summary: string;
  description?: string;
  scope?: string;
};

/** Text with `code` spans, as the route descriptions are written. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) =>
        i % 2 ? (
          <code key={i} className="rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-[0.88em]">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

function ParamList({ title, items }: { title: string; items: Param[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col">
      <h4 className="border-b border-public-border pb-2 text-sm font-bold">{title}</h4>
      <dl className="flex flex-col">
        {items.map((p) => (
          <div key={p.name} className="flex flex-col gap-1 border-b border-public-border py-3 last:border-b-0">
            <dt className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <code className="font-mono text-[13px] font-bold">{p.name}</code>
              <span className="font-mono text-xs text-text-muted">{p.type}</span>
              {p.required && <span className="text-xs font-bold text-accent-text">required</span>}
              {p.defaultValue && <span className="text-xs text-text-muted">default {p.defaultValue}</span>}
            </dt>
            {p.description && (
              <dd className="text-sm leading-6 text-text/85">
                <Inline text={p.description} />
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}

export function Endpoint({ route, baseUrl }: { route: EndpointRoute; baseUrl: string }) {
  const pathParams = [...route.path.matchAll(/:([A-Za-z]+)/g)].map((m) => ({
    name: m[1]!,
    type: "string",
    required: true,
    description: m[1] === "slug" ? "The shop's slug." : m[1] === "photoId" ? "The photo's id." : "The id.",
  }));
  const response = route.example?.response;

  return (
    <section id={anchorFor(route)} className="scroll-mt-24 border-t border-public-border pt-10 first:border-t-0 first:pt-2">
      <div className="grid gap-x-10 gap-y-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <h3 className="font-display text-[22px] leading-7 font-extrabold tracking-tight">{route.summary}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Method method={route.method} />
            <code className="font-mono text-sm font-semibold break-all">/v1{route.path}</code>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {route.access === "public" ? (
              <span className="rounded-full bg-secondary-soft px-2.5 py-1 font-semibold text-secondary">No key needed</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 font-semibold text-text-muted">
                <LockIcon size={12} strokeWidth={2.4} />
                Needs a key{route.scope ? ` with ${route.scope}` : route.method === "GET" ? " with read" : ""}
              </span>
            )}
            {route.multipart && <span className="rounded-full bg-surface-muted px-2.5 py-1 font-semibold text-text-muted">Takes uploads</span>}
          </div>
          {route.description && (
            <p className="text-[15px] leading-7 text-text/90">
              <Inline text={route.description} />
            </p>
          )}
          <ParamList title="Path" items={pathParams} />
          <ParamList title="Query" items={params(route.query)} />
          <ParamList title="Body" items={params(route.body)} />
        </div>
        <div className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-24 xl:self-start">
          <CodeTabs samples={samples(route, baseUrl)} title="Request" />
          {response !== undefined && <CodeBlock tone="paper" title="Response" code={JSON.stringify(response, null, 2)} />}
        </div>
      </div>
    </section>
  );
}
