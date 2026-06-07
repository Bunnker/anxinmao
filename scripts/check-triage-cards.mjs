#!/usr/bin/env node
// 分诊引擎 ↔ 医学 AI 卡 一致性校验。
//
// 目标:把 src/lib/triage.ts 的分诊规则迁到「ai-card 真值源」并加护栏。
// triage.ts 的红旗/选项可以用 `claim: "xxx_001"`(或 `claims: [...]`)注解它依据的
// 医学 claim;本脚本校验每个注解:
//   1. 该 claim 真实存在(在 docs/medical/source/*.source.md 里有定义)。
//   2. 该 claim 的前缀属于这个症状对应的病情卡,或是通用急症 emg_。
// 另外做结构覆盖:每个有专属 flow 的症状都得有对应病情卡。
//
// 设计:不改分诊判级行为,只加可追溯性 + 漂移护栏。未注解的选项不报错(渐进迁移)。
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "docs/medical/source");
const TRIAGE_FILE = path.join(ROOT, "src/lib/triage.ts");

// 症状 → 病情卡 claim 前缀。emg_ 为通用急症,任何症状都可交叉引用。
const SYMPTOM_PREFIX = {
  vomit: "vom",
  diarrhea: "dia",
  eat: "tox",
  breath: "bre",
  blood: "bld",
  pee: "uo",
  urine: "uo",
  noeat: "ano",
  sneeze: "uri",
  ear: "ear",
  skin: "skin",
  eye: "eye",
  mouth: "oral",
  behavior: "beh",
  limp: "limp",
  lethargy: "leth",
};

// triage.ts 里的 const 块名 → 症状。RED_FLAG_OPTIONS 是跨症状共享红旗,只认 emg_。
const BLOCK_SYMPTOM = {
  vomitFlow: "vomit",
  diarrheaFlow: "diarrhea",
  eatFlow: "eat",
  breathFlow: "breath",
  bloodFlow: "blood",
  peeFlow: "pee",
  urineFlow: "urine",
  noeatFlow: "noeat",
  sneezeFlow: "sneeze",
  earFlow: "ear",
  skinFlow: "skin",
  eyeFlow: "eye",
  mouthFlow: "mouth",
  behaviorFlow: "behavior",
  limpFlow: "limp",
  generalFlow: "lethargy", // 通用流兜底精神差 / 其它,按精神差卡 + emg_ 解析
  RED_FLAG_OPTIONS: "__shared__", // 只认 emg_
};

// 有专属 flow 的症状(必须有对应病情卡才算覆盖)。
const DEDICATED_SYMPTOMS = [
  "vomit", "diarrhea", "eat", "breath", "blood", "pee", "urine", "noeat",
  "sneeze", "ear", "skin", "eye", "mouth", "behavior", "limp",
];

function claimTokens(text) {
  return text.match(/\b[a-z]+_\d{3}\b/g) || [];
}

// 从所有 source 文档收集「已定义的 claim」(全局已知集)。
async function loadKnownClaims() {
  const files = (await readdir(SOURCE_DIR)).filter((f) => f.endsWith(".source.md"));
  const known = new Set();
  for (const f of files) {
    const text = await readFile(path.join(SOURCE_DIR, f), "utf8");
    for (const id of claimTokens(text)) known.add(id);
  }
  return known;
}

// 把 triage.ts 切成顶层 const 数组块:const Name ... = [ ... \n];
function parseBlocks(src) {
  const blocks = [];
  const re = /const\s+(\w+)\s*(?::[^=]+)?=\s*\[([\s\S]*?)\n\];/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    blocks.push({ name: m[1], body: m[2], index: m.index });
  }
  return blocks;
}

