import Link from "next/link";
import React from "react";
import { Metadata } from "next";
import { getLinkedCollections } from "@catalog/page";
import Things from "@catalog/things/client";
import openapi from "@app/../specification.json";
/**
 * Static content from OpenAPI specification
 */
const { properties, title } = openapi.components.schemas.Things;
/**
 * Static linkable types of Node.
 */
const links = getLinkedCollections(properties);
/**
 * Browser and crawler metadata.
 */
export const metadata: Metadata = {
  title: `Oceanics.io | ${title}`,
  description: `Catalog of ${title}`,
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
    <>
      <p>
        You can <Link href={"create/"}>create</Link> <code>{title}</code>, and
        link them to {links}.
      </p>
      <Things
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
    </>
  );
}
