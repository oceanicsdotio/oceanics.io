import React, { Suspense } from "react";
import Oceanics from "./Oceanics";
import { Metadata } from "next";
import styles from "./layout.module.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Oceanics.io",
  description: "The trust layer for the blue economy.",
};

export default function Page() {
  return (
    <>
      <h1>
        <Link className={styles.link} href="/">
          Oceanics.io
        </Link>
      </h1>
      <Suspense fallback={<div className={styles.placeholder}></div>}>
        <Oceanics
          worldSize={96}
          gridSize={7}
          waterLevel={1.0}
          backgroundColor="#222222ff"
        />
      </Suspense>

      <p className={styles.large}>
        To protect our Ocean, you need to draw on community knowledge and make
        data-driven decisions for the future. Whether watching your surf or
        seeking opportunity.
      </p>
      <p className={styles.large}>
        We analyze public and proprietary data and serve you synthetic and aggregate products to manage risk and conflict.
      </p>
      <p>
        <a className={styles.link} href="https://data.oceanics.io">
          🛟 Explore our ocean data service
        </a>
      </p>
      <p>
        <Link className={styles.link} href="/subscribe">
          🛟 Subscribe to our community newsletter
        </Link>
      </p>
      <p>
        <Link className={styles.link} href="/about-us">
          🛟 Learn more about us or get in touch
        </Link>
      </p>
    </>
  );
}
