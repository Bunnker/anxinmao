# Case Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a health-only case summary feature that turns structured triage/chat context into a copyable doctor-facing illness note, without diagnosis, prescription dosage, or drug-purchase advice.

**Architecture:** Add a standalone `/api/case-summary` route backed by a strict `CaseSummaryInput` schema and a safety guard, instead of letting the normal chat agent freely summarize. Report and health-chat pages render the same reusable client panel; the panel generates the summary on demand, copies plain text, and sends metadata-only analytics events. Dry-run harnesses validate context construction, boundaries, UI wiring, and telemetry without requiring a live model call.

**Tech Stack:** Next.js 16 App Router route handlers using Web `Request`/`Response`, React 19 client components, TypeScript, existing OpenAI-compatible `src/lib/llm.ts`, existing `src/lib/ratelimit.ts`, local `.data` JSONL telemetry.

---

## Scope

Build in this first version:

- A manual button on the report page.
- A manual button on the behavior chat page only when the conversation is health-related.
- A doctor-facing illness note plus one short user-facing summary.
- Copy-to-clipboard plain text.
- Metadata-only analytics.
- Harness coverage for safety boundaries and wiring.

Do not build in this first version:

- Automatic AI-triggered summaries.
- PDF/export/printing.
- Daily-care summaries.
- Prescription drug recommendations.
- Vet-side dashboard.
- Per-user clinical record management.

## File Structure

- Create `src/lib/case-summary.ts`: shared schema normalization, prompt builder, JSON parser, plain-text copy renderer, health-conversation gate.
- Create `src/lib/case-summary-safety.ts`: output guard that blocks diagnosis certainty, prescription dosage, and drug purchase language.
- Create `src/app/api/case-summary/route.ts`: POST route for validated, rate-limited, non-streaming summary generation; supports development `dryRun`.
- Create `src/app/api/case-summary/events/route.ts`: POST route for metadata-only JSONL events.
- Create `src/components/CaseSummaryPanel.tsx`: client UI for generate/copy states and analytics calls.
- Modify `src/app/report/page.tsx`: add report-page summary button after the reviewed notice and before “继续补充问问”.
- Modify `src/app/behavior/page.tsx`: add health-chat summary action after assistant output/followups, hidden for routine daily-care conversations.
- Modify `package.json`: add `harness:case-summary`.
- Create `scripts/harness-case-summary.mjs`: dry-run/static regression harness.

---

### Task 1: Case Summary Schema And Prompt Builder

**Files:**
- Create: `src/lib/case-summary.ts`
- Test: `scripts/harness-case-summary.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing harness skeleton**

Create `scripts/harness-case-summary.mjs`:

```js
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function fail(message, detail = "") {
  console.error(`\n❌ ${message}`);
  if (detail) console.error(detail);
  process.exit(1);
}

function assert(condition, message, detail = "") {
  if (!condition) fail(message, detail);
}

function includesAll(source, needles, label) {
  for (const needle of needles) {
    assert(source.includes(needle), `${label} missing: ${needle}`);
  }
}

console.log("══ 病情说明 harness ══");

{
  const source = read("src/lib/case-summary.ts");
  includesAll(
    source,
    [
      "export type CaseSummarySource",
      "export type CaseSummaryInput",
      "export type CaseSummaryOutput",
      "export function normalizeCaseSummaryBody",
      "export function buildCaseSummaryPrompt",
      "export function renderCaseSummaryCopyText",
      "export function isHealthCaseSummaryCandidate",
    ],
    "case-summary schema",
  );

  assert(
    source.includes('unknown: "不详"'),
    "schema must preserve missing fields as 不详",
  );
  assert(
    source.includes("缺失信息必须写“不详”") ||
      source.includes("缺失信息必须写\"不详\""),
    "prompt must forbid guessing missing fields",
  );
  assert(
    source.includes("不得输出药品剂量") &&
      source.includes("不得推荐购买处方药"),
    "prompt must include medication boundaries",
  );
}

console.log("✅ case-summary schema checks passed");
```

Modify `package.json` script block by adding this exact entry after `harness:triage`:

```json
"harness:case-summary": "node scripts/harness-case-summary.mjs",
```

- [ ] **Step 2: Run the harness to verify it fails**

Run:

```bash
npm run harness:case-summary
```

Expected:

```text
❌ case-summary schema missing: export type CaseSummarySource
```

- [ ] **Step 3: Implement `src/lib/case-summary.ts`**

Create `src/lib/case-summary.ts`:

```ts
import type { ChatMessage, RiskTier } from "@/types/cat";
import type { UserRegionContext } from "@/lib/request-region";

export type CaseSummarySource = "report" | "chat";
export type CaseSummaryMode = "doctor_note" | "observation_note";

export type CaseSummaryCat = {
  name: string;
  ageMonths?: number;
  sex?: string;
  breed?: string;
  weight?: number;
  neutered?: string;
  vaccines?: { name: string; date: string }[];
  deworm?: string;
  chronicConditions?: string;
  allergies?: string;
  notes?: string;
};

export type CaseSummaryMedical = {
  symptom?: string;
  symptomLabel?: string;
  tier?: RiskTier;
  claimIds: string[];
  report?: string;
  qa?: string;
};

export type CaseSummaryConversation = {
  memo?: string;
  messages: ChatMessage[];
};

