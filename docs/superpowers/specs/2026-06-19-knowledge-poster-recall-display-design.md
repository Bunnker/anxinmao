# Knowledge Poster Recall Display Design

## Goal

Use the generated cat-care knowledge posters as controlled supporting media in the chat answer flow. When the app recalls a local knowledge card for a user question, it should attach the matching poster to the assistant message in a way that helps the user understand the next step without turning the chat into a gallery or implying diagnosis.

This design covers the first implementation slice for `/api/behavior` and `/behavior`: one assistant answer can show at most one poster attachment, selected from `public/knowledge-posters/generated-style/manifest.json`.

## Current Context

- The local knowledge base has medical cards under `docs/medical/ai-cards` and care cards under `docs/care/ai-cards`.
- Medical answer generation already produces `medical.cardIds` through `buildMedicalKnowledgeContext`.
- Care answer generation already produces `agent.careCardIds` through `runBehaviorAgentTools`.
- The generated poster manifest lives at `public/knowledge-posters/generated-style/manifest.json` and binds poster ids to image paths, titles, source docs, tags, priority, and generation metadata.
- The behavior chat currently streams `text/plain` from `/api/behavior`; the frontend reads `res.body` incrementally and renders a plain assistant message.

## Product Decision

Use risk-tier based display:

- Red / emergency health answers: show one inline poster after the answer text.
- Yellow health answers: show a compact "related illustration" preview row after the answer text.
- Green health answers and daily care / behavior answers: show a collapsed poster row after the answer text.
- No clear match, casual chat, or answer failure: show no poster.

The poster is supporting educational media. It is never presented as a diagnosis, test result, medical proof, or a replacement for veterinary care.

## Non-Goals

- Do not let the LLM choose arbitrary images or output Markdown image links.
- Do not add multi-poster carousels in the first version.
- Do not change the core risk-tier decision rules.
- Do not replace the current text answer with an image-first experience.
- Do not expose local `sourceDocs` paths to normal users.
- Do not make the generated poster itself part of the model prompt.

## Approach Options Considered

### Recommended: Server-Selected Attachment Metadata

The server uses the already-selected card ids to choose a poster and returns structured attachment metadata. The frontend renders the attachment after the streamed text.

Benefits:
- Reuses the same recall result as the actual answer.
- Keeps image selection deterministic and testable.
- Prevents model-generated image placement.
- Allows display rules to be centralized and safe.

Trade-off:
- The existing `text/plain` stream needs a small metadata channel.

### Alternative: Frontend-Only Matching

The frontend reads the manifest and tries to match the user question, URL handoff, or local message state to a poster.

Rejected for the first version because it can drift from the actual server-side retrieval and risk rules.

### Alternative: Full SSE Protocol

Convert `/api/behavior` into a structured SSE stream that emits metadata and text chunks separately.

Deferred because it is a larger transport change. It may be worth doing later, but the first version should preserve the existing streaming behavior as much as possible.

## Data Model

Add a server-side attachment type:

```ts
export type KnowledgePosterDisplayMode = "inline" | "preview" | "collapsed";

export type KnowledgePosterRiskTone = "red" | "yellow" | "green" | "care";

export type KnowledgePosterAttachment = {
  id: string;
  title: string;
  image: string;
  sourceDocs?: string[];
  displayMode: KnowledgePosterDisplayMode;
  riskTone: KnowledgePosterRiskTone;
  reason?: string;
};
```

The `image` value must be a public path from the manifest, for example `/knowledge-posters/generated-style/cat-dyspnea-xhs-style-v1.png`.

The frontend message model should gain an optional attachment field:

```ts
type Msg = {
  role: "user" | "assistant";
  content: string;
  poster?: KnowledgePosterAttachment;
};
```

Persisted behavior conversations should keep the attachment with the assistant message so returning to "recent questions" restores the same visual context.

## Selection Rules

### Inputs

The selector receives:

- `medical.cardIds`
- `agent.careCardIds`
- current `tier`
- `intent.intent`
- user query
- poster manifest items

### Candidate Matching

For each card id:

- Match manifest `item.id === cardId`.
- Ignore items with missing image files.
- Ignore items without an image path.

Medical candidates and care candidates share the same output type, but medical candidates win when the current answer has a health intent or an upstream tier.

### Display Mode

- `tier === "red"` or `intent.intent === "emergency"` -> `inline`, `riskTone: "red"`.
- `tier === "yellow"` -> `preview`, `riskTone: "yellow"`.
- `tier === "green"` -> `collapsed`, `riskTone: "green"`.
- `intent.intent === "daily_care"` -> `collapsed`, `riskTone: "care"`.
- Other medical answers without tier -> `preview` only when there is exactly one medical candidate and that candidate is not `cat-emergency-red-flags`; otherwise no poster.

