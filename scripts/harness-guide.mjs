#!/usr/bin/env node
// Home guide harness
//
// Keeps the onboarding guide tied to real UI regions instead of drifting back
// into a detached slideshow.

import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function includesAll(source, needles, label) {
  for (const needle of needles) {
    assert(source.includes(needle), `${label}: missing ${needle}`);
  }
}

const guide = read("src/components/Guide.tsx");
const layout = read("src/app/layout.tsx");
const home = read("src/app/page.tsx");
const symptoms = read("src/app/symptoms/page.tsx");
const triage = read("src/app/triage/page.tsx");
const pets = read("src/app/pets/page.tsx");
const onboarding = read("src/app/onboarding/page.tsx");
const tabBar = read("src/components/TabBar.tsx");

includesAll(
  guide,
  [
    "export const GUIDE_STEPS",
    "targetId:",
    "getBoundingClientRect",
    "guide-spotlight",
    "guide-coach",
    "scrollIntoView",
    "route:",
  ],
  "Guide spotlight implementation",
);

const targetIds = [
  "guide-home-stage",
  "guide-symptom-picker",
  "guide-triage-questions",
  "guide-knowledge",
  "guide-help",
  "guide-tools",
  "guide-triage",
  "guide-behavior",
  "guide-profile",
  "guide-profile-summary",
  "guide-profile-health",
  "guide-profile-edit-basic",
  "guide-profile-edit-health",
];

for (const id of targetIds) {
  assert(guide.includes(`targetId: "${id}"`), `Guide step missing target ${id}`);
}

assert(
  (guide.match(/targetId:/g) ?? []).length >= 11,
  "Guide should contain the extended home, triage, and profile coach-mark steps",
);

includesAll(
  guide,
  [
    'route: "/"',
    'route: "/symptoms"',
    'route: "/triage?symptom=vomit"',
    'route: "/pets"',
    'route: "/onboarding#edit-basic"',
    'route: "/onboarding#edit-health"',
  ],
  "Guide route-aware steps",
);

assert(
  layout.includes('import { GuideHost } from "@/components/GuideHost"') &&
    layout.includes("<GuideHost />"),
  "Root layout should mount GuideHost so the tour survives route changes",
);

includesAll(
  home,
  targetIds
    .filter((id) =>
      [
        "guide-home-stage",
        "guide-knowledge",
        "guide-help",
        "guide-tools",
        "guide-triage",
        "guide-behavior",
      ].includes(id),
    )
    .map((id) => `data-guide-target="${id}"`),
  "Home guide targets",
);

includesAll(
  symptoms,
  ['guideTarget="guide-symptom-picker"', "data-guide-target={guideTarget}"],
  "Symptoms guide targets",
);

includesAll(
  triage,
  ['data-guide-target="guide-triage-questions"'],
  "Triage guide targets",
);

includesAll(
  pets,
  [
    'data-guide-target="guide-profile-summary"',
    'data-guide-target="guide-profile-health"',
  ],
  "Pets profile guide targets",
);

includesAll(
  onboarding,
  [
    'data-guide-target={guideTarget}',
    'guideTarget="guide-profile-edit-basic"',
    'guideTarget="guide-profile-edit-health"',
  ],
  "Onboarding edit guide targets",
);

assert(
  tabBar.includes('data-guide-target={tab.href === "/pets" ? "guide-profile" : undefined}'),
  "TabBar should expose the profile tab as the guide-profile target",
);

console.log("guide spotlight checks passed");
