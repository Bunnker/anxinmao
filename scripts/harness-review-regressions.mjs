import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function indexAfter(source, needle, start, label = needle) {
  const index = source.indexOf(needle, start);
  assert(index !== -1, `Missing ${label}`);
  return index;
}

function bodyOfPost(source) {
  const start = source.indexOf("export async function POST");
  assert(start !== -1, "Missing POST handler");
  return source.slice(start);
}

{
  const source = read("src/app/api/followups/route.ts");
  const post = bodyOfPost(source);
  assert(
    source.includes('from "@/lib/ratelimit"'),
    "followups route must import rate-limit helpers",
  );
  assert(
    source.includes("checkAndConsume") &&
      source.includes("getClientIp") &&
      source.includes("rateLimitMessage"),
    "followups route must use rate-limit helpers",
  );
  const validation = indexAfter(post, 'recent.some((m) => m.role === "user")', 0, "followups user validation");
  const limit = indexAfter(post, 'checkAndConsume(getClientIp(req), "chat")', validation, "followups rate limit");
  const chat = indexAfter(post, "await chat(", limit, "followups chat call");
  assert(limit < chat, "followups rate limit must run before the LLM call");
}

{
  const post = bodyOfPost(read("src/app/api/behavior/route.ts"));
  const parse = indexAfter(post, "const parsed = parseHistory", 0, "behavior parseHistory");
  const userValidation = indexAfter(post, 'recent[recent.length - 1].role !== "user"', parse, "behavior last-user validation");
  const limit = indexAfter(post, 'checkAndConsume(getClientIp(req), "chat")', userValidation, "behavior rate limit");
  const agent = indexAfter(post, "await runBehaviorAgentTools", limit, "behavior agent tools");
  assert(limit < agent, "behavior rate limit must run before retrieval/model work");
}

{
  const post = bodyOfPost(read("src/app/api/triage/route.ts"));
  const messages = indexAfter(post, "const messages = messagesFromBody", 0, "triage messagesFromBody");
  const userValidation = indexAfter(post, 'messages[messages.length - 1].role !== "user"', messages, "triage last-user validation");
  const limit = indexAfter(post, 'checkAndConsume(getClientIp(req), "chat")', userValidation, "triage rate limit");
  const medical = indexAfter(post, "await buildMedicalKnowledgeContext", limit, "triage medical context");
  assert(limit < medical, "triage rate limit must run before retrieval/model work");
}

for (const path of ["src/app/behavior/page.tsx", "src/app/report/page.tsx"]) {
  const source = read(path);
  assert(source.includes('from "@/lib/persist"'), `${path} must import persisted storage fallback`);
  assert(source.includes("readPersisted(STORAGE_KEY)"), `${path} must read snapshot via readPersisted`);
  assert(
    !source.includes("window.localStorage.getItem(STORAGE_KEY)"),
    `${path} must not bypass persisted storage fallback`,
  );
}

{
  const dockerignore = read(".dockerignore");
  for (const entry of [
    "!docs/medical/ai-cards/*.md",
    "!docs/medical/source/*.md",
    "!docs/care/ai-cards/*.md",
  ]) {
    assert(dockerignore.includes(entry), `.dockerignore must keep runtime docs: ${entry}`);
  }
}

{
  const tabBar = read("src/components/TabBar.tsx");
  assert(!tabBar.includes("STORAGE_KEY"), "TabBar should not import unused STORAGE_KEY");
}

console.log("review regression checks passed");
