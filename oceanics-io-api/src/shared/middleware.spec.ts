import { describe, expect, test } from '@jest/globals';
import { asNodes, filterBaseRoute, Method } from "../shared/middleware";



describe("middleware", function () {

  test("parses get entity path", function () {
    const uuid = `abcd`;
    const path = `api/DataStreams(${uuid})`;
    const nodeTransform = asNodes(Method.GET, "");
    const segments = path.split("/").filter(filterBaseRoute)
    const node = nodeTransform(segments[0], 0);
    expect(node.patternOnly()).toEqual(expect.stringContaining(uuid))
  })

  test("parses post collection path", function () {
    const uuid = `abcd`;
    const path = `api/DataStreams`;
    const nodeTransform = asNodes(Method.POST, JSON.stringify({ uuid }));
    const segments = path.split("/").filter(filterBaseRoute)
    const node = nodeTransform(segments[0], 0);
    expect(node.patternOnly()).toEqual(expect.stringContaining(uuid))
  })
})
