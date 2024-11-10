import React from "react";
import { AdditionalProperties } from "@app/catalog/historical_locations/client";
import { CollectionPage, formatMetadata } from "@catalog/page";
import type { Metadata } from "next";
import openapi from "@app/../specification.json";
import { Collection } from "../client";
import { HistoricalLocations } from "@oceanics/app";
const schema = openapi.components.schemas.HistoricalLocations;
export const metadata: Metadata = formatMetadata("Read", schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <CollectionPage schema={schema}>
      <Collection<HistoricalLocations>
        title={schema.title}
        AdditionalProperties={AdditionalProperties as any}
      />
    </CollectionPage>
  );
}
