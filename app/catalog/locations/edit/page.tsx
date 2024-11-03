import React from "react";
import type { Metadata } from "next";
import openapi from "@app/../specification.json";
import { CollectionTemplate, formatMetadata } from "@app/catalog/page";
import Client from "./client";
const schema = openapi.components.schemas.Locations;
/**
 * Page browser metadata
 */
export const metadata: Metadata = formatMetadata("Update", schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Client Component
   */
  return (
    <CollectionTemplate schema={schema} showActions={false}>
      <Client/>
    </CollectionTemplate>
  );
}
