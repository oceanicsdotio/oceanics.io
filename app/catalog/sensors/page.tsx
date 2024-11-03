import React from "react";
import openapi from "@app/../specification.json";
import Client from "@app/catalog/sensors/client";
import type { Metadata } from "next";
import { CollectionTemplate, formatMetadata } from "@catalog/page";
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
    <CollectionTemplate schema={schema}>
        <Client></Client>
    </CollectionTemplate>
  );
}
