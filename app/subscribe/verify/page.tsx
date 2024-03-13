import ValidateToken from "./ValidateToken";
import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import styles from "@app/layout.module.css"

export const metadata: Metadata = {
  title: "Oceanics.io | Verify e-mail",
  description: "Check your e-mail for a verification link.",
};

/**
 * User is directed here from the verification emails that
 * are sent as part of the subscription flow.
 */
export default function Page() {
  return (
    <>
    <Suspense>
      <ValidateToken
        verify={{
          token: "/.netlify/functions/verify-email",
        }}
      />
    </Suspense>
    </>
  );
}
