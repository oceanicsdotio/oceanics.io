import pg from "pg";

export function handler(event, context, callback) {
    callback(null, {
    statusCode: 200,
    body: "Hello, World"
    });
}