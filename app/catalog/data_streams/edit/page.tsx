import React, { Suspense } from "react";
import { Linking } from "@catalog/client";
import { Metadata } from "next";
import openapi from "@app/../specification.json";
const schema = openapi.components.schemas.DataStreams;
/**
 * Browser metadata
 */
export const metadata: Metadata = {
  title: `Oceanics.io | ${schema.title}`,
  description: `Manage ${schema.title}. ${schema.description}`,
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
    <Suspense>
      <Linking {...schema}></Linking>
    </Suspense>
  );
}
