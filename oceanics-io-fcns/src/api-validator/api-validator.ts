
import type { Handler } from "@netlify/functions";
// https://ajv.js.org/standalone.html#using-the-validation-function-s
import validator from "../shared/validate";


const handler: Handler = async ({ }) => {

  const pass = 1.0;
  const fail = {value: 0.0}

  const validateWeight = validator["#/components/schemas/Weight"];
  console.log({validateWeight})

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pass: validateWeight(pass),
      fail: validateWeight(fail)
    })
  }
}

export { handler };