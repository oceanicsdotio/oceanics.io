import React from "react";
import openapi from "@app/../specification.json";
import ClientComponent from "./client";
import type { Metadata } from "next";
import { CollectionPage, formatMetadata } from "@catalog/page";
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
        <ClientComponent/>
    </CollectionPage>
  );
}
