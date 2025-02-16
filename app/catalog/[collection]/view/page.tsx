import React from "react";
import { CollectionPage } from "@catalog/page";
import openapi from "@app/../specification.json";
import { View as DataStreams } from "@catalog/data_streams/client";
import { View as Locations } from "@catalog/locations/client";
import { toKey, type Props, collectionMetadata, collectionSlugs } from "../page";

const components = {
  DataStreams,
  Locations
};
export async function generateStaticParams() {
  return collectionSlugs(components);
}
export async function generateMetadata({ params }: Props) {
  const { collection } = await params;
  return collectionMetadata("View", collection);
}
export default async function Page({ params }: Props) {
  const { collection } = await params;
  const key = toKey(collection);
  const schema = (openapi.components.schemas as any)[key];
  const Client = (components as any)[key] as React.FunctionComponent;
  return (
    <CollectionPage schema={schema} showActions={false}>
      <Client></Client>
    </CollectionPage>
  );
}
