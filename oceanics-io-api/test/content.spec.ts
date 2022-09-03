/**
 * Endpoint allows bulk upload of content metadata. 
 */
import { describe, expect, test } from '@jest/globals';
import { getContent } from './test-utils';
import fetch from "node-fetch";

const url = "http://localhost:8888/.netlify/functions/content"


describe("content handlers", function() {
    describe("content.post", function() {
        test.concurrent.each(getContent())(`creates %s %s`, async function (label: string, slug: string, body: string) {
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
