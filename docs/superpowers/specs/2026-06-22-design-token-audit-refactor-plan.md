# 安心猫 · 设计 Token 审计与重构计划

> 日期:2026-06-22 · 真相源:`src/app/globals.css`(`:root` 行 7–71 + `@theme inline` 行 73–91)
> 方法:5 路并行审计(token 清单 / 字号 / 颜色 / 形状间距 / 逐屏 12 点)+ 综合
> 范围:只改 `src/app/**/*.tsx` 与 `src/components/**/*.tsx`,**不动数据 / 逻辑 / 医疗内容**
> 红线:全程不触碰风险三色语义、衬线只用标题、暖白陶土红身份;**不含「上线」决策**,每批做到本地可验证即止,合入/部署由用户逐批拍板

---

## A. 一句话结论 + 漂移规模总表

**结论**:项目**已经有**一套质量不错的设计 token(颜色,尤其风险三色,是单一真相源);但**整个「尺寸维度」——字号、间距、字重——完全没有 token 标度层**,加上约一半 token 没进 `@theme` 工具类,逼着 tsx 内联手敲数值——这是设计漂移的系统性根因。所以**不是「从头写 token」,而是「补标度 + 收漂移 + 装护栏」**。

| 维度 | 现状种数 | 出现处数 | 应收敛到 | 根因 |
|---|---|---|---|---|
| **字号** | **25 种**(21 px + 4 rem,含 9 种 .5 非整数) | **272 处** | **7 档** `--text-*` | 无任何字号 token |
| **字重** | 6 档(含 `font-[650]`、bold+extrabold 重叠) | ~136 处 | **3 档** `--fw-*` | 无字重 token |
| **颜色** | ~45 处硬编码字面量(品牌红 5 魔数 / 暖米 6 / 米灰 ~10) | ~45 处 | 复用现有 + 新增 ~6 | 一半 token 没进 `@theme` → 被迫内联 |
| **圆角** | 15 种 `rounded-[Npx]`(11 种离散 36 次 + 42 次硬编码 token 值) | ~78 处 | **6 档**(补 `--radius-sm`) | 圆角双轨命名 + 缺小档 |
| **间距** | 29 处非 4px 网格任意值(`mt-[22px]`×5 等) | ~29 处 | Tailwind 原生 4px 网格 | 无间距节奏约束 |
| **阴影** | 65 处已走 var(非漂移)+ **20 处真离散** | ~85 处 | 6 档(补 4 个语义阴影) | shadow / ease 未进 `@theme` |

**红线核验全部通过**(都不动):风险三色全部用作信号本体且基本已走 token(`report:1392-1396`、`pets:46-53` 为合规典范);无外来企业蓝 `#1B40D1` / 薄荷青 `#00C896`;衬线 28 处全落在标题/名字/情绪文案,无违规;中文无 `italic`。

---

## B. 建议新增的标度 token(可直接粘进 globals.css)

> 落位:**纯数值标度**(字号/字重/圆角/阴影/缓动)放进 `@theme inline`(才会生成 `text-*`/`font-*`/`rounded-*`/`shadow-*` 工具类);**语义颜色别名**放进 `:root` 再在 `@theme` 映射成 `--color-*`。

### B1. `:root` 内新增

```css
  /* 墨色基:统一 line/ink 族 rgba 基重,消灭 7 处硬编码 28,26,22 */
  --ink-rgb: 28, 26, 22;
  --accent-rgb: 176, 90, 80;              /* = --accent,供 rgba(var(--accent-rgb)/.xx) */

  /* 品牌陶土红次阶(收口 #bd6258/#bd655b 魔数) */
  --accent-light: #bd6258;                /* CTA 渐变高光端 */
  /* 深陶土红文字/危险态:复用已有 --accent-deep(#9c4a41),
     b54b3f/95483f 与之差 <5% → 全部映射到 --accent-deep,不新设 */

  /* 暖米/暖白(欢迎+建档专属暖调,区别于冷白 paper/surface) */
  --warm-cream: #f8eddc;                  /* 头图/hero 暖米底(统一 f8eddc/f6e7d6/fbf2e4) */
  --warm-white: #fff8f0;                  /* 暖白输入/卡底(统一 fffaf5/fff8f0) */

  /* 中性米灰(护理徽章/进度槽/虚线边);注意 --surface-2(#f0ede9) 已极近 */
  --neutral-bg: #f0ebe2;
  --neutral-line: #cdbfae;
  --neutral-ink: #8a6f54;
```

