import React from "react";
import { Metadata } from "next";
import { CollectionTemplate } from "@catalog/page";
import { Webgl } from "@catalog/things/client";
import openapi from "@app/../specification.json";
/**
 * Static content from OpenAPI specification
 */
const schema = openapi.components.schemas.Things;
/**
 * Browser and crawler metadata.
 */
export const metadata: Metadata = {
  title: `Oceanics.io | ${schema.title}`,
  description: `Catalog of ${schema.title}`,
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Server component enforces `use client` boundary.
   */
  return (
      <CollectionTemplate title={schema.title} properties={schema.properties}>
        <Webgl
          velocity={{
            metadataFile:
              "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/assets/wind.json",
            source:
              "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/assets/wind.png",
          }}
          res={16}
          colors={["#deababff", "#660066ff"]}
          opacity={0.92}
          speed={0.00007}
          diffusivity={0.004}
          pointSize={1.0}
          drop={0.01}
        />
      </CollectionTemplate>
    );
}
