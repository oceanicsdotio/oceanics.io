import React, { ReactNode, Suspense } from "react";
import Markdown from "react-markdown";
import Link from "next/link";
import { Metadata } from "next";
import styles from "@catalog/page.module.css";
import openapi from "@app/../specification.json";
import Client from "@catalog/client";
/**
 * Browser and crawler metadata
 */
export const metadata: Metadata = {
  title: "Oceanics.io | Catalog",
  description: "Sensor Things Catalog.",
};

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
 * Parse OpenAPI schema properties and extract the
 * allowed types of nodes for linking. These are suffixed
 * with `@iot.navigation`.
 */
export function getLinkedCollections(properties: any) {
  const related = Object.keys(properties)
    .filter((key: string) => key.includes("@"))
    .map((key) => key.split("@")[0]);
  const links = related.map((name: string, index: number) => {
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
  return links;
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function CollectionTemplate({
  schema,
  children,
  showActions = true,
}: {
  children: ReactNode;
  schema: {
    title: string;
    properties: any;
    description: string;
  };
  showActions?: boolean;
}) {
  const links = getLinkedCollections(schema.properties);
  const segment = schema.title.split(/\.?(?=[A-Z])/).join("_").toLowerCase()
  return (
    <>
      <details>
        <summary>About This Collection</summary>
        <Markdown>{schema.description}</Markdown>
        <p></p>
      </details>
      <details open={showActions}>
        <summary>Actions</summary>
        <p>
          You can <Link href={`/catalog/${segment}/create/`}>create</Link> <code>{schema.title}</code>
          , and link them to {links}.
        </p>
      </details>
      <Suspense>{children}</Suspense>
    </>
  );
}
/**
 * The OpenApi component uses an OpenAPI specification for a
 * simulation backend, and uses it to construct an interface.
 */
export default function Page({}) {
  /**
   * Server component enforces `use client` boundary.
   */
  return (
    <div className={styles.catalog}>
      <Markdown>{openapi.info.description}</Markdown>
      <p>
        If code is more your style, try our{" "}
        <Link href="/openapi/" prefetch={false}>
          {" "}
          OpenAPI documentation for integration developers.
        </Link>
      </p>
      <Client />
    </div>
  );
}
