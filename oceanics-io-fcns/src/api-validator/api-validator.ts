
import type { Handler } from "@netlify/functions";
// https://ajv.js.org/standalone.html#using-the-validation-function-s
import spec from "./bathysphere.json";
import Ajv from "ajv";


const ajv = new Ajv({ removeAdditional: true });
ajv.addSchema(spec, "bathysphere");



const handler: Handler = async ({ body, httpMethod, path }) => {

  // const valid = ajv.validate({ $ref: 'bathysphere#/definitions/Employee' }, {
  //   name: "John"
  // });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      path,
      schema: spec["/{entity}"]["post"]
      // pass: validateWeight(pass),
      // fail: validateWeight(fail)
    })
  }
}

export { handler };