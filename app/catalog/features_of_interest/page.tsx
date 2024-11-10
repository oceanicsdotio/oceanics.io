import React from "react";
import openapi from "@app/../specification.json";
import { AdditionalProperties } from "./client";
import { CollectionPage, formatMetadata } from "@catalog/page";
import type { Metadata } from "next";
import { FeaturesOfInterest } from "@oceanics/app";
import { Collection } from "../client";
const schema = openapi.components.schemas.FeaturesOfInterest;
export const metadata: Metadata = formatMetadata("Read", schema);
/**
 * Display an index of all or some subset of the
 * available Features of Interest in the database.
 */
export default function Page({}) {
  return (
    <CollectionPage schema={schema}>
      <Collection<FeaturesOfInterest>
        title={schema.title}
        AdditionalProperties={AdditionalProperties as any}
      />
    </CollectionPage>
  );
}