### B2. `@theme inline` 内新增

```css
  /* 字号标度(7 档,px 整数,消灭所有 .5 与 rem) */
  --text-micro:    10px;  --text-micro--line-height:    1.2;   /* TabBar 标签/角标/最小元信息 */
  --text-caption:  12px;  --text-caption--line-height:  1.35;  /* chip/时间戳/副描述/免责声明 */
  --text-footnote: 13px;  --text-footnote--line-height: 1.4;   /* 列表次要行/表单辅助说明 */
  --text-body:     14px;  --text-body--line-height:     1.55;  /* 正文/段落/对话气泡 */
  --text-callout:  15px;  --text-callout--line-height:  1.45;  /* 卡片标题/表单主值/次级 CTA */
  --text-title:    18px;  --text-title--line-height:    1.3;   /* 区块标题/sheet 主入口标题/按钮 */
  --text-display:  26px;  --text-display--line-height:  1.25;  /* 页面 H1/hero/情绪大标题(serif) */

  /* 字重(3 档;serif 700+ 浏览器合成加粗品质差,封顶 600) */
  --font-weight-regular: 400;
  --font-weight-medium:  500;
  --font-weight-bold:    600;

  /* 圆角(补小档;2xl/3xl 已映射到 --radius-card/-lg) */
  --radius-sm: 14px;   /* 小 chip / 输入框 / 小图标块(收 7~16px 一族) */

  /* 阴影(现有 3 个 + 新增 4 个都注册成 shadow-* 工具类) */
  --shadow-ring-white:  0 0 0 2px rgba(255,255,255,0.25);
  --shadow-ring-paper:  0 0 0 3px var(--paper);
  --shadow-avatar-glow: 0 10px 24px -8px rgba(190,130,70,0.55), inset 0 0 0 3px #fff;
  --shadow-soft:        0 4px 12px rgba(120,90,60,0.16), inset 0 0 0 1px rgba(255,255,255,0.6);

  /* 颜色别名补进工具类(补齐被迫内联的缺口) */
  --color-surface-2: var(--surface-2);
  --color-accent-soft: var(--accent-soft);
  --color-accent-deep: var(--accent-deep);
  --color-accent-tint: var(--accent-tint);
  --color-accent-light: var(--accent-light);
  --color-warm-cream: var(--warm-cream);
  --color-warm-white: var(--warm-white);
  --color-neutral-bg: var(--neutral-bg);
  --color-neutral-line: var(--neutral-line);
  --color-neutral-ink: var(--neutral-ink);
  /* 🔴 风险底/深字色补进工具类(此前 6 个全靠内联,漂移高危) */
  --color-red-bg: var(--red-bg);     --color-red-ink: var(--red-ink);
  --color-amber-bg: var(--amber-bg); --color-amber-ink: var(--amber-ink);
  --color-green-bg: var(--green-bg); --color-green-ink: var(--green-ink);
```

> ⚠️ **Tailwind v4 注意**:`@theme` 里阴影若用 `--shadow-card: var(--shadow-card)` 自引用可能报循环;且 v4 会摇掉只在内联引用、未注册的值(见 [[anxinmao-tailwind-keyframes]] 同类坑)。**批 0 必须先在空白分支验证 `npm run build` 通过 + 工具类真生成**,若循环则把完整阴影值直接写进 `@theme`、删 `:root` 同名定义。

---

## C. 逐项映射速查表(现值 → token,机械替换)

### C1. 字号(25 → 7)

| 现值 | 次数 | → token / 类 | 备注 |
|---|---|---|---|
| 9.5 / 10 / 10.5 | 8 | `text-micro` | .5 全消;9.5(`pets:457`)上调 10 |
| 11 / 11.5 / 12 / 12.5 | 117 | `text-caption` | **最大批**,.5 消并入 12 |
| 13 / 13.5 | 51 | `text-footnote` | |
| 14 / 14.5 | 42 | `text-body` | 含首页问问入口 `page:2345` 14.5 |
| 15 / 15.5 | 25 | `text-callout` | |
| 16 | 11 | `text-title`(↑18)**人工过目** | 区块/卡片标题归 18,详见下注 |
| 17 / 18 / 19 / 20 | 15 | `text-title` | 20(`behavior:609`)是「×」符 |
| 21 | 1 | `text-title` | `Guide:418` |
| 1.55/1.6/1.7/1.8rem · 25 · 29px | 10 | `text-display` | 全部 H1/hero,统一 26 + 收掉 rem |

