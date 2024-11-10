import React from "react";
import openapi from "@app/../specification.json";
import { AdditionalProperties } from "@app/catalog/sensors/client";
import type { Metadata } from "next";
import { CollectionPage, formatMetadata } from "@catalog/page";
import { Collection } from "../client";
import { type Sensors } from "@oceanics/app";
/**
 * OpenAPI metadata.
 */
const schema = openapi.components.schemas.Sensors;
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
   * Server Component
   */
  return (
    <CollectionPage schema={schema}>
      <Collection<Sensors>
        title={schema.title}
        AdditionalProperties={AdditionalProperties as any}
      />
    </CollectionPage>
  );
}
