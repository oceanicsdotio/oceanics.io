import React from "react";
import OpenAPI from "@app/../specification.yaml";
import { CollectionPage } from "@catalog/page";
import { collectionMetadata, fromKey, toKey } from "@catalog/[collection]/page";
// Type-bound instances of LinkedGeneric (see sibling client.tsx)
import { Linked as DataStreams } from "@catalog/data_streams/client";
import { Linked as FeaturesOfInterest } from "@catalog/features_of_interest/client";
import { Linked as HistoricalLocations } from "@catalog/historical_locations/client";
import { Linked as Locations } from "@catalog/locations/client";
import { Linked as Observations } from "@catalog/observations/client";
import { Linked as ObservedProperties } from "@catalog/observed_properties/client";
import { Linked as Sensors } from "@catalog/sensors/client";
import { Linked as Things } from "@catalog/things/client";
/**
 * Result of the generateStaticParams function, which
 * is available to the page and metadata functions.
 */
interface Props {
  params: Promise<{
    collection: string;
    related: string;
  }>;
};
/**
 * Create a lookup table for components. Mapping these
 * keys will be used to build the paths for static generation.
 * 
 * The implementations are identical, derived from the Linked
 * component in the client.tsx file. We do it this way to help
 * with type checking and to avoid circular dependencies.
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
type ValidComponents = keyof typeof components;
/**
 * Use specification and known components to generate static paths.
 * The specification of entity models have properties that include
 * `@import.navigation` which allows easier detection of possible
 * linkages.
 * 
 * The process converts canonical names to the snake case keys used in the
 * components lookup table.
 */
export async function generateStaticParams() {
  return Object.keys(components).flatMap((collection) => {
    const schema = OpenAPI.components.schemas[collection];
    const options = Object.keys(schema.properties)
      .filter((key: string) => key.includes("@"))
      .map((key) => {
        const related = key.split("@")[0] as ValidComponents;
        return {
          collection: fromKey(collection),
          related: fromKey(related),
        }
      });
    return options;
  });
}
/**
 * Generate metadata for the page from the collection 
 * metadata. This will be visible to crawlers, if the page
 * is not behind a login.
 */
export async function generateMetadata({ params }: Props) {
  const { collection } = await params;
  return collectionMetadata("Related", collection);
}
/**
 * Render the page with the related component. Select
 * client component based on the current root and leaf
 * nodes. The linked component can be different for each root
 * node. The key conversion processes snake case names
 * back in to canonical names for looking up schemas from
 * the specification.
 */
export default async function Page({ params }: Props) {
  const { collection, related } = await params;
  const _collection = toKey(collection) as ValidComponents;
  const _related = toKey(related) as ValidComponents;
  const schema = (OpenAPI.components.schemas)[_collection];
  const Client = (components)[_related];
  return (
    <CollectionPage schema={schema} showActions={false}>
      <Client collection={schema}></Client>
    </CollectionPage>
  );
}
