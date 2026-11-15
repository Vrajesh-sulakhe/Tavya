import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardPayload } from "@/domain/types";
import {
  ApiRequestError,
  requestJson,
  unwrapDashboardPayload,
} from "../client-api";

describe("client-api utilities", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends JSON body and parses successful responses", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, count: 2 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    const data = await requestJson<{ ok: boolean; count: number }>(
      "/api/test",
      {
        method: "POST",
        body: { hello: "world" },
      }
    );

    expect(data).toEqual({ ok: true, count: 2 });
    expect(mockFetch).toHaveBeenCalledWith("/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });
  });

  it("extracts structured Zod issue messages from non-OK responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "Validation failed",
            issues: [{ message: "Passcode must be 4-8 digits." }],
          }),
          { status: 400 }
        )
      )
    );

    await expect(
      requestJson("/api/circle/members", {
        method: "POST",
        body: {},
        fallbackError: "Fallback error",
      })
    ).rejects.toMatchObject({
      status: 400,
      message: "Passcode must be 4-8 digits.",
      isUnauthorized: false,
    });
  });

  it("flags 401 responses cleanly with isUnauthorized", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Session expired" }), {
          status: 401,
        })
      )
    );

    try {
      await requestJson("/api/doses", { method: "POST", body: {} });
      throw new Error("Expected requestJson to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      const apiErr = err as ApiRequestError;
      expect(apiErr.status).toBe(401);
      expect(apiErr.isUnauthorized).toBe(true);
      expect(apiErr.message).toBe("Session expired");
    }
  });

  it("unwraps both direct and envelope dashboard payloads", () => {
    const fakeDashboard = {
      todayKey: "2026-11-15",
      viewerRole: "caretaker",
    } as DashboardPayload;

    expect(unwrapDashboardPayload(fakeDashboard)).toBe(fakeDashboard);
    expect(unwrapDashboardPayload({ dashboard: fakeDashboard })).toBe(
      fakeDashboard
    );
  });
});
