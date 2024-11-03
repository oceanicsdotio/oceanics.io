import openapi from "@app/../specification.json";
import React from "react";
import Client from "@catalog/locations/client";
import { CollectionTemplate, formatMetadata } from "@catalog/page";
import { Metadata } from "next";
const schema = openapi.components.schemas.DataStreams;
export const metadata: Metadata = formatMetadata("Read", schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <CollectionTemplate schema={schema}>
        <Client></Client>
    </CollectionTemplate>
  );
}