// 抽取一个块里的 claim 注解:claim: "x_001" 以及 claims: ["x_001", "y_002"]。
function annotationsIn(body) {
  const ids = [];
  for (const mm of body.matchAll(/\bclaim:\s*["'`]([a-z]+_\d{3})["'`]/g)) {
    ids.push(mm[1]);
  }
  for (const mm of body.matchAll(/\bclaims:\s*\[([^\]]*)\]/g)) {
    for (const idm of mm[1].matchAll(/["'`]([a-z]+_\d{3})["'`]/g)) ids.push(idm[1]);
  }
  return ids;
}

function prefixOf(id) {
  return id.replace(/_\d{3}$/, "");
}

async function main() {
  const errors = [];
  const warnings = [];
  const known = await loadKnownClaims();

  const sourceFiles = new Set(await readdir(SOURCE_DIR));

  // 1. 结构覆盖:每个专属 flow 症状都有病情卡 source 文档。
  const SYMPTOM_CARD = {
    vomit: "cat-vomiting", diarrhea: "cat-diarrhea", eat: "cat-toxin-ingestion",
    breath: "cat-dyspnea", blood: "cat-bleeding", pee: "cat-urethral-obstruction",
    urine: "cat-urethral-obstruction",
    noeat: "cat-anorexia", sneeze: "cat-uri", ear: "cat-ear-problem",
    skin: "cat-skin-problem", eye: "cat-eye-problem", mouth: "cat-oral-problem",
    behavior: "cat-behavior-change", limp: "cat-limping", lethargy: "cat-lethargy",
  };
  for (const sym of DEDICATED_SYMPTOMS) {
    const card = SYMPTOM_CARD[sym];
    if (!card || !sourceFiles.has(`${card}.source.md`)) {
      errors.push(`症状「${sym}」有专属 flow,但缺对应病情卡 source(${card ?? "未映射"}.source.md)`);
    }
  }

  // 2. claim 注解校验。
  const src = await readFile(TRIAGE_FILE, "utf8");
  if (/label:\s*["'`]牙齿发黄、黄棕色牙垢 \/ 牙结石["'`]\s*,\s*weight:\s*1/.test(src)) {
    errors.push("mouthFlow 把轻微牙黄和硬黄棕牙结石合并成 weight=1;硬牙结石应单独 weight=2 以保持 yellow");
  }
  const blocks = parseBlocks(src);
  let annotated = 0;
  const perSymptom = {};
  for (const block of blocks) {
    const sym = BLOCK_SYMPTOM[block.name];
    if (sym === undefined) continue; // 非 flow / 非红旗块,跳过
    const ids = annotationsIn(block.body);
    if (ids.length) perSymptom[block.name] = ids.length;
    for (const id of ids) {
      annotated++;
      if (!known.has(id)) {
        errors.push(`${block.name} 注解的 claim ${id} 不存在于任何 source 文档`);
        continue;
      }
      const pref = prefixOf(id);
      if (sym === "__shared__") {
        if (pref !== "emg") {
          errors.push(`${block.name}(跨症状共享红旗)只能引用 emg_,却引用了 ${id}`);
        }
      } else {
        const want = SYMPTOM_PREFIX[sym];
        if (pref !== want && pref !== "emg") {
          errors.push(`${block.name}(症状 ${sym})的 claim ${id} 前缀应为 ${want}_ 或 emg_,实为 ${pref}_`);
        }
      }
    }
  }

  // 报告
  console.log("triage ↔ card 一致性校验");
  console.log(`  专属 flow 症状:${DEDICATED_SYMPTOMS.length} 个,均已映射病情卡`);
  console.log(`  claim 注解总数:${annotated}`);
  if (Object.keys(perSymptom).length) {
    for (const [name, n] of Object.entries(perSymptom)) {
      console.log(`    ${name}: ${n} 条注解`);
    }
  } else {
    console.log("    (尚无 claim 注解 —— 渐进迁移中,逐症状补)");
  }

  if (warnings.length) {
    console.log("\n警告:");
    for (const w of warnings) console.log(`  - ${w}`);
  }
  if (errors.length) {
    console.error("\n错误:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("\n校验通过。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