> ⚠️ **唯一需设计判断的一步**:16px 的 11 处人工判角色——作区块/卡片标题(`pets:263/423/515/564/584/626`、`report:1671`)→ 归 `title(18)`,顺手把 17/19 也归 18。其余全机械。

### C2. 字重(6 → 3)

| 现值 | 次数 | → |
|---|---|---|
| `font-normal`(400) | 5 | `font-regular` |
| `font-medium`(500) | 47 | `font-medium` |
| `font-[650]` | 2(`Welcome:203/223`) | `font-bold` |
| `font-semibold`(600) | 69 | `font-bold` |
| `font-bold`(700) | 11 | `font-bold`(↓600) |
| `font-extrabold`(800) | 2 | `font-bold`(↓600) |

### C3. 颜色(A 纯漂移 / B 新增 / C 豁免)

| 类 | 现值 | 处 | → 目标 |
|---|---|---|---|
| A | `#1a1a18` | ShareReport:106/124/136 | `--ink`(canvas 见批 5) |
| A | `#f7f6f3` | ShareReport:80、layout:56 | `--paper`(layout 是 metadata 不能用 var,加注释绑定) |
| A | `#fff` 实底/描边 | page:1923、Welcome:207、AvatarPicker:203 | `--surface`(SVG `stroke="#fff"` 反白可豁免) |
| B1 | `#bd6258`/`#bd655b` | behavior:475、page:2262、Welcome:266 | `--accent-light` |
| B1 | `#b54b3f`/`#95483f` | pets:830、onboarding:874、Welcome:208/238/242 | `--accent-deep`(复用) |
| B2 | `#f8eddc`/`#f6e7d6`/`#fbf2e4` | Welcome:98、pets:259、AvatarPicker:162 | `--warm-cream` |
| B2 | `#fffaf5`/`#fff8f0` | Welcome:176/226 | `--warm-white` |
| B3 | `#f0ebe2`/`#efece6` | pets:40/41、records:334/408 | `--neutral-bg`(或复用 `--surface-2`) |
| B3 | `#cdbfae`/`#d9d2c6` | pets:301/484/683、records:501 | `--neutral-line` |
| B3 | `#8a6f54`/`#9a7e62` | pets:34/40/301 | `--neutral-ink` |
| C 豁免 | 性别粉/蓝 `#c77fa0`/`#5a90c2` | pets:32-34 | 保留(语义符号,已隔离,非外来色) |
| C 豁免 | 头像插画渐变 `#f3c590`/`#e2954f` | pets:326、AvatarPicker | 保留(插画填充) |
| C 豁免 | `rgba(176,90,80,…)` alpha、阴影 alpha | Welcome:92/134 等 | 保留(项目既定写法) |

### C4. 圆角(15 → 6,全换语义类)

| 现值 px | 次数 | → 类 |
|---|---|---|
| 7/9/11/12/13/14/15/16 | ~31 | `rounded-sm`(14) |
| 18 | 8 | `rounded-lg` |
| 20/22/24/26 | ~20 | `rounded-xl`(22) |
| 28 | 24 | `rounded-2xl` |
| 32/34 | 2 | `rounded-3xl`(34) |

> 含 42 处「把 token 值硬编码成 `rounded-[28px]`」——数值对但绕过语义类、改 token 不跟随,一并换 `rounded-2xl`。

### C5. 间距(非 4px → Tailwind 原生)

| 现值 | 处 | → |
|---|---|---|
| `mt-[22px]`×5 | pets:422/514/563/583/625 | `mt-5` **统一** |
| `mt-[30px]` | page:2240 | `mt-8` |
| `mt-[7px]`×2 | report:1726/1771 | `mt-2` |
| `gap-[14px]`/`mt-[14px]` | Welcome | `gap-3.5`/`mt-3.5` |
| `px-[15px]`×2 / `pt-[25px]` / `pb-[18px]` | pets/Welcome | `px-4`/`pt-6`/`pb-4` |

