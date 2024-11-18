import React from "react";
import openapi from "@app/../specification.json";
import { CollectionPage, formatMetadata } from "@catalog/page";
import {Data as DataStreams} from "../data_streams/client";
import {Data as FeaturesOfInterest} from "../features_of_interest/client";
import {Data as HistoricalLocations} from "../historical_locations/client";
import {Data as Locations} from "../locations/client";
import {Data as Observations} from "../observations/client";
import {Data as ObservedProperties} from "../observed_properties/client";
import {Data as Sensors} from "../sensors/client";
import {Data as Things} from "../things/client";

const components = {
  DataStreams,
  FeaturesOfInterest,
  HistoricalLocations,
  Observations,
  Locations,
  ObservedProperties,
  Sensors,
  Things
}
function fromKey(collection: string) {
  return collection.split(/\.?(?=[A-Z])/).join("_").toLowerCase()
}
export async function generateStaticParams() {
    return Object.keys(components).map((collection) => {
        return {
            collection: fromKey(collection)
        }
    })}
type Props = {
    params: Promise<{ collection: string }>
}
function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
function toKey(collection: string) {
  return collection.split("_").map(capitalizeFirstLetter).join("");
}

export async function generateMetadata({params}:Props) {
    const {collection} = await params;
    const key = toKey(collection);
    const schema = (openapi.components.schemas as any)[key];
    return formatMetadata("Read", schema);
}
export default async function Page({
    params,
  }: Props) {
    const {collection} = await params;
    const key = toKey(collection);
    const schema = (openapi.components.schemas as any)[key];
    const Component = (components as any)[key]
    return (
        <CollectionPage schema={schema}>
            <>{collection}</>
        <Component></Component>
      </CollectionPage>
    )
  }

