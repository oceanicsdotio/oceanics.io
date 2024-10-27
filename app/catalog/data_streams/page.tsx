import React, { Suspense } from "react";
import { getLinkedCollections } from "@catalog/page";
import Client from "@catalog/data_streams/client";
import Link from "next/link";
import { Metadata } from "next";
import openapi from "@app/../specification.json";
const schema = openapi.components.schemas.DataStreams;
/**
 * Linkable node types defined by OpenAPI
 */
const links = getLinkedCollections(schema.properties);
/**
 * Browser metadata
 */
export const metadata: Metadata = {
  title: `Oceanics.io | ${schema.title}`,
  description: `Catalog of ${schema.title}.`,
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Static Component
   */
  return (
    <>
      <p>
        You can <Link href={"create/"}>create</Link> new <code>{schema.title}</code>{" "}
        and link them with {links}.
      </p>
      <Suspense>
        <Client></Client>
      </Suspense>
    </>
  );
}
