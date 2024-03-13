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
    <>
      <h2>
        We Are So <strong>Glad</strong> You Asked!
      </h2>
      <h3>What is this?</h3>
      <p>
        Innovative business models that increase equity for Maine
        workers are cool. They could encourage a blue economy culture of{" "}
        <strong>autonomy</strong>, <strong>prosperity</strong>, and{" "}
        <strong>accountability</strong>.
        Needing to start somewhere, we{" "}
        <Link className={styles.link} href="/upcoming-events">
          organize social events
        </Link>
        , and hope these lead to friends, partners, art, and
        industry.
      </p>
      <h3>Who are you?</h3>
      <p>
        The websites{" "}
        <Link className={styles.link} href="/">
          outoftheblue.today
        </Link>{" "}
        and{" "}
        <Link className={styles.link} href="https://www.oceanics.io">
          oceanics.io
        </Link>{" "}
        are projects of Oceanicsdotio LLC. We are a Rockland ME business
        developing digital tools for civilian marine operators.
        Whether or not that is your thing,{" "}
        <Link
          className={styles.link}
          href="mailto:person@outoftheblue.today?subject=Out of the Blue"
          target="_blank"
        >
          we would love to hear from you
        </Link>
        .
      </p>
      <p>
        <Link className={styles.link} href="/subscribe">
          🛟 Subscribe to News & Events
        </Link>
      </p>
    </>
  );
}
