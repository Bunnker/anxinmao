# 毛孩子页(/pets)重做 + 完整多猫 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development(推荐)或 superpowers:executing-plans 逐任务实施。步骤用 `- [ ]` 勾选跟踪。

**Goal:** 新建 `/pets` 档案展示页(多猫切换 + hero + 四宫格 + 生活相册照片墙[可单独编辑] + 健康档案 + 体重曲线 + 健康背景 + 健康足迹 + 健康记录全部可看),`/onboarding` 退为编辑/添加表单;落地完整多猫(切换/添加/删除)。

**Architecture:** 数据层 `Store.cats[]/activeCatId` 已支持多猫,新增 `addCat/setActiveCat/deleteCat`(沿用 `updateRecordOutcome` 的 load→mutate→saveStore→return 模式)。把 onboarding 里现有的 `WeightSparkline/HealthFootprint/ageLabel/careStatus/相册逻辑` 抽成共享组件供 /pets 与 onboarding 复用(DRY,不重写退化)。/pets 是「视图」,onboarding 转为「编辑/添加表单」(去掉原查看态 GroupCards,保留编辑表单 + 分组直达锚)。

**Tech Stack:** Next.js 16 App Router / React 19 / TypeScript / Tailwind v4。视觉源真相:原型 `public/_proto/pets-proto.html` + `prototype/claude-design/shared.css`(令牌 `--bg/--card/--terra/--terra-tint/--ink*/--serif/--soft-sm` 等;App 内对应 `--paper/--surface/--accent/--accent-tint/--ink*`)。设计稿 `毛孩子.html`/`毛孩子-编辑.html`。

**红线(全程不变):** 风险三色(`--red/--amber/--green`)只用于「真分诊 tier 点 / 健康足迹 tier 统计条」;care 徽章、性别 chip、开关、选中态、加号一律陶土红/中性灰/装饰专色,绝不取风险盘;装饰色不进 :root token(内联常量)。医疗不出现「诊断」;Disclaimer 每屏底固定。AI/CatFace 头像仅身份陪伴、不进医学图。生活照仅本地橱窗、不参与分诊、≤6 张/≤5MB。NOT_A_CAT 守门保留。

**Spec:** `docs/superpowers/specs/2026-06-16-pets-page-multicat-design.md`(已含拍板:手动记一笔本批不做;提醒开关做 UI 存偏好不真推送)。

---

## 文件结构

- 新增 `src/app/pets/page.tsx` —— /pets 展示页(主体)。
- 新增 `src/lib/profile.ts` —— 纯函数:`ageLabel` / `careStatus` / `companionDays`(供 /pets + onboarding 复用)。
- 新增 `src/components/profile/WeightSparkline.tsx`、`src/components/profile/HealthFootprint.tsx` —— 从 onboarding 抽出的展示组件。
- 改 `src/types/cat.ts` —— 加 `Cat.reminders`。
- 改 `src/lib/storage.ts` —— 加 `addCat/setActiveCat/deleteCat`。
- 改 `src/app/onboarding/page.tsx` —— 改用共享 profile 组件;读 `?pet/?add` + 添加/删除 + 提醒开关;转为编辑表单(去查看态 GroupCards)。
- 改 `src/components/TabBar.tsx` —— 毛孩子 href `/onboarding`→`/pets`、`SHOW_PATHS` 同步。
- 改 `CLAUDE.md` —— 多猫红线反转。
- 删 `public/_proto/`(原型脚手架,收尾清掉)。

每个 UI 任务的验证统一为:`npm run build`(含类型检查)过 + `npm run lint` 无新错 + preview 三宽度(360/393/430)实操。本仓库无单测框架,逻辑正确性靠 preview 实际操作 + build 验证。

---

## Task 1:数据模型 —— Cat.reminders

**Files:** Modify `src/types/cat.ts`

- [ ] **Step 1:** 在 `Cat` interface 的 `weightLog?` 之后加提醒偏好字段:

```ts
  // 健康提醒偏好(编辑页开关存这里,随猫走云同步)。仅存偏好,本批不接真实推送。
  // 默认 vaccine/deworm 开、weight 关(读取时用 ?? 兜底,见 onboarding 提醒开关)。
  reminders?: { vaccine: boolean; deworm: boolean; weight: boolean };
```

