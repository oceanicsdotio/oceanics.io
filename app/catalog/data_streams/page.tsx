import React from "react";
import { CollectionTemplate, formatMetadata } from "@catalog/page";
import Client from "@catalog/data_streams/client";
import { Metadata } from "next";
import openapi from "@app/../specification.json";
const schema = openapi.components.schemas.DataStreams;
const action = "Read"
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
    <CollectionTemplate schema={schema}>
        <Client></Client>
    </CollectionTemplate>
  );
}
