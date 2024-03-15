import Subscribe from "./Subscribe";
import { Metadata } from "next";
import Link from "next/link";
import layout from "@app/layout.module.css";
import style from "./Subscribe.module.css";

export const metadata: Metadata = {
  title: "Oceanics.io | Subscribe",
  description: "Subscribe to newsletter.",
};

export default function Page() {
  return (
    <div className={style.subscribe}>
      <h2>
        Subscribe to <strong>Out of the Blue</strong>, our community newsletter and calendar
      </h2>
      <p>You will receive messages no more than once per week, 
        except as needed to verify your email.
        We will not share your contact information. You can
        unsubscribe and have your data deleted at any time
        by <Link className={layout.link} href="/about-us">
          sending us an email
        </Link>.
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
      <p>
        When you press <code>Subscribe</code> you agree we can save and
        use your email to verify that you are a person and to notify you about
        news and events.
        </p>
      
    </div>
  );
}
