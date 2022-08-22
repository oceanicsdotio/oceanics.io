import fetch from "node-fetch";
import { describe, expect, test } from '@jest/globals';
import { EXTENSIONS, BASE_PATH, WELL_KNOWN_NODES } from "../shared/middleware.spec";
import spec from "./bathysphere.json";

/**
 * API request validation is through a separate service so that it can be tested
 * and used without needing to persist data or manage side effects. 
 * 
 * This `describe` block checks that all canonical examples we use in tests and code
 * are valid, and that the API layer contract is being upheld on both sides. If the docs
 * fall out of date with the schema, these tests will start failing. 
 */
describe("API Request Validator", function () {

  const query = (data: Object) => fetch(`${BASE_PATH}/api-validator`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const testResponse = async (data: Object, expected: boolean) => {
    const response = await query(data);
    const result = await response.json();
    
    expect(response.status).toBe(200);

    const pass = result.test === expected;
    if (!pass) console.log({...data, ...result});
    expect(pass).toBe(true);
  }

  /**
   * Block of `test` scope tests that check that the validation service is
   * maintaining the integrity constraints identified in the specification.
   */
  const validateInterface = (nodeType: string) => {
    return function () {

      const reference = `#/components/schemas/${nodeType}`;
      const testCase = WELL_KNOWN_NODES[nodeType][0];
      const {required=[], additionalProperties=true} = spec.components.schemas[nodeType];

      test("validates well known nodes", async function () {
        for (const data of WELL_KNOWN_NODES[nodeType]) {
          await testResponse({ data, reference}, true);
        }
      }, 4000)

      for (const key of required) {
        test(`fails without ${key}`, async function () {
          await testResponse({ data: {
            ...testCase,
            [key]: undefined
          }, reference }, false);
        }, 4000)
      }
      if (!additionalProperties) {
        test("fails with additional properties", async function () {
          await testResponse({ data: {
            ...testCase,
            extra: "extra-key-value-pair"
          }, reference }, false);
        }, 4000)
      }
    }
  }

  /**
   * Create a `describe` block for each of the Sensing API entities
   */
  for (const nodeType of EXTENSIONS.sensing) {
    describe(nodeType, validateInterface(nodeType));
  }
})
