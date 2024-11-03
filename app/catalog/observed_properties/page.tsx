import React from "react";
import openapi from "@app/../specification.json";
import Client from "@catalog/observed_properties/client";
import type { Metadata } from "next";
import { CollectionTemplate, formatMetadata } from "@catalog/page";
/**
 * Get schema metadata from the OpenAPI specification.
 */
const schema = openapi.components.schemas.ObservedProperties;
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
   * Client Component
   */
  return (
    <CollectionTemplate schema={schema}>
        <Client></Client>
    </CollectionTemplate>
  );
}
