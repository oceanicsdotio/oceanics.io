import React from "react";
import specification from "@app/../specification.json";
import Client from "./client";
import type { Metadata } from "next";
import { CollectionPage, formatMetadata } from "@catalog/page";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = specification.components.schemas.FeaturesOfInterest;
/**
 * Page browser metadata
 */
export const metadata: Metadata = formatMetadata("Update", schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Client Component
   */
  return (
    <>
    <CollectionPage schema={schema} showActions={false}>
      <Client/>
    </CollectionPage>
  </>
  );
}
