import React from "react";
import openapi from "@app/../specification.json";
import Client from "@app/catalog/features_of_interest/client";
import { CollectionTemplate } from "@catalog/page";
const schema = openapi.components.schemas.FeaturesOfInterest;
/**
 * Display an index of all or some subset of the
 * available Features of Interest in the database.
 */
export default function Page({}) {
  /**
   * Static Component
   */
  return (
    <CollectionTemplate title={schema.title} properties={schema.properties}>
        <Client></Client>
    </CollectionTemplate>
  );
}
