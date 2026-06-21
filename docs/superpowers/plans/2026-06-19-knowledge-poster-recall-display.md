# Knowledge Poster Recall Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attach the generated mobile knowledge posters to chat answers through deterministic local-card recall, with red/yellow/green/care display modes.

**Architecture:** Add a pure shared type, a server-only poster selector that maps existing `medical.cardIds` and `agent.careCardIds` to `public/knowledge-posters/generated-style/manifest.json`, then emit one encoded `X-Knowledge-Poster` response header from `/api/behavior`. The `/behavior` client reads that header before streaming text, stores the attachment on the final assistant message, and renders it below the answer with a full-screen image viewer.

**Tech Stack:** Next.js 16 App Router Route Handlers, Web `Response`/Streams API, React 19 client components, TypeScript, localStorage persistence, existing Node harness scripts.

---

## File Structure

- Create `src/types/knowledge-poster.ts`: shared client/server attachment types and a runtime guard for parsed header data.
- Create `src/lib/knowledge-poster-attachments.ts`: server-only manifest loader, selector, header encoder.
- Create `scripts/harness-knowledge-poster-attachments.mjs`: static and live-manifest checks for selector/API/frontend integration points.
- Modify `package.json`: add `harness:knowledge-posters`.
- Modify `src/types/cat.ts`: allow assistant chat messages to persist an optional poster attachment.
- Modify `src/app/api/behavior/route.ts`: compute attachment from existing retrieval ids and emit `X-Knowledge-Poster` for successful streamed/non-streamed answers; expose dry-run preview.
- Modify `src/app/behavior/page.tsx`: parse the header, attach poster to final assistant message, render poster card/viewer, and avoid stale attachments on failures.

Implementation notes:

- Do not move existing medical/care recall logic.
- Do not pass poster metadata into the LLM prompt.
- Do not change the current `text/plain` streaming body.
- Do not touch generated poster image files.

---

### Task 1: Shared Types and Server Selector

**Files:**
- Create: `src/types/knowledge-poster.ts`
- Create: `src/lib/knowledge-poster-attachments.ts`
- Create: `scripts/harness-knowledge-poster-attachments.mjs`
- Modify: `package.json`
- Test: `npm run harness:knowledge-posters`

- [ ] **Step 1: Add the failing harness script**

Create `scripts/harness-knowledge-poster-attachments.mjs`:

```js
#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();

function read(rel) {
  const fullPath = path.join(ROOT, rel);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

function fail(message, detail) {
  console.error(`❌ ${message}`);
  if (detail) console.error(detail);
  process.exit(1);
}

function assert(condition, message, detail) {
  if (!condition) fail(message, detail);
}

function assertIncludes(source, needle, label) {
  assert(source.includes(needle), `${label}: missing ${needle}`);
}

function main() {
  console.log("══ Knowledge poster attachment harness ══");

  const manifestPath = path.join(ROOT, "public/knowledge-posters/generated-style/manifest.json");
  assert(fs.existsSync(manifestPath), "poster manifest missing");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert(manifest.count === 43, "manifest count should remain 43", JSON.stringify({ count: manifest.count }));
  assert(Array.isArray(manifest.items) && manifest.items.length === 43, "manifest items should remain 43");
  for (const item of manifest.items) {
    assert(item.id && item.title && item.image, "manifest item missing id/title/image", JSON.stringify(item));
    assert(fs.existsSync(path.join(ROOT, "public", item.image)), `poster file missing for ${item.id}`, item.image);
  }
  console.log("  ✓ manifest has 43 bound poster images");

  const typeSource = read("src/types/knowledge-poster.ts");
  assertIncludes(typeSource, 'KnowledgePosterDisplayMode = "inline" | "preview" | "collapsed"', "shared poster type");
  assertIncludes(typeSource, 'KnowledgePosterRiskTone = "red" | "yellow" | "green" | "care"', "shared poster type");
  assertIncludes(typeSource, "isKnowledgePosterAttachment", "shared poster guard");
  console.log("  ✓ shared poster types exist");

  const selectorSource = read("src/lib/knowledge-poster-attachments.ts");
  assertIncludes(selectorSource, "selectKnowledgePosterAttachment", "selector");
  assertIncludes(selectorSource, "selectKnowledgePosterFromItems", "pure selector");
  assertIncludes(selectorSource, "encodeKnowledgePosterHeader", "header encoder");
  assertIncludes(selectorSource, "cat-emergency-red-flags", "red priority");
  assertIncludes(selectorSource, "2048", "header size limit");
  console.log("  ✓ selector exports expected API");

  const routeSource = read("src/app/api/behavior/route.ts");
  assertIncludes(routeSource, "selectKnowledgePosterAttachment", "behavior route");
  assertIncludes(routeSource, "X-Knowledge-Poster", "behavior route");
  assertIncludes(routeSource, "posterAttachmentPreview", "behavior dryRun");
  console.log("  ✓ route integration points exist");

  const pageSource = read("src/app/behavior/page.tsx");
  assertIncludes(pageSource, "posterFromHeader", "behavior page");
  assertIncludes(pageSource, "PosterAttachmentCard", "behavior page");
  assertIncludes(pageSource, "PosterViewer", "behavior page");
  console.log("  ✓ frontend integration points exist");
}

main();
```

