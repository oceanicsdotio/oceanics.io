import React, { Suspense } from "react";
import Catalog from "./Catalog";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oceanics.io | Catalog",
  description: "Access ocean data.",
};

export default function Page() {
  return (
    <>
      <Suspense>
        <Catalog src="/"></Catalog>
        </Suspense>
    </>
  );
}
