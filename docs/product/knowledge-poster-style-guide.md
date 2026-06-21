# 小红书手绘知识海报提示词规范

用途：把本地猫咪护理和问诊资料生成“手绘水彩小红书长图”，并按资料 ID 绑定到多模态召回。本文档基于已生成的 4 张样张提示词整理，目标风格是 `public/knowledge-posters/generated-style/*-xhs-style-v1.png`，不是规整 UI 卡片。

## 风格目标

必须接近这类画面：

- 手机端竖图，9:16 或接近 941x1672 / 1080x1920，第一屏就能看清标题。
- 暖米色纸张背景，上面贴一张白色手账纸。
- 四角彩色和纸胶带，粗糙黑色手绘边框，角落有星星、爪印、爱心、小贴纸。
- 水彩 + 彩铅 + 黑色墨线，轻微纸纹，边缘不完全规整。
- 主角是圆脸橘猫幼猫：大眼睛、腮红、奶油色口鼻和肚皮，同一张图里出现多个动作姿态。
- 大标题使用粗黑手写字，背后有黄色荧光笔刷痕。
- 内容是 4-5 个步骤/信号，每个点都有编号圆点、黄色重点条、小插画、虚线箭头。
- 底部必须有“禁忌/不要这样做/现在就做”警示栏，配红叉或警告图标。

负面例子：

- 不要生成干净的 SaaS 卡片、App UI 卡片、扁平图标清单、PPT 风信息图。
- 不要只画一个大猫头或一张插画，必须是多图多字的知识海报。
- 不要加截图黑边、手机状态栏、水印、小红书标识、平台 logo。
- 不要把医学内容改成诊断、用药剂量、商品推荐或“在家治疗”。

## 通用母提示词

```text
Use case: infographic-diagram
Asset type: detailed vertical Chinese pet-care knowledge poster for mobile sharing and multimodal retrieval

Input images: The attached images are style references only. Do not copy their exact composition, watermark, platform UI, logo, or exact text. Match the same general scrapbook hand-drawn watercolor infographic style.

Primary request: Create an original detailed Chinese infographic poster about {topic}. The poster should look like a Xiaohongshu-style handmade cat-care note: warm, cute, dense, useful, and mobile-readable.

Canvas/composition: vertical mobile poster, 9:16, no phone screenshot frame. A white paper sheet is taped onto a warm beige textured paper background. Use four pastel washi-tape corners, a rough black hand-drawn border, small star stickers, paw prints, hearts, dotted arrows, speech bubbles, yellow highlighter strips behind headings, red cross marks for mistakes, and a bottom warning/action strip. Dense but readable.

Style/medium: soft watercolor + colored pencil sketch + thin black ink outlines. Cute educational scrapbook poster, slightly imperfect hand lettering, warm cream paper, pastel accents, not vector UI, not clean flat icon design, not corporate presentation.

Mascot/cat design: cute chubby orange tabby kitten, big round brown eyes, blush cheeks, cream muzzle and belly, tiny pink nose, soft striped fur. Use multiple kitten poses in one poster: worried, curious, being gently handled, resting, in a carrier, near a litter box, eating, or interacting with owner hands depending on the topic.

Layout requirements: large handwritten Chinese title at the top with yellow highlighter behind it. Then 4-5 numbered sections. Each numbered section has a pastel circular number, a bold black handwritten subheading, 1 short line of Chinese explanation, and a detailed small illustration. Use dotted arrows to guide the eye between sections. Keep important warnings in red. Put the final "禁忌" or "现在就做" strip at the bottom.

Text rules: Chinese only. Use short phrases, not paragraphs. Text must be large, black, legible on a phone, and not crowded. Render the following text as accurately as possible:
Title: 《{title}》
1 {point_1_title}
{point_1_text}
2 {point_2_title}
{point_2_text}
3 {point_3_title}
{point_3_text}
4 {point_4_title}
{point_4_text}
5 {point_5_title}
{point_5_text}
Bottom strip: {bottom_warning_or_action}

Medical/safety constraints: This is educational triage and care guidance, not diagnosis. Do not mention drug names, doses, prescription plans, or product purchase recommendations. Urgent red flags should tell the user to contact a veterinarian or emergency hospital. Do not suggest unsafe home treatment.

Avoid: watermark, platform logo, app screenshot frame, black phone UI bars, tiny unreadable text, English labels, distorted Chinese characters, random extra medical claims, clean UI cards, flat vector icons, photorealism, scary gore.
```

## 资料卡转提示词规则

从 `docs/care/ai-cards/*.care-card.md` 和 `docs/medical/ai-cards/*.ai-card.md` 取内容时，只抽这几类信息：

- `title`：转成小红书式标题，短、明确、带场景感，例如“尿不出别等：这是真急症”。
- `point_1..5`：优先使用红旗信号、步骤动作、观察记录、禁忌边界。
- `scene_details`：把每个点翻译成画面，而不是抽象图标。
- `bottom_warning_or_action`：医疗类优先“现在就做/禁忌”，护理类优先“禁忌/奖励/暂停”。

每张图最多 5 个主点。每个主点尽量控制在：

- 小标题：2-6 个中文词。
- 解释：8-16 个中文字符，最多 1 行半。
- 底部警示：3-5 个短词，用 `｜` 分隔。

## 画面细节词库

