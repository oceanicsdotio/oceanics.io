import Catalog from "./Catalog";
import Markdown from "react-markdown";
import React from "react";
import styles from "./catalog.module.css";
import specification from "@app/../specification.json";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Oceanics.io | Catalog",
  description: "Access and manage ocean data.",
};

export default function Page() {
  return (
    <div className={styles.catalog}>
      <h2>{specification.info.title}</h2>
      <Markdown>{specification.info.description}</Markdown>
      <p>
        If code is more your style, try our{" "}
        <Link href="/openapi">
          {" "}
          documentation for Bathysphere integration developers.
        </Link>
      </p>
      <Catalog />
    </div>
  );
}
