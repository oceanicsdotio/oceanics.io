import React from "react";
import { Linking } from "@catalog/client";
import { Metadata } from "next";
import openapi from "@app/../specification.json";
import { CollectionTemplate, formatMetadata } from "@app/catalog/page";
const schema = openapi.components.schemas.DataStreams;
const action = "Update";
/**
 * Browser metadata
 */
export const metadata: Metadata = formatMetadata(action, schema);
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
      <Linking {...schema}></Linking>
    </CollectionTemplate>
  );
}
