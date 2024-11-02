import openapi from "@app/../specification.json";
import React from "react";
import Client from "@catalog/locations/client";
import { CollectionTemplate } from "@catalog/page";
import { Metadata } from "next";
const schema = openapi.components.schemas.DataStreams;
export const metadata: Metadata = {
  title: `Oceanics.io | ${schema.title}`,
  description: "Catalog of Locations",
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <CollectionTemplate title={schema.title} properties={schema.properties} description={schema.description}>
        <Client></Client>
    </CollectionTemplate>
  );
}
