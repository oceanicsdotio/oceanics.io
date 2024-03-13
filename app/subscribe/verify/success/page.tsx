import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Out of the Blue | Subscribed",
  description: "Your email has been verified.",
};

export default function Page() {
  return (
    <>
        <h1>Your email address has been verified!</h1>
        <p>You can safely close this tab.</p>
    </>
  );
}
