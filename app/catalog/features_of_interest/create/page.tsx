import React, { Suspense } from "react";
import { Create } from "../client";
import type { Metadata } from "next";
import openapi from "@app/../specification.json";
const schema = openapi.components.schemas.FeaturesOfInterest;
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
   * Server Component
   */
  return (
    <Suspense>
      <Create />
    </Suspense>
  );
}
