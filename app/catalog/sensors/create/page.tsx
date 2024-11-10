import React from "react";
import Client from "@catalog/sensors/create/client";
import type { Metadata } from "next";
import openapi from "@app/../specification.json";
import { CollectionPage, formatMetadata } from "@app/catalog/page";
const schema = openapi.components.schemas.Sensors;
const action = "Create"
/**
 * Browser metadata
 */
export const metadata: Metadata = formatMetadata(action, schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function ({}) {
  /**
   * Server Component
   */
  return (
    <CollectionPage schema={schema} showActions={false}>
      <Client />
    </CollectionPage>
  );
}
