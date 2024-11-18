import React from "react";
import openapi from "@app/../specification.json";
import { CollectionPage, formatMetadata } from "@catalog/page";
import { New as DataStreams } from "@catalog/data_streams/client";
import { New as FeaturesOfInterest } from "@catalog/features_of_interest/client";
import { New as HistoricalLocations } from "@catalog/historical_locations/client";
import { New as Locations } from "@catalog/locations/client";
import { New as Observations } from "@catalog/observations/client";
import { New as ObservedProperties } from "@catalog/observed_properties/client";
import { New as Sensors } from "@catalog/sensors/client";
import { New as Things } from "@catalog/things/client";

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
function fromKey(collection: string) {
  return collection
    .split(/\.?(?=[A-Z])/)
    .join("_")
    .toLowerCase();
}
export async function generateStaticParams() {
  return Object.keys(components).map((collection) => {
    return {
      collection: fromKey(collection),
    };
  });
}
type Props = {
  params: Promise<{ collection: string }>;
};
function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
function toKey(collection: string) {
  return collection.split("_").map(capitalizeFirstLetter).join("");
}

export async function generateMetadata({ params }: Props) {
  const { collection } = await params;
  const key = toKey(collection);
  const schema = (openapi.components.schemas as any)[key];
  return formatMetadata("Create", schema);
}
export default async function Page({ params }: Props) {
  const { collection } = await params;
  const key = toKey(collection);
  const schema = (openapi.components.schemas as any)[key];
  const Component = (components as any)[key];
  return (
    <CollectionPage schema={schema} showActions={false}>
      <Component></Component>
    </CollectionPage>
  );
}
