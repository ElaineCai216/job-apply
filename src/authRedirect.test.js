import { describe, expect, it } from "vitest";
import { sessionTokensFromUrl } from "./authRedirect";

describe("native auth callback", () => {
  it("extracts implicit-flow tokens without exposing them", () => {
    expect(sessionTokensFromUrl("com.elaine.applydesk://login-callback#access_token=a&refresh_token=b")).toMatchObject({ access_token: "a", refresh_token: "b" });
  });
  it("extracts a PKCE code callback", () => {
    expect(sessionTokensFromUrl("applydesk://login-callback?code=abc").code).toBe("abc");
  });
});
