import fetch from "node-fetch";
import { describe, expect, test } from '@jest/globals';
import { EXTENSIONS, BASE_PATH, WELL_KNOWN_NODES } from "../shared/middleware.spec";
import spec from "./bathysphere.json";

const PATH = `${BASE_PATH}/api-validator`;

/**
 * API request validation is through a separate service so that it can be tested
 * and used without needing to persist data or manage side effects. 
 * 
 * This `describe` block checks that all canonical examples we use in tests and code
 * are valid, and that the API layer contract is being upheld on both sides. If the docs
 * fall out of date with the schema, these tests will start failing. 
 */
describe("API Validator", function () {
  /**
   * Create a `describe` block for each of the Sensing API entities
   * 
   * Block of `test` scope tests that check that the validation service is
   * maintaining the integrity constraints identified in the specification.
   */
 
  describe.each(Array.from(EXTENSIONS.sensing))(`Validate %s`, function (nodeType) {

    const reference = `#/components/schemas/${nodeType}`;
    const [testCase] = WELL_KNOWN_NODES[nodeType];
    const {required=[], additionalProperties=true} = spec.components.schemas[nodeType];

    test.concurrent.each(WELL_KNOWN_NODES[nodeType])(`validates $uuid`, async function ({uuid, ...data}) {
      const response = await fetch(PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({data: {...data, uuid}, reference})
      });
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.test).toBe(true);
    }, 4000)

    test.concurrent.each(required)(`fails without %s`, async function (key) {
      const response = await fetch(PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({data: {
          ...testCase,
          [key]: undefined
        }, reference})
      });
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.test).toBe(false);
    }, 4000)
    
    if (!additionalProperties) {
      test("fails with additional properties", async function () {
        const response = await fetch(PATH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({data: {
            ...testCase,
            extra: "extra-key-value-pair"
          }, reference})
        });
        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.test).toBe(false);
      }, 4000)
    }
  });
})
