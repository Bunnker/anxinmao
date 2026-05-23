# pet 项目文档

> `pet` 为工作目录代号;产品正式名称待定(见 design-doc 的"开放问题")。
> 所有项目文档统一维护在本 `docs/` 下,按类型分文件夹归档。

## 目录结构

| 文件夹 | 存放内容 |
|---|---|
| `product/` | 产品文档:PRD、产品设计文档、定位与范围 |
| `research/` | 调研:用户访谈记录、竞品/领域调研、第三方意见 |
| `tech/` | 技术文档:架构、数据模型、分诊引擎方案、接口设计 |
| `decisions/` | 决策记录:关键取舍、premise、开放问题的结论 |

## 当前文档

- `product/PRD-v0.1.md` —— 原始 PRD 讨论稿(2026-05-07,定位为"一站式答疑工具")
- `product/design-doc-20260521.md` —— office-hours 审核后的设计文档(已 APPROVED,定位重构为"新手猫主分诊器")
- `product/前端设计PRD-v0.1.md` —— 前端设计 PRD(交给设计工具生成界面用)
- `research/小红书-养猫app调研-20260521.md` —— 小红书竞品调研(+ 同名 rawdata.json 原始数据)

注:`design-doc-20260521.md` 的源文件位于 `~/.gstack/projects/project/`,gstack 技能(如 plan-eng-review)从那里自动发现;本目录是项目内的归档副本,两边若有改动需同步。

## 待补充

- `tech/` —— 进入开发前的工程方案(建议先跑 `/gstack-plan-eng-review`)
- `decisions/` —— 关键决策记录(如设计方向、风险三色方案)
