#!/usr/bin/env node
// Home mobile layout harness
//
// Guards against in-app mobile browsers compressing the pet stage so the first
// thing a user sees is only the cat's head or a cropped room.

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

const home = read("src/app/page.tsx");
const globals = read("src/app/globals.css");
const pkg = read("package.json");

assert(
  !home.includes("calc(100dvh - 190px)"),
  "Home stage must not derive its height from 100dvh minus a fixed chrome guess",
);

includesAll(
  home,
  [
    "visualViewport",
    "--home-visual-height",
    "data-home-stage",
    "data-home-cat",
    "intro ? \"idle\"",
  ],
  "Home mobile viewport and first-frame safeguards",
);

includesAll(
  globals,
  [
    "--home-visual-height",
    "--home-stage-min",
    ".home-shell",
    ".home-stage",
    "@media (max-height: 700px)",
  ],
  "Global mobile home sizing rules",
);

assert(
  pkg.includes('"harness:home-mobile": "node scripts/harness-home-mobile-layout.mjs"'),
  "package.json should expose the home mobile layout harness",
);

console.log("home mobile layout checks passed");