export type CaseSummaryInput = {
  source: CaseSummarySource;
  mode: CaseSummaryMode;
  cat: CaseSummaryCat;
  medical: CaseSummaryMedical;
  conversation: CaseSummaryConversation;
  region: UserRegionContext;
  unknown: "不详";
};

export type CaseSummaryOutput = {
  userSummary: string;
  doctorNote: string;
  doctorQuestions: string[];
  dontDo: string[];
  copyText: string;
};

type RawBody = Record<string, unknown>;

const MEDICAL_RE =
  /打喷嚏|鼻涕|眼屎|流泪|咳嗽|呕吐|吐|拉稀|腹泻|软便|便血|黑便|不吃|食欲|精神差|嗜睡|尿频|尿血|尿少|乱尿|排尿|耳朵|甩头|挠耳|眼睛|眯眼|皮肤|掉毛|瘙痒|牙龈|牙齿|口臭|流口水|掉食|跛|瘸|摔|出血|误食|发烧|疼|痛|支原体|疱疹|杯状|PCR|检查|用药|医院|医生|兽医/;

function cleanText(raw: unknown, max: number): string | undefined {
  if (typeof raw !== "string") return undefined;
  const text = raw.trim().replace(/\s+/g, " ");
  return text ? text.slice(0, max) : undefined;
}

function cleanNumber(raw: unknown): number | undefined {
  return typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
}

function cleanTier(raw: unknown): RiskTier | undefined {
  return raw === "red" || raw === "yellow" || raw === "green" ? raw : undefined;
}

function cleanClaimIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!/^[a-z]+_\d{3}$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 32) break;
  }
  return out;
}

function cleanMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as ChatMessage).role;
    const content = cleanText((item as ChatMessage).content, 1800);
    if ((role === "user" || role === "assistant") && content) {
      out.push({ role, content });
    }
  }
  return out.slice(-16);
}

function normalizeCat(raw: unknown): CaseSummaryCat {
  const obj = raw && typeof raw === "object" ? (raw as RawBody) : {};
  const vaccines = Array.isArray(obj.vaccines)
    ? obj.vaccines
        .map((v) => {
          const row = v && typeof v === "object" ? (v as RawBody) : {};
          const name = cleanText(row.name, 40);
          const date = cleanText(row.date, 20);
          return name || date ? { name: name ?? "不详", date: date ?? "不详" } : null;
        })
        .filter((v): v is { name: string; date: string } => Boolean(v))
        .slice(0, 8)
    : [];

  return {
    name: cleanText(obj.name, 40) ?? "猫咪",
    ageMonths: cleanNumber(obj.ageMonths),
    sex: cleanText(obj.sex, 20),
    breed: cleanText(obj.breed, 40),
    weight: cleanNumber(obj.weight),
    neutered: cleanText(obj.neutered, 20),
    vaccines,
    deworm: cleanText(obj.deworm, 20),
    chronicConditions: cleanText(obj.chronicConditions, 160),
    allergies: cleanText(obj.allergies, 160),
    notes: cleanText(obj.notes, 240),
  };
}

function normalizeMedical(raw: unknown): CaseSummaryMedical {
  const obj = raw && typeof raw === "object" ? (raw as RawBody) : {};
  return {
    symptom: cleanText(obj.symptom, 60),
    symptomLabel: cleanText(obj.symptomLabel, 80),
    tier: cleanTier(obj.tier),
    claimIds: cleanClaimIds(obj.claimIds),
    report: cleanText(obj.report, 800),
    qa: cleanText(obj.qa, 1200),
  };
}

function normalizeConversation(raw: unknown): CaseSummaryConversation {
  const obj = raw && typeof raw === "object" ? (raw as RawBody) : {};
  return {
    memo: cleanText(obj.memo, 2000),
    messages: cleanMessages(obj.messages),
  };
}

function normalizeSource(raw: unknown): CaseSummarySource {
  return raw === "report" ? "report" : "chat";
}

function normalizeMode(source: CaseSummarySource, tier?: RiskTier): CaseSummaryMode {
  if (source === "report" && tier === "green") return "observation_note";
  return "doctor_note";
}

export function normalizeCaseSummaryBody(
  body: RawBody,
  region: UserRegionContext,
): CaseSummaryInput {
  const source = normalizeSource(body.source);
  const medical = normalizeMedical(body.medical);
  return {
    source,
    mode: normalizeMode(source, medical.tier),
    cat: normalizeCat(body.cat),
    medical,
    conversation: normalizeConversation(body.conversation),
    region,
    unknown: "不详",
  };
}

export function isHealthCaseSummaryCandidate(input: CaseSummaryInput): boolean {
  if (input.source === "report") return true;
  if (input.medical.symptom || input.medical.tier || input.medical.claimIds.length > 0) return true;
  const text = [
    input.medical.report,
    input.medical.qa,
    input.conversation.memo,
    ...input.conversation.messages.map((m) => m.content),
  ]
    .filter(Boolean)
    .join("\n");
  return MEDICAL_RE.test(text);
}

function line(label: string, value: string | number | undefined, unknown: string): string {
  return `${label}:${value === undefined || value === "" ? unknown : value}`;
}

