"use client"
import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from 'next/navigation'
import layout from "@app/layout.module.css";

export default function Page() {
  const path = usePathname()
  const uuid = path.split("/").filter(some => some).pop();
  const [property, setProperty] = useState<any>({});
  const [message, setMessage] = useState(`Querying ${uuid}...`)
  useEffect(() => {
    let user: string = localStorage.getItem("gotrue.user") ?? "";
    let {
      token: { access_token },
    }: any = JSON.parse(user);
    (async function () {
      let response = await fetch(`/.netlify/functions/entity?left=ObservedProperties&left_uuid=${uuid}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      let result = await response.json();
      setProperty(result.value[0]);
      setMessage(`Found observed property ${uuid}.`)
      console.log("result", result);
    })();
  }, [uuid]);

  return (
    <>
      <h2>
        <Link className={layout.link} href={"/catalog/observed_properties/"}>
          Observed Properties
        </Link>
      </h2>
      <Suspense fallback={<p>Loading...</p>}>
        <p>{message}</p>
        <p>Name: {property.name}</p>
      </Suspense>
    </>
  );
}
