import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oceanics.io | E-mail verification error",
  description: "There was a problem with our servers.",
};

export default function Page() {
  return (
    <>
      <h2>Something is wrong with our server.</h2>
      <p>
        Not ideal, but we will fix it. It would help if you could let us
        know about the problem.
      </p>
    </>
  );
}
