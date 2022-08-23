import type { Handler } from "@netlify/functions";
import spec from "../shared/bathysphere.json";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const API_NAME = "bathysphere";

const ajv = new Ajv({ strict: false });
addFormats(ajv);
ajv.addSchema(spec, API_NAME);

const handler: Handler = async ({ body, httpMethod }) => {
  if (httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Invalid HTTP Method" }),
      headers: { "Content-Type": "application/json" }
    }
  }
  const { data, reference } = JSON.parse(body);
  let test: boolean;
  try {
    test = ajv.validate({ $ref: `${API_NAME}${reference}`}, data);
  } catch (error) {
    console.log({error});
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
      headers: { "Content-Type": "application/json" }
    }
  }
  
  let schema = spec;
  for (const part of reference.split("/").filter((symbol: string) => symbol !== "#")) {
    schema = schema[part]
    if (typeof schema === "undefined") {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Bad Validation Reference"}),
        headers: { "Content-Type": "application/json" }
      }
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      test,
      errors: ajv.errors,
      schema
    })
  }
}

export { handler };