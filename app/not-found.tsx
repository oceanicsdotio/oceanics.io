import { Metadata } from "next";
import React from "react";
import layout from "./layout.module.css";
 
export const metadata: Metadata = {
  title: 'Oceanics.io | Not Found 404',
  description: 'Page not found',
}

export default function NotFound() {
  return (
    <>
      <h2>{"You can't get there from here."}</h2>
      <img
        className={layout.image}
        src="sprites/not-found.gif"
        alt="Sea creature seeking answers"
      />
    </>
  );
};

