import React, { Suspense } from "react";
import specification from "@app/../specification.json";
import {Linking} from "@catalog/client";
import { ThingsForm } from "@catalog/things/client";
import { type Metadata } from "next";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = specification.components.schemas.Things;
/**
 * Browser and crawler metadata
 */
export const metadata: Metadata = {
  title: `Oceanics.io | ${schema.title}`,
  description: "Catalog of Things",
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <>
      <ThingsForm
        limit={100}
        offset={0}
        initial={{
          uuid: "",
          name: "",
        }}
      />
      <Suspense>
        <Linking {...schema}></Linking>
      </Suspense>
    </>
  );
}
