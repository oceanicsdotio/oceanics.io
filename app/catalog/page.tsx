import React, { ReactNode, Suspense } from "react";
import Markdown from "react-markdown";
import Link from "next/link";
import { Metadata } from "next";
import styles from "@catalog/page.module.css";
import layout from "@app/layout.module.css";
import openapi from "@app/../specification.json";
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
  showActions = false,
}: {
  children: ReactNode;
  schema: {
    title: string;
    properties: any;
    description: string;
  };
  showActions?: boolean;
}) {
  const links = Object.keys(schema.properties)
    .filter((key: string) => key.includes("@"))
    .map((key, index, related) => {
      let name = key.split("@")[0];
      let prepend = "";
      if (index === related.length - 1 && index > 0) {
        prepend = " and ";
      } else if (index > 0) {
        prepend = ", ";
      }
      return (
        <span key={`linked-${index}`}>
          {prepend}
          <code>{name}</code>
        </span>
      );
    });
  const segment = schema.title
    .split(/\.?(?=[A-Z])/)
    .join("_")
    .toLowerCase();
  return (
    <>
      {"/"}
      <Link
        className={layout.link}
        href={`/catalog/${segment}`}
        prefetch={false}
      >
        {schema.title}
      </Link>
      <div className={layout.content}>
        <details>
          <summary>About This Collection</summary>
          <Markdown>{schema.description}</Markdown>
        </details>
        <details open={showActions}>
          <summary>Actions</summary>
          <p>
            You can <Link href={`/catalog/${segment}/create/`}>create</Link>{" "}
            <code>{schema.title}</code>, and link them to {links}.
          </p>
        </details>
        <hr />
        <Suspense>{children}</Suspense>
      </div>
    </>
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