### C6. 阴影(20 离散 → 4 新档)

| 现值 | 处 | → |
|---|---|---|
| `0_4px_12px_rgba(120,90,60,0.16),inset…` | page:1917/1947/1970/1991 | `shadow-[var(--shadow-soft)]` |
| `0_0_0_2px_rgba(255,255,255,0.25)` | page:2292-94 | `shadow-[var(--shadow-ring-white)]` |
| `0_0_0_3px_var(--paper)` | pets:682、records:500 | `shadow-[var(--shadow-ring-paper)]` |
| 头像光晕一族 | pets:323/333、onboarding:528/530 | `shadow-[var(--shadow-avatar-glow)]` |
| `Guide:390` 遮罩 `0 0 0 9999px` | 1 | **保留内联**(功能特例) |

---

## D. 重构顺序(分批,每批独立验证可回滚)

每批一个分支、原子提交、可单独 revert。验证关:每批 `npm run build` + 本地 `npm run dev` 目视相关屏。

| 批 | 内容 | 风险 | 工时 | 验证 |
|---|---|---|---|---|
| **0 加标度** | §B 全部 token 粘进 globals.css,**只增不改 tsx** | 极低 | 0.5h | build 通过 + 工具类生成 + 确认阴影不报循环 |
| **1 消 .5/rem** | §C1 的 9 种 .5 + 4 种 rem 共 ~80 处机械替换 | 极低 | 1-1.5h | 抽查标题/正文无跳变 |
| **2 颜色收口** | §C3 的 A/B;canvas 集中成 `SHARE_PALETTE` 注释绑 token | 低 | 2-3h | Welcome/pets/onboarding + 生成一张分享图 |
| **3 字号+字重并档** | §C1 剩余 + §C2;**16px 的 11 处人工过目** | **中** | 3-4h | **6 主屏逐屏目视** |
| **4 圆角+间距** | §C4 全换语义类 + §C5 归 4px 网格 | 低-中 | 2-3h | 卡片边界/留白;注意 onboarding 卡中卡 |
| **5 阴影收口** | §C6 的 20 处 + 65 处升级为 `shadow-card/control/accent` | 低 | 1.5-2h | 头像/选中环 |
| **6 抽公共控件** | 见下 | **中-高** | 6-10h | 每控件替换前后截图 |
| **7 护栏** | 装 §E 规则,跑全量 lint 清残留 | 低 | 1-2h | lint 全绿 |

**合计 ~17-26h。**

**批 6 抽公共控件(按杠杆排序)**:
1. `<TextField>` —— O1 补 focus/error 态 + W2 输入框外观对齐(**唯一触及可访问性的硬缺口,优先**)
2. `<SegRow>` 共享 —— onboarding O4 与 Welcome W2/W4 的「性别 segmented control」是同一物
3. `<QuestionRow>` —— behavior B1 三种「可点问题行」统一
4. `<SectionHeader>` —— pets P1 区块操作链 + P2 与 onboarding 分区标题对齐
5. `<CTAButton>` —— W3 三种按钮字重统一 + 品牌渐变三段全 token
6. `<RiskDot>` —— S3 风险三色点 6/7/14px → 固定 1-2 档(信号层一致)

> 批 0–5 是「视觉应当不变或仅收敛」的低风险批;批 6 是「行为可能变化」批,每控件单独 PR、前后截图对比。

---

## E. 防回流护栏(关键——否则下次又漂回去)

### E1. ESLint(禁裸 hex + 任意值字号/圆角/字重),加进 `eslint.config.mjs`

```js
"no-restricted-syntax": [
  "error",
  { selector: "Literal[value=/(text|rounded)-\\[\\d/]",
    message: "禁任意值字号/圆角。用 text-caption/body/title… 或 rounded-sm/lg/xl/2xl/3xl;新档先加进 @theme。" },
  { selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
    message: "禁裸 hex。用 token var(--accent)/--ink/--paper… 或 bg-*/text-* 工具类;风险色用 --red/--amber/--green。" },
  { selector: "Literal[value=/font-\\[\\d/]",
    message: "禁任意值字重。用 font-regular/medium/bold。" },
],
```

