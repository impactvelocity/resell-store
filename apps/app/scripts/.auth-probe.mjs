import Kernel from "@onkernel/sdk";
process.loadEnvFile(".env.local");
const k = new Kernel({ apiKey: process.env.KERNEL_API_KEY });
const c = await k.auth.connections.create({ domain: "ebay.com", profile_name: "rs-probe-ebay", health_checks: true });
console.log("created", JSON.stringify({ id: c.id, status: c.status, domain: c.domain, profile: c.profile_name, can_reauth: c.can_reauth, hci: c.health_check_interval }));
const l = await k.auth.connections.login(c.id);
console.log("login", JSON.stringify({ ...l, handoff_code: l.handoff_code ? "(present)" : null }));
await new Promise((r) => setTimeout(r, 8000));
const r = await k.auth.connections.retrieve(c.id);
console.log("after 8s", JSON.stringify({ status: r.status, flow_status: r.flow_status, flow_step: r.flow_step, fields: r.fields?.map((f) => f.name ?? f), login_url: r.login_url }));
try { await k.auth.connections.create({ domain: "ebay.com", profile_name: "rs-probe-ebay" }); } catch (e) { console.log("dup create ->", e.status, e.message.slice(0, 120)); }
await k.auth.connections.delete(c.id);
console.log("deleted");
const p = await k.profiles?.list?.().catch(() => null);
console.log("profiles api?", typeof k.profiles?.delete);
