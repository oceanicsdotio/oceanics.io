import { describe, expect, test } from '@jest/globals';
import { asNodes, Method, materialize, dematerialize } from "../shared/middleware";
import crypto from "crypto";

describe("idempotent", function() {
  /**
   * Tests lower-level parts of the API without making HTTP
   * requests.
   */
  describe("middleware", function () {

    test.concurrent("reversible operations", async function () {
      const claim = {
        email: "test@oceanics.io",
        uuid: crypto.randomUUID()
      }
      const user = materialize(claim, "u", "User")
      const props = dematerialize(user);
      expect(props.email).toBe(claim.email)
      expect(props.uuid).toBe(claim.uuid)
    })

    test.concurrent("parses get index path", async function () {
      const nodes = asNodes(Method.GET, "", {});
      expect(nodes.length).toEqual(0)
    })

    test.concurrent("parses get entity path", async function () {
      const uuid = `abcd`;
      const [node] = asNodes(Method.GET, "", {left: `DataStreams`, uuid});
      expect(node.patternOnly()).toEqual(expect.stringContaining(uuid))
    })

    test.concurrent("parses post collection path", async function () {
      const uuid = `abcd`;
      const [node] = asNodes(Method.POST, JSON.stringify({ uuid }), {left: `DataStreams`});
      expect(node.patternOnly()).toEqual(expect.stringContaining(uuid))
    })

    test.concurrent("parses post topology path", async function () {
      const uuid1 = `abcd`;
      const uuid2 = `efgh`;
      const [left, right] = asNodes(Method.POST, JSON.stringify({ uuid2 }), {left: `DataStreams`, uuid: uuid1, right: "Things"});
      expect(left.patternOnly()).toEqual(expect.stringContaining(uuid1));
      expect(right.patternOnly()).toEqual(expect.stringContaining(uuid2));
    })

  })
})