- [ ] **Step 2:** Run `npm run build`，期望编译通过(纯类型新增,无破坏)。
- [ ] **Step 3:** Commit `feat(types): Cat 加 reminders 提醒偏好字段`。

---

## Task 2:storage 多猫操作(addCat/setActiveCat/deleteCat)

**Files:** Modify `src/lib/storage.ts`(在 `updateRecordOutcome` 之后追加)

- [ ] **Step 1:** 追加三个多猫操作函数(沿用现有 load→mutate→saveStore→return 模式):

```ts
// ── 多猫操作(数据层早已是 cats[] + activeCatId;以下是切换/添加/删除的写入口)──
// 都返回更新后的 store(失败返回 null),方便调用方就地 setState。

// 添加一只猫(由编辑表单 newCat() 构造好传入),追加并设为活动猫。
export function addCat(cat: Cat): Store | null {
  if (typeof window === "undefined") return null;
  const store = loadStore() ?? { cats: [], activeCatId: null, records: [] };
  const next: Store = { ...store, cats: [...store.cats, cat], activeCatId: cat.id };
  saveStore(next);
  return next;
}

// 切换活动猫(id 不存在则原样不动返回 null)。
export function setActiveCat(id: string): Store | null {
  if (typeof window === "undefined") return null;
  const store = loadStore();
  if (!store || !store.cats.some((c) => c.id === id)) return null;
  const next: Store = { ...store, activeCatId: id };
  saveStore(next);
  return next;
}

// 删除一只猫:连带删它的 records;活动猫被删则改指向剩余第一只(无则 null)。
// 删到 0 只时 cats:[] 写回 —— loadStore 对空 cats 返回 null,首页/档案页自然回到新建流程。
export function deleteCat(id: string): Store | null {
  if (typeof window === "undefined") return null;
  const store = loadStore();
  if (!store) return null;
  const cats = store.cats.filter((c) => c.id !== id);
  const records = store.records.filter((r) => r.catId !== id);
  const activeCatId =
    store.activeCatId === id ? (cats[0]?.id ?? null) : store.activeCatId;
  const next: Store = { cats, activeCatId, records };
  saveStore(next);
  return next;
}
```

- [ ] **Step 2:** Run `npm run build`，期望通过。
- [ ] **Step 3:** Commit `feat(storage): 多猫 addCat/setActiveCat/deleteCat`。

---

## Task 3:抽出共享 profile 组件 / 工具(不重写退化)

**Files:** Create `src/lib/profile.ts`、`src/components/profile/WeightSparkline.tsx`、`src/components/profile/HealthFootprint.tsx`;Modify `src/app/onboarding/page.tsx`(改为 import 共享版,删本地副本)

现状:`ageLabel`(onboarding:106)、`WeightSparkline`(133)、`HealthFootprint`(299)是 onboarding 内部局部定义。抽成共享供 /pets 复用。

- [ ] **Step 1:** 读 `src/app/onboarding/page.tsx` 三处实现(`ageLabel`、`WeightSparkline`、`HealthFootprint`),原样剪到新文件:
  - `src/lib/profile.ts`:`export function ageLabel(months: number): string`(原样搬)。再新增两个纯函数:

```ts
import type { Cat, CatRecord } from "@/types/cat";

// 陪伴天数:今天 − homeDate(无 homeDate 返回 0)。
export function companionDays(homeDate: string): number {
  if (!homeDate) return 0;
  const d = new Date(homeDate);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

// 护理状态派生(疫苗/驱虫/绝育)。status 仅 done/due/no —— 渲染层用中性/陶土红,绝不映射风险三色。
export type CareStatus = "done" | "due" | "no";
export function careStatus(cat: Cat): {
  vaccine: { sub: string; status: CareStatus; label: string };
  deworm: { sub: string; status: CareStatus; label: string };
  neuter: { sub: string; status: CareStatus; label: string };
} {
  const lastVac = cat.vaccines?.[cat.vaccines.length - 1];
  const vaccine = lastVac
    ? { sub: `${cat.vaccines.length} 针 · 上次 ${lastVac.date}`, status: "done" as const, label: "已完成" }
    : { sub: "还没有记录", status: "no" as const, label: "未记录" };
  // 驱虫:有日期且距今 ≤35 天=已完成,否则=本月待做;无日期=未记录。
  const dwDays = cat.deworm ? Math.floor((Date.now() - new Date(cat.deworm).getTime()) / 86400000) : null;
  const deworm =
    dwDays === null
      ? { sub: "还没有记录", status: "no" as const, label: "未记录" }
      : dwDays <= 35
        ? { sub: `上次 ${cat.deworm}`, status: "done" as const, label: "已完成" }
        : { sub: `上次 ${cat.deworm} · 该做了`, status: "due" as const, label: "本月待做" };
  const neuter =
    cat.neutered === "是"
      ? { sub: "已完成", status: "done" as const, label: "已绝育" }
      : { sub: "6–8 月龄可咨询医生", status: "no" as const, label: "未安排" };
  return { vaccine, deworm, neuter };
}
```

  - `src/components/profile/WeightSparkline.tsx`:把 onboarding 的 `WeightSparkline` 函数原样搬入并 `export`(保留其无依赖 SVG 实现,`"use client"` 顶部)。
  - `src/components/profile/HealthFootprint.tsx`:把 onboarding 的 `HealthFootprint` 函数原样搬入并 `export`(`"use client"` 顶部;它接 `records: CatRecord[]`)。
