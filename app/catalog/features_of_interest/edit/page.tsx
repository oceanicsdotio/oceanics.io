import React, { Suspense } from "react";
import specification from "@app/../specification.json";
import { Linking } from "@catalog/client";
import type { Metadata } from "next";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = specification.components.schemas.FeaturesOfInterest;
/**
 * Page browser metadata
 */
  export const metadata: Metadata = {
    title: `Oceanics.io | ${schema.title}`,
    description: `Create new ${schema.title}. ${schema.description}`,
  };
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Client Component
   */
  return (
    <>
    <Suspense>
      <Linking {...schema}></Linking>
    </Suspense>
  </>
  );
}