**豁免**(行级 `// eslint-disable-next-line` + 注释):`layout.tsx:56` themeColor、SVG `stroke="#fff"` 反白、canvas `fillStyle`(`ShareReportButton`/`TIER_COLOR`)、`Guide:390` 遮罩。

### E2. 可选 CI grep 守卫 `scripts/guard-tokens.sh`

```bash
! grep -rnE '(text|rounded|font)-\[[0-9]' src/app src/components --include='*.tsx' | grep -v 'eslint-disable' \
&& ! grep -rnE '#[0-9a-fA-F]{3,8}' src/app src/components --include='*.tsx' \
     | grep -vE 'stroke="#fff"|fillStyle|themeColor|eslint-disable|TIER_COLOR'
```

---

## F. Top 10 立即见效快修(可单独成小 PR 先尝甜头)

1. **首页两主入口标题字号/字族不一**(用户点名):`page.tsx:2287` 看病 `font-serif text-[18px]` vs `:2345` 问问 `text-[14.5px]`(无 serif)→ 两处统一 `font-serif text-title font-bold`。
2. **pets 区块操作链 accent/灰混用无规则**(P1,最刺眼):`pets:430` 编辑 `text-accent`、`:520/569/589` 管理/记一笔/编辑 `text-ink-faint`、`:632` 报表 `text-accent` → 五处统一(全 `text-ink-faint` 或全 `text-accent`)。**改动极小、收益最大。**
3. **页面 H1 四字号 + px/rem 混用**:symptoms/behavior/triage/feedback/Welcome/pets 各异 → 全部 `font-serif text-display`。
4. **`font-[650]` 任意值字重 2 处**:`Welcome:203/223` → `font-bold`。
5. **`9.5px` 全站最小字孤例**:`pets:457` 主图徽章 → `text-micro`(10px)。
6. **品牌红渐变亮端两魔数**:`page:2262`/`behavior:475` `#bd6258` + `Welcome:266` `#bd655b` → `var(--accent-light)`。
7. **删除态裸 hex 复制粘贴**:`pets:830`/`onboarding:874`/`Welcome:208/238/242` `#b54b3f`/`#95483f` → `var(--accent-deep)`。
8. **timeline 卡圆角 15 孤例**:`pets:648` `rounded-[15px]` → `rounded-sm`。
9. **`mt-[22px]`×5 同值离格**:`pets:422/514/563/583/625` → `mt-5`。
10. **onboarding 中文 label 套 `uppercase` 死代码**:`onboarding:52` `text-[11px] uppercase tracking-[0.14em]` → `text-caption` 去 uppercase、`tracking-[0.06em]`。

---

## G. 高风险屏(逐屏视觉回归必做)

- **`pets/page.tsx`** —— 漂移最集中(字号 13 档、`mt-[22px]`×5、`rounded-[13px]`×6、P1 操作链)。
- **`onboarding/page.tsx`** —— 圆角四档 + 卡中卡嵌套 + 表单 focus/error 缺口(O1)+ SegRow 不一致(O4)。
- **`report/page.tsx`** —— **唯一需额外跑 `npm run triage:check` + `npm run medical:validate` 的屏**(改样式后确认没误伤风险色/急停文案呈现)。
- **`behavior/page.tsx`** —— 12 档字号 + 三种问题行,对话气泡视觉敏感。

低风险:`symptoms`、首页院子层、`knowledge`、`feedback`。

**回滚**:每批独立分支 + 原子提交,任一批 `git revert` 单批即可。批 0(纯加 token)永不需回滚。
**不替用户决定的事**:全程不含部署/上线;每批做到本地 build 通过 + 目视回归即停,合入/上线逐批由用户拍板。

---

## 附录:逐屏 12 点自查发现(具体不一致清单)

### 全局 / 跨屏(同角色不同处理,最该先修)
- **G1 白卡圆角四值并存** `med` —— 同为「白底信息卡」:`page:2321`(18)/`symptoms:40`(22)/`behavior:501`(28)/`pets:538`(16)。需定 2–3 档卡片圆角层级(主卡 28 / 次级 22 / 行内 18)。
- **G2 功能字号失控** `med` —— 单 behavior 12 档、pets 13 档、onboarding 12 档;14/14.5、12/12.5、13/13.5 大量并存且语义无差。
- **G3 SVG 描边粗细无规则** `med` —— chevron/图标 strokeWidth 在 1.6/1.7/1.8/1.9/2/2.2 间随机;同一相机图标三处描边(`pets:347` 2 / `pets:762` 1.7 / `onboarding:539` 2)。建议描边图标锁 1.7、强调箭头锁 2。
- **G4 CTA 渐变起始色三处不一** `low` —— `#bd6258`(page/behavior)vs `#bd655b`(Welcome)。

