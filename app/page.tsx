import React, { Suspense } from "react";
import Oceanside from "./Oceanics";
import { Metadata } from "next";
import styles from "./index.module.css";
import Link from "next/link";
import _styles from "@styles/layout.module.css";

export const metadata: Metadata = {
  title: "Oceanics.io",
  description: "The trust layer for the blue economy.",
};

export default function Page() {
  return (
    <>
      <Suspense fallback={<div className={styles.placeholder}></div>}>
        <Oceanside
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
      </Suspense>

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
      <p>
        <Link className={_styles.link} href="/subscribe">
          Subscribe to News & Events
        </Link>
      </p>
      <p>
        <Link className={_styles.link} href="/upcoming-events">
          See Upcoming Events
        </Link>
      </p>
    </>
  );
}
