import React from "react";
import Client from "./client";
import type { Metadata } from "next";
import openapi from "@app/../specification.json";
import { CollectionPage, formatMetadata } from "@app/catalog/page";
const schema = openapi.components.schemas.HistoricalLocations;
/**
 * Page browser metadata
 */
export const metadata: Metadata = formatMetadata("Update", schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Connect({}) {
  /**
   * Client Component
   */
  return (
      <CollectionPage schema={schema} showActions={false}>
        <Client/>
      </CollectionPage>
  );
}
