import { describe, expect, it } from "vitest";
import { withTimeout } from "./async";

describe("request timeout", () => {
  it("rejects an indefinitely pending request instead of leaving the UI busy", async () => {
    await expect(withTimeout(new Promise(() => {}), "云端校验", 5)).rejects.toThrow("云端校验超时");
  });
});
