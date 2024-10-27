import React, { Suspense } from "react";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
import { Linking } from "@catalog/client";
import { Metadata } from "next";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = specification.components.schemas.DataStreams;
/**
 * Browser metadata
 */
export const metadata: Metadata = {
  title: `Oceanics.io | ${schema.title}`,
  description: `Catalog node editing interface`,
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
    <>
    <Markdown>{schema.description}</Markdown>
    <Suspense>
      <Linking {...schema}></Linking>
    </Suspense>
  </>
  );
}
