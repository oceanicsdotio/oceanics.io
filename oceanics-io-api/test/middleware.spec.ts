import { describe, expect, test } from '@jest/globals';
import { asNodes, filterBaseRoute, Method, materialize, dematerialize } from "../src/shared/middleware";
import crypto from "crypto";

describe("idempotent", function() {
  /**
   * Tests lower-level parts of the API without making HTTP
   * requests.
   */
  describe("middleware", function () {

    test("reversible operations", function () {
      const claim = {
        email: "test@oceanics.io",
        uuid: crypto.randomUUID()
      }
      const user = materialize(claim, "u", "User")
      const props = dematerialize(user);
      expect(props.email).toBe(claim.email)
      expect(props.uuid).toBe(claim.uuid)
    })

    test("parses get entity path", function () {
      const uuid = `abcd`;
      const path = `api/DataStreams(${uuid})`;
      const nodeTransform = asNodes(Method.GET, "");
      const segments = path.split("/").filter(filterBaseRoute)
      const node = nodeTransform(segments[0], 0);
      expect(node.pattern).toEqual(expect.stringContaining(uuid))
    })

    test("parses post collection path", function () {
      const uuid = `abcd`;
      const path = `api/DataStreams`;
      const nodeTransform = asNodes(Method.POST, JSON.stringify({ uuid }));
      const segments = path.split("/").filter(filterBaseRoute)
      const node = nodeTransform(segments[0], 0);
      expect(node.pattern).toEqual(expect.stringContaining(uuid))
    })
  })
})

