import fetch from "node-fetch";
import { describe, expect, test } from '@jest/globals';

const BASE_PATH = `http://localhost:8888/.netlify/functions`;

/**
 * A stand-alone function for dictionary and aliasing
 * features
 */
describe("Lexicon", function () {
  /**
   * Test correcting input word to the closest
   * well-known match.
   */
  test.skip("works?", async function () {
    const response = await fetch(`${BASE_PATH}/lexicon`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pattern: "lexicon",
        maxCost: 1,
      }),
    });
    expect(response.status).toBe(200);
  });
});
