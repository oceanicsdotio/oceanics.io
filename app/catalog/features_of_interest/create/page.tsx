import React, { Suspense } from "react";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
import { Create } from "../client";
/**
 * Get DataStreams properties from OpenAPI schema
 */
const schema = specification.components.schemas.FeaturesOfInterest;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Server Component
   */
  return (
    <>
      <Markdown>{schema.description}</Markdown>
      <Suspense><Create/></Suspense>
    </>
  );
}
