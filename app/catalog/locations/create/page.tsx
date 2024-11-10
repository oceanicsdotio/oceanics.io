import React from "react";
import OpenAPI from "@app/../specification.json";
import { CollectionPage, formatMetadata } from "@catalog/page";
import { type Metadata } from "next";
import { Form } from "../client";
import { Create } from "@catalog/client";
import { type Locations } from "@oceanics/app";
const action = "Create";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = OpenAPI.components.schemas.Locations;
/**
 * Browser and crawler metadata.
 */
export const metadata: Metadata = formatMetadata(action, schema);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <CollectionPage schema={schema} showActions={false}>
      <Create<Locations> Form={Form} title={schema.title}/>
    </CollectionPage>
  );
}
