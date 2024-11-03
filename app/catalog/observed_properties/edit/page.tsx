import React from "react";
import Client from "@catalog/observed_properties/edit/client";
import type { Metadata } from "next";
import openapi from "@app/../specification.json";
import { CollectionTemplate, formatMetadata } from "@app/catalog/page";
const schema = openapi.components.schemas.ObservedProperties;
/**
 * Browser metadata
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
      <CollectionTemplate schema={schema}>
        <Client/>
      </CollectionTemplate>
  );
}