- [ ] **Step 2: Register the harness command**

Modify the `scripts` object in `package.json` and add:

```json
"harness:knowledge-posters": "node scripts/harness-knowledge-poster-attachments.mjs"
```

Keep the existing script order close to other behavior harnesses.

- [ ] **Step 3: Run the harness and verify it fails**

Run:

```bash
npm run harness:knowledge-posters
```

Expected output:

```text
══ Knowledge poster attachment harness ══
  ✓ manifest has 43 bound poster images
❌ shared poster type: missing KnowledgePosterDisplayMode = "inline" | "preview" | "collapsed"
```

- [ ] **Step 4: Create shared poster types**

Create `src/types/knowledge-poster.ts`:

```ts
export type KnowledgePosterDisplayMode = "inline" | "preview" | "collapsed";

export type KnowledgePosterRiskTone = "red" | "yellow" | "green" | "care";

export type KnowledgePosterAttachment = {
  id: string;
  title: string;
  image: string;
  displayMode: KnowledgePosterDisplayMode;
  riskTone: KnowledgePosterRiskTone;
  sourceDocs?: string[];
  reason?: string;
};

const DISPLAY_MODES = new Set<KnowledgePosterDisplayMode>([
  "inline",
  "preview",
  "collapsed",
]);

const RISK_TONES = new Set<KnowledgePosterRiskTone>([
  "red",
  "yellow",
  "green",
  "care",
]);

export function isKnowledgePosterAttachment(
  raw: unknown,
): raw is KnowledgePosterAttachment {
  if (!raw || typeof raw !== "object") return false;
  const value = raw as Partial<KnowledgePosterAttachment>;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.title === "string" &&
    value.title.length > 0 &&
    typeof value.image === "string" &&
    value.image.startsWith("/") &&
    DISPLAY_MODES.has(value.displayMode as KnowledgePosterDisplayMode) &&
    RISK_TONES.has(value.riskTone as KnowledgePosterRiskTone)
  );
}
```

- [ ] **Step 5: Create the server-only selector**

Create `src/lib/knowledge-poster-attachments.ts`:

