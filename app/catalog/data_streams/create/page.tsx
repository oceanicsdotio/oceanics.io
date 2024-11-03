import React from "react";
import { Metadata } from "next";
import Client from "./client";
import openapi from "@app/../specification.json";
import { CollectionTemplate, formatMetadata } from "@app/catalog/page";
const schema = openapi.components.schemas.DataStreams;
const action = "Create";
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
    <CollectionTemplate schema={schema} showActions={false}>
      <Client/>
    </CollectionTemplate>
  );
}
