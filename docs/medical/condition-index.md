# 分诊病症资料索引

> 目标:把现有 `src/lib/triage.ts` 的症状入口映射到 source 文档和 AI card。状态为 `draft` 的内容可供开发参考,进入产品前仍需兽医审核。

| triage symptom | 用户入口 | condition_id | 现有证据 | source | ai-card | 建议批次 |
|---|---|---|---|---|---|---|
| `vomit` | 呕吐 | `cat_vomiting` | `分诊证据-草稿-v0.2.md` §1.1 | `source/cat-vomiting.source.md` | `ai-cards/cat-vomiting.ai-card.md` | batch 2 |
| `diarrhea` | 腹泻 | `cat_diarrhea` | `分诊证据-草稿-v0.2.md` §1.2 | `source/cat-diarrhea.source.md` | `ai-cards/cat-diarrhea.ai-card.md` | batch 2 |
| `noeat` | 不吃东西 | `cat_anorexia` | `分诊证据-草稿-v0.2.md` §1.3 | `source/cat-anorexia.source.md` | `ai-cards/cat-anorexia.ai-card.md` | batch 2 |
| `lethargy` | 精神差 | `cat_lethargy` | `分诊证据-草稿-v0.2.md` §3.1 + 通用红旗 | `source/cat-lethargy.source.md` | `ai-cards/cat-lethargy.ai-card.md` | batch 3 |
| `sneeze` | 打喷嚏 / 流鼻涕 | `cat_uri` | `证据-cat-uri-上呼吸道感染.md` | `source/cat-uri.source.md` | `ai-cards/cat-uri.ai-card.md` | batch 1 |
| `ear` | 耳朵问题 | `cat_ear_problem` | `证据-cat-ear-耳朵问题.md` | `source/cat-ear-problem.source.md` | `ai-cards/cat-ear-problem.ai-card.md` | batch 3 |
| `skin` | 皮肤痒 / 掉毛 | `cat_skin_problem` | `证据-cat-skin-皮肤问题.md` | `source/cat-skin-problem.source.md` | `ai-cards/cat-skin-problem.ai-card.md` | batch 4 |
| `eye` | 眼睛问题 | `cat_eye_problem` | `证据-cat-eye-眼睛问题.md` | `source/cat-eye-problem.source.md` | `ai-cards/cat-eye-problem.ai-card.md` | batch 3 |
| `mouth` | 口腔问题 | `cat_oral_problem` | `证据-cat-mouth-口腔问题.md` | `source/cat-oral-problem.source.md` | `ai-cards/cat-oral-problem.ai-card.md` | batch 4 |
| `behavior` | 行为突变 | `cat_behavior_change` | `证据-cat-behavior-行为问题.md` | `source/cat-behavior-change.source.md` | `ai-cards/cat-behavior-change.ai-card.md` | batch 4 |
| `limp` | 跛行 / 走路异常 | `cat_limping` | `证据-cat-limp-跛行问题.md` | `source/cat-limping.source.md` | `ai-cards/cat-limping.ai-card.md` | batch 4 |
| `eat` | 可能误食 | `cat_toxin_ingestion` | `分诊证据-草稿-v0.2.md` §3.2 | `source/cat-toxin-ingestion.source.md` | `ai-cards/cat-toxin-ingestion.ai-card.md` | batch 2 |
| `breath` | 呼吸怪 | `cat_dyspnea` | `分诊证据-草稿-v0.2.md` §2.1 + Anicira | `source/cat-dyspnea.source.md` | `ai-cards/cat-dyspnea.ai-card.md` | batch 2 |
| `blood` | 看到血 | `cat_bleeding` | `分诊证据-草稿-v0.2.md` §2.2 + Anicira | `source/cat-bleeding.source.md` | `ai-cards/cat-bleeding.ai-card.md` | batch 3 |
| `pee` | 尿不出 | `cat_urethral_obstruction` | `证据-icatcare-尿道阻塞.md` + v0.2 §2.3 | `source/cat-urethral-obstruction.source.md` | `ai-cards/cat-urethral-obstruction.ai-card.md` | batch 1 |
| `other` | 其它情况 | `cat_general_triage` | 通用红旗 | todo | todo | batch 5 |
| cross-cutting | 通用红旗 | `cat_emergency_red_flags` | `证据-anicira-急诊10信号.md` + v0.2 §3.3 | `source/cat-emergency-red-flags.source.md` | `ai-cards/cat-emergency-red-flags.ai-card.md` | batch 1 |

## 批次建议

1. `batch 1`:通用红旗、URI、尿闭。覆盖安全底线 + 一个高频轻症 + 一个硬急症。
2. `batch 2`:呕吐、腹泻、不吃、误食、呼吸。已生成 source + AI card;仍需兽医审核后进入产品。
3. `batch 3`:眼、耳、出血、精神差。已生成 source + AI card;覆盖用户高焦虑入口和需要“别乱用药”的入口。
4. `batch 4`:皮肤、口腔、行为、跛行。已生成 source + AI card;覆盖慢性/专科判断和长期护理。
5. `batch 5`:其它情况与总控 prompt。把通用红旗和宿主风险画像接入所有问诊。