### 首页 page.tsx
- **H1** 底部 sheet 三卡 padding/圆角不齐(`px-5 py-4 rounded-[20px]` vs `px-4 py-3 rounded-[18px]`)`med`
- **H2** sheet 内图标底座圆角 12/15/full 三套 `low` · **H3** 「最近」空态 12.5px vs 有记录态 15px `low` · **H4** 院子浮层硬编码暖色(可接受局部常量)`low`

### 问答 behavior.tsx
- **B1** 三种「可点问题行」样式各异(发现态 16/14、追问 18/13.5、最近问过 13)`med` → 抽 `QuestionRow`
- **B2** 海报附件两 variant 22/20 圆角 + card/control 阴影 `low` · **B3** 助手气泡 28 vs 用户气泡 26 `low` · **B4** error/thinking 字号低于正文 `low`

### 症状 symptoms.tsx
- **S1** 「其它情况」卡圆角 28 vs 症状卡 22(同列表)`med` · **S2** H1 1.7rem 是全站孤例 `low` · **S3** 风险红点 6/7/14px 跨屏不一 `low`(关联信号层一致性)

### 毛孩子 pets.tsx
- **P1 区块操作链 accent/灰混用无规则** `high` —— 5 个同级入口 2 红 3 灰无规律(`:430` accent / `:520/569/589` 灰 / `:632` accent)。**本屏最刺眼。**
- **P2** section header serif 16px vs onboarding 分组标题 11.5px 灰(同信息层级两体系)`med`
- **P3** 卡圆角 timeline 15 是 16 的孤例 `med` · **P4** 多猫切换 chip 选中/未选视觉重量差致基线跳 `low` · **P5** 删除态裸 hex `#b54b3f` 复制粘贴 `low` · **P6** 「主图」徽章 9.5px 全站最小字 `low`

### onboarding.tsx
- **O1 表单输入无 focus/error 态** `high` —— 全部 `outline-none` 且无替代 focus 样式(键盘/可访问性缺口);字段级 error 缺失。**唯一触及可访问性的硬缺口。**
- **O2** 完成键 disabled 仅变灰、无背景差异(vs Welcome CTA disabled 换底去阴影)`med`
- **O3** 本屏圆角四档(14/18/22/24)+ 卡中卡反常嵌套(22 在 18 内)`med`
- **O4** SegRow 圆角(外 xl 内 lg)与 Welcome 性别快选(外 2xl 内 xl)差一级 + 字重不同 `med` → 抽共享 SegRow
- **O5** 中文 label 套 `uppercase`(无效)+ `tracking-[0.14em]` 偏散 `low`

### Welcome.tsx
- **W1** 多处裸 hex 暖色绕过 token(`#f8eddc/#fffaf5/#fff8f0/#95483f`)`med`
- **W2** 名字输入框(实底+全边框)与 onboarding 名字框(透明底+下划线)风格冲突 `med` → 对齐
- **W3** CTA `font-extrabold` 是全站按钮孤例(vs semibold/bold)`low` · **W4** 性别选中态裸 rgba 阴影 vs onboarding token 阴影 `low`

### 优先级速览
| 级别 | 条目 |
|---|---|
| **high** | P1(pets 操作链)· O1(表单 focus/error) |
| **med** | G1·G2·G3 · H1 · B1 · S1 · P2·P3 · O2·O3·O4 · W1·W2 |
| **low** | G4 · H2-H4 · B2-B4 · S2-S3 · P4-P6 · O5 · W3-W4 |

**最高杠杆三件事**:① 定 2–3 档卡片圆角 + 1–2 档风险点尺寸全量替换(扫掉 G1/H1/P3/O3/S1/B2/B3 一大半);② 给 onboarding/Welcome 输入框补 focus 态并对齐(O1/O4/W2,唯一可访问性硬缺口);③ 统一 pets 区块操作链颜色(P1,改动极小最显眼)。
