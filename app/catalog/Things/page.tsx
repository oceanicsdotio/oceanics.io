import Link from "next/link";
import React from "react";
import Markdown from "react-markdown";
import { Metadata } from "next";
import { getLinkedCollections } from "@catalog/page";
import specification from "@app/../specification.json";
import Collection from "@app/catalog/things/client";
export const metadata: Metadata = {
  title: "Oceanics.io | Things",
  description: "Catalog of Things",
};
const {
  properties,
  description,
  title,
} = specification.components.schemas.Things;
const links = getLinkedCollections(properties);
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Server Component.
   */
  return (
    <div>
      <Markdown>{description}</Markdown>
      <p>
        You can{" "}
        <Link href={"create/"}>
          create
        </Link>{" "}
        <code>{title}</code>, and link them to {links}.
      </p>
      <Collection />
    </div>
  );
}
