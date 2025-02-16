import React from "react";
import openapi from "@app/../specification.yaml";
import { CollectionPage } from "@catalog/page";
import { Edit as DataStreams } from "@catalog/data_streams/client";
import { Edit as FeaturesOfInterest } from "@catalog/features_of_interest/client";
import { Edit as HistoricalLocations } from "@catalog/historical_locations/client";
import { Edit as Locations } from "@catalog/locations/client";
import { Edit as Observations } from "@catalog/observations/client";
import { Edit as ObservedProperties } from "@catalog/observed_properties/client";
import { Edit as Sensors } from "@catalog/sensors/client";
import { Edit as Things } from "@catalog/things/client";
import { collectionMetadata, collectionSlugs, toKey, type Props } from "../page";

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
  return collectionMetadata("Update", collection);
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
