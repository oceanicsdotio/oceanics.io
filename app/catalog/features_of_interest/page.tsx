import React from "react";
import openapi from "@app/../specification.json";
import Client from "@app/catalog/features_of_interest/client";
import { CollectionTemplate, formatMetadata } from "@catalog/page";
import type { Metadata } from "next";
const schema = openapi.components.schemas.FeaturesOfInterest;
/**
 * Page browser metadata
 */
export const metadata: Metadata = formatMetadata("Read", schema);
/**
 * Display an index of all or some subset of the
 * available Features of Interest in the database.
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
