import React from "react";
import { Metadata } from "next";
import Sensors from "./Sensors";

export const metadata: Metadata = {
  title: "Oceanics.io | Sensors",
  description: "Sensors.",
};

export default function Page() {
  return (
     <Sensors/>
  );
}
