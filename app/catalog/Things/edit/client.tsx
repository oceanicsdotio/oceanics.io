import React, { useEffect } from "react";
import openapi from "@app/../specification.json";
import { Linking } from "@catalog/client";
import { ThingsForm } from "@catalog/things/client";
export const action = "Update";
/**
 * OpenAPI schema information used in the interface.
 */
const schema = openapi.components.schemas.Things;
const parameters = openapi.components.parameters;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function ({}) {
  useEffect(() => {

  }, [dsiabled]);
  return (
    <>
      <ThingsForm
        action={action}
        limit={parameters.limit.schema.default}
        offset={parameters.offset.schema.default}
        initial={{
          uuid: "",
          name: "",
        }}
      />
      <Linking {...schema}></Linking>
    </>
  );
}
