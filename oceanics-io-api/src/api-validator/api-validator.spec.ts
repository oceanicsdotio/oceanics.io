import fetch from "node-fetch";
import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { BASE_PATH } from "../../test-utils";
import spec from "../shared/bathysphere.json";
import fs from "fs";
import crypto from "crypto";

const PATH = `${BASE_PATH}/api-validator`;
type Properties = { uuid: string};
type Schema = { examples: Properties[] };
type KeyValue = [ string, Properties[] ];
/**
 * Create a `describe` block for each of the Sensing API entities
 * 
 * Block of `test` scope tests that check that the validation service is
 * maintaining the integrity constraints identified in the specification.
 */

  // Shallow copy and insert uuid v4
  const insertId = (props: Object): Properties => Object({ ...props, uuid: crypto.randomUUID() });
  const filterWithoutExamples = ([_, { examples = []}]: [string, any]) => !!examples.length;
  const specifyExamples = ([key, { examples }]: [string, any]): KeyValue => [key, examples.map(insertId)];

  // Examples from the specification, overwrite them
  let nodeEntries: KeyValue[] = Object.entries(spec.components.schemas)
    .filter(filterWithoutExamples)
    .map(specifyExamples);

  let WELL_KNOWN_NODES = Object.fromEntries(nodeEntries);
  let NODES = nodeEntries.flatMap(([key, examples]) => examples.map((props: Properties): [string, string, Properties] => [key, props.uuid, props]));

  /**
   * Once all examples are validated, write them with UUID to swap file
   */
    //  afterAll(() => {
    //   fs.writeFile("./src/shared/nodes.json", JSON.stringify(WELL_KNOWN_NODES), (err) => {
    //     if (err) throw err;
    //     console.log('Example file saved');
    //   })
    // })
  
/**
 * API request validation is through a separate service so that it can be tested
 * and used without needing to persist data or manage side effects. 
 * 
 * This `describe` block checks that all canonical examples we use in tests and code
 * are valid, and that the API layer contract is being upheld on both sides. If the docs
 * fall out of date with the schema, these tests will start failing. 
 */
describe("api-validator.post", function () {

  test.concurrent.each(NODES)(`validates %s %s`, async function (nodeType, _, data) {
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
})
