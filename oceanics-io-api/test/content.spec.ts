/**
 * Endpoint allows bulk upload of content metadata. 
 */
import { describe, expect, test } from '@jest/globals';
import { getContent } from './test-utils';
import fetch from "node-fetch";

const url = "http://localhost:8888/.netlify/functions/content"


describe("content handlers", function() {
    describe("content.post", function() {
        const content: string[][] = getContent();
        test.concurrent.each(content)(`creates %s`, async function (body) {
            const response = await fetch(url, {
                method: "POST",
                body,
                headers: {
                    "Content-Type": "text/plain",
                }
            })
            expect(response.status).toBe(200);
            const result = await response.json();
            console.log(result)
        })
    })
})
