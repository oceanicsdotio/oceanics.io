import React, { Suspense } from "react";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
import Linked from "@app/catalog/Linked";
import { ThingsForm } from "@app/catalog/things/client";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = specification.components.schemas.Things;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  return (
    <>
      <Markdown>{schema.description}</Markdown>
      <ThingsForm
        limit={100}
        offset={0}
        initial={{
          uuid: "",
          name: "",
        }}
      />
      <Suspense>
        <Linked {...schema}></Linked>
      </Suspense>
    </>
  );
}
