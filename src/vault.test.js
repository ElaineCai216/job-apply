import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createRecoveryKey, decryptJson, encryptJson, importRecoveryKey } from "./vault";

describe("encrypted local vault", () => {
  it("round-trips private application data without plaintext ciphertext", async () => {
    const recovery = await createRecoveryKey();
    expect(recovery.replaceAll("-", "")).toHaveLength(44);
    const source = { company: "Private Co", referralCode: "SECRET-1" };
    const encrypted = await encryptJson(source);
    expect(encrypted.ciphertext).not.toContain("Private Co");
    expect(await decryptJson(encrypted)).toEqual(source);
  });

  it("rejects malformed recovery keys", async () => {
    await expect(importRecoveryKey("bad-key")).rejects.toThrow("格式不正确");
  });
});
