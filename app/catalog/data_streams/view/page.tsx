import React from "react";
import { CollectionPage, formatMetadata } from "@catalog/page";
import Client from "./client";
import { Metadata } from "next";
import openapi from "@app/../specification.json";
const schema = openapi.components.schemas.DataStreams;
const action = "View"
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
   * Static Component
   */
  return (
    <CollectionPage schema={schema}>
        <Client></Client>
    </CollectionPage>
  );
}
