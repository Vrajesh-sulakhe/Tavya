import { describe, expect, it } from "vitest";
import { detectAllergyConflicts, detectInteractions } from "../interactions";
import { parsePrescriptionText } from "../prescription-parser";

describe("interactions & prescription parser", () => {
  it("flags major NSAID + Aspirin bleeding risk and Statin + Grapefruit caution", () => {
    const warnings = detectInteractions([
      "Aspirin 75mg",
      "Ibuprofen 400mg",
      "Atorvastatin 10mg",
    ]);

    expect(warnings.some((w) => w.severity === "major")).toBe(true);
    expect(warnings.some((w) => w.pairLabel.includes("Atorvastatin"))).toBe(true);
  });

  it("parses medical shorthand (OD, BD, HS, AC, PC) into senior-friendly schedule items", () => {
    const result = parsePrescriptionText(
      "Tab Metformin 500mg BD after meals\nTab Atorvastatin 10mg HS\nTab Levothyroxine 50mcg OD before breakfast"
    );

    expect(result.items).toHaveLength(3);
    expect(result.items[0]?.slots).toEqual(["morning", "night"]);
    expect(result.items[0]?.mealTiming).toBe("after_food");

    expect(result.items[1]?.slots).toEqual(["night"]);
    expect(result.items[2]?.slots).toEqual(["morning"]);
    expect(result.items[2]?.mealTiming).toBe("before_food");
    expect(result.disclaimer).toContain("licensed physician");
  });

  it("cross-screens medications against profile allergies including drug classes", () => {
    const conflicts = detectAllergyConflicts(
      ["Amoxicillin 500mg", "Glimepiride 2mg", "Metformin 500mg"],
      ["Penicillin", "Sulfa drugs"]
    );

    expect(conflicts).toHaveLength(2);
    expect(conflicts.map((c) => c.medicationName)).toEqual(
      expect.arrayContaining(["Amoxicillin 500mg", "Glimepiride 2mg"])
    );
    expect(conflicts[0]?.guidance).toBeTruthy();
  });
});
