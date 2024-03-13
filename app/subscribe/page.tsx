import Subscribe from "./Subscribe";
import { Metadata } from "next";
import Link from "next/link";
import styles from "@styles/layout.module.css";

export const metadata: Metadata = {
  title: "Out of the Blue | Calendar",
  description: "Contact information and frequently asked questions.",
};

export default function Page() {
  return (
    <div className={`${styles.subscribe} ${styles.frame}`}>
      <h2>
        <strong>Out of the Blue</strong> News & Events
      </h2>
      <p>
        When you press <strong>subscribe</strong> you agree we can save and
        use your email to verify that you are a person and to notify you about
        news and events.
        </p>
      <p>You will receive messages no more than once per week, 
        except as needed to verify your email.
        We will not share your contact information. You can
        unsubscribe and have your data deleted at any time
        by sending us an email.
      </p>
      <p>
        <Link className={styles.link} href="/about-us">
          🛟 Find Out More or Contact Us
        </Link>
      </p>
      <Subscribe
        {...{
          sitekey: "6LdojWcpAAAAAPMOjOcCD--jyIWLRLQPQ6blVMtZ",
          verify: {
            recaptcha: "/.netlify/functions/verify-recaptcha",
            email: "/subscribe/verify",
          },
        }}
      />
    </div>
  );
}
