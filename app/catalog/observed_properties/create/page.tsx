import React from "react";
import ClientComponent from "./client";
import type { Metadata } from "next";
import openapi from "@app/../specification.json";
import { CollectionPage, formatMetadata } from "@app/catalog/page";
const schema = openapi.components.schemas.ObservedProperties;
/**
 * Page browser metadata
 */
export const metadata: Metadata = formatMetadata("Create", schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <CollectionPage schema={schema} showActions={false}>
      <ClientComponent />
    </CollectionPage>
  );
}