- [ ] **Step 2:** 在 `src/app/onboarding/page.tsx`:删掉本地 `ageLabel`/`WeightSparkline`/`HealthFootprint` 定义,改顶部 import:

```ts
import { ageLabel, companionDays, careStatus } from "@/lib/profile";
import { WeightSparkline } from "@/components/profile/WeightSparkline";
import { HealthFootprint } from "@/components/profile/HealthFootprint";
```

- [ ] **Step 3:** Run `npm run build` + `npm run lint`,期望通过(若 HealthFootprint/WeightSparkline 内部用到 onboarding 别的局部量,一并搬或改参数传入)。
- [ ] **Step 4:** Preview 打开 `/onboarding`,确认体重曲线 / 健康足迹仍正常渲染(回归)。
- [ ] **Step 5:** Commit `refactor(profile): 抽出 ageLabel/careStatus/WeightSparkline/HealthFootprint 共享`。

---

## Task 4:/pets 骨架 —— 切换条 + Hero + 四宫格

**Files:** Create `src/app/pets/page.tsx`

视觉对照 `public/_proto/pets-proto.html` 的 `.phero/.switcher/.pchip/.pcard/.avslot/.pmeta/.statrow`(类样式见原型 `<style>`;App 内色用 `--accent`/`--accent-tint`/`--paper`/`--surface`/`--ink*`,**装饰橘渐变/性别色写内联常量,不进 token**)。

- [ ] **Step 1:** 新建 `src/app/pets/page.tsx`(`"use client"`)。加载 store(复用首页 `loadStore`+`pullHistory` 兜底套路;无猫则 `<Welcome onUseTemplate=…>` 或重定向 `/onboarding`)。state:`store/cat/records/loaded`,`active = cat`。

- [ ] **Step 2:** 顶部 `phero` 容器(暖橘渐变内联)内渲染:
  - topbar:衬线「毛孩子」。
  - **switcher**:`store.cats.map` → chip(`CatFace` 30px 头像 + 名;活动猫陶土红描边);点 chip 调 `setActiveCat(c.id)` 后 `setStore/setCat/setRecords` 就地切换。末尾「+」chip → `Link href="/onboarding?add=1"`。
  - **pcard**:`avslot`(88px,`cat.avatar` 有则 `<img>` 否则 `<CatFace size={74}>`;右下相机角标 `Link href={"/onboarding?pet="+cat.id}`)+ `editmini`「编辑档案」`Link href={"/onboarding?pet="+cat.id}`;`pmeta`:名 + 性别 chip(性别色内联:雌`#c77fa0/#fbeaf1`、雄`#5a90c2/#e6f0f8`、不确定中性)+ 一行 `品种 · 毛色 · ageLabel(月龄)` + tags(`体重kg`/驱虫态/绝育态 由 `careStatus` 文案派生)。
  - **statrow**:四格 年龄`ageLabel`/体重`kg`/健康记录`records.length`/陪伴`companionDays(cat.homeDate)天`。

- [ ] **Step 3:** Run `npm run build`。直接 preview 访问 `http://localhost:3000/pets`(TabBar 暂未指向它,直接输 URL)。三宽度看 hero + 切换条;点 chip 切换猫,确认 hero/stat 随之变。
- [ ] **Step 4:** Commit `feat(pets): /pets 骨架(多猫切换条 + hero + 四宫格)`。

