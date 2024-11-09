import React from "react";
import OpenAPI from "@app/../specification.json";
import { CollectionLayout } from "@catalog/layout";
const schema = OpenAPI.components.schemas.HistoricalLocations;
export default function Layout({ children }: { children: React.ReactNode }) {
  return <CollectionLayout title={schema.title}>{children}</CollectionLayout>;
}