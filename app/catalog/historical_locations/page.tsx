import React from "react";
import Client from "@app/catalog/historical_locations/client";
import { CollectionPage, formatMetadata } from "@catalog/page";
import type { Metadata } from "next";
import openapi from "@app/../specification.json";
const schema = openapi.components.schemas.HistoricalLocations;
/**
 * Page browser metadata
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
        <Client></Client>
    </CollectionPage>
  );
}
