import React from "react";
import Client from "./client";
import type { Metadata } from "next";
import openapi from "@app/../specification.json";
import { CollectionTemplate, formatMetadata } from "@catalog/page";
const schema = openapi.components.schemas.HistoricalLocations;
/**
 * Page browser metadata
 */
export const metadata: Metadata = formatMetadata("Create", schema);
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
      <Client/>
    </CollectionTemplate>
  );
}
