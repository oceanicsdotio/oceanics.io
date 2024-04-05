import React from "react";
import { Metadata } from "next";
import Locations from "./Locations";

export const metadata: Metadata = {
  title: "Oceanics.io | Location",
  description: "Location data.",
};

export default function Page() {
  return (
    <>
      <Locations />
    </>
  );
}
