import React from "react";
import { Metadata } from "next";
import { CollectionPage, formatMetadata } from "@catalog/page";
import OpenAPI from "@app/../specification.json";
import { Collection } from "../client";
import { AdditionalProperties } from "./client";
import { type Things } from "@oceanics/app";
/**
 * Static content from OpenAPI specification
 */
const schema = OpenAPI.components.schemas.Things;
/**
 * Browser and crawler metadata.
 */
export const metadata: Metadata = formatMetadata("Read", schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <CollectionPage schema={schema}>
      <Collection<Things>
        title={schema.title}
        nav={"view"}
        AdditionalProperties={AdditionalProperties as any}
      />
    </CollectionPage>
  );
}
