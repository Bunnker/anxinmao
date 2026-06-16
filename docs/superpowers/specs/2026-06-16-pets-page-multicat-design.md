# 毛孩子页(/pets)重做 + 完整多猫 设计

> 版本 v1.0 · 2026-06-16 · 用户已拍板范围(全做:新 /pets + 完整多猫)与两处小点。
> 本文是「claude design 毛孩子.html / 毛孩子-编辑.html → 现有 Next 产品」的落地设计,
> 落实并**取代**大 spec `2026-06-15-full-app-redesign-claude-design-spec.md` §3.6/§4 中
> 「砍多猫」的旧文字(该 spec 顶部 Q9 已反转红线为「做多猫」,§4 作废)。

## 目标

把「毛孩子」从当前单页 `/onboarding`(查看+编辑混在一页)重做成设计稿形态:
- 新建 **`/pets`** 档案展示页(多猫切换条 + hero + 四宫格 + 健康档案 + 健康记录 timeline)。
- `/onboarding` 退为**编辑/添加表单**(顶部 取消/保存 navbar,不带 TabBar)。
- 落地**完整多猫**:切换活动猫 / 添加 / 删除;同步把 CLAUDE.md「不做多猫切换 UI」红线改为「支持多猫」。

## 拍板决策(2026-06-16)

- **范围**:全做 —— 新 /pets + 完整多猫(切换/添加/删除)。
- **手动记一笔**:这批**不做**。/pets timeline 只展示现有 `triage`/`behavior` 记录;不放「手动记一笔」按钮(无对应数据类型,不为它开新类型)。
- **健康提醒开关**(疫苗加强/驱虫/称重):**做 UI 开关 + 存偏好,不真推送**。偏好存进 `Cat.reminders`(随猫、走云同步),将来接 PWA 通知再消费。

## 架构

### 路由与导航
- **新建 `/pets`**(`src/app/pets/page.tsx`):展示页,带 TabBar,毛孩子 tab 高亮。
- **`/onboarding`**(改造现有):编辑/添加表单,**不带 TabBar**(全屏表单,顶部自带 取消/保存)。
  - 无参数:新用户首次建档(现有行为)。
  - `?pet=<id>`:编辑指定猫。
  - `?add=1`:添加新猫(空表单,保存=addCat)。
- **TabBar**(`src/components/TabBar.tsx`):毛孩子 `href` `/onboarding`→`/pets`;`SHOW_PATHS` 把 `/onboarding` 换成 `/pets`(编辑表单页不显 TabBar)。新用户无猫时 TabBar 仍按现有 `hasCat` 逻辑隐藏。

### 数据层(`src/lib/storage.ts`)新增多猫操作
纯函数 + 持久化(都经 `saveStore` → 本地 localStorage + Cookie 兜底 + 匿名云同步,沿用现有三层):
- `addCat(cat: Cat): Store` —— 追加到 `cats`,设为 `activeCatId`。
- `setActiveCat(id: string): Store` —— 切换活动猫。
- `deleteCat(id: string): Store` —— 移除该猫 + 其 `records`(按 catId 过滤);重选 `activeCatId`(剩余第一只,空则 null)。删到 0 只时:回到 Welcome/新建流程。
- 这些在 storage 暴露,/pets 与 /onboarding 调用后 `setStore` 就地重渲染。

### 数据模型(`src/types/cat.ts`)新增
- `Cat.reminders?: { vaccine: boolean; deworm: boolean; weight: boolean }` —— 健康提醒偏好(UI 开关存这里,默认 vaccine/deworm 开、weight 关,与设计稿一致)。仅存偏好,不驱动真实推送。

## `/pets` 展示页(对设计稿 毛孩子.html)

自上而下:

1. **顶栏**:衬线「毛孩子」标题。
2. **切换条 `.switcher`**:横滚 chip 列出全部猫(头像 + 名;活动态白底陶土红描边),末尾「+」加猫 chip。
   - 点 chip → `setActiveCat` + 重渲染(整页换成那只猫)。
   - 点「+」→ `/onboarding?add=1`。
3. **Hero 卡 `.pcard`**:
   - 头像 `.avslot`:优先 `cat.avatar`(AI 生成图),无则 `CatFace`(MOOD 通用插画)回退;右下相机角标 → `/onboarding?pet=id`。
   - 「编辑档案」小药丸 → `/onboarding?pet=id`。
   - 名 + 性别 chip(性别色:雌粉/雄蓝/不确定中性 —— **内联常量,不进 :root token**)。
   - 一行 `品种 · 毛色 · 月龄`。
   - tags:`体重kg` / 驱虫态 / 绝育态。
