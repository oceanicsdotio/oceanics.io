import React from "react";
import Markdown from "react-markdown";
import { Metadata } from "next";
import { Create } from "@catalog/data_streams/client";
import specification from "@app/../specification.json";
/**
 * Get DataStreams properties from OpenAPI schema
 */
const schema = specification.components.schemas.DataStreams;
/**
 * Page browser metadata
 */
export const metadata: Metadata = {
  title: `Oceanics.io | ${schema.title}`,
  description: `Create new ${schema.title}`,
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
      <Create></Create>
    </>
  );
}
