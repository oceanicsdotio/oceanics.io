import React from "react";
import Index from "./Index";
import { Metadata } from "next";

import styles from "./index.module.css";

export const metadata: Metadata = {
  title: "Oceanics.io",
  description: "The trust layer for the blue economy.",
};

export default function Page() {
  return (
    <>
      <Index
        {...{
          size: 96,
          view: {
            size: 9,
          },
          grid: {
            size: 7,
          },
          datum: 0.8,
          runtime: null,
          src: "/nodes.json",
        }}
      />
      <p className={styles.large}>
        To protect our Ocean, you need to draw on community knowledge and make
        data-driven decisions for the future. Whether watching your surf or
        seeking opportunity.
      </p>
      <p className={styles.large}>
        We analyze public and proprietary data and serve you synthetic and
        aggregate products to manage risk and conflict.
      </p>
      <p className={styles.large}>
        <a href="https://data.oceanics.io">
          Learn more about Bathysphere, our Ocean Data API.
        </a>
      </p>
    </>
  );
}
