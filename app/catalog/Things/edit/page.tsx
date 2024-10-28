import React, { Suspense } from "react";
import openapi from "@app/../specification.json";
import Client, { action } from "@catalog/things/edit/client";
import { type Metadata } from "next";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = openapi.components.schemas.Things;
/**
 * Browser and crawler metadata
 */
export const metadata: Metadata = {
  title: `${openapi.info.title} | ${schema.title}`,
  description: `${action} ${schema.title}. ${schema.description}`,
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <Suspense>
      <Client />
    </Suspense>
  );
}
