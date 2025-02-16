import React from "react";
import openapi from "@app/../specification.yaml";
import { CollectionPage } from "@catalog/page";
import { New as DataStreams } from "@catalog/data_streams/client";
import { New as FeaturesOfInterest } from "@catalog/features_of_interest/client";
import { New as HistoricalLocations } from "@catalog/historical_locations/client";
import { New as Locations } from "@catalog/locations/client";
import { New as Observations } from "@catalog/observations/client";
import { New as ObservedProperties } from "@catalog/observed_properties/client";
import { New as Sensors } from "@catalog/sensors/client";
import { New as Things } from "@catalog/things/client";
import { collectionMetadata, type Props, toKey, collectionSlugs } from "../page";
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
  return collectionSlugs(components);
}
export async function generateMetadata({ params }: Props) {
  const { collection } = await params;
  return collectionMetadata("Create", collection);
}
export default async function Page({ params }: Props) {
  const { collection } = await params;
  const key = toKey(collection);
  const schema = (openapi.components.schemas as any)[key];
  const Client = (components as any)[key];
  return (
    <CollectionPage schema={schema} showActions={false}>
      <Client></Client>
    </CollectionPage>
  );
}
