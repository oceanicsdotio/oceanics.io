import Link from "next/link";
import React from "react";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
import Collection from "@app/catalog/observed_properties/client";
/**
 * Get schema metadata from the OpenAPI specification.
 */
const components = specification.components;
const { title: left, description } = components.schemas.ObservedProperties;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Client Component
   */
  return (
    <div>
      <Markdown>{description}</Markdown>
      <p>
        You can <Link href="create/">create</Link> <code>{left}</code>.
      </p>
      <Collection></Collection>
    </div>
  );
}
