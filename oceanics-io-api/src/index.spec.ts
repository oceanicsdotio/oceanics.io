import { describe, expect, test } from '@jest/globals';
import { EXTENSIONS, fetchToken, apiFetch, testAllowedMethodCount } from "./shared/middleware.spec";

/**
 * Collect tests that create, get, and manipulate graph nodes related
 * to sensing
 */
describe("Index", function () {
  test.concurrent("options reports Allowed Methods", async function () {
    const token = await fetchToken();
    const response = await apiFetch(token, "", "OPTIONS")();
    expect(response.status).toEqual(204);
    testAllowedMethodCount(response.headers, 2);
  });

  test.concurrent("retrieves collection index", async function () {
    const token = await fetchToken();
    const response = await apiFetch(token, "", "GET")();
    expect(response.status).toEqual(200);
    const data = await response.json();
    expect(data.length).toBeGreaterThanOrEqual(1);
    const names = new Set(data.map((item: {name: string}) => item.name));
    expect(EXTENSIONS.auth.every((omit) => !names.has(omit))).toBe(true)
  });
})
