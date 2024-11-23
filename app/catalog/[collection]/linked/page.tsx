import React from "react";
import { CollectionPage, formatMetadata } from "@catalog/page";
import openapi from "@app/../specification.json";
import { Linked as DataStreams } from "@catalog/data_streams/client";
import { Linked as FeaturesOfInterest } from "@catalog/features_of_interest/client";
import { Linked as HistoricalLocations } from "@catalog/historical_locations/client";
import { Linked as Locations } from "@catalog/locations/client";
import { Linked as Observations } from "@catalog/observations/client";
import { Linked as ObservedProperties } from "@catalog/observed_properties/client";
import { Linked as Sensors } from "@catalog/sensors/client";
import { Linked as Things } from "@catalog/things/client";
import { collectionMetadata, collectionSlugs, fromKey, toKey, type Props } from "../page";

const components = {
  DataStreams,
  FeaturesOfInterest,
  HistoricalLocations,
  Observations,
  Locations,
  ObservedProperties,
  Sensors,
  Things,
};
export async function generateStaticParams() {
  return collectionSlugs(components)
}
export async function generateMetadata({ params }: Props) {
  const { collection } = await params;
  return collectionMetadata("Link", collection);
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
