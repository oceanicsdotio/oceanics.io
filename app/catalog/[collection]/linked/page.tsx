import React from "react";
import { CollectionPage, formatMetadata } from "@catalog/page";
import { Linked as DataStreams } from "@catalog/data_streams/client";
import openapi from "@app/../specification.json";
import { fromKey, toKey, type Props } from "../page";

const components = {
  DataStreams
};
export async function generateStaticParams() {
  return Object.keys(components).map((collection) => {
    return {
      collection: fromKey(collection),
    };
  });
}
export async function generateMetadata({ params }: Props) {
  const { collection } = await params;
  const key = toKey(collection);
  const schema = (openapi.components.schemas as any)[key];
  return formatMetadata("Link", schema);
}
export default async function Page({ params }: Props) {
  const { collection } = await params;
  const key = toKey(collection);
  const schema = (openapi.components.schemas as any)[key];
  const Component = (components as any)[key] as React.FunctionComponent;
  return (
    <CollectionPage schema={schema} showActions={false}>
      <Component></Component>
    </CollectionPage>
  );
}
