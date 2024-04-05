import Catalog from "./Catalog";
import Markdown from "react-markdown";
import React from "react";
import styles from "./catalog.module.css";
import specification from "../../specification.json";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oceanics.io | Catalog",
  description: "Access and manage ocean data.",
};

export default function Page() {
  return (
    <div className={styles.catalog}>
      <h2>{specification.info.title}</h2>
      <Markdown>{specification.info.description}</Markdown>
      <Catalog />
    </div>
  );
}