护理类常用画面：

- 剪指甲：爪垫、透明指甲尖、粉色血线、指甲剪、奖励零食、主人轻握爪子、猫咪放松。
- 清洁耳朵：外耳、耳液瓶、棉片、禁止棉签深入、甩头猫、拍视频手机。
- 刷牙：猫用牙膏、指套牙刷、轻碰嘴边、奖励零食、不要强刷疼痛牙龈。
- 梳毛：软刷、毛球、短时间、猫咪趴着放松、不要硬剪贴皮毛结。
- 多猫关系：安全房、隔门喂食、气味交换毛巾、两只猫保持距离。

问诊/急症类常用画面：

- 尿不出：猫砂盆、没有尿团、几滴尿、痛苦叫、公猫符号、猫包、电话联系医院。
- 呼吸异常：张口喘、牙龈发紫、趴低伸脖子、安静猫包、急诊电话。
- 误食中毒：药片、百合、鼠药、清洁剂瓶、包装袋、问号、电话。
- 创伤出血：纱布按压、猫包转运、伤口照片、不要乱用药。
- 抽搐神经：计时器、移开硬物、拍视频、猫咪恢复、禁止伸手进嘴。
- 急诊红旗：呼吸、尿不出、误食、出血、抽搐/休克五组小场景。

## 已验证样张提示词摘要

### 剪指甲

```text
Topic: cat nail trimming training
Title: 《剪指甲不翻车：只剪透明尖尖》
Visuals: orange tabby kitten paw close-up, nail clipper, transparent claw tip, pink quick/blood line warning, reward treat, owner hand gently touching paw, relaxed kitten face.
Sections:
1 准备奖励 / 摸爪1-2秒就奖励
2 按出指甲 / 轻轻按肉垫露出指甲
3 看清血线 / 只剪透明尖尖
4 一次一小步 / 先剪1个也可以
5 结束奖励 / 不追着剪
Bottom strip: 禁忌：别剪粉色血线｜别强按｜出血不止要就医
```

### 耳朵问题

```text
Topic: cat ear observation and safe cleaning boundary
Title: 《耳朵脏了先看这3点》
Visuals: orange tabby kitten ear close-up, owner hand holding ear gently, pet ear cleaner bottle, cotton pad wiping only outer ear, big red cross over cotton swab going deep, kitten shaking head, warning icons for head tilt and unstable walking.
Sections:
1 先排急信号 / 头歪走不稳要就医
2 看外耳 / 红肿臭味黑分泌物要检查
3 只擦外耳 / 用棉片擦看得见的地方
4 别深掏 / 棉签不要伸进耳道
5 拍照记录 / 甩头和走路视频带给医生
Bottom strip: 禁忌：别用酒精/双氧水/精油｜别自行滴药｜别只凭黑耳垢判断耳螨
```

### 尿不出

```text
Topic: feline urinary blockage red flags
Title: 《尿不出别等：这是真急症》
Visuals: orange tabby kitten near litter box, tiny urine drops, worried kitten squatting repeatedly, male cat symbol, phone calling vet, cat carrier, red warning marks.
Sections:
1 频繁蹲砂 / 来回进猫砂盆却没尿团
2 只有几滴 / 尿很少带血或痛苦叫
3 公猫更急 / 公猫尿不出要立刻急诊
4 伴随异常 / 不吃呕吐精神差更危险
5 现在就做 / 拍尿团和蹲砂视频联系医院
Bottom strip: 禁忌：别按压肚子｜别强灌水｜别喂人药｜别等到明天
```

### 急诊红旗

```text
Topic: general emergency red flags for cats
Title: 《猫咪急诊红旗：命中就别等》
Visuals: orange tabby kitten in several small scenes: open-mouth breathing warning, litter box with no urine, toxic household items, bleeding with gauze pressure, seizure/collapse safety, phone and carrier.
Sections:
1 呼吸异常 / 张口喘呼吸费力牙龈发紫
2 尿不出来 / 频繁蹲砂但没有尿团
3 高危误食 / 人药百合鼠药清洁剂
4 大量出血 / 按压还止不住要急诊
5 神经/休克 / 抽搐叫不醒站不起来
Bottom strip: 现在就做：保持安静｜拍视频｜带包装｜联系最近动物医院
```

## 批量生成顺序

优先级按资料风险排序：

1. P1：急诊/硬红旗/高危护理，必须先生成。
2. P2：高频问诊问题。
3. P3：常见护理和半医疗边界。
4. P4-P5：低压护理、记录、复诊准备。

文件命名：

```text
public/knowledge-posters/generated-style/{资料ID}-xhs-style-v1.png
```

绑定清单：

```text
public/knowledge-posters/generated-style/manifest.json
```

manifest 里每项至少包含：

- `id`
- `title`
- `sourceDoc`
- `image`
- `tags`
- `stylePromptVersion`

## 手机端验收标准

- 图片必须是竖图，适合手机阅读，不要横版。
- 顶部标题在缩略图里也能识别。
- 不少于 4 个小插画场景，不能只有一个主视觉。
- 底部有清楚的禁忌/行动栏。
- 没有平台水印、黑色截图边框、状态栏。
- 风格像手账水彩海报，而不是规整知识卡。
- 如果中文有明显错字，该图只能作为风格样张，不能直接用于问诊回复。
