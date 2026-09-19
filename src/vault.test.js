import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createRecoveryKey, decryptJson, encryptJson, importRecoveryKey, recoverWithPhrase, revealRecoveryKey, wrapRecoveryKey } from "./vault";

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

  it("restores a vault key from a client-encrypted recovery phrase kit", async () => {
    const original = await createRecoveryKey();
    const kit = await wrapRecoveryKey("a-recovery-phrase");
    await createRecoveryKey();
    await recoverWithPhrase(kit, "a-recovery-phrase");
    expect(await revealRecoveryKey()).toBe(original);
    await expect(recoverWithPhrase(kit, "wrong-recovery-phrase")).rejects.toThrow("不正确");
  });
});
