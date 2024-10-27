import React from "react";
import { CollectionTemplate } from "@catalog/page";
import Client from "@catalog/data_streams/client";
import { Metadata } from "next";
import openapi from "@app/../specification.json";
const schema = openapi.components.schemas.DataStreams;
/**
 * Browser metadata
 */
export const metadata: Metadata = {
  title: `Oceanics.io | ${schema.title}`,
  description: `Catalog of ${schema.title}.`,
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Static Component
   */
  return (
    <CollectionTemplate title={schema.title} properties={schema.properties}>
        <Client></Client>
    </CollectionTemplate>
  );
}