---

## Task 5:/pets 生活相册照片墙(展示 + 单独编辑)

**Files:** Modify `src/app/pets/page.tsx`;(相册增删逻辑参考 onboarding `onAlbumUpload`/`removeAlbumPhoto`:285-300 区与 548-566)

视觉对照原型 `.album/.pcell/.padd-cell`(3 列网格、aspect-1、圆角16、`--accent-tint` 底、虚线添加格、首格「主图」角标)。

- [ ] **Step 1:** 加 `sec-h`「生活相册」+ 右「编辑 ›」(切换 `albumEdit` 布尔态)。展示态:`(cat.photos ?? []).map` 渲染 `pcell`(`<img object-cover>`;`cat.avatar===photo` 或 index0 标「主图」)+ 末位「添加」格(file input multiple)。空态:虚线添加格 + 「还没有生活照」。底部 note「最多 6 张 · 仅本地展示,不参与分诊判断」。
- [ ] **Step 2:** 上传/删除复用逻辑(直接在 /pets 内实现,写 `cat.photos` 后 `persistCat`):

```ts
const MAX_PROFILE_PHOTOS = 6;
async function onAlbumUpload(e: ChangeEvent<HTMLInputElement>) {
  const files = Array.from(e.target.files ?? []);
  e.target.value = "";
  if (!cat || !files.length) return;
  const usable = files.filter((f) => f.size <= 5 * 1024 * 1024).slice(0, MAX_PROFILE_PHOTOS);
  const dataUrls = await Promise.all(usable.map(fileToDataUrl)); // fileToDataUrl 同 onboarding 实现,复制进来或抽 lib
  persistCat({ ...cat, photos: [...(cat.photos ?? []), ...dataUrls].slice(0, MAX_PROFILE_PHOTOS) });
}
function removeAlbumPhoto(i: number) {
  if (!cat) return;
  persistCat({ ...cat, photos: (cat.photos ?? []).filter((_, idx) => idx !== i) });
}
function setCover(photo: string) { if (cat) persistCat({ ...cat, avatar: photo }); }
```
  其中 `persistCat(nextCat)` = 写 `store.cats` 对应项 + `saveStore` + `setStore/setCat`(照首页 `persistCat` 写)。`fileToDataUrl` 从 onboarding 复制或抽到 `src/lib/profile.ts` 复用。

- [ ] **Step 3:** **单独编辑态**(`albumEdit`):每格右上 `×`(`removeAlbumPhoto(i)`)+ 点格上滑 `.scrim+.sheet`(复用原型 sheet 范式)出「设为主图 `setCover` / 删除 / 替换」`.opt2` 选项;「添加」格触发上传。「设为主图」即写 `cat.avatar`(兼容现有 AI 头像)。
- [ ] **Step 4:** Run `npm run build`。preview `/pets`:上传 2 张图、删 1 张、设主图、退出编辑态确认展示;三宽度看网格不挤不裁。
- [ ] **Step 5:** Commit `feat(pets): 生活相册照片墙(展示 + 单独编辑:增删/设主图/替换)`。

---

## Task 6:/pets 健康档案 + 体重曲线 + 健康背景

**Files:** Modify `src/app/pets/page.tsx`

视觉对照原型 `.care/.crow/.cs(.done/.due/.no)`、`.wcard`、`.bg-card`。

- [ ] **Step 1:** **健康档案**:`sec-h`「健康档案」+「管理 ›」(`Link href={"/onboarding?pet="+cat.id}`)。`careStatus(cat)` 派生三行(疫苗/驱虫/绝育):icon + 标题 + sub + 状态徽章。**徽章色严守红线(内联,不取风险盘)**:`done`→`color:var(--accent);background:var(--accent-tint)`;`due`→`color:#8a6f54;background:#f0ebe2`;`no`→`color:var(--ink-soft);background:#efece6`。
- [ ] **Step 2:** **体重曲线**:`sec-h`「体重」+「记一笔 ›」(→ `/onboarding?pet=id`)。`(cat.weightLog?.length ?? 0) >= 2` → `<WeightSparkline log={cat.weightLog!} />`(共享组件);否则给「记满 2 次出现曲线」引导文案。
- [ ] **Step 3:** **健康背景**:`sec-h`「健康背景」+「编辑 ›」(→ `/onboarding?pet=id`)。`bg-card` 三行 慢性病史/过敏史/其它备注(`cat.chronicConditions/allergies/notes`,空显灰引导「未填 —— 填了分诊会替它考虑」)。
- [ ] **Step 4:** Run `npm run build`。preview 三宽度看三区;确认 care 徽章**无红黄绿**(用 devtools/preview_inspect 核对徽章 color 是 `--accent`/中性,非 `--red/--amber/--green`)。
- [ ] **Step 5:** Commit `feat(pets): 健康档案(中性徽章)+ 体重曲线 + 健康背景`。

