import React from "react";
import OpenAPI from "@app/../specification.json";
import Client from "@catalog/things/edit/client";
import { type Metadata } from "next";
import { CollectionTemplate, formatMetadata } from "@catalog/page";
const action = "Update";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = OpenAPI.components.schemas.Things;
/**
 * Browser metadata.
 */
export const metadata: Metadata = formatMetadata(action, schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <CollectionTemplate schema={schema} showActions={false}>
      <Client />
    </CollectionTemplate>
  );
}
