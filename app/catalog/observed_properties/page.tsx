import React from "react";
import openapi from "@app/../specification.json";
import { AdditionalProperties } from "./client";
import type { Metadata } from "next";
import { CollectionPage, formatMetadata } from "@catalog/page";
import { Collection } from "@catalog/client";
import { type ObservedProperties } from "@oceanics/app";
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
  return (
    <CollectionPage schema={schema}>
      <Collection<ObservedProperties>
        title={schema.title}
        AdditionalProperties={AdditionalProperties as any}
      />
    </CollectionPage>
  );
}
