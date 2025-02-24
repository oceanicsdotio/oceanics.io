import React from "react";
import OpenAPI from "@app/../specification.yaml";
import { CollectionPage } from "@catalog/page";
import { Linked as DataStreams } from "@catalog/data_streams/client";
import { Linked as FeaturesOfInterest } from "@catalog/features_of_interest/client";
import { Linked as HistoricalLocations } from "@catalog/historical_locations/client";
import { Linked as Locations } from "@catalog/locations/client";
import { Linked as Observations } from "@catalog/observations/client";
import { Linked as ObservedProperties } from "@catalog/observed_properties/client";
import { Linked as Sensors } from "@catalog/sensors/client";
import { Linked as Things } from "@catalog/things/client";
import { collectionMetadata, fromKey, toKey } from "../page";
/**
 * Result of the generateStaticParams function, which
 * is available to the page and metadata functions.
 */
type Props = {
  params: Promise<{
    collection: string;
    related: string;
  }>;
};
/**
 * Create a lookup table for components. Mapping these
 * keys will be used to build the paths for static generation.
 */
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
/**
 * Use specification and known components to generate static paths.
 */
export async function generateStaticParams() {
  return Object.keys(components).flatMap((collection) => {
    const schema = (OpenAPI.components.schemas as any)[collection];
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
/**
 * Generate metadata for the page from the collection 
 * metadata. This will be visible to crawlers.
 */
export async function generateMetadata({ params }: Props) {
  const { collection } = await params;
  return collectionMetadata("Related", collection);
}
/**
 * Render the page with the related component. Select
 * client component based on the current root and leaf
 * nodes. The linked component is different for each root
 * node.
 */
export default async function Page({ params }: Props) {
  const { collection, related } = await params;
  const _related = toKey(related);
  const _collection = toKey(collection);
  const schema = (OpenAPI.components.schemas as any)[_collection];
  const Client = (components as any)[_related] as any;
  return (
    <CollectionPage schema={schema} showActions={false}>
      <Client collection={schema}></Client>
    </CollectionPage>
  );
}
