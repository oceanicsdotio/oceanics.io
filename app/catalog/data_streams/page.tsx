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
  title: `${openapi.info.title} | ${schema.title}`,
  description: `${schema.title} catalog.`,
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
    <CollectionTemplate schema={schema}>
        <Client></Client>
    </CollectionTemplate>
  );
}
