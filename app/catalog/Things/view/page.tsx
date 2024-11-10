import React from "react";
import OpenAPI from "@app/../specification.json";
import Client from "./client";
import { type Metadata } from "next";
import { CollectionPage, formatMetadata } from "@catalog/page";
const action = "View";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = OpenAPI.components.schemas.Things;
/**
 * Browser metadata.
 */
export const metadata: Metadata = formatMetadata(action, schema);
export default function Page({}) {
  return (
    <CollectionPage schema={schema} showActions={false}>
      <Client />
    </CollectionPage>
  );
}
