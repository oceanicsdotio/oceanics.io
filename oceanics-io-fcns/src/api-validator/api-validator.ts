
import type { Handler } from "@netlify/functions";
import AJV from "ajv";
import YAML from "yaml";
import fetch from "node-fetch";


const loadSchema = async () => {
  const text = await fetch("https://www.oceanics.io/bathysphere.yaml").then(response => response.text());
  return YAML.parse(text);
}

// https://github.com/DavidWells/netlify-functions-workshop/tree/master/lessons-code-complete/core-concepts/7-using-middleware/functions
const validator = new AJV({loadSchema});


const handler: Handler = async ({ headers, body, httpMethod }) => {

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({valid: false})
  }
}

export { handler };