```ts
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { RiskTier } from "@/types/cat";
import type {
  KnowledgePosterAttachment,
  KnowledgePosterDisplayMode,
  KnowledgePosterRiskTone,
} from "@/types/knowledge-poster";

const MANIFEST_PATH = path.join(
  process.cwd(),
  "public/knowledge-posters/generated-style/manifest.json",
);
const PUBLIC_ROOT = path.join(process.cwd(), "public");
const HEADER_LIMIT = 2048;

const RED_PRIORITY = [
  "cat-emergency-red-flags",
  "cat-dyspnea",
  "cat-urethral-obstruction",
  "cat-toxin-ingestion",
  "cat-seizure-neurologic-emergency",
  "cat-bleeding",
  "cat-trauma-first-aid",
];

type PosterManifestItem = {
  id: string;
  title: string;
  image: string;
  kind?: "medical" | "care";
  priority?: number;
  sourceDocs?: string[];
};

type PosterManifest = {
  items?: PosterManifestItem[];
};

export type KnowledgePosterSelectionInput = {
  medicalCardIds?: string[];
  careCardIds?: string[];
  tier?: RiskTier;
  intent?: string;
  query?: string;
};

let manifestCache: Promise<PosterManifestItem[]> | null = null;

export function resetKnowledgePosterManifestCacheForTests(): void {
  manifestCache = null;
}

function unique(values: string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values ?? []) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function displayFor(
  input: KnowledgePosterSelectionInput,
  hasMedicalCandidate: boolean,
): { displayMode: KnowledgePosterDisplayMode; riskTone: KnowledgePosterRiskTone } | null {
  if (input.tier === "red" || input.intent === "emergency") {
    return { displayMode: "inline", riskTone: "red" };
  }
  if (input.tier === "yellow") {
    return { displayMode: "preview", riskTone: "yellow" };
  }
  if (input.tier === "green") {
    return { displayMode: "collapsed", riskTone: "green" };
  }
  if (input.intent === "daily_care") {
    return { displayMode: "collapsed", riskTone: "care" };
  }
  if (hasMedicalCandidate) {
    return { displayMode: "preview", riskTone: "yellow" };
  }
  return null;
}

function priorityOf(item: PosterManifestItem, input: KnowledgePosterSelectionInput): number {
  const medicalIds = unique(input.medicalCardIds);
  const careIds = unique(input.careCardIds);
  const isRedMode = input.tier === "red" || input.intent === "emergency";
  if (isRedMode) {
    const redIndex = RED_PRIORITY.indexOf(item.id);
    if (redIndex >= 0) return redIndex;
    if (medicalIds.includes(item.id)) return 20 + medicalIds.indexOf(item.id);
  }
  if (item.id === "cat-emergency-red-flags") return 90;
  if (medicalIds.includes(item.id)) return 40 + medicalIds.indexOf(item.id);
  if (item.id === "cat-general-triage") return 80;
  if (careIds.includes(item.id)) return 120 + careIds.indexOf(item.id);
  return 500 + (item.priority ?? 999);
}

function reasonFor(item: PosterManifestItem, input: KnowledgePosterSelectionInput): string {
  if (input.tier) return `matched_${input.tier}_tier_card:${item.id}`;
  if (input.intent === "daily_care") return `matched_care_card:${item.id}`;
  return `matched_recalled_card:${item.id}`;
}

async function loadManifestItems(): Promise<PosterManifestItem[]> {
  if (manifestCache) return manifestCache;
  manifestCache = (async () => {
    const text = await readFile(MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(text) as PosterManifest;
    return Array.isArray(parsed.items) ? parsed.items : [];
  })();
  return manifestCache;
}

async function imageExists(publicPath: string): Promise<boolean> {
  if (!publicPath.startsWith("/")) return false;
  const fullPath = path.join(PUBLIC_ROOT, publicPath);
  const relative = path.relative(PUBLIC_ROOT, fullPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  try {
    await access(fullPath);
    return true;
  } catch {
    return false;
  }
}

export function selectKnowledgePosterFromItems(
  input: KnowledgePosterSelectionInput,
  items: PosterManifestItem[],
): KnowledgePosterAttachment | null {
  const medicalIds = unique(input.medicalCardIds);
  const careIds = unique(input.careCardIds);
  const hasMedicalIntent =
    Boolean(input.tier) ||
    input.intent === "emergency" ||
    input.intent === "medical_general" ||
    input.intent === "triage_followup";
  const wantedIds = hasMedicalIntent ? medicalIds : careIds;
  if (wantedIds.length === 0) return null;

  const candidates = items.filter((item) => wantedIds.includes(item.id));
  if (candidates.length === 0) return null;

  if (!input.tier && hasMedicalIntent) {
    if (candidates.length !== 1 || candidates[0].id === "cat-emergency-red-flags") {
      return null;
    }
  }

  const mode = displayFor(input, hasMedicalIntent);
  if (!mode) return null;

  const selected = [...candidates].sort(
    (a, b) => priorityOf(a, input) - priorityOf(b, input),
  )[0];

  return {
    id: selected.id,
    title: selected.title,
    image: selected.image,
    displayMode: mode.displayMode,
    riskTone: mode.riskTone,
    sourceDocs: selected.sourceDocs,
    reason: reasonFor(selected, input),
  };
}

export async function selectKnowledgePosterAttachment(
  input: KnowledgePosterSelectionInput,
): Promise<KnowledgePosterAttachment | null> {
  try {
    const items = await loadManifestItems();
    const existing: PosterManifestItem[] = [];
    for (const item of items) {
      if (!item.id || !item.title || !item.image) continue;
      if (await imageExists(item.image)) existing.push(item);
    }
    return selectKnowledgePosterFromItems(input, existing);
  } catch {
    return null;
  }
}

export function encodeKnowledgePosterHeader(
  attachment: KnowledgePosterAttachment | null,
): string | undefined {
  if (!attachment) return undefined;
  const full = encodeURIComponent(JSON.stringify(attachment));
  if (full.length <= HEADER_LIMIT) return full;

  const slim: KnowledgePosterAttachment = {
    id: attachment.id,
    title: attachment.title,
    image: attachment.image,
    displayMode: attachment.displayMode,
    riskTone: attachment.riskTone,
  };
  const encoded = encodeURIComponent(JSON.stringify(slim));
  return encoded.length <= HEADER_LIMIT ? encoded : undefined;
}
```

