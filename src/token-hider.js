const qs = require("qs")

exports.handler = async function(event, context) {
  // apply our function to the queryStringParameters and assign it to a variable

  const { API_SECRET = "schnauzer/giant" } = process.env

  // TODO: customize your URL
  // this is secret too, your frontend won't see this
  const URL = `https://dog.ceo/api/breed/${API_SECRET}/images`

  console.log("Constructed URL is ...", URL)

  try {
    const { data } = await (await fetch(URL)).json()
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    }
  } catch (error) {
    const { status, statusText, headers, data } = error.response
    return {
      statusCode: error.response.status,
      body: JSON.stringify({ status, statusText, headers, data }),
    }
  }
}
