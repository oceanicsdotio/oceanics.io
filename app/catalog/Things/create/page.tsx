import React, { Suspense } from "react";
import { ThingsForm } from "@catalog/things/client";
import openapi from "@app/../specification.json";
import { type Metadata } from "next";
import {v7 as uuid7} from "uuid";
const action = "Create"
/**
 * OpenAPI schema information used in the interface.
 */
const schema = openapi.components.schemas.Things;
const parameters = openapi.components.parameters;
/**
 * Browser and crawler metadata
 */
export const metadata: Metadata = {
  title: `${openapi.info.title} | ${schema.title}`,
  description: `${action} ${schema.title}. ${schema.description}`,
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Server component
   */
  return (
      <Suspense>
        <ThingsForm
          action={action}
          limit={parameters.limit.schema.default}
          offset={parameters.offset.schema.default}
          initial={{
            uuid: uuid7(),
            name: "",
          }}
        />
      </Suspense>
  );
}
