import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import Subscribe from "@app/about/client";
import layout from "@app/layout.module.css";
import style from "@about/page.module.css";

export const metadata: Metadata = {
  title: "Oceanics.io | About",
  description: "Contact information and newsletter subscription.",
};

export default function Page() {
  return (
    <div className={`${style.subscribe}`}>
      <h2>
        We are so <strong>glad</strong> you asked!
      </h2>
      <p>
        Oceanicsdotio LLC is a Rockland Maine business developing digital tools
        for civilian marine operators. We like innovative business models that
        nuture <strong>autonomy</strong>, <strong>prosperity</strong>, and{" "}
        <strong>accountability</strong> in the blue economy.
      </p>
      <h2>
        Subscribe to <strong>Out of the Blue</strong>
      </h2>
      <Subscribe
        {...{
          sitekey: "6LdojWcpAAAAAPMOjOcCD--jyIWLRLQPQ6blVMtZ",
          verify: {
            recaptcha: "/.netlify/functions/verify-recaptcha",
            email: "/subscribe/verify",
          },
        }}
      >
        <p>
          Pressing <code>Subscribe</code> opts you into email verification,
          news, and events.{" "}
          <Link
            className={layout.link}
            href="mailto:wave@oceanics.io?subject=Out of the Blue"
            target="_blank"
          >
            Send us an email to say hello or unsubscribe
          </Link>
          . We will not share your contact information.
        </p>
      </Subscribe>
    </div>
  );
}
