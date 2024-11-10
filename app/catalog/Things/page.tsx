import React from "react";
import { Metadata } from "next";
import { CollectionPage, formatMetadata } from "@catalog/page";
import Client from "@catalog/things/client";
import OpenAPI from "@app/../specification.json";
/**
 * Static content from OpenAPI specification
 */
const schema = OpenAPI.components.schemas.Things;
/**
 * Browser and crawler metadata.
 */
export const metadata: Metadata = formatMetadata("Read", schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Server component enforces `use client` boundary.
   */
  return (
    <CollectionPage schema={schema}>
      <Client />
    </CollectionPage>
  );
}
