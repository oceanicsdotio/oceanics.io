import React, { ReactNode, Suspense } from "react";
import Markdown from "react-markdown";
import Link from "next/link";
import { Metadata } from "next";
import styles from "@catalog/page.module.css";
import layout from "@app/layout.module.css";
import openapi from "@app/../specification.yaml";
import Client from "@catalog/client";
/**
 * Browser and crawler metadata
 */
export const metadata: Metadata = {
  title: `${openapi.info.title} | Catalog`,
  description: "SensorThings Catalog.",
};
/**
 * Common format for all types
 */
export function formatMetadata(
  action: string,
  schema: { title: string; description: string }
): Metadata {
  return {
    title: `${openapi.info.title} | ${schema.title}`,
    description: `${action} ${schema.title}. ${schema.description}`,
  };
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 * Parse OpenAPI schema properties and extract the
 * allowed types of nodes for linking. These are suffixed
 * with `@iot.navigation`.
 */
export function CollectionPage({
  schema,
  children,
  showActions = true,
}: {
  children: ReactNode;
  schema: {
    title: string;
    properties: object;
    description: string;
  };
  showActions?: boolean;
}) {
  const segment = schema.title
    .split(/\.?(?=[A-Z])/)
    .join("_")
    .toLowerCase();
  return (
    <div className={layout.content}>
      <details open={true}>
        <summary>About This Collection</summary>
        <Markdown>{schema.description}</Markdown>
      </details>
      <details open={showActions}>
        <summary>Actions</summary>
        <ul>
          <li>
          <Link href={`/catalog/${segment}/create/`} prefetch={false}>
            Create 
          </Link>{" "}
          <code>{schema.title}</code>
          </li>
        </ul>
      </details>
      <hr />
      <Suspense>{children}</Suspense>
    </div>
  );
}
/**
 * The OpenApi component uses an OpenAPI specification for a
 * simulation backend, and uses it to construct an interface.
 */
export default function Page({}) {
  return (
    <div className={styles.catalog}>
      <details open={true}>
        <summary>About This Catalog</summary>
        <Markdown>{openapi.info.description}</Markdown>
        <p>
          If code is more your style, try our{" "}
          <Link href="/openapi/" prefetch={false}>
            {" "}
            OpenAPI documentation for integration developers.
          </Link>
        </p>
      </details>
      <hr />
      <Client />
    </div>
  );
}
