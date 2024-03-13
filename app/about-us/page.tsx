import React from "react";
import { Metadata } from "next";
import styles from "@app/layout.module.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Out of the Blue | About Us",
  description: "Contact information and frequently asked questions.",
};

/**
 * User is redirected here after subscribing to newsletter.
 */
export default function Page() {
  return (
    <div className={`${styles.subscribe}`}>
      <h2>
        We are so <strong>glad</strong> you asked!
      </h2>
      <p>
        Oceanicsdotio LLC is a Rockland Maine business developing digital tools for civilian marine operators. We think innovative business models that increase equity for
        workers are cool, and nuture{" "}
        <strong>autonomy</strong>, <strong>prosperity</strong>, and{" "}
        <strong>accountability</strong> in the blue economy.
      </p>
      <p>
        <Link
          className={styles.link}
          href="mailto:business@oceanics.io?subject=Out of the Blue"
          target="_blank"
        >
          🛟 We would love to hear from you
        </Link>
      </p>
      <p>
        <Link className={styles.link} href="/about-us/brand">
          🛟 Brand use guidelines
        </Link>
      </p>
      <p>
        <Link className={styles.link} href="/about-us/lottery">
          🛟 Buoy lottery service
        </Link>
      </p>
    </div>
  );
}
