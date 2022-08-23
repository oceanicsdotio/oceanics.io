import { describe, expect, test } from '@jest/globals';
import { EXTENSIONS, fetchToken, apiFetch, testAllowedMethodCount, API_PATH } from "../test-utils";

/**
 * Collect tests that create, get, and manipulate graph nodes related
 * to sensing
 */
describe("index", function () {
  test.concurrent("options reports allowed methods", async function () {
    const token = await fetchToken();
    const response = await apiFetch(token, API_PATH, "OPTIONS")();
    expect(response.status).toEqual(204);
    testAllowedMethodCount(response.headers, 2);
  });

  /**
   * Fails if database hasn't been populated yet. Relies on real labels,
   * not those defined in the specification/code. 
   */
  test.concurrent("retrieves collection index", async function () {
    const token = await fetchToken();
    const response = await apiFetch(token, API_PATH, "GET")();
    expect(response.status).toEqual(200);
    const data = await response.json();
    expect(data.length).toBeGreaterThanOrEqual(1);
    const names = new Set(data.map((item: {name: string}) => item.name));
    expect(EXTENSIONS.auth.every((omit) => !names.has(omit))).toBe(true)
  });
})
