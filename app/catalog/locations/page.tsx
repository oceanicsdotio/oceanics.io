import Link from "next/link";
import specification from "@app/../specification.json";
import React from "react";
import Collection from "@app/catalog/locations/client";
import { getLinkedCollections } from "@app/catalog/page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oceanics.io | Locations",
  description: "Catalog of Locations",
};
const { properties, title } =
  specification.components.schemas.DataStreams;
const links = getLinkedCollections(properties);

/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <>
      <p>
        You can{" "}
        <Link href="create/" prefetch={false}>
          create
        </Link>{" "}
        <code>{title}</code>{" "}
        and link them with {links}
      </p>
      <Collection></Collection>
    </>
  );
}
