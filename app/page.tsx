import React, { Suspense } from "react";
import Oceanics from "./Oceanics";
import { Metadata } from "next";
import layout from "./layout.module.css";
import style from "./oceanics.module.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Oceanics.io",
  description: "The trust layer for the blue economy.",
};

export default function Page() {
  return (
    <>
      <h1>
        <Link className={layout.link} href="/">
          Oceanics.io
        </Link>
      </h1>
      <Suspense fallback={<div className={style.placeholder}></div>}>
        <Oceanics
          gridSize={20}
          backgroundColor="#110022ff"
          timeConstant={-0.00018}
          frameConstant={0.002}
          amplitude={0.25}
          phase={10.0}
        />
      </Suspense>

      <p>
        You need to draw on community knowledge and make
        data-driven decisions for the future. Whether watching your surf or seeking opportunity.
      </p>
      <p>
        We analyze public and proprietary data and serve you synthetic and aggregate products to manage risk and conflict.
      </p>
      <p>
        <a className={layout.link} href="https://data.oceanics.io">
          🛟 Explore ocean data
        </a>
      </p>
      <p>
        <Link className={layout.link} href="/subscribe">
          🛟 Subscribe to newsletter
        </Link>
      </p>
      <p>
        <Link className={layout.link} href="/about-us">
          🛟 Learn more about us
        </Link>
      </p>
    </>
  );
}
