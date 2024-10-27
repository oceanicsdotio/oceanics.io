import React from "react";
import openapi from "@app/../specification.json";
import Client from "@app/catalog/historical_locations/client";
import { CollectionTemplate } from "@catalog/page";
const schema = openapi.components.schemas.HistoricalLocations;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Server Component
   */
  return (
    <CollectionTemplate title={schema.title} properties={schema.properties}>
        <Client></Client>
    </CollectionTemplate>
  );
}
