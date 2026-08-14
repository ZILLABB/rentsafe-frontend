import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, clearSession, getToken, setToken } from "./api";

/** Session handling.
 *
 *  Access tokens last 15 minutes. The refresh token used to be received and
 *  thrown away, and `/auth/refresh` was never called by anything — so every
 *  session died silently after 15 minutes, typically part-way through the
 *  six-step review wizard on a slow connection.
 *
 *  These are the cases that made that bug invisible: a single 401 looks like a
 *  normal auth failure, and only the retry-and-recover behaviour distinguishes
 *  a working session from a dead one.
 */

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("request session handling", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("stores the refresh token at sign-in, not just the access token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        access_token: "access-1",
        refresh_token: "refresh-1",
        user_id: 7,
      }),
    );

    await api.verifyOtp("08012345678", "123456");

    expect(getToken()).toBe("access-1");
    // Discarding this is what made sessions die after 15 minutes.
    expect(localStorage.getItem("rentsafe.refresh_token")).toBe("refresh-1");
  });

  it("refreshes once on a 401 and retries the original request", async () => {
    setToken("stale-access");
    localStorage.setItem("rentsafe.refresh_token", "refresh-1");

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ detail: "expired" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "access-2", refresh_token: "refresh-2" }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: 7, display_name: "Tunde" }));

    const me = await api.me();

    expect(me).toMatchObject({ id: 7 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(getToken()).toBe("access-2");
    // The server rotates the refresh token; keeping the old one would work
    // exactly once more and then fail.
    expect(localStorage.getItem("rentsafe.refresh_token")).toBe("refresh-2");
  });

  it("gives up and clears the session when the refresh also fails", async () => {
    setToken("stale-access");
    localStorage.setItem("rentsafe.refresh_token", "refresh-dead");

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ detail: "expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ detail: "invalid" }, 401));

    await expect(api.me()).rejects.toThrow(/401/);
    expect(getToken()).toBeNull();
    expect(localStorage.getItem("rentsafe.refresh_token")).toBeNull();
  });

  it("does not attempt a refresh when there is no refresh token", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ detail: "unauthorised" }, 401));

    await expect(api.me()).rejects.toThrow(/401/);
    // An anonymous caller should get its 401 straight back, not a pointless
    // extra round trip.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shares one refresh across concurrent requests", async () => {
    setToken("stale-access");
    localStorage.setItem("rentsafe.refresh_token", "refresh-1");

    let refreshCalls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) {
        refreshCalls += 1;
        return jsonResponse({
          access_token: "access-2",
          refresh_token: "refresh-2",
        });
      }
      return getToken() === "access-2"
        ? jsonResponse({ ok: true })
        : jsonResponse({ detail: "expired" }, 401);
    });

    await Promise.all([api.me(), api.me(), api.me()]);

    // Without a shared in-flight promise, three stale requests would fire three
    // refreshes and the last two would present an already-rotated token.
    expect(refreshCalls).toBe(1);
  });

  it("clearSession removes both tokens", () => {
    setToken("a");
    localStorage.setItem("rentsafe.refresh_token", "b");

    clearSession();

    // Clearing only the access token would leave a "signed out" user holding a
    // refresh token, and the next 401 would silently sign them back in.
    expect(getToken()).toBeNull();
    expect(localStorage.getItem("rentsafe.refresh_token")).toBeNull();
  });
});
