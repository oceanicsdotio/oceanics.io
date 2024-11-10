import openapi from "@app/../specification.json";
import React from "react";
import { AdditionalProperties } from "./client";
import { CollectionPage, formatMetadata } from "@catalog/page";
import { Metadata } from "next";
import { Collection } from "../client";
import { Locations } from "@oceanics/app";
const schema = openapi.components.schemas.Locations;
export const metadata: Metadata = formatMetadata("Read", schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <CollectionPage schema={schema}>
      <Collection<Locations>
        title={schema.title}
        nav={"map"}
        AdditionalProperties={AdditionalProperties as any}
      />
    </CollectionPage>
  );
}
