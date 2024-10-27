import Link from "next/link";
import React from "react";
import specification from "@app/../specification.json";
import Collection from "@app/catalog/observations/client";
const components = specification.components;
const { title } = components.schemas.Observations;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Server Component
   */
  return (
    <>
      <p>
        You can <Link href="create/">create</Link> <code>{title}</code>.
      </p>
      <Collection/>
    </>
  );
}
