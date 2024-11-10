import React from "react";
import { CollectionPage, formatMetadata } from "@catalog/page";
import type { Metadata } from "next";
import openapi from "@app/../specification.json";
import { Collection } from "../client";
import { Observations } from "@oceanics/app";
const schema = openapi.components.schemas.Observations;
/**
 * Page browser metadata
 */
export const metadata: Metadata = formatMetadata("Read", schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <CollectionPage schema={schema}>
      <Collection<Observations>
        title={schema.title}
      />
    </CollectionPage>
  );
}