4. **四宫格 `.statrow`**:年龄(月/岁)/ 体重 kg / 健康记录数(该猫 records 条数)/ 陪伴天数(由 `homeDate` 算 today−homeDate)。
5. **健康档案 `.care`**(疫苗/驱虫/绝育三行,icon + 文案 + 状态徽章):
   - 派生自 `vaccines[]` / `deworm`(ISO date)/ `neutered`(是/否)。小 helper `careStatus(cat)`。
   - **红线**:状态徽章只用**中性灰 / 陶土红系**,`done`=陶土红或浅绿中性、`due/未做`=中性灰或陶土红 tint,**绝不用 `--red/--amber/--green` 风险三色**(设计稿用了 risk-green/yellow,落地必须改)。
   - 「管理」入口 → `/onboarding?pet=id`(滚到对应分组,沿用现有 editFocus 锚点)。
6. **健康记录 timeline `.tl`**:取该猫 `records`(triage + behavior),时间倒序:
   - 真分诊记录 tier 点用红黄绿(**合规**:这是风险分档信号本体,同首页 record tier);问答/其它用中性米色点。
   - 点击 → 沿用现有 `recordHref`(triage→报告卡、behavior→`/behavior?c=id`)。
   - **不放**「手动记一笔」按钮(本批不做)。「全部 N 条」入口可指向 /pets 自身的完整列表或先 toast 占位。
7. **Disclaimer** 固定底部(红线)。

## `/onboarding` 编辑/添加页(增强现有,不退化)

**原则(大 spec 红线):绝不照搬 HTML 退化功能。** 现有 onboarding 比设计稿强(AI 头像生成、体重 sparkline、健康足迹、慢性病/过敏字段),全部**保留**。本批只做:
- **读 query**:`?pet=<id>`(编辑指定猫,默认现有=活动猫)、`?add=1`(添加模式)。
- **添加模式**:标题「添加毛孩子」、保存按钮「添加」、空表单(`newCat()`)、保存=`addCat`。
- **删除**:多猫已解禁 → 加「移除这只毛孩子」(二次确认;删到 0 只回新建流程)。**单猫时**可隐藏删除或允许(删后回 Welcome)。
- **健康提醒开关**组:疫苗加强 / 每月驱虫 / 称重提醒,存 `Cat.reminders`(不真推送)。
- 视觉对齐:表单分组卡 / seg / stepper / toggle 一律**陶土红**(绝不用风险色,红线)。保存/取消 navbar 陶土红。

## 红线护栏(逐条)

| 红线 | 落地 |
|---|---|
| 风险三色独立信号层 | care 徽章避风险黄绿、改中性/陶土红;timeline 仅真分诊 tier 用三色(合规);开关/seg/stepper 一律陶土红 |
| 装饰色不进 :root token | 性别 chip 色 / hero 渐变 / 墙橘色族 = 组件内联常量 |
| 医疗克制不诊断 | 文案不出现「诊断」;Disclaimer 保留 |
| AI 形象不进医学图 | 头像用 `cat.avatar`/`CatFace`,仅身份/陪伴,不进病征示意 |
| 多猫红线反转 | 同步改 `CLAUDE.md`:「不做多猫切换 UI(数据结构留接口)」→「支持多猫切换/添加/删除」 |

## 涉及文件
- 新增 `src/app/pets/page.tsx`(/pets 展示页)。
- 改 `src/app/onboarding/page.tsx`(读 query + 添加/删除 + 提醒开关)。
- 改 `src/lib/storage.ts`(addCat/setActiveCat/deleteCat)。
- 改 `src/types/cat.ts`(Cat.reminders)。
- 改 `src/components/TabBar.tsx`(href + SHOW_PATHS)。
- 改 `CLAUDE.md`(多猫红线反转)。
- 可选:更新大 spec §3.6/§4 指向本文(标注 §4 作废)。

## 本批不做(YAGNI)
- 手动记录类型 / 「手动记一笔」编辑器。
- 真实推送通知(提醒开关仅存偏好)。
- 切换条之外的批量管理(合并/转移记录等)。
