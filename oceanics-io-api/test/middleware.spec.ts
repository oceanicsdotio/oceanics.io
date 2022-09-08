import { describe, expect, test } from '@jest/globals';
import { HttpMethod } from "../src/shared/middleware";
import crypto from "crypto";
import { Node, Cypher } from "oceanics-io-api-wasm";

describe("idempotent", function() {
  /**
   * Tests lower-level parts of the API without making HTTP
   * requests.
   */
  describe("middleware", function () {

    describe("Node", function (){

      test.concurrent("create empty node", async function () {
        const node = new Node(undefined, undefined, undefined);
        expect(node.symbol).toBe("n");
        expect(node.label).toBe("");
        expect(node.pattern).toBe("");
        expect(node.uuid).toBe("");
      })

      test.concurrent("create labeled node", async function () {
        const label = "Things";
        const node = new Node(undefined, undefined, label);
        expect(node.symbol).toBe("n");
        expect(node.label).toBe(label);
        expect(node.pattern).toBe("");
        expect(node.uuid).toBe("");
      })

      test.concurrent("create materialized node", async function () {
        const label = "Things";
        const example = {
          uuid: "just-a-test"
        };
        const propString = JSON.stringify(example)
        const node = new Node(propString, undefined, label);
        console.log({
          pattern: node.pattern,
          propString
        })
        expect(node.symbol).toBe("n");
        expect(node.label).toBe(label);
        expect(node.pattern).toContain(example.uuid);
        expect(node.uuid).toBe(example.uuid);
      })

      test.concurrent("errors on create query without label", async function() {
        const node = new Node('{"uuid":"test"}', undefined, undefined);
        let query = null;
        let error = null;
        try {
          query = node.create();
        } catch (_error) {
          error = _error.message;
        }
        expect(query).toBe(null);
        expect(error).not.toBeFalsy();
      })

      test.concurrent("errors on create query without props", async function() {
        const node = new Node(undefined, undefined, "Things");
        let query = null;
        let error = null;
        try {
          query = node.create();
        } catch (_error) {
          error = _error.message;
        }
        expect(query).toBe(null);
        expect(error).not.toBeFalsy();
      })

      test.concurrent("produces create query", async function() {
        const node = new Node('{"uuid":"test"}', undefined, "Things");
        const query = node.create();
        expect(query.readOnly).toBe(false);
      })

      test.concurrent("produces count query", async function() {
        const query = (new Node()).count();
        expect(query.readOnly).toBe(true);
      })

      test.concurrent("produces load query", async function() {
        const query = (new Node()).load();
        expect(query.readOnly).toBe(true);
      })

      test.concurrent("produces delete query", async function() {
        const query = (new Node()).delete();
        expect(query.readOnly).toBe(false);
      })

      test.concurrent("produces mutate query", async function() {
        const updates = new Node();
        const query = (new Node()).mutate(updates);
        expect(query.readOnly).toBe(false);
      })


    })

    // describe("Links", function() {
    //   test.concurrent("", async function() {

    //   })
    // })

    // test.concurrent("reversible operations", async function () {
    //   const claim = {
    //     email: "test@oceanics.io",
    //     uuid: crypto.randomUUID()
    //   }
    //   const user = Node.materialize(claim, "u", "User")
    //   const props = user.dematerialize();
    //   expect(props.email).toBe(claim.email)
    //   expect(props.uuid).toBe(claim.uuid)
    // })

    // test.concurrent("parses get index path", async function () {
    //   const nodes = Node.asNodes(HttpMethod.GET, "", {});
    //   expect(nodes.length).toEqual(0)
    // })

    // test.concurrent("parses get entity path", async function () {
    //   const uuid = `abcd`;
    //   const [node] = Node.asNodes(HttpMethod.GET, "", {left: `DataStreams`, uuid});
    //   expect(node.patternOnly()).toEqual(expect.stringContaining(uuid))
    // })

    // test.concurrent("parses post collection path", async function () {
    //   const uuid = `abcd`;
    //   const [node] = Node.asNodes(HttpMethod.POST, JSON.stringify({ uuid }), {left: `DataStreams`});
    //   expect(node.patternOnly()).toEqual(expect.stringContaining(uuid))
    // })

    // test.concurrent("parses post topology path", async function () {
    //   const uuid1 = `abcd`;
    //   const uuid2 = `efgh`;
    //   const [left, right] = Node.asNodes(HttpMethod.POST, JSON.stringify({ uuid2 }), {left: `DataStreams`, uuid: uuid1, right: "Things"});
    //   expect(left.patternOnly()).toEqual(expect.stringContaining(uuid1));
    //   expect(right.patternOnly()).toEqual(expect.stringContaining(uuid2));
    // })

  })
})

