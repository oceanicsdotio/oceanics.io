import React from "react";
import { CollectionPage, formatMetadata } from "@catalog/page";
import { AdditionalProperties } from "./client";
import openapi from "@app/../specification.json";
import { type DataStreams } from "@oceanics/app";
import { Collection } from "../client";
const schema = openapi.components.schemas.DataStreams;
const action = "Read";
export const metadata = formatMetadata(action, schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <CollectionPage schema={schema}>
      <Collection<DataStreams>
        title={schema.title}
        AdditionalProperties={AdditionalProperties as any}
      />
    </CollectionPage>
  );
}
