import React from "react";
import openapi from "@app/../specification.yaml";
import { CollectionPage, formatMetadata } from "@catalog/page";
import { Data as DataStreams } from "../data_streams/client";
import { Data as FeaturesOfInterest } from "../features_of_interest/client";
import { Data as HistoricalLocations } from "../historical_locations/client";
import { Data as Locations } from "../locations/client";
import { Data as Observations } from "../observations/client";
import { Data as ObservedProperties } from "../observed_properties/client";
import { Data as Sensors } from "../sensors/client";
import { Data as Things } from "../things/client";
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
type ValidComponents = keyof typeof components;
export function fromKey(collection: string) {
  return collection
    .split(/\.?(?=[A-Z])/)
    .join("_")
    .toLowerCase();
}
export interface Props {
  params: Promise<{ collection: string }>;
};
export function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
export function toKey(collection: string) {
  return collection.split("_").map(capitalizeFirstLetter).join("");
}
export function collectionSlugs(components: object) {
  return Object.keys(components).map((collection) => {
    return {
      collection: fromKey(collection),
    };
  });
}
export async function generateStaticParams() {
  return collectionSlugs(components);
}
export function collectionMetadata(action: string, collection: string) {
  const key = toKey(collection) as ValidComponents;
  const schema = openapi.components.schemas[key];
  return formatMetadata(action, schema);
}
export async function generateMetadata({ params }: Props) {
  const { collection } = await params;
  return collectionMetadata("Read", collection);
}
export default async function Page({ params }: Props) {
  const { collection } = await params;
  const key = toKey(collection) as ValidComponents;
  const schema = openapi.components.schemas[key];
  const Component = components[key];
  return (
    <CollectionPage schema={schema}>
      <Component></Component>
    </CollectionPage>
  );
}