- [ ] **Step 6: Run the harness and confirm the next expected failure**

Run:

```bash
npm run harness:knowledge-posters
```

Expected output:

```text
══ Knowledge poster attachment harness ══
  ✓ manifest has 43 bound poster images
  ✓ shared poster types exist
  ✓ selector exports expected API
❌ behavior route: missing selectKnowledgePosterAttachment
```

- [ ] **Step 7: Commit Task 1**

Run:

```bash
git add package.json scripts/harness-knowledge-poster-attachments.mjs src/types/knowledge-poster.ts src/lib/knowledge-poster-attachments.ts
git commit -m "feat: add knowledge poster selector"
```

Expected result: commit succeeds with only these four files staged.

---

### Task 2: API Route Header Integration

**Files:**
- Modify: `src/app/api/behavior/route.ts`
- Test: `npm run harness:knowledge-posters`
- Test: `npm run build`

- [ ] **Step 1: Import the selector and header encoder**

Modify the imports in `src/app/api/behavior/route.ts`:

```ts
import {
  encodeKnowledgePosterHeader,
  selectKnowledgePosterAttachment,
} from "@/lib/knowledge-poster-attachments";
```

- [ ] **Step 2: Compute the poster attachment after medical, agent recall, and upstream tier parsing**

In `POST`, after:

```ts
  const upstreamTier = parseRiskTier(nestedMedical.tier ?? b.tier);
```

insert:

```ts
  const posterAttachment = await selectKnowledgePosterAttachment({
    medicalCardIds: medical.cardIds,
    careCardIds: agent.careCardIds,
    tier: upstreamTier,
    intent: intent.intent,
    query,
  });
  const posterHeader = encodeKnowledgePosterHeader(posterAttachment);
```

- [ ] **Step 3: Include dry-run poster preview**

In the dry-run `Response.json({ ... })` payload, add:

```ts
      posterAttachmentPreview: posterAttachment,
```

Place it near the existing `careCardIds` and `evidence` fields so harness output keeps related retrieval data together.

- [ ] **Step 4: Add the header to successful text responses**

Replace the current `headers` object:

```ts
    const headers = {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    };
```

with:

```ts
    const headers: Record<string, string> = {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    };
    if (posterHeader) {
      headers["X-Knowledge-Poster"] = posterHeader;
    }
```

Keep the existing guarded and streamed `new Response(..., { headers })` calls unchanged after this replacement.

- [ ] **Step 5: Run the static harness**

Run:

```bash
npm run harness:knowledge-posters
```

Expected output now reaches the frontend failure:

```text
══ Knowledge poster attachment harness ══
  ✓ manifest has 43 bound poster images
  ✓ shared poster types exist
  ✓ selector exports expected API
  ✓ route integration points exist
❌ behavior page: missing posterFromHeader
```

- [ ] **Step 6: Run the production build**

Run:

```bash
npm run build
```

Expected result: build succeeds. If it fails because unrelated dirty worktree files have errors, capture the first failing file path and do not edit unrelated files in this task.

- [ ] **Step 7: Commit Task 2**

Run:

```bash
git add src/app/api/behavior/route.ts
git commit -m "feat: attach poster metadata to behavior responses"
```

Expected result: commit succeeds with only `src/app/api/behavior/route.ts` staged.

