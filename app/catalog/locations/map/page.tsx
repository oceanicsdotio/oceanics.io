import openapi from "@app/../specification.json";
import React from "react";
import Client from "./client";
import { CollectionPage, formatMetadata } from "@catalog/page";
import { Metadata } from "next";
const schema = openapi.components.schemas.Locations;
export const metadata: Metadata = formatMetadata("View", schema);
export default function Page({}) {
  return (
    <CollectionPage schema={schema}>
      <Client></Client>
    </CollectionPage>
  );
}
