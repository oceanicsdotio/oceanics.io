import { Metadata } from "next";
import Image from "next/image";
import React from "react";
 
export const metadata: Metadata = {
  title: 'Oceanics.io | Not Found 404',
  description: 'Page not found',
}

export default function Page() {
  return (
    <>
      <p>{"You can't get there from here."}</p>
      <Image
        src={"/assets/dagan-sprite.gif"}
        alt="Sea creature seeking answers"
        unoptimized={true}
      />
    </>
  );
};

