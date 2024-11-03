import React, { Suspense } from "react";
import Client from "@catalog/sensors/create/client";
import type { Metadata } from "next";
import openapi from "@app/../specification.json";
const schema = openapi.components.schemas.Sensors;
const action = "Create"
/**
 * Page browser metadata
 */
export const metadata: Metadata = {
  title: `${openapi.info.title} | ${schema.title}`,
  description: `${action} ${schema.title}. ${schema.description}`,
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function ({}) {
  /**
   * Server Component
   */
  return (
    <Suspense>
      <Client />
    </Suspense>
  );
}
