import React, { Suspense } from "react";
import Compute from "./Compute";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oceanics.io | Compute",
  description: "Web GPU instance",
};

export default function Page() {
  return (
    <>
      <Suspense fallback={<p>Loading...</p>}>
        <Compute
          velocity={{
            metadataFile: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/assets/wind.json",
            source: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/assets/wind.png",
          }}
          res={16}
          colors={[
            "#deababff",
            "#660066ff",
          ]}
          opacity = {0.92}
          speed ={ 0.00007}
          diffusivity = {0.004}
          pointSize = {1.0}
          drop = {0.01}
        ></Compute>
      </Suspense>
    </>
  );
}
