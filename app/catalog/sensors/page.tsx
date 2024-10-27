import React from "react";
import openapi from "@app/../specification.json";
import Client from "@app/catalog/sensors/client";
import type { Metadata } from "next";
import { CollectionTemplate } from "@catalog/page";
/**
 * OpenAPI metadata.
 */
const schema = openapi.components.schemas.Sensors;
/**
 * Browser and crawler metadata.
 */
export const metadata: Metadata = {
  title: `Oceanics.io | ${schema.title}`,
  description: `Catalog of ${schema.title}`,
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Server Component
   */
  return (
    <CollectionTemplate title={schema.title} properties={schema.properties}>
        <Client></Client>
    </CollectionTemplate>
  );
}
