/**
 * WCAG AAA Contrast Ratio Audit Script
 * Analyzes all themes for accessibility compliance
 */

// WCAG contrast calculation utilities
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

function meetsWCAG_AAA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
}

function meetsWCAG_AA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

// Theme definitions (WCAG AAA compliant colors from themes.ts)
const themes = {
  aurora: {
    light: {
      primary: "#075985",
      accent: "#0C4A6E",
      ink: "#0F172A",
      paper: "#F0F9FF",
      outline: "#334155",
    },
    dark: {
      primary: "#7DD3FC",
      accent: "#BAE6FD",
      ink: "#F0F9FF",
      paper: "#082F49",
      outline: "#7DD3FC",
    },
  },
  midnight: {
    light: {
      primary: "#4338CA",
      accent: "#5B21B6",
      ink: "#0F172A",
      paper: "#F8FAFC",
      outline: "#334155",
    },
    dark: {
      primary: "#A78BFA",
      accent: "#C4B5FD",
      ink: "#F8FAFC",
      paper: "#020617",
      outline: "#A78BFA",
    },
  },
  sakura: {
    light: {
      primary: "#9F1239",
      accent: "#881337",
      ink: "#1F2937",
      paper: "#FDF2F8",
      outline: "#374151",
    },
    dark: {
      primary: "#F9A8D4",
      accent: "#FBCFE8",
      ink: "#F9FAFB",
      paper: "#831843",
      outline: "#F9A8D4",
    },
  },
  horizon: {
    light: {
      primary: "#164E63",
      accent: "#164E63",
      ink: "#164E63",
      paper: "#ECFEFF",
      outline: "#334155",
    },
    dark: {
      primary: "#67E8F9",
      accent: "#A5F3FC",
      ink: "#ECFEFF",
      paper: "#083344",
      outline: "#67E8F9",
    },
  },
  emerald: {
    light: {
      primary: "#065F46",
      accent: "#064E3B",
      ink: "#064E3B",
      paper: "#ECFDF5",
      outline: "#334155",
    },
    dark: {
      primary: "#6EE7B7",
      accent: "#A7F3D0",
      ink: "#D1FAE5",
      paper: "#022C22",
      outline: "#6EE7B7",
    },
  },
  obsidian: {
    light: {
      primary: "#1F2937",
      accent: "#374151",
      ink: "#111827",
      paper: "#F9FAFB",
      outline: "#374151",
    },
    dark: {
      primary: "#F3F4F6",
      accent: "#E5E7EB",
      ink: "#F3F4F6",
      paper: "#111827",
      outline: "#6B7280",
    },
  },
};

console.log("=".repeat(80));
console.log("WCAG AAA CONTRAST AUDIT REPORT");
console.log("=".repeat(80));
console.log("");
console.log("Standards:");
console.log("  WCAG AAA Normal Text: 7:1 minimum");
console.log("  WCAG AAA Large Text:  4.5:1 minimum");
console.log("  WCAG AA Normal Text:  4.5:1 minimum");
console.log("  WCAG AA Large Text:   3:1 minimum");
console.log("");

let totalTests = 0;
let passedAAA = 0;
let passedAA = 0;
let failed = 0;

for (const [themeName, modes] of Object.entries(themes)) {
  console.log("─".repeat(80));
  console.log(`Theme: ${themeName.toUpperCase()}`);
  console.log("─".repeat(80));

  for (const [mode, colors] of Object.entries(modes)) {
    console.log(`\n${mode.toUpperCase()} MODE:`);
    console.log("");

    // Critical tests: Text on background
    const tests = [
      {
        name: "Ink on Paper (body text)",
        fg: colors.ink,
        bg: colors.paper,
        isLarge: false,
      },
      {
        name: "Primary on Paper (buttons)",
        fg: colors.primary,
        bg: colors.paper,
        isLarge: false,
      },
      {
        name: "Accent on Paper (highlights)",
        fg: colors.accent,
        bg: colors.paper,
        isLarge: false,
      },
      {
        name: "Outline on Paper (borders)",
        fg: colors.outline,
        bg: colors.paper,
        isLarge: true,
      },
    ];

    for (const test of tests) {
      const ratio = getContrastRatio(test.fg, test.bg);
      const aaa = meetsWCAG_AAA(ratio, test.isLarge);
      const aa = meetsWCAG_AA(ratio, test.isLarge);

      totalTests++;
      if (aaa) passedAAA++;
      else if (aa) passedAA++;
      else failed++;

      const status = aaa ? "AAA ✓" : aa ? "AA  ⚠" : "FAIL ✗";
      const requiredRatio = test.isLarge ? "4.5:1" : "7:1";

      console.log(
        `  ${test.name.padEnd(30)} ${ratio.toFixed(2)}:1 ${status} (req: ${requiredRatio})`,
      );
      console.log(`    FG: ${test.fg.padEnd(10)} BG: ${test.bg}`);

      if (!aaa) {
        if (aa) {
          console.log(
            `    ⚠ WARNING: Passes AA but fails AAA (${ratio.toFixed(2)} < ${requiredRatio})`,
          );
        } else {
          console.log(`    ✗ CRITICAL: Fails WCAG AA minimum standards!`);
        }
      }
      console.log("");
    }
  }
}

console.log("=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));
console.log(`Total Tests: ${totalTests}`);
console.log(
  `AAA Compliant (7:1 / 4.5:1): ${passedAAA} (${((passedAAA / totalTests) * 100).toFixed(1)}%)`,
);
console.log(
  `AA Compliant (4.5:1 / 3:1):  ${passedAA} (${((passedAA / totalTests) * 100).toFixed(1)}%)`,
);
console.log(
  `Failed (<4.5:1 / <3:1):      ${failed} (${((failed / totalTests) * 100).toFixed(1)}%)`,
);
console.log("");

if (passedAAA === totalTests) {
  console.log("✓ ALL THEMES MEET WCAG AAA STANDARDS");
} else if (passedAAA + passedAA === totalTests) {
  console.log("⚠ Some themes only meet WCAG AA (need improvement for AAA)");
} else {
  console.log("✗ CRITICAL: Some combinations fail basic WCAG AA standards");
}
console.log("=".repeat(80));
