import React from "react";
import Markdown from "react-markdown";
import Link from "next/link";
import { Metadata } from "next";
import styles from "@catalog/page.module.css";
import specification from "@app/../specification.json";
import Index from "@app/catalog/client";

export const metadata: Metadata = {
  title: "Oceanics.io | Catalog",
  description: "Sensor Things Catalog.",
};

export function getLinkedCollections(properties: any) {
  const related = Object.keys(properties)
    .filter((key: string) => key.includes("@"))
    .map((key) => key.split("@")[0]);
  const links = related.map((name: string, index: number) => {
    let prepend = "";
    if (index === related.length - 1) {
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
 * The OpenApi component uses an OpenAPI specification for a
 * simulation backend, and uses it to construct an interface.
 */
export default function Page({}) {
  /**
   * Server Component.
   */
  return (
    <div className={styles.catalog}>
      <Markdown>{specification.info.description}</Markdown>
      <p>
        If code is more your style, try our{" "}
        <Link href="/openapi/" prefetch={false}>
          {" "}
          OpenAPI documentation for integration developers.
        </Link>
      </p>
      <Index></Index>
    </div>
  );
}
