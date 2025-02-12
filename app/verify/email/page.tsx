import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oceanics.io | E-mail verification needed",
  description: "Check your e-mail for a verification link.",
};

/**
 * User is redirected here after submitting email for verification.
 */
export default function Page() {
  return (
    <>
      <h2>Wait, we still need to verify your email!</h2>
      <p>
        You should receive a confirmation message with a verification link
        to finish subscribing. If you do not see one within a few minutes, check
        your spam.
        The link is good for 1 hour. 
        Ignore the email and we will not
        contact you.
      </p>
    </>
  );
}
