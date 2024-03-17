import React, { Suspense } from "react";
import Catalog from "./Catalog";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oceanics.io | Catalog",
  description: "Manage your data.",
};

export default function Page() {
  return (
    <>
      <Suspense>
        <Catalog
          zoomLevel={10}
          accessToken={process.env.NEXT_MAPBOX_ACCESS_TOKEN ?? ""}
        ></Catalog>
      </Suspense>
    </>
  );
}
