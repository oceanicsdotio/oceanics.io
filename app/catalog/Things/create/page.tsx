import React, { Suspense } from "react";
import { ThingsForm } from "@catalog/things/client";
import openapi from "@app/../specification.json";
import { type Metadata } from "next";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = openapi.components.schemas.Things;
/**
 * Browser and crawler metadata
 */
export const metadata: Metadata = {
  title: `Oceanics.io | ${schema.title}`,
  description: "Catalog of Things",
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Server component
   */
  return (
      <Suspense>
        <ThingsForm
          limit={100}
          offset={0}
          initial={{
            uuid: crypto.randomUUID(),
            name: "",
          }}
        />
      </Suspense>
  );
}
