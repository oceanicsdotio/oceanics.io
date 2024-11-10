import React from "react";
import OpenAPI from "@app/../specification.json";
import { type Metadata } from "next";
import { CollectionPage, formatMetadata } from "@catalog/page";
const action = "Link";
import { Linked } from "@catalog/client";
import { type Sensors } from "@oceanics/app";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = OpenAPI.components.schemas.Sensors;
/**
 * Browser metadata.
 */
export const metadata: Metadata = formatMetadata(action, schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <CollectionPage schema={schema} showActions={false}>
      <Linked<Sensors> {...schema} />
    </CollectionPage>
  );
}
