---
title: 首页主动气泡 · 卖萌动作出图交接
status: 待出图(交给「桌宠逐帧动画」批的 agent)
created: 2026-06-17
branch: pet-home
audience: 负责桌宠逐帧动画出图的 agent / 回来接手的自己
related:
  - docs/superpowers/specs/2026-06-17-deskpet-frame-animation-design.md  # 出图管线 + base.png + hatch-action
  - src/app/page.tsx        # nudge / PawCta / 接线点
  - src/components/PetSprite.tsx  # 新增状态行
---

# 首页主动气泡 · 卖萌动作出图交接

## 背景

首页桌宠「主动气泡」(`nudge`,commit `dd90369`/`b8dba45`)已落地:没有待回访时,小猫遛 ~7s
坐下冒一个**可点的喵语气泡**(护理提醒:称重/驱虫/疫苗 → 跳记一笔;闲时搭话:→ 分诊/问答),
气泡带醒目**猫爪按钮 `PawCta`**。

**代码部分已完成**(喵语文案 + 猫爪按钮 + 触发/优先级/调度暂停)。**缺的只是「卖萌动作帧」**:
当前 `nudge.sprite` 暂用现有 `review`(护理)/`waving`(搭话),用户反馈这俩**别扭、不够卖萌**,
要求出**和 codex pet 一样的逐帧动图**,换成真·卖萌动作。出图这块按分工交给你(你已有
base.png + hatch-action 管线,见 deskpet-frame-animation-design.md)。

## 要出的卖萌动作(调研:用户公认可爱的时刻)

公认最萌的猫时刻:**翻肚皮露肚、撒娇蹭头、踩奶、歪头卖萌、打滚伸懒腰、举爪求摸**。
本批挑 2 个,分别配「护理提醒」和「搭话邀请」两类气泡语义:

| 新状态 | 语义/用在 | 动作弧线(6 帧关键帧) | 配哪类 nudge |
|---|---|---|---|
| **`coax`(撒娇求关注)** | 「该称重/驱虫啦」提醒 —— 求你来照顾我 | 坐 → 歪头 → 蹭(头往一侧蹭)→ **翻身露肚皮** → 肚皮朝上扭一下卖萌 → 回坐 | careNudge 的提醒泡 |
| **`knead`(踩奶/招呼)** | 「有事问我/来分诊」搭话 —— 邀请你互动 | 坐 → 抬前爪 → 左右交替踩(踩奶)2 帧 → 歪头看你 → 轻招手 → 回坐 | CHAT_NUDGES 的搭话泡 |

> 也可只出 1 个通用「卖萌」动作两处复用(省一半出图),但 2 个更贴语义。你定。
> 翻肚皮是用户点名要的,务必进 `coax`。

**规格**:沿用你管线的标准 —— 锚 `base.png` + 纠偏 prompt(low-sat milky orange / flat matte
绘本 / 金橘条纹不偏红 / deep matte brown 眼 / soft edges),蓝幕 `#0000FF` 6 等宽槽横排 →
去蓝幕 → 切 6 帧 → 统一基线进 cell。这两个是**纯猫位置锚定**(无道具,同洗脸/逗猫棒那类),
盖帧叠在猫实时位置;或若做成主 spritesheet 行也行(见下「接线」二选一)。

## 接线点(出图后,改动很小)

`nudge.sprite` 是唯一开关(`src/app/page.tsx`,`careNudge()` 与 `CHAT_NUDGES`):
- careNudge 三条的 `sprite: "review"` → 改 `"coax"`;
- CHAT_NUDGES 两条的 `sprite: "waving"` → 改 `"knead"`。

**两种落地方式(你选,与你现有管线一致即可)**:
1. **进主 spritesheet**(推荐,若 coax/knead 是纯猫无道具):在 `PetSprite.tsx` 的
   `PetSpriteState` 加 `"coax" | "knead"`,`ROWS` 加两行(spritesheet 加 2 行 6 帧),
   `nudge.sprite` 直接用 → `PetSprite` 自动逐帧播。**最干净**,首页气泡 sprite 就是 `<PetSprite state={...}>`。
2. **走盖帧**(若想复用 hatch 盖帧那套):同洗脸,加 `COAX_SEQS/KNEAD_SEQS` + 盖在 `roam.x/roam.y`;
   但首页气泡这里用的是主 `PetSprite`(`yardSprite`),方式 1 更省事。建议方式 1。

接线后:首页造一条「称重超期」记录(weightLog 末次 >14 天 + 无待回访)→ 遛 7s 看 coax;
careNudge 都没命中时 60% 出 CHAT_NUDGES → 看 knead。

## 红线(同 deskpet 动画 spec)

- 橘猫一致性:锚 base.png + 纠偏 prompt,出图对照目检,漂移重出。
- AI 形象红线:陪伴角色,**不进医学图**;合规。
- 资产规范:源 PNG / 蓝幕条 / 中间产物**不进 `public/`**,只留切好 webp;tmp 清理。
- 不碰风险三色;Disclaimer 不动;部署须用户批准。

## 验收

`npm run build` 过、lint 无新增;首页 coax/knead 逐帧流畅(无 2 帧闪)、橘猫一致;
nudge.sprite 已切到新态;源图/中间产物未进 public。
