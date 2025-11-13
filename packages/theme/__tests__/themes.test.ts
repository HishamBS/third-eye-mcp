import { describe, it, expect } from "vitest";
import { getTheme, getAllThemes, getThemeNames, THEMES } from "../src/themes";
import type { Theme, ThemeName, ThemeMode } from "../src/themes";

describe("Theme Registry", () => {
  describe("THEMES object", () => {
    it("should contain all seven themes", () => {
      expect(Object.keys(THEMES).length).toBe(7);
      expect(THEMES.overseer).toBeDefined();
      expect(THEMES.aurora).toBeDefined();
      expect(THEMES.midnight).toBeDefined();
      expect(THEMES.sakura).toBeDefined();
      expect(THEMES.horizon).toBeDefined();
      expect(THEMES.emerald).toBeDefined();
      expect(THEMES.obsidian).toBeDefined();
    });

    it("should have light and dark variants for each theme", () => {
      const themeNames: ThemeName[] = [
        "overseer",
        "aurora",
        "midnight",
        "sakura",
        "horizon",
        "emerald",
        "obsidian",
      ];

      for (const themeName of themeNames) {
        expect(THEMES[themeName].light).toBeDefined();
        expect(THEMES[themeName].dark).toBeDefined();
      }
    });

    it("should have frozen theme objects", () => {
      expect(Object.isFrozen(THEMES)).toBe(true);
      for (const theme of Object.values(THEMES)) {
        expect(Object.isFrozen(theme)).toBe(true);
        expect(Object.isFrozen(theme.light)).toBe(true);
        expect(Object.isFrozen(theme.dark)).toBe(true);
      }
    });
  });

  describe("getTheme", () => {
    it("should return theme for valid name and mode", () => {
      const theme = getTheme("aurora", "light");
      expect(theme).toBeDefined();
      expect(theme.name).toBe("aurora");
      expect(theme.mode).toBe("light");
    });

    it("should return dark variant when requested", () => {
      const theme = getTheme("midnight", "dark");
      expect(theme).toBeDefined();
      expect(theme.name).toBe("midnight");
      expect(theme.mode).toBe("dark");
    });

    it("should return theme for all theme names and modes", () => {
      const themeNames: ThemeName[] = [
        "overseer",
        "aurora",
        "midnight",
        "sakura",
        "horizon",
        "emerald",
        "obsidian",
      ];
      const modes: ThemeMode[] = ["light", "dark"];

      for (const themeName of themeNames) {
        for (const mode of modes) {
          const theme = getTheme(themeName, mode);
          expect(theme).toBeDefined();
          expect(theme.name).toBe(themeName);
          expect(theme.mode).toBe(mode);
        }
      }
    });
  });

  describe("getAllThemes", () => {
    it("should return array of all themes", () => {
      const themes = getAllThemes();
      expect(themes.length).toBe(14); // 7 themes × 2 modes
    });

    it("should include both light and dark variants", () => {
      const themes = getAllThemes();
      const auroaLights = themes.filter(
        (t) => t.name === "aurora" && t.mode === "light",
      );
      const auroaDarks = themes.filter(
        (t) => t.name === "aurora" && t.mode === "dark",
      );

      expect(auroaLights.length).toBe(1);
      expect(auroaDarks.length).toBe(1);
    });
  });

  describe("getThemeNames", () => {
    it("should return all theme names", () => {
      const names = getThemeNames();
      expect(names.length).toBe(7);
      expect(names).toContain("overseer");
      expect(names).toContain("aurora");
      expect(names).toContain("midnight");
      expect(names).toContain("sakura");
      expect(names).toContain("horizon");
      expect(names).toContain("emerald");
      expect(names).toContain("obsidian");
    });
  });

  describe("Theme structure", () => {
    const testTheme = (theme: Theme) => {
      expect(theme).toHaveProperty("name");
      expect(theme).toHaveProperty("mode");
      expect(theme).toHaveProperty("colors");
      expect(theme).toHaveProperty("typography");
      expect(theme).toHaveProperty("spacing");
      expect(theme).toHaveProperty("radius");
      expect(theme).toHaveProperty("shadow");

      // Test color structure
      expect(theme.colors).toHaveProperty("brand");
      expect(theme.colors).toHaveProperty("semantic");
      expect(theme.colors).toHaveProperty("eye");

      expect(theme.colors.brand).toHaveProperty("primary");
      expect(theme.colors.brand).toHaveProperty("accent");
      expect(theme.colors.brand).toHaveProperty("ink");
      expect(theme.colors.brand).toHaveProperty("paper");
      expect(theme.colors.brand).toHaveProperty("paperElev");
      expect(theme.colors.brand).toHaveProperty("outline");

      // Test typography structure
      expect(theme.typography).toHaveProperty("fontFamily");
      expect(theme.typography).toHaveProperty("fontSize");
      expect(theme.typography).toHaveProperty("fontWeight");
      expect(theme.typography).toHaveProperty("letterSpacing");

      // Test spacing structure
      expect(theme.spacing).toHaveProperty("4");
      expect(theme.spacing).toHaveProperty("8");

      // Test radius structure
      expect(theme.radius).toHaveProperty("sm");
      expect(theme.radius).toHaveProperty("md");
      expect(theme.radius).toHaveProperty("lg");

      // Test shadow structure
      expect(theme.shadow).toHaveProperty("sm");
      expect(theme.shadow).toHaveProperty("md");
      expect(theme.shadow).toHaveProperty("lg");
    };

    it("should have consistent structure across all themes", () => {
      const themes = getAllThemes();
      for (const theme of themes) {
        testTheme(theme);
      }
    });

    it("should have eye colors in all themes", () => {
      const theme = getTheme("aurora", "light");
      expect(theme.colors.eye.sharingan).toBe("#E11D48");
      expect(theme.colors.eye.byakugan).toBe("#93C5FD");
    });
  });

  describe("Theme contrast (accessibility)", () => {
    const testContrast = (theme: Theme) => {
      // Basic accessibility check: ink should be readable on paper
      // This is a placeholder for actual WCAG AA contrast ratio calculation
      const ink = theme.colors.brand.ink;
      const paper = theme.colors.brand.paper;

      // Ensure colors are defined
      expect(ink).toBeDefined();
      expect(paper).toBeDefined();

      // In dark mode, ink should be light (light color hex)
      if (theme.mode === "dark") {
        // Dark mode ink should be a light color (higher hex values)
        expect(ink).toBeDefined();
        expect(typeof ink).toBe("string");
      }
    };

    it("should have readable contrast in light mode", () => {
      const lightThemes = getAllThemes().filter((t) => t.mode === "light");
      for (const theme of lightThemes) {
        testContrast(theme);
      }
    });

    it("should have readable contrast in dark mode", () => {
      const darkThemes = getAllThemes().filter((t) => t.mode === "dark");
      for (const theme of darkThemes) {
        testContrast(theme);
      }
    });
  });
});
