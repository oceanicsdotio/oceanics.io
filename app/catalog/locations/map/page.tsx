import openapi from "@app/../specification.json";
import React from "react";
import Client from "./client";
import { CollectionPage, formatMetadata } from "@catalog/page";
import { Metadata } from "next";
const schema = openapi.components.schemas.DataStreams;
export const metadata: Metadata = formatMetadata("View", schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <CollectionPage schema={schema}>
        <Client></Client>
    </CollectionPage>
  );
}
