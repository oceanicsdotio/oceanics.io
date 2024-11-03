import React from "react";
import OpenAPI from "@app/../specification.json";
import Client from "@catalog/things/edit/client";
import { type Metadata } from "next";
import { CollectionTemplate } from "@catalog/page";
const action = "Update";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = OpenAPI.components.schemas.Things;
/**
 * Browser and crawler metadata.
 */
export const metadata: Metadata = {
  title: `${OpenAPI.info.title} | ${schema.title}`,
  description: `${action} ${schema.title}. ${schema.description}`,
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <CollectionTemplate schema={schema} showActions={false}>
      <Client />
    </CollectionTemplate>
  );
}