---

## Task 7:/pets 健康记录(健康足迹 + timeline + 查看全部)

**Files:** Modify `src/app/pets/page.tsx`(记录跳转复用首页 `recordHref`:`src/app/page.tsx:1784` —— 抽到 `src/lib/profile.ts` 或 import 复用)

视觉对照原型 `.foot`(三色分布条)、`.tl/.ti/.dot(.g/.y/.r/.b)/.tc`。

- [ ] **Step 1:** 把首页的 `recordHref(record)`(triage→`/report?…`、behavior→`/behavior?c=id`)抽到 `src/lib/profile.ts` 并在首页与 /pets 同时 import(避免重复)。
- [ ] **Step 2:** **健康足迹**:`<HealthFootprint records={records} />`(共享组件;最近 30 天 分诊/问答计数 + 红黄绿 tier 分布条 + 图例 —— **合规**:tier 统计是风险信号本体)。
- [ ] **Step 3:** **timeline**:`sec-h`「健康记录」+「全部 N 条 ›」。默认展示最近 ~6 条(`records.slice(0, showAll ? records.length : 6)`);点「全部 N 条」置 `showAll=true` 展开全部。每条:`dot`(triage 用 `tier` 映射 g/y/r;behavior/其它用中性 `b`)+ `tc`(summary + tier 标签[仅 triage]+ 来源 + 时间);整条 `recordHref(r)` 有值则 `<Link>` 跳转,无值(老记录)则不可点。空态:「还没有记录 —— 来分诊会自动长出病历」+ 分诊链接。
- [ ] **Step 4:** **不放**「手动记一笔」(本批不做)。底部 `<Disclaimer />`。
- [ ] **Step 5:** Run `npm run build`。preview:点单条分诊记录 → 跳报告卡;点问答记录 → 跳 `/behavior?c=`;点「全部 N 条」展开全部;确认 timeline 仅真分诊 tier 用三色、问答用灰点。
- [ ] **Step 6:** Commit `feat(pets): 健康记录(健康足迹 + timeline + 查看全部 + Disclaimer)`。

---

## Task 8:/onboarding 转编辑/添加表单(query + 添加 + 删除 + 提醒开关)

**Files:** Modify `src/app/onboarding/page.tsx`

- [ ] **Step 1:** 读 query(用 `useSearchParams`,需 `<Suspense>` 包裹或确认现有结构):`const add = sp.get("add")==="1"; const petId = sp.get("pet");`。挂载时:add → `setDraft(newCat())` 空表单 + 标题/CTA 文案改「添加毛孩子 / 添加」;petId → 载入该 id 的猫编辑;都无 → 现有「活动猫/新用户首次建档」逻辑。
- [ ] **Step 2:** **转为编辑表单**:去掉原查看态 GroupCards 渲染(那部分内容已搬到 /pets),默认进入编辑态(`editing=true`);保留编辑表单 + 分组直达锚(`#edit-basic/#edit-photos/#edit-health/#edit-background`,供 /pets 的「管理/编辑」深链滚动)。
- [ ] **Step 3:** **保存**:add 模式 → 调 `addCat(builtCat)`;编辑模式 → 写 `store.cats` 对应项 `saveStore`。保存后跳 `/pets`(`router.push("/pets")`)。保存仍走 `withWeightLog` 自动记体重(保留)。
- [ ] **Step 4:** **删除**:表单底部「移除这只毛孩子」(暗红 `#b54b3f`,非风险红),`window.confirm` 二次确认后 `deleteCat(cat.id)` → 跳 `/pets`(删到 0 只时 /pets 自然回 Welcome/新建)。
- [ ] **Step 5:** **健康提醒开关**组(疫苗加强/每月驱虫/称重提醒):三个陶土红 toggle,读写 `draft.reminders ?? { vaccine:true, deworm:true, weight:false }`,随保存落库。开关旁注「本地提醒偏好,暂不推送」。
- [ ] **Step 6:** Run `npm run build` + `npm run lint`。preview 流程:`/onboarding?add=1` 加猫 → 保存回 /pets 多一只;`/onboarding?pet=<id>` 编辑保存;删除二次确认;提醒开关存后重进保持。
- [ ] **Step 7:** Commit `feat(onboarding): 转编辑/添加表单(query + addCat/deleteCat + 提醒开关)`。

