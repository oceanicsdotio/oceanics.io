import Link from "next/link";
import React from "react";
import specification from "@app/../specification.json";
import Collection from "@app/catalog/features_of_interest/client";
import { getLinkedCollections } from "@app/catalog/page";
const { title, properties } =
  specification.components.schemas.FeaturesOfInterest;
const links = getLinkedCollections(properties);
/**
 * Display an index of all or some subset of the
 * available Features of Interest in the database.
 */
export default function Page({}) {
  /**
   * Static Component
   */
  return (
    <>
      <p>
        You can{" "}
        <Link href={"create/"} prefetch={false}>
          create
        </Link>{" "}
        <code>{title}</code> and link them with {links}.
      </p>
      <Collection></Collection>
    </>
  );
}