---

### Task 3: Persistable Chat Message Attachment

**Files:**
- Modify: `src/types/cat.ts`
- Test: `npm run build`

- [ ] **Step 1: Import the shared type**

At the top of `src/types/cat.ts`, after the leading comment and before `export interface Vaccine`, add:

```ts
import type { KnowledgePosterAttachment } from "@/types/knowledge-poster";
```

- [ ] **Step 2: Extend `ChatMessage`**

Replace:

```ts
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
```

with:

```ts
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  poster?: KnowledgePosterAttachment;
}
```

No storage code change is needed in this task because `saveConversation` persists `messages` as JSON and the cookie fallback already strips `messages` from behavior records.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected result: build succeeds. If TypeScript reports a client/server import problem, verify that only `src/types/knowledge-poster.ts` is imported by `src/types/cat.ts`, not `src/lib/knowledge-poster-attachments.ts`.

- [ ] **Step 4: Commit Task 3**

Run:

```bash
git add src/types/cat.ts
git commit -m "feat: persist chat poster attachments"
```

Expected result: commit succeeds with only `src/types/cat.ts` staged.

---

### Task 4: Frontend Header Parsing and Message Binding

**Files:**
- Modify: `src/app/behavior/page.tsx`
- Test: `npm run harness:knowledge-posters`
- Test: `npm run build`

- [ ] **Step 1: Import shared chat and poster types**

Replace the existing type import block:

```ts
import type { Cat, CatRecord, RiskTier, Store } from "@/types/cat";
```

with:

```ts
import type { Cat, CatRecord, ChatMessage, RiskTier, Store } from "@/types/cat";
import type { KnowledgePosterAttachment } from "@/types/knowledge-poster";
import { isKnowledgePosterAttachment } from "@/types/knowledge-poster";
```

Replace the local `Msg` type:

```ts
type Msg = { role: "user" | "assistant"; content: string };
```

with:

```ts
type Msg = ChatMessage;
```

- [ ] **Step 2: Add the header parser**

Add this helper near `clientRegionPayload`:

```ts
function posterFromHeader(headers: Headers): KnowledgePosterAttachment | undefined {
  const raw = headers.get("X-Knowledge-Poster");
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return isKnowledgePosterAttachment(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 3: Read the poster header before streaming**

In `runChat`, after the successful response guard:

```ts
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "出了点问题,请稍后重试。");
        return;
      }
```

insert:

```ts
      const poster = posterFromHeader(res.headers);
```

- [ ] **Step 4: Attach poster only to completed assistant answers**

Replace this final message construction:

```ts
        const finalMsgs: Msg[] = [...msgs, { role: "assistant", content: acc }];
```

with:

```ts
        const assistantMsg: Msg = poster
          ? { role: "assistant", content: acc, poster }
          : { role: "assistant", content: acc };
        const finalMsgs: Msg[] = [...msgs, assistantMsg];
```

Leave the streaming update unchanged:

```ts
setMessages([...msgs, { role: "assistant", content: acc }]);
```

This keeps the poster from appearing until the answer has completed.

- [ ] **Step 5: Ensure partial network failures do not show stale posters**

Leave the `catch` partial message construction as a plain message:

```ts
const partial: Msg[] = [...msgs, { role: "assistant", content: acc }];
```

Do not add `poster` in the catch block.

- [ ] **Step 6: Run the harness and verify the next expected failure**

Run:

```bash
npm run harness:knowledge-posters
```

Expected output:

```text
══ Knowledge poster attachment harness ══
  ✓ manifest has 43 bound poster images
  ✓ shared poster types exist
  ✓ selector exports expected API
  ✓ route integration points exist
❌ behavior page: missing PosterAttachmentCard
```

- [ ] **Step 7: Commit Task 4**

Run:

```bash
git add src/app/behavior/page.tsx
git commit -m "feat: bind poster metadata to chat messages"
```

Expected result: commit succeeds with only `src/app/behavior/page.tsx` staged.

---

### Task 5: Poster Card and Full-Screen Viewer UI

**Files:**
- Modify: `src/app/behavior/page.tsx`
- Test: `npm run harness:knowledge-posters`
- Test: `npm run build`

- [ ] **Step 1: Add viewer state**

Inside `BehaviorContent`, near the existing state declarations:

```ts
  const [posterViewer, setPosterViewer] =
    useState<KnowledgePosterAttachment | null>(null);
