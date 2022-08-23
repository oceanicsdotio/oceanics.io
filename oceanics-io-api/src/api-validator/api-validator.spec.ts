import fetch from "node-fetch";
import { describe, expect, test } from '@jest/globals';
import { BASE_PATH, getNodes } from "../../test-utils";

const PATH = `${BASE_PATH}/api-validator`;

describe("idempotent", function() {
  /**
   * API request validation is through a separate service so that it can be tested
   * and used without needing to persist data or manage side effects. 
   * 
   * This `describe` block checks that all canonical examples we use in tests and code
   * are valid, and that the API layer contract is being upheld on both sides. If the docs
   * fall out of date with the schema, these tests will start failing. 
   */
  describe("api-validator handlers", function () {
    describe("api-validator.post", function () {
      test.concurrent.each(getNodes())(`validates %s %s`, async function (nodeType, _, data) {
        const reference = `#/components/schemas/${nodeType}`;
        const response = await fetch(PATH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({data, reference})
        });
        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.test).toBe(true);
      })
    })
  })

})


    // const {required=[], additionalProperties=true} = spec.components.schemas[nodeType];
    // const [testCase] = WELL_KNOWN_NODES[nodeType];
    // test.concurrent.each(required)(`fails without %s`, async function (key) {
    //   const response = await fetch(PATH, {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({data: {
    //       ...testCase,
    //       [key]: undefined
    //     }, reference})
    //   });
    //   expect(response.status).toBe(200);
    //   const result = await response.json();
    //   expect(result.test).toBe(false);
    // }, 4000)
    
    // if (!additionalProperties) {
    //   test("fails with additional properties", async function () {
    //     const response = await fetch(PATH, {
    //       method: "POST",
    //       headers: { "Content-Type": "application/json" },
    //       body: JSON.stringify({data: {
    //         ...testCase,
    //         extra: "extra-key-value-pair"
    //       }, reference})
    //     });
    //     expect(response.status).toBe(200);
    //     const result = await response.json();
    //     expect(result.test).toBe(false);
    //   }, 4000)
    // }

