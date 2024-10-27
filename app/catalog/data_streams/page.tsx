import React from "react";
import { getLinkedCollections } from "@catalog/page";
import Collection from "@catalog/data_streams/client";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oceanics.io | Data Streams",
  description: "Catalog of Data Streams.",
};
const { properties, description, title } =
  specification.components.schemas.DataStreams;
const links = getLinkedCollections(properties);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Static Component
   */
  return (
    <div>
      <Markdown>{description}</Markdown>
      <p>
        You can <Link href={"create/"}>create</Link> new <code>{title}</code>{" "}
        and link them with {links}.
      </p>
      <Collection></Collection>
    </div>
  );
}