```

- [ ] **Step 2: Add `PosterAttachmentCard`**

Add this component after `AssistantCard`:

```tsx
function PosterAttachmentCard({
  poster,
  onOpen,
}: {
  poster: KnowledgePosterAttachment;
  onOpen: (poster: KnowledgePosterAttachment) => void;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  const isInline = poster.displayMode === "inline";
  const actionText = poster.displayMode === "preview" ? "查看" : "展开";
  const toneColor =
    poster.riskTone === "red"
      ? "var(--red)"
      : poster.riskTone === "yellow"
        ? "var(--amber)"
        : poster.riskTone === "green"
          ? "var(--green)"
          : "var(--accent)";

  if (isInline) {
    return (
      <button
        type="button"
        onClick={() => onOpen(poster)}
        className="ml-8 max-w-[82%] self-start overflow-hidden rounded-[22px] border border-[var(--line)] bg-surface text-left shadow-[var(--shadow-card)]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--line-soft)] px-3.5 py-2.5">
          <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-ink-soft">
            <span
              className="size-1.5 rounded-full"
              style={{ background: toneColor }}
              aria-hidden="true"
            />
            相关图解
          </span>
          <span className="text-[11px] text-ink-faint">点开看大图</span>
        </div>
        <img
          src={poster.image}
          alt={`${poster.title}相关图解`}
          className="block aspect-[9/16] w-full object-cover"
          loading="lazy"
          onError={() => setHidden(true)}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(poster)}
      className="ml-8 flex max-w-[82%] items-center gap-3 self-start rounded-[20px] border border-[var(--line)] bg-surface px-3 py-2.5 text-left shadow-[var(--shadow-control)]"
    >
      <img
        src={poster.image}
        alt=""
        className="h-[70px] w-[44px] shrink-0 rounded-[9px] object-cover"
        loading="lazy"
        onError={() => setHidden(true)}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold text-ink">相关图解</span>
        <span className="mt-0.5 block truncate text-[12px] text-ink-soft">
          {poster.title}
        </span>
      </span>
      <span
        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
        style={{ background: toneColor }}
      >
        {actionText}
      </span>
    </button>
  );
}
```

- [ ] **Step 3: Add `PosterViewer`**

Add this component after `PosterAttachmentCard`:

```tsx
function PosterViewer({
  poster,
  onClose,
}: {
  poster: KnowledgePosterAttachment;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/92"
      role="dialog"
      aria-modal="true"
      aria-label={`${poster.title}相关图解`}
    >
      <div className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] text-white">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{poster.title}</p>
          <p className="mt-0.5 text-[11px] text-white/62">相关图解</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-white/12 text-[20px] text-white"
          aria-label="关闭图解"
        >
          ×
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <img
          src={poster.image}
          alt={`${poster.title}相关图解`}
          className="mx-auto block min-h-0 max-h-none w-full max-w-[430px] rounded-[18px] object-contain"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Render poster attachments after assistant messages**

In the `messages.map` render block, after the assistant card branch, keep the existing assistant card and add the poster card immediately after it.

Use this structure inside the `<Fragment>`:

```tsx
                {m.role === "user" ? (
                  <UserBubble text={m.content} />
                ) : (
                  <>
                    <AssistantCard
                      text={m.content}
                      streaming={loading && i === messages.length - 1}
                    />
                    {m.poster && (
                      <PosterAttachmentCard
                        poster={m.poster}
                        onOpen={setPosterViewer}
                      />
                    )}
                  </>
                )}
```

Keep the emergency banner check after this block.

- [ ] **Step 5: Render the viewer**

Near the end of the returned `<main>`, before the closing `</main>`, add:

```tsx
      {posterViewer && (
        <PosterViewer
          poster={posterViewer}
          onClose={() => setPosterViewer(null)}
        />
      )}
```

- [ ] **Step 6: Run the harness**

Run:

```bash
npm run harness:knowledge-posters
```

Expected output:

```text
══ Knowledge poster attachment harness ══
  ✓ manifest has 43 bound poster images
  ✓ shared poster types exist
  ✓ selector exports expected API
  ✓ route integration points exist
  ✓ frontend integration points exist
```

- [ ] **Step 7: Run the production build**

Run:

```bash
npm run build
```

Expected result: build succeeds.

- [ ] **Step 8: Commit Task 5**

Run:

```bash
git add src/app/behavior/page.tsx
git commit -m "feat: show recalled knowledge posters in chat"
```

Expected result: commit succeeds with only `src/app/behavior/page.tsx` staged.

---

### Task 6: Live Dry-Run QA

**Files:**
- No planned source edits unless a previous task produced a bug.
- Test: local dev server and dry-run API calls.

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev
```

Expected output includes:

```text
Local:        http://localhost:3000
```

If port 3000 is occupied, use the printed port in the next steps.

- [ ] **Step 2: Verify red-tier preview**

Run from another shell:

```bash
node - <<'NODE'
fetch("http://localhost:3000/api/behavior", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    dryRun: true,
    messages: [{ role: "user", content: "猫张口喘,呼吸很费力" }],
    medical: { symptom: "breath", tier: "red", claimIds: ["bre_001"] },
    region: { locale: "zh-CN", timeZone: "Asia/Shanghai" }
  })
}).then(r => r.json()).then(j => {
  const p = j.posterAttachmentPreview;
  if (!p || p.displayMode !== "inline" || p.riskTone !== "red") {
    throw new Error(JSON.stringify(p));
  }
  console.log("red poster ok", p.id, p.displayMode, p.riskTone);
});
NODE
```

Expected output:

```text
red poster ok cat-emergency-red-flags inline red
```

- [ ] **Step 3: Verify yellow-tier preview**

Run:

```bash
node - <<'NODE'
fetch("http://localhost:3000/api/behavior", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    dryRun: true,
    messages: [{ role: "user", content: "今天吐了两次,精神还可以" }],
    medical: { symptom: "vomit", tier: "yellow", claimIds: ["vom_001"] },
    region: { locale: "zh-CN", timeZone: "Asia/Shanghai" }
  })
}).then(r => r.json()).then(j => {
  const p = j.posterAttachmentPreview;
  if (!p || p.displayMode !== "preview" || p.riskTone !== "yellow") {
    throw new Error(JSON.stringify(p));
  }
  console.log("yellow poster ok", p.id, p.displayMode, p.riskTone);
});
NODE
```

Expected output:

```text
yellow poster ok cat-vomiting preview yellow
```

- [ ] **Step 4: Verify care collapsed preview**

Run:

```bash
node - <<'NODE'
fetch("http://localhost:3000/api/behavior", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    dryRun: true,
    messages: [{ role: "user", content: "怎么让猫慢慢接受剪指甲?" }],
    region: { locale: "zh-CN", timeZone: "Asia/Shanghai" }
  })
}).then(r => r.json()).then(j => {
  const p = j.posterAttachmentPreview;
  if (!p || p.id !== "care-nail-trimming" || p.displayMode !== "collapsed") {
    throw new Error(JSON.stringify(p));
  }
  console.log("care poster ok", p.id, p.displayMode, p.riskTone);
});
NODE
```

Expected output:

```text
care poster ok care-nail-trimming collapsed care
```

- [ ] **Step 5: Manual mobile UI check**

Open:

```text
http://localhost:3000/behavior
```

Use the existing UI to ask:

```text
怎么让猫慢慢接受剪指甲?
```

Expected:

- The assistant text streams first.
- After completion, one "相关图解" collapsed row appears below the assistant answer.
- Tapping the row opens a full-screen poster viewer.
- Closing the viewer returns to the same scroll position.

- [ ] **Step 6: Commit QA fixes if any**

If Task 6 required source changes, commit only those files:

```bash
git add src/app/api/behavior/route.ts src/app/behavior/page.tsx src/lib/knowledge-poster-attachments.ts
git commit -m "fix: polish knowledge poster recall display"
```

If no source changes were needed, do not create a commit.

---

## Final Verification

Run:

```bash
npm run harness:knowledge-posters
npm run build
```

Expected:

```text
✓ frontend integration points exist
```

and a successful Next.js production build.

Then inspect:

```bash
git status --short
```

Expected:

- Only pre-existing unrelated dirty files remain.
- Files from this plan are either committed or intentionally staged for the final commit.
