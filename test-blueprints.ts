#!/usr/bin/env bun
import { DEFAULT_BLUEPRINTS } from "@third-eye/constants/blueprints-data";

console.log("DEFAULT_BLUEPRINTS keys:", Object.keys(DEFAULT_BLUEPRINTS));
console.log("Total keys:", Object.keys(DEFAULT_BLUEPRINTS).length);
console.log("Has jogan?", "jogan" in DEFAULT_BLUEPRINTS);
console.log("Has mangekyo?", "mangekyo" in DEFAULT_BLUEPRINTS);

for (const [key, value] of Object.entries(DEFAULT_BLUEPRINTS)) {
  console.log(`  ${key}: ${(value as any).metadata?.name || "NO NAME"}`);
}
