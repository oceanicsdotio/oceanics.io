import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oceanics.io | Subscribed",
  description: "Your email has been verified.",
};

export default function Page() {
  return (
    <>
        <h2>Your email address has been verified!</h2>
        <p>You can safely close this tab.</p>
    </>
  );
}
