#!/usr/bin/env node
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const require = createRequire(import.meta.url);

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

function loadTypeScriptModule(rel, customRequire = require) {
  const ts = require("typescript");
  const fullPath = path.join(ROOT, rel);
  const source = fs.readFileSync(fullPath, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: fullPath,
  }).outputText;
  const mod = new Module(fullPath);
  mod.filename = fullPath;
  mod.paths = Module._nodeModulePaths(path.dirname(fullPath));
  mod.require = customRequire;
  mod._compile(js, fullPath);
  return mod.exports;
}

function assertSelectorBehavior() {
  const typeExports = loadTypeScriptModule("src/types/knowledge-poster.ts");
  const selectorExports = loadTypeScriptModule(
    "src/lib/knowledge-poster-attachments.ts",
    (request) => {
      if (request === "@/types/knowledge-poster") return typeExports;
      return require(request);
    },
  );

  const unsafeAttachment = {
    id: "cat-vomiting",
    title: "呕吐",
    image: "//evil.example/poster.png",
    displayMode: "preview",
    riskTone: "yellow",
  };
  assert(
    typeExports.isKnowledgePosterAttachment(unsafeAttachment) === false,
    "shared poster guard should reject protocol-relative image paths",
    JSON.stringify(unsafeAttachment),
  );

  const rawBackslashAttachment = {
    ...unsafeAttachment,
    image: "/\\evil.example/poster.png",
  };
  assert(
    typeExports.isKnowledgePosterAttachment(rawBackslashAttachment) === false,
    "shared poster guard should reject raw backslash image paths",
    JSON.stringify(rawBackslashAttachment),
  );

  const decodedBackslashAttachment = {
    ...unsafeAttachment,
    image: "/%5Cevil.example/poster.png",
  };
  assert(
    typeExports.isKnowledgePosterAttachment(decodedBackslashAttachment) === false,
    "shared poster guard should reject decoded backslash image paths",
    JSON.stringify(decodedBackslashAttachment),
  );

  const invalidSourceDocsAttachment = {
    ...unsafeAttachment,
    image: "/knowledge-posters/generated-style/cat-vomiting.png",
    sourceDocs: [123],
  };
  assert(
    typeExports.isKnowledgePosterAttachment(invalidSourceDocsAttachment) === false,
    "shared poster guard should reject non-string sourceDocs",
    JSON.stringify(invalidSourceDocsAttachment),
  );

  const invalidReasonAttachment = {
    ...unsafeAttachment,
    image: "/knowledge-posters/generated-style/cat-vomiting.png",
    reason: { source: "bad" },
  };
  assert(
    typeExports.isKnowledgePosterAttachment(invalidReasonAttachment) === false,
    "shared poster guard should reject non-string reason",
    JSON.stringify(invalidReasonAttachment),
  );

  const protocolRelative = selectorExports.selectKnowledgePosterFromItems(
    [
      {
        id: "cat-vomiting",
        title: "呕吐",
        image: "//evil.example/poster.png",
      },
    ],
    { tier: "yellow", medicalCardIds: ["cat-vomiting"] },
  );
  assert(
    protocolRelative === undefined,
    "pure selector should reject protocol-relative image paths",
    JSON.stringify(protocolRelative),
  );

  const rawBackslash = selectorExports.selectKnowledgePosterFromItems(
    [
      {
        id: "cat-vomiting",
        title: "呕吐",
        image: "/\\evil.example/poster.png",
      },
    ],
    { tier: "yellow", medicalCardIds: ["cat-vomiting"] },
  );
  assert(
    rawBackslash === undefined,
    "pure selector should reject raw backslash image paths",
    JSON.stringify(rawBackslash),
  );

  const decodedBackslash = selectorExports.selectKnowledgePosterFromItems(
    [
      {
        id: "cat-vomiting",
        title: "呕吐",
        image: "/%5Cevil.example/poster.png",
      },
    ],
    { tier: "yellow", medicalCardIds: ["cat-vomiting"] },
  );
  assert(
    decodedBackslash === undefined,
    "pure selector should reject decoded backslash image paths",
    JSON.stringify(decodedBackslash),
  );

  const localImage = "/knowledge-posters/generated-style/cat-vomiting-xhs-style-v1.png";
  const local = selectorExports.selectKnowledgePosterFromItems(
    [
      {
        id: "cat-vomiting",
        title: "呕吐",
        image: localImage,
      },
    ],
    { tier: "yellow", medicalCardIds: ["cat-vomiting"] },
  );
  assert(
    local?.image === localImage,
    "pure selector should preserve validated local public image path",
    JSON.stringify(local),
  );

  const fallbackPoster = selectorExports.selectKnowledgePosterFromItems(
    [
      {
        id: "care-carrier-vet-visit",
        title: "猫包/去医院训练",
        image: "/knowledge-posters/generated-style/care-carrier-vet-visit-xhs-style-v1.png",
        generationMode: "local-scrapbook-fallback",
      },
    ],
    { intent: "daily_care", careCardIds: ["care-carrier-vet-visit"] },
  );
  assert(
    fallbackPoster === undefined,
    "pure selector should not return local fallback poster art",
    JSON.stringify(fallbackPoster),
  );

  const expectedItems = [
    {
      id: "cat-emergency-red-flags",
      title: "通用急诊红旗",
      image: "/knowledge-posters/generated-style/cat-emergency-red-flags-xhs-style-v1.png",
    },
    {
      id: "cat-dyspnea",
      title: "呼吸异常",
      image: "/knowledge-posters/generated-style/cat-dyspnea-xhs-style-v1.png",
    },
    {
      id: "cat-vomiting",
      title: "猫呕吐",
      image: "/knowledge-posters/generated-style/cat-vomiting-xhs-style-v1.png",
    },
    {
      id: "cat-anorexia",
      title: "猫不吃/食欲下降",
      image: "/knowledge-posters/generated-style/cat-anorexia-xhs-style-v1.png",
    },
    {
      id: "care-nail-trimming",
      title: "剪指甲训练",
      image: "/knowledge-posters/generated-style/care-nail-trimming-xhs-style-v1.png",
    },
  ];

  const red = selectorExports.selectKnowledgePosterFromItems(expectedItems, {
    tier: "red",
    medicalCardIds: ["cat-emergency-red-flags", "cat-dyspnea"],
  });
  assert(
    red?.id === "cat-emergency-red-flags" &&
      red.displayMode === "inline" &&
      red.riskTone === "red",
    "pure selector should map red tier to inline emergency poster",
    JSON.stringify(red),
  );

  const yellow = selectorExports.selectKnowledgePosterFromItems(expectedItems, {
    tier: "yellow",
    medicalCardIds: ["cat-emergency-red-flags", "cat-vomiting"],
  });
  assert(
    yellow?.id === "cat-vomiting" &&
      yellow.displayMode === "preview" &&
      yellow.riskTone === "yellow",
    "pure selector should map yellow tier to non-red preview poster",
    JSON.stringify(yellow),
  );

  const medicalGeneral = selectorExports.selectKnowledgePosterFromItems(
    expectedItems,
    {
      intent: "medical_general",
      medicalCardIds: ["cat-anorexia", "cat-vomiting"],
      careCardIds: ["care-nail-trimming"],
    },
  );
  assert(
    medicalGeneral?.id === "cat-anorexia" &&
      medicalGeneral.displayMode === "preview" &&
      medicalGeneral.riskTone === "yellow",
    "pure selector should prefer medical recall posters for medical_general questions",
    JSON.stringify(medicalGeneral),
  );

  const care = selectorExports.selectKnowledgePosterFromItems(expectedItems, {
    intent: "daily_care",
    careCardIds: ["care-nail-trimming"],
  });
  assert(
    care?.id === "care-nail-trimming" &&
      care.displayMode === "collapsed" &&
      care.riskTone === "care",
    "pure selector should map daily care to collapsed care poster",
    JSON.stringify(care),
  );
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
    assert(
      item.generationMode === "ai-imagegen",
      `poster manifest should not expose fallback art for ${item.id}`,
      JSON.stringify({ id: item.id, generationMode: item.generationMode }),
    );
  }
  console.log("  ✓ manifest has 43 bound ai-imagegen poster images");

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
  assertSelectorBehavior();
  console.log("  ✓ selector rejects unsafe image paths");

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
