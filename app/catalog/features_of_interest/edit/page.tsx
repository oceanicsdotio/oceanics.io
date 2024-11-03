import React from "react";
import specification from "@app/../specification.json";
import Client from "./client";
import type { Metadata } from "next";
import { CollectionTemplate, formatMetadata } from "@app/catalog/page";
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
    <CollectionTemplate schema={schema} showActions={false}>
      <Client/>
    </CollectionTemplate>
  </>
  );
}
