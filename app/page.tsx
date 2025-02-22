import React, { Suspense } from "react";
import { Oceanics, Subscribe } from "@app/client";
import { Metadata } from "next";
import style from "@app/page.module.css";

export const metadata: Metadata = {
  title: "Oceanics.io",
  description: "The trust layer for the blue economy.",
};

export default function Page() {
  return (
    <>
      <Suspense fallback={<div className={style.placeholder}></div>}>
        <Oceanics
          gridSize={20}
          backgroundColor="#110022"
          timeConstant={-0.00018}
          frameConstant={0.002}
          amplitude={0.25}
          phase={10.0}
        />
      </Suspense>

      <p>
        We analyze public and proprietary ocean data and serve you synthetic and
        aggregate products to manage risk and conflict.
      </p>
      <p>
        Together we can draw on community knowledge and make data-driven
        decisions for the future. Whether watching your surf or seeking
        opportunity.
      </p>
      <div className={`${style.subscribe}`}>
        <h3>Request access to <a href="/catalog">our data catalog</a></h3>
        <Subscribe
          {...{
            sitekey: process.env.NEXT_PUBLIC_SITE_RECAPTCHA_KEY ?? "",
            verify: {
              recaptcha: "/.netlify/functions/verify-recaptcha",
              email: "/verify",
            },
          }}
        ></Subscribe>
      </div>
    </>
  );
}