---

## Task 9:TabBar 指向 /pets

**Files:** Modify `src/components/TabBar.tsx`

- [ ] **Step 1:** `TABS` 数组毛孩子项 `href: "/onboarding"` → `"/pets"`。
- [ ] **Step 2:** `SHOW_PATHS` 把 `"/onboarding"` 换成 `"/pets"`(编辑表单页 `/onboarding` 不显 TabBar)。`activeHref` 逻辑确认 `/pets` 高亮毛孩子 tab。
- [ ] **Step 3:** Run `npm run build`。preview:底栏点「毛孩子」→ /pets;/pets 上毛孩子 tab 高亮;/onboarding 编辑态无 TabBar。
- [ ] **Step 4:** Commit `feat(nav): TabBar 毛孩子 → /pets(SHOW_PATHS 同步)`。

---

## Task 10:CLAUDE.md 红线反转 + 收尾验收

**Files:** Modify `CLAUDE.md`;Delete `public/_proto/`

- [ ] **Step 1:** `CLAUDE.md` 产品红线「**不做**:…多猫切换 UI(数据结构留接口)…」改为「支持多猫切换/添加/删除(切换条在 /pets;数据 `Store.cats[]/activeCatId`)」。「当前进度」补一条 `/pets` 已上线(档案展示 + 多猫 + 相册 + 健康全档)。
- [ ] **Step 2:** 删原型脚手架:`rm -rf public/_proto`。确认无代码引用它(grep `_proto`)。
- [ ] **Step 3:** **红线逐条核对**:三色只在「真分诊 tier 点 + 健康足迹 tier 条」;care 徽章/性别 chip/开关/加号/选中态全陶土红或中性(preview_inspect 抽查);Disclaimer 在;无「诊断」字样;相册「不参与分诊」标注在;头像 NOT_A_CAT 守门仍在(onboarding 编辑头像)。
- [ ] **Step 4:** **功能回归**:多猫 切换/添加/删除;相册 增删/设主图/替换;care/体重/背景/足迹/timeline 全显;timeline 点单条进详情、点「全部」展开;TabBar 跳转;`/onboarding?add/?pet` + 删除 + 提醒开关。三宽度(360/393/430)preview。
- [ ] **Step 5:** `npm run build` + `npm run lint` 过;截图给用户验收。**部署须用户批准**(MEMORY 红线)。
- [ ] **Step 6:** Commit `feat(pets): 多猫红线反转 + 收尾(CLAUDE.md/清理/验收)`。

---

## Self-Review 备注

- **最大风险:onboarding(1361 行)改造**(Task 3 抽组件、Task 8 转编辑表单)。先抽组件并回归(Task 3)再改表单(Task 8),小步 commit;若 `WeightSparkline/HealthFootprint` 内部耦合 onboarding 局部量,抽时改成 props 传入。
- **不退化**:AI 头像生成 + NOT_A_CAT 守门、疫苗逐针列表 + 模版、驱虫日期、健康背景、withWeightLog 自动记体重、三层存储兜底 —— 全部保留(Task 8 只加 query/add/delete/reminders,不动这些既有能力)。
- **顺序**:/pets 视图(Task 4-7)先建好,再把 onboarding 的查看态搬走(Task 8)、再把 TabBar 指过去(Task 9)—— 避免中途 毛孩子 tab 404 或视图断档。
- **红线**:care 徽章是最易踩点(设计稿用了风险绿/黄)——已在 Task 6 用内联中性/陶土红写死;timeline tier 点与健康足迹三色条是合规的风险信号本体。
- **多猫删空**:删最后一只 → loadStore 返回 null → /pets 与首页回 Welcome/新建,已由 deleteCat + 现有空态逻辑兜底。
