"use client"
import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from 'next/navigation'
import layout from "@app/layout.module.css";

export default function Page() {
  const path = usePathname()
  const uuid = path.split("/").filter(some => some).pop();
  const [location, setLocation] = useState<any>({});
  const [message, setMessage] = useState(`Querying ${uuid}...`)
  useEffect(() => {
    let user: string = localStorage.getItem("gotrue.user") ?? "";
    let {
      token: { access_token },
    }: any = JSON.parse(user);
    (async function () {
      let response = await fetch(`/.netlify/functions/entity?left=Locations&left_uuid=${uuid}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      let result = await response.json();
      setLocation(result.value[0]);
      setMessage(`Found location ${uuid}.`)
      console.log("result", result);
    })();
  }, [uuid]);

  return (
    <>
      <h2>
        <Link className={layout.link} href={"/catalog/locations/"}>
          Locations
        </Link>
      </h2>
      <Suspense fallback={<p>Loading...</p>}>
        <p>{message}</p>
        <p>Name: {location.name}</p>
      </Suspense>
    </>
  );
}
