import { describe, expect, it } from "vitest";
import { canMarkReady, emptyApplication, evaluateEligibility, materialGaps, normalizeLegacy } from "./domain";

describe("application gates", () => {
  it("requires tailored material", () => expect(canMarkReady(emptyApplication())).toBe(false));
  it("requires referral code when a source exists", () => {
    const job = emptyApplication({ resumeFile: "cv.pdf", resumeTailoring: "JD keywords", personalStatement: "Why this role", referralSource: "shared doc" });
    expect(materialGaps(job)).toContain("内推码");
  });
  it("requires complete email draft", () => {
    const job = emptyApplication({ resumeFile: "cv.pdf", resumeTailoring: "x", personalStatement: "x", applyMethod: "email" });
    expect(materialGaps(job)).toContain("完整邮件稿");
  });
});

describe("eligibility", () => {
  it("excludes insurance sales", () => expect(evaluateEligibility(emptyApplication({ role: "Insurance Sales Agent" })).value).toBe("excluded"));
  it("excludes recruiting roles", () => expect(evaluateEligibility(emptyApplication({ role: "Talent Acquisition Intern" })).value).toBe("excluded"));
  it("blocks early full-time start", () => expect(evaluateEligibility(emptyApplication({ employmentType: "fulltime", earliestStart: "2026-11-01" }), new Date("2026-09-15")).value).toBe("excluded"));
});

it("deduplicates legacy records by URL", () => {
  expect(normalizeLegacy({ applications: [{ url: "https://a.test/job/1" }], pipeline: [{ url: "https://a.test/job/1?x=1" }] })).toHaveLength(1);
});