### Priority

When multiple posters match, select one:

1. Red / emergency priority:
   - `cat-emergency-red-flags`
   - directly matched red-flag cards such as `cat-dyspnea`, `cat-urethral-obstruction`, `cat-toxin-ingestion`, `cat-seizure-neurologic-emergency`, `cat-bleeding`, `cat-trauma-first-aid`
   - other medical cards
2. Yellow / green health priority:
   - current symptom card
   - claim-matched card
   - `cat-general-triage`
   - `cat-emergency-red-flags` only if no more specific card exists
3. Daily care priority:
   - highest-scoring `agent.careCardIds[0]`
   - no fallback to unrelated medical posters

The first version always returns at most one poster.

## API Transport

Preserve the existing text streaming response and return poster metadata in a response header:

```http
X-Knowledge-Poster: <url-encoded JSON KnowledgePosterAttachment>
```

Rules:

- The header is omitted when no poster should be shown.
- The header contains only one attachment object.
- If the encoded header would exceed 2 KB, omit optional `sourceDocs` and `reason`; if it still exceeds 2 KB, omit the header entirely.
- The required frontend fields are `id`, `title`, `image`, `displayMode`, and `riskTone`.
- The body remains `text/plain; charset=utf-8`.

This lets the frontend read `res.headers.get("X-Knowledge-Poster")` before consuming the stream, while keeping the current incremental answer rendering.

## Frontend Behavior

When `runChat` receives the response:

1. Read and parse `X-Knowledge-Poster` before streaming body chunks.
2. Continue rendering the assistant text exactly as today while chunks arrive.
3. When the stream finishes, attach the parsed poster to the final assistant message.
4. If the stream fails before producing a usable answer, discard the poster.
5. Persist the poster with the assistant message.

Rendering:

- `inline`: full-width poster preview below the assistant bubble, constrained to the chat column. It shows the complete 9:16 image with a title strip and opens the full-screen viewer on tap.
- `preview`: compact row with thumbnail, title, one-line label, and "查看".
- `collapsed`: compact row with thumbnail, title, one-line label, and "展开".
- All modes open the same full-screen viewer.

Viewer:

- Mobile-first full-screen overlay.
- Dark backdrop.
- Full poster image with pinch/scroll-safe layout.
- Close action always visible.
- Optional save/share affordance can be added later; first version only needs close.

Copy labels:

- Use "相关图解".
- Do not use "诊断依据", "医生建议", "检查结果", or "治疗方案".

## Safety Rules

- The poster is always below the assistant text; it must not replace or precede urgent instructions.
- Red answers must still say "立刻就医 / 急诊 / 现在送医" when required by the existing tier rules.
- A poster must not soften a red-tier answer into home care.
- Poster metadata must never be given to the LLM as an instruction to include images.
- If a poster image is missing or fails to load, hide the attachment and keep the text answer.
- If attachment JSON cannot be parsed, ignore it.
- If answer generation fails, do not show the poster.
- Do not display `sourceDocs` paths in the user UI.

## Error Handling

- Manifest read failure: log in development if useful, but answer normally with no poster.
- Manifest item exists but file is missing: omit that candidate.
- Header parse failure on frontend: ignore the header.
- Image load failure: hide image area and leave the answer unchanged.
- Restored conversation with stale image path: hide only the stale attachment.

## Testing Plan

Add focused harness coverage:

- Red tier with `cat-dyspnea` returns `inline` and red tone.
- Yellow tier with vomiting returns `preview`.
- Green tier with a medical card returns `collapsed`.
- Daily care question about nail trimming returns `collapsed` from `care-nail-trimming`.
- No card id returns no header.
- Missing manifest item returns no header.
- The selected attachment never includes more than one poster.

Add frontend behavior checks:

- Streamed text still updates incrementally.
- Final assistant message stores the poster attachment only after the response completes.
- Retry does not reuse a stale poster from the failed request.
- Persisted conversation restores the poster attachment.
- Image load failure does not affect the text answer.

## Implementation Boundary

The first implementation should be limited to:

- A server-side poster manifest loader and selector.
- `/api/behavior` integration that emits `X-Knowledge-Poster`.
- Frontend message type update and rendering components for inline / preview / collapsed.
- A simple full-screen image viewer.
- Harness tests for selector and behavior route dry-run or mocked response behavior.

Leave multi-image galleries, analytics, image save/share, and SSE transport for later.