function catFacts(cat: CaseSummaryCat, unknown: string): string {
  const vaccines =
    cat.vaccines && cat.vaccines.length > 0
      ? cat.vaccines.map((v) => `${v.name}(${v.date})`).join("、")
      : unknown;
  return [
    line("名字", cat.name, unknown),
    line("月龄", cat.ageMonths, unknown),
    line("性别", cat.sex, unknown),
    line("品种", cat.breed, unknown),
    line("体重kg", cat.weight, unknown),
    line("绝育", cat.neutered, unknown),
    `疫苗:${vaccines}`,
    line("最近驱虫", cat.deworm, unknown),
    line("慢性病史", cat.chronicConditions, unknown),
    line("过敏史", cat.allergies, unknown),
    line("备注", cat.notes, unknown),
  ].join("\n");
}

function tierText(tier: RiskTier | undefined): string {
  if (tier === "red") return "红档:立刻就医/急诊";
  if (tier === "yellow") return "黄档:建议尽快就医/这几天内挂号";
  if (tier === "green") return "绿档:先在家观察,出现升级红线再就医";
  return "不详";
}

function conversationText(conversation: CaseSummaryConversation): string {
  const recent = conversation.messages
    .map((m) => `${m.role === "user" ? "用户" : "助手"}:${m.content}`)
    .join("\n");
  return [
    conversation.memo ? `【较早对话摘要】\n${conversation.memo}` : "",
    recent ? `【最近对话】\n${recent}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildCaseSummaryPrompt(input: CaseSummaryInput): string {
  const unknown = input.unknown;
  const medical = input.medical;
  const modeInstruction =
    input.mode === "observation_note"
      ? "当前目标是整理观察要点,不要写成已需就医的病历;但仍要写清楚何时升级。"
      : "当前目标是整理给兽医/宠物医院看的病情说明,让医生快速了解事实。";

  return [
    "你在帮猫主人整理病情说明。只基于下方结构化资料成文,不要脑补。",
    modeInstruction,
    "",
    "硬规则:",
    "- 缺失信息必须写“不详”,不能猜。",
    "- 不得下诊断,不要写“确诊/就是/一定是/已经得了某病”。",
    "- 不得输出药品剂量、疗程、购买链接、购买渠道或自行用药建议。",
    "- 不得推荐购买处方药;处方药只能整理成“复诊时问医生的问题”。",
    "- 可以写低风险护理事实,但不能说成治疗当前疾病。",
    "- 输出必须是 JSON,不要 Markdown 代码块。",
    "",
    "JSON 格式:",
    '{"userSummary":"一句安抚但不拖延的话","doctorNote":"给医生看的纯文字病情说明","doctorQuestions":["问题1","问题2","问题3"],"dontDo":["不要做1","不要做2"]}',
    "",
    "【猫咪档案】",
    catFacts(input.cat, unknown),
    "",
    "【分诊/医学上下文】",
    line("症状key", medical.symptom, unknown),
    line("症状名称", medical.symptomLabel, unknown),
    `风险档:${tierText(medical.tier)}`,
    `claimIds:${medical.claimIds.length > 0 ? medical.claimIds.join(",") : unknown}`,
    line("报告摘要", medical.report, unknown),
    line("分诊问答", medical.qa, unknown),
    "",
    "【对话上下文】",
    conversationText(input.conversation) || unknown,
  ].join("\n");
}

function extractJson(raw: string): string {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function cleanStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim().replace(/\s+/g, " ").slice(0, 160))
    .slice(0, 5);
}

export function parseCaseSummaryOutput(raw: string): Omit<CaseSummaryOutput, "copyText"> | null {
  try {
    const data = JSON.parse(extractJson(raw)) as Record<string, unknown>;
    const userSummary = cleanText(data.userSummary, 220);
    const doctorNote = cleanText(data.doctorNote, 1800);
    if (!userSummary || !doctorNote) return null;
    return {
      userSummary,
      doctorNote,
      doctorQuestions: cleanStringArray(data.doctorQuestions).slice(0, 3),
      dontDo: cleanStringArray(data.dontDo).slice(0, 4),
    };
  } catch {
    return null;
  }
}

export function renderCaseSummaryCopyText(output: Omit<CaseSummaryOutput, "copyText">): string {
  const questions = output.doctorQuestions.length
    ? output.doctorQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")
    : "不详";
  const dontDo = output.dontDo.length
    ? output.dontDo.map((q, i) => `${i + 1}. ${q}`).join("\n")
    : "不详";

  return [
    "病情说明:",
    output.doctorNote,
    "",
    "想请医生重点确认:",
    questions,
    "",
    "在家先别做:",
    dontDo,
  ].join("\n");
}
```

- [ ] **Step 4: Run the harness to verify it passes**

Run:

```bash
npm run harness:case-summary
```

Expected:

```text
✅ case-summary schema checks passed
```

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/harness-case-summary.mjs src/lib/case-summary.ts
git commit -m "feat: add case summary schema"
```

---

### Task 2: Case Summary Safety Guard

**Files:**
- Create: `src/lib/case-summary-safety.ts`
- Modify: `scripts/harness-case-summary.mjs`

- [ ] **Step 1: Extend the harness with safety checks**

Append this block before the final `console.log("✅ case-summary schema checks passed");` line in `scripts/harness-case-summary.mjs`:

```js
{
  const source = read("src/lib/case-summary-safety.ts");
  includesAll(
    source,
    [
      "export function validateCaseSummaryOutput",
      "diagnosisCertainty",
      "prescriptionDosage",
      "drugPurchase",
    ],
    "case-summary safety",
  );
  assert(source.includes("确诊") && source.includes("剂量"), "safety guard must scan diagnosis and dosage language");
}
```

Change the final log line to:

```js
console.log("✅ case-summary checks passed");
```

- [ ] **Step 2: Run the harness to verify it fails**

Run:

```bash
npm run harness:case-summary
```

Expected:

```text
❌ case-summary safety missing: export function validateCaseSummaryOutput
```

- [ ] **Step 3: Implement `src/lib/case-summary-safety.ts`**

Create `src/lib/case-summary-safety.ts`:

```ts
import type { CaseSummaryOutput } from "@/lib/case-summary";

export type CaseSummarySafetyViolation =
  | "diagnosisCertainty"
  | "prescriptionDosage"
  | "drugPurchase";

export type CaseSummarySafetyResult = {
  ok: boolean;
  violations: CaseSummarySafetyViolation[];
};

const DIAGNOSIS_CERTAINTY_RE =
  /确诊|就是.{0,12}(猫瘟|支原体|疱疹|杯状|肾病|糖尿病|鼻炎|肺炎|口炎)|一定是|已经得了|百分百|肯定是/;

const PRESCRIPTION_DOSAGE_RE =
  /\d+(\.\d+)?\s*(mg|毫克|ml|毫升|片|粒|袋|次\/天|一天\d次|每日\d次|q\d+h)|按.{0,8}体重.{0,8}(吃|用|喂)|连用\d+天|疗程\d+天|剂量/iu;

const DRUG_PURCHASE_RE =
  /购买.{0,12}(多西|阿奇|抗生素|消炎药|止痛药|止吐药|处方药|眼药水|耳药)|自行.{0,8}(买|购买|用药|喂药)|药店.{0,12}(买|购买)|网上.{0,12}(买|下单)|链接|店铺/;

function joined(output: CaseSummaryOutput | Omit<CaseSummaryOutput, "copyText">): string {
  return [
    output.userSummary,
    output.doctorNote,
    output.doctorQuestions.join("\n"),
    output.dontDo.join("\n"),
    "copyText" in output ? output.copyText : "",
  ].join("\n");
}

export function validateCaseSummaryOutput(
  output: CaseSummaryOutput | Omit<CaseSummaryOutput, "copyText">,
): CaseSummarySafetyResult {
  const text = joined(output);
  const violations: CaseSummarySafetyViolation[] = [];
  if (DIAGNOSIS_CERTAINTY_RE.test(text)) violations.push("diagnosisCertainty");
  if (PRESCRIPTION_DOSAGE_RE.test(text)) violations.push("prescriptionDosage");
  if (DRUG_PURCHASE_RE.test(text)) violations.push("drugPurchase");
  return { ok: violations.length === 0, violations };
}
```

- [ ] **Step 4: Run the harness to verify it passes**

Run:

```bash
npm run harness:case-summary
```

Expected:

```text
✅ case-summary checks passed
```

- [ ] **Step 5: Commit**

```bash
git add scripts/harness-case-summary.mjs src/lib/case-summary-safety.ts
git commit -m "feat: guard case summary output"
```

---

### Task 3: `/api/case-summary` Route

**Files:**
- Create: `src/app/api/case-summary/route.ts`
- Modify: `scripts/harness-case-summary.mjs`

- [ ] **Step 1: Extend the harness with route checks**

Append this block before the final log line in `scripts/harness-case-summary.mjs`:

```js
{
  const route = read("src/app/api/case-summary/route.ts");
  includesAll(
    route,
    [
      "export async function POST(req: Request)",
      "normalizeCaseSummaryBody",
      "isHealthCaseSummaryCandidate",
      "buildCaseSummaryPrompt",
      "parseCaseSummaryOutput",
      "renderCaseSummaryCopyText",
      "validateCaseSummaryOutput",
      'checkAndConsume(getClientIp(req), "chat")',
      "dryRun === true",
    ],
    "case-summary route",
  );

  const parseIndex = route.indexOf("normalizeCaseSummaryBody");
  const gateIndex = route.indexOf("isHealthCaseSummaryCandidate");
  const limitIndex = route.indexOf('checkAndConsume(getClientIp(req), "chat")');
  const chatIndex = route.indexOf("await chat(");
  assert(parseIndex !== -1 && gateIndex > parseIndex, "route must validate health context after normalization");
  assert(limitIndex > gateIndex, "route must rate-limit after validation");
  assert(chatIndex > limitIndex, "route must call model after rate-limit");
}
```

- [ ] **Step 2: Run the harness to verify it fails**

Run:

```bash
npm run harness:case-summary
```

Expected:

```text
❌ case-summary route missing: export async function POST(req: Request)
```

- [ ] **Step 3: Implement `src/app/api/case-summary/route.ts`**

Create `src/app/api/case-summary/route.ts`:

```ts
// 病情说明 API —— 结构化上下文打底,AI 只负责整理成医生可读的文字。
import { chat, LLMError } from "@/lib/llm";
import {
  buildCaseSummaryPrompt,
  isHealthCaseSummaryCandidate,
  normalizeCaseSummaryBody,
  parseCaseSummaryOutput,
  renderCaseSummaryCopyText,
  type CaseSummaryOutput,
} from "@/lib/case-summary";
import { validateCaseSummaryOutput } from "@/lib/case-summary-safety";
import { userRegionFromRequest } from "@/lib/request-region";
import { checkAndConsume, getClientIp, rateLimitMessage } from "@/lib/ratelimit";

const SYSTEM = `你是帮猫主人整理病情说明的助手。
你只整理事实和待确认问题,不诊断,不开药,不给处方药剂量,不推荐购买处方药。
输出必须是 JSON,字段为 userSummary, doctorNote, doctorQuestions, dontDo。`;

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "请求格式不对。" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "请求格式不对。" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const region = userRegionFromRequest(req, b);
  const input = normalizeCaseSummaryBody(b, region);

  if (!isHealthCaseSummaryCandidate(input)) {
    return Response.json(
      { error: "这个功能只用于健康/分诊相关内容。" },
      { status: 400 },
    );
  }

  const prompt = buildCaseSummaryPrompt(input);

  if (b.dryRun === true && process.env.NODE_ENV !== "production") {
    return Response.json({
      dryRun: true,
      input,
      promptPreview: prompt.slice(0, 5000),
    });
  }

  const rl = checkAndConsume(getClientIp(req), "chat");
  if (!rl.ok) {
    return Response.json(
      { error: rateLimitMessage(rl.kind, rl.scope), code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  try {
    const raw = await chat(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      { temperature: 0.25, maxTokens: 1800 },
    );
    const parsed = parseCaseSummaryOutput(raw);
    if (!parsed) {
      return Response.json(
        { error: "病情说明生成失败,请再试一次。", code: "BAD_SUMMARY_JSON" },
        { status: 502 },
      );
    }
    const safety = validateCaseSummaryOutput(parsed);
    if (!safety.ok) {
      return Response.json(
        {
          error: "这版说明里出现了不适合直接给用户的医疗表述,请重试。",
          code: "SUMMARY_SAFETY_BLOCKED",
          violations: safety.violations,
        },
        { status: 502 },
      );
    }

    const output: CaseSummaryOutput = {
      ...parsed,
      copyText: renderCaseSummaryCopyText(parsed),
    };
    return Response.json({ summary: output });
  } catch (e) {
    if (e instanceof LLMError) {
      const status = e.code === "no_provider" ? 503 : 502;
      return Response.json({ error: e.message, code: e.code }, { status });
    }
    return Response.json({ error: "病情说明生成失败,请稍后重试。" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run the harness to verify it passes**

Run:

```bash
npm run harness:case-summary
```

Expected:

```text
✅ case-summary checks passed
```

- [ ] **Step 5: Run a dry-run API check**

Run:

```bash
node -e 'fetch("http://localhost:3000/api/case-summary",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dryRun:true,source:"report",cat:{name:"年糕",ageMonths:24,weight:4.2,neutered:"是",vaccines:[{name:"猫三联",date:"2025-10-01"}]},medical:{symptom:"sneeze",symptomLabel:"打喷嚏",tier:"yellow",claimIds:["uri_001"],report:"黄档 · 打喷嚏 建议这几天内复诊",qa:"持续两年,眼屎红褐色"},conversation:{messages:[{role:"user",content:"医生说支原体,吃了三周药还是偶尔打喷嚏"}]},region:{locale:"zh-CN",timeZone:"Asia/Shanghai"}})}).then(r=>r.json()).then(j=>{if(!j.dryRun||!String(j.promptPreview).includes("缺失信息必须写")) throw new Error(JSON.stringify(j)); console.log("dryRun ok")})'
```

Expected:

```text
dryRun ok
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/case-summary/route.ts scripts/harness-case-summary.mjs
git commit -m "feat: add case summary api"
```

---

### Task 4: Case Summary Panel UI

**Files:**
- Create: `src/components/CaseSummaryPanel.tsx`
- Modify: `scripts/harness-case-summary.mjs`

- [ ] **Step 1: Extend the harness with component checks**

Append this block before the final log line in `scripts/harness-case-summary.mjs`:

```js
{
  const component = read("src/components/CaseSummaryPanel.tsx");
  includesAll(
    component,
    [
      "export function CaseSummaryPanel",
      'fetch("/api/case-summary"',
      "navigator.clipboard.writeText",
      "copyText",
      "case_summary_opened",
      "case_summary_generated",
      "case_summary_copied",
    ],
    "case-summary panel",
  );
}
```

- [ ] **Step 2: Run the harness to verify it fails**

Run:

```bash
npm run harness:case-summary
```

Expected:

```text
❌ case-summary panel missing: export function CaseSummaryPanel
```

- [ ] **Step 3: Implement `src/components/CaseSummaryPanel.tsx`**

Create `src/components/CaseSummaryPanel.tsx`:

```tsx
"use client";

import { useState } from "react";

type CaseSummaryPayload = Record<string, unknown>;

type CaseSummaryResponse = {
  summary?: {
    userSummary: string;
    doctorNote: string;
    doctorQuestions: string[];
    dontDo: string[];
    copyText: string;
  };
  error?: string;
};

type EventName =
  | "case_summary_opened"
  | "case_summary_generated"
  | "case_summary_copied"
  | "case_summary_regenerated"
  | "case_summary_from_report"
  | "case_summary_from_chat";

type Props = {
  source: "report" | "chat";
  label: string;
  payload: CaseSummaryPayload;
  tier?: string;
  symptom?: string;
  hasCatProfile: boolean;
  hasTriageContext: boolean;
};

function clientRegionPayload() {
  if (typeof navigator === "undefined") return undefined;
  return {
    locale: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function trackCaseSummaryEvent(name: EventName, meta: Record<string, unknown>) {
  void fetch("/api/case-summary/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, meta }),
  }).catch(() => {});
}

export function CaseSummaryPanel({
  source,
  label,
  payload,
  tier,
  symptom,
  hasCatProfile,
  hasTriageContext,
}: Props) {
  const [summary, setSummary] = useState<CaseSummaryResponse["summary"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const meta = {
    source,
    symptom: symptom || null,
    tier: tier || null,
    hasCatProfile,
    hasTriageContext,
  };

  async function generate(regenerate = false) {
    if (loading) return;
    setLoading(true);
    setError(null);
    setCopied(false);
    trackCaseSummaryEvent(regenerate ? "case_summary_regenerated" : "case_summary_opened", meta);
    trackCaseSummaryEvent(
      source === "report" ? "case_summary_from_report" : "case_summary_from_chat",
      meta,
    );
    try {
      const res = await fetch("/api/case-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          source,
          region: clientRegionPayload(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as CaseSummaryResponse;
      if (!res.ok || !data.summary) {
        setError(data.error || "整理失败了,请稍后再试。");
        return;
      }
      setSummary(data.summary);
      trackCaseSummaryEvent("case_summary_generated", {
        ...meta,
        contentLength: data.summary.copyText.length,
        includesUnknown: data.summary.copyText.includes("不详"),
      });
    } catch {
      setError("网络断了一下,请重试。");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!summary?.copyText) return;
    try {
      await navigator.clipboard.writeText(summary.copyText);
      setCopied(true);
      trackCaseSummaryEvent("case_summary_copied", {
        ...meta,
        contentLength: summary.copyText.length,
        includesUnknown: summary.copyText.includes("不详"),
      });
    } catch {
      setError("复制失败了,可以手动选中文字复制。");
    }
  }

  return (
    <section className="mt-3 rounded-[28px] bg-surface p-4 shadow-[var(--shadow-control)]">
      {!summary ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => generate(false)}
          className="flex w-full items-center justify-between text-left text-[14px] font-medium text-ink disabled:opacity-50"
        >
          <span>{loading ? "正在整理..." : label}</span>
          <span className="text-ink-faint" aria-hidden="true">
            →
          </span>
        </button>
      ) : (
        <div>
          <p className="text-[13.5px] leading-relaxed text-ink">{summary.userSummary}</p>
          <div className="mt-3 rounded-[18px] bg-[var(--surface-2)] p-3">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-faint">
              给医生看的病情说明
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
              {summary.copyText}
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={copy}
              className="flex-1 rounded-full bg-accent px-4 py-2.5 text-[13px] font-medium text-accent-fg"
            >
              {copied ? "已复制" : "复制给医生"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => generate(true)}
              className="rounded-full bg-[var(--surface-2)] px-4 py-2.5 text-[13px] font-medium text-ink-soft disabled:opacity-50"
            >
              重整
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--red-ink)]">{error}</p>}
    </section>
  );
}
```

- [ ] **Step 4: Run the harness to verify it passes**

Run:

```bash
npm run harness:case-summary
```

Expected:

```text
✅ case-summary checks passed
```

- [ ] **Step 5: Commit**

```bash
git add src/components/CaseSummaryPanel.tsx scripts/harness-case-summary.mjs
git commit -m "feat: add case summary panel"
```

---

### Task 5: Report Page Entry

**Files:**
- Modify: `src/app/report/page.tsx`
- Modify: `scripts/harness-case-summary.mjs`

- [ ] **Step 1: Extend the harness with report-page checks**

Append this block before the final log line in `scripts/harness-case-summary.mjs`:

```js
{
  const report = read("src/app/report/page.tsx");
  includesAll(
    report,
    [
      'import { CaseSummaryPanel } from "@/components/CaseSummaryPanel";',
      "const triageHandoff = useMemo",
      "整理病情说明",
      "整理观察要点",
      "<CaseSummaryPanel",
      "hasTriageContext={true}",
    ],
    "report page case summary",
  );
}
```

- [ ] **Step 2: Run the harness to verify it fails**

Run:

```bash
npm run harness:case-summary
```

Expected:

```text
❌ report page case summary missing: import { CaseSummaryPanel } from "@/components/CaseSummaryPanel";
```

- [ ] **Step 3: Modify imports in `src/app/report/page.tsx`**

Add this import with the other component imports:

```ts
import { CaseSummaryPanel } from "@/components/CaseSummaryPanel";
```

- [ ] **Step 4: Load handoff context in `ReportContent`**

After this existing line:

```ts
  const handoffId = queryHandoffId || generatedHandoffId;
```

Insert:

```ts
  const triageHandoff = useMemo(() => loadTriageHandoff(handoffId), [handoffId]);
```

- [ ] **Step 5: Build the panel payload in `ReportContent`**

After the existing `reportSummary` block, insert:

```ts
  const caseSummaryPayload = {
    cat,
    medical: {
      symptom,
      symptomLabel,
      tier: shownTier,
      claimIds,
      report: reportSummary,
      qa: triageHandoff?.qa,
    },
    conversation: {
      messages: [],
    },
  };
  const caseSummaryLabel =
    shownTier === "green" ? "整理观察要点" : "整理病情说明";
```

- [ ] **Step 6: Render the panel**

After:

```tsx
      <ReviewedNotice className="mt-3" />
```

Insert:

```tsx
      <CaseSummaryPanel
        source="report"
        label={caseSummaryLabel}
        payload={caseSummaryPayload}
        tier={shownTier}
        symptom={symptom}
        hasCatProfile={Boolean(cat)}
        hasTriageContext={true}
      />
```

- [ ] **Step 7: Run the harness to verify it passes**

Run:

```bash
npm run harness:case-summary
```

Expected:

```text
✅ case-summary checks passed
```

- [ ] **Step 8: Commit**

```bash
git add src/app/report/page.tsx scripts/harness-case-summary.mjs
git commit -m "feat: add report case summary entry"
```

---

### Task 6: Behavior Chat Entry

**Files:**
- Modify: `src/app/behavior/page.tsx`
- Modify: `scripts/harness-case-summary.mjs`

- [ ] **Step 1: Extend the harness with behavior-page checks**

Append this block before the final log line in `scripts/harness-case-summary.mjs`:

```js
{
  const behavior = read("src/app/behavior/page.tsx");
  includesAll(
    behavior,
    [
      'import { CaseSummaryPanel } from "@/components/CaseSummaryPanel";',
      "function hasMedicalConversation",
      "showCaseSummary",
      "总结现在情况",
      "<CaseSummaryPanel",
      "hasTriageContext={Boolean(medicalContext)}",
    ],
    "behavior page case summary",
  );
}
```

- [ ] **Step 2: Run the harness to verify it fails**

Run:

```bash
npm run harness:case-summary
```

Expected:

```text
❌ behavior page case summary missing: import { CaseSummaryPanel } from "@/components/CaseSummaryPanel";
```

- [ ] **Step 3: Modify imports in `src/app/behavior/page.tsx`**

Add:

```ts
import { CaseSummaryPanel } from "@/components/CaseSummaryPanel";
```

- [ ] **Step 4: Add the health gate helper**

Add this helper near `parseClaimIds`:

```ts
function hasMedicalConversation(messages: Msg[], memo: string, medicalContext: MedicalChatContext | null): boolean {
  if (medicalContext) return true;
  const text = [memo, ...messages.map((m) => m.content)].join("\n");
  return /打喷嚏|鼻涕|眼屎|流泪|咳嗽|呕吐|腹泻|拉稀|软便|便血|不吃|食欲|精神差|尿频|尿血|乱尿|排尿|耳朵|甩头|眼睛|皮肤|掉毛|牙龈|牙齿|口臭|流口水|跛|瘸|出血|误食|发烧|疼|痛|支原体|PCR|医院|医生|兽医/.test(text);
}
```

- [ ] **Step 5: Build the panel payload**

After `const empty = messages.length === 0;`, insert:

```ts
  const showCaseSummary =
    !empty && !loading && messages[messages.length - 1]?.role === "assistant" &&
    hasMedicalConversation(messages, memo, medicalContext);
  const caseSummaryPayload = {
    cat: catProfilePayload(cat),
    medical: medicalContext
      ? {
          symptom: medicalContext.symptom,
          symptomLabel: medicalContext.symptom
            ? SYMPTOM_LABELS[medicalContext.symptom] ?? medicalContext.symptom
            : undefined,
          tier: medicalContext.tier,
          claimIds: medicalContext.claimIds,
          report: medicalContext.report,
          qa: medicalContext.qa,
        }
      : { claimIds: [] },
    conversation: {
      memo,
      messages,
    },
  };
```

- [ ] **Step 6: Render the panel in the conversation area**

After the `FollowupChips` render block and before `{error && <ErrorRow ... />}`, insert:

```tsx
            {showCaseSummary && (
              <CaseSummaryPanel
                source="chat"
                label="总结现在情况"
                payload={caseSummaryPayload}
                tier={medicalContext?.tier}
                symptom={medicalContext?.symptom}
                hasCatProfile={Boolean(cat)}
                hasTriageContext={Boolean(medicalContext)}
              />
            )}
```

- [ ] **Step 7: Run the harness to verify it passes**

Run:

```bash
npm run harness:case-summary
```

Expected:

```text
✅ case-summary checks passed
```

- [ ] **Step 8: Commit**

```bash
git add src/app/behavior/page.tsx scripts/harness-case-summary.mjs
git commit -m "feat: add chat case summary entry"
```

---

### Task 7: Metadata-Only Analytics Events

**Files:**
- Create: `src/app/api/case-summary/events/route.ts`
- Modify: `scripts/harness-case-summary.mjs`

- [ ] **Step 1: Extend the harness with analytics checks**

Append this block before the final log line in `scripts/harness-case-summary.mjs`:

```js
{
  const route = read("src/app/api/case-summary/events/route.ts");
  includesAll(
    route,
    [
      "case-summary-events.jsonl",
      "case_summary_opened",
      "case_summary_generated",
      "case_summary_copied",
      "contentLength",
      "includesUnknown",
      "appendFile",
    ],
    "case-summary event route",
  );
  assert(
    !route.includes("doctorNote") && !route.includes("copyText"),
    "analytics route must not persist illness text fields",
  );
}
```

- [ ] **Step 2: Run the harness to verify it fails**

Run:

```bash
npm run harness:case-summary
```

Expected:

```text
❌ case-summary event route missing: case-summary-events.jsonl
```

- [ ] **Step 3: Implement `src/app/api/case-summary/events/route.ts`**

Create `src/app/api/case-summary/events/route.ts`:

```ts
// 病情说明最小埋点 —— 只记录 metadata,不记录完整病情文本。
import { promises as fs } from "node:fs";
import path from "node:path";
import { checkAndConsume, getClientIp, rateLimitMessage } from "@/lib/ratelimit";

export const runtime = "nodejs";

const DATA_DIR = process.env.CASE_SUMMARY_EVENT_DIR || path.join(process.cwd(), ".data");
const LOG_FILE = path.join(DATA_DIR, "case-summary-events.jsonl");

const EVENT_NAMES = new Set([
  "case_summary_opened",
  "case_summary_generated",
  "case_summary_copied",
  "case_summary_regenerated",
  "case_summary_from_report",
  "case_summary_from_chat",
]);

function text(raw: unknown, max = 80): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value ? value.slice(0, max) : null;
}

function bool(raw: unknown): boolean | null {
  return typeof raw === "boolean" ? raw : null;
}

function num(raw: unknown): number | null {
  return typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : null;
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "请求格式不对。" }, { status: 400 });
  }
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = text(b.name, 60);
  if (!name || !EVENT_NAMES.has(name)) {
    return Response.json({ error: "事件名不支持。" }, { status: 400 });
  }

  const rl = checkAndConsume(getClientIp(req), "feedback");
  if (!rl.ok) {
    return Response.json(
      { error: rateLimitMessage(rl.kind, rl.scope), code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  const meta = b.meta && typeof b.meta === "object" ? (b.meta as Record<string, unknown>) : {};
  const entry = {
    at: new Date().toISOString(),
    name,
    source: text(meta.source, 20),
    symptom: text(meta.symptom, 60),
    tier: text(meta.tier, 20),
    hasCatProfile: bool(meta.hasCatProfile),
    hasTriageContext: bool(meta.hasTriageContext),
    contentLength: num(meta.contentLength),
    includesUnknown: bool(meta.includesUnknown),
  };

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.appendFile(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: `保存失败 —— ${msg}` }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run the harness to verify it passes**

Run:

```bash
npm run harness:case-summary
```

Expected:

```text
✅ case-summary checks passed
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/case-summary/events/route.ts scripts/harness-case-summary.mjs
git commit -m "feat: log case summary events"
```

---

### Task 8: Final Verification

**Files:**
- Verify only; no planned source edits.

- [ ] **Step 1: Run all relevant harnesses**

Run:

```bash
npm run harness:case-summary
npm run harness:review-regressions
npm run harness:behavior-style
npm run harness:behavior-intent
npm run harness:agent-loop
npm run harness:triage
npm run harness:cat-context
npm run harness:medicine-policy
npm run triage:check
npm run medical:validate
```

Expected:

```text
all commands exit 0
```

- [ ] **Step 2: Run lint and build**

Run:

```bash
npm run lint
npm run build
```

Expected:

```text
eslint exits 0
next build exits 0
```

- [ ] **Step 3: Manual browser QA**

Use the Browser plugin or Playwright against `http://localhost:3000`:

```text
1. Open /symptoms.
2. Complete a sneeze or mouth triage flow to /report.
3. Confirm red/yellow report shows “整理病情说明”; green report shows “整理观察要点”.
4. Click the button.
5. Confirm a summary card appears with user summary, doctor-facing note, copy button, and regenerate button.
6. Click copy and confirm button text changes to “已复制”.
7. Open /behavior.
8. Ask a health question such as “猫牙龈红肿怎么办”.
9. After the assistant response, confirm “总结现在情况” appears.
10. Ask a daily-care question such as “猫半夜跑酷怎么办” in a fresh chat.
11. Confirm the summary button does not appear for routine daily-care chat.
```

Expected:

```text
Report and health-chat summary actions work; routine daily-care chat does not show the medical summary action.
```

- [ ] **Step 4: Commit final integration if needed**

If prior tasks were implemented in one session without per-task commits, run:

```bash
git add src/lib/case-summary.ts src/lib/case-summary-safety.ts src/app/api/case-summary/route.ts src/app/api/case-summary/events/route.ts src/components/CaseSummaryPanel.tsx src/app/report/page.tsx src/app/behavior/page.tsx scripts/harness-case-summary.mjs package.json
git commit -m "feat: add copyable case summaries"
```

Expected:

```text
[branch <sha>] feat: add copyable case summaries
```

---

## Self-Review

Spec coverage:

- Manual stage summary: covered by Task 5 and Task 6.
- Health-only boundary: covered by `isHealthCaseSummaryCandidate` in Task 1 and chat-page gate in Task 6.
- Structure-first, AI-second: covered by `CaseSummaryInput` and `buildCaseSummaryPrompt` in Task 1.
- Missing fields as “不详”: covered by Task 1 prompt and schema.
- No diagnosis/dosage/prescription purchase: covered by Task 1 prompt, Task 2 guard, Task 3 route safety block.
- Copyable plain text: covered by `renderCaseSummaryCopyText` and Task 4 copy button.
- Report and chat entries: covered by Task 5 and Task 6.
- Metadata-only analytics: covered by Task 7.
- Harness verification: covered by every task and Task 8.

Placeholder scan:

- No red-flag placeholder terms.
- No unspecified “add tests” step.
- No undefined type or function names used by later tasks.

Type consistency:

- `CaseSummaryInput`, `CaseSummaryOutput`, `CaseSummarySource`, and `CaseSummaryMode` are defined in Task 1 and reused consistently by Tasks 2-7.
- `copyText` is generated server-side and used by the panel copy action.
- Event names in the panel match the event route allowlist.
