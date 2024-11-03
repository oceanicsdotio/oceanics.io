import React from "react";
import type { Metadata } from "next";
import Client from "@catalog/sensors/edit/client";
import openapi from "@app/../specification.json";
import { CollectionTemplate, formatMetadata } from "@app/catalog/page";
const schema = openapi.components.schemas.Sensors;
const action = "Create"
/**
 * Page browser metadata
 */
export const metadata: Metadata = formatMetadata(action, schema);
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
