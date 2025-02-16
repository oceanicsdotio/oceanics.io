import React from "react";
import { CollectionPage } from "@catalog/page";
import openapi from "@app/../specification.yaml";
import { Linked as DataStreams } from "@catalog/data_streams/client";
import { Linked as FeaturesOfInterest } from "@catalog/features_of_interest/client";
import { Linked as HistoricalLocations } from "@catalog/historical_locations/client";
import { Linked as Locations } from "@catalog/locations/client";
import { Linked as Observations } from "@catalog/observations/client";
import { Linked as ObservedProperties } from "@catalog/observed_properties/client";
import { Linked as Sensors } from "@catalog/sensors/client";
import { Linked as Things } from "@catalog/things/client";
import { collectionMetadata, fromKey, toKey } from "../page";
export type Props = {
  params: Promise<{
    collection: string;
    related: string;
  }>;
};
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
  return Object.keys(components).flatMap((collection) => {
    const schema = (openapi.components.schemas as any)[collection];
    const options = Object.keys(schema.properties)
      .filter((key: string) => key.includes("@"))
      .map((key) => key.split("@")[0]);
    return options.map((related) => {
      return {
        collection: fromKey(collection),
        related: fromKey(related),
      };
    });
  });
}
export async function generateMetadata({ params }: Props) {
  const { collection } = await params;
  return collectionMetadata("Related", collection);
}
export default async function Page({ params }: Props) {
  const { collection, related } = await params;
  const _related = toKey(related);
  const _collection = toKey(collection);
  const schema = (openapi.components.schemas as any)[_collection];
  const Client = (components as any)[_related] as any;
  return (
    <CollectionPage schema={schema} showActions={false}>
      <Client collection={schema}></Client>
    </CollectionPage>
  );
}
