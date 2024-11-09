import React from "react";
import { CollectionTemplate, formatMetadata } from "@catalog/page";
import Client from "@catalog/data_streams/client";
import openapi from "@app/../specification.json";
const schema = openapi.components.schemas.DataStreams;
const action = "Read";
export const metadata = formatMetadata(action, schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <CollectionTemplate schema={schema}>
      <Client />
    </CollectionTemplate>
  );
}
