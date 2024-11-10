import React from "react";
import OpenAPI from "@app/../specification.json";
import Client from "./client";
import { CollectionPage, formatMetadata } from "@catalog/page";
import { type Metadata } from "next";
const action = "Create";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = OpenAPI.components.schemas.Things;
/**
 * Browser and crawler metadata.
 */
export const metadata: Metadata = formatMetadata(action, schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Server component enforces `use client` boundary.
   */
  return (
    <CollectionPage schema={schema} showActions={false}>
      <Client />
    </CollectionPage>
  );
}
