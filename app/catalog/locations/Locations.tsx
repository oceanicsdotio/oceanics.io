"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function Locations({}) {
  let [locations, setLocations] = useState(null);
  useEffect(() => {
    let user: string = localStorage.getItem("gotrue.user") ?? "";
    let {
      token: { access_token },
    }: any = JSON.parse(user);
    (async function () {
      let response = await fetch(
        "/.netlify/functions/collection?left=Locations",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );
      let result = await response.json();
      setLocations(result.value);
      console.log("result", result.value);
    })();
  }, []);
  return (
    <div>
      {(locations || []).map((each: any) => {
        console.log(each)
        let href = `/catalog/locations/${each.uuid}`
        return (
          <p key={each.uuid}>
            <Link href={href}>{each.name}</Link>
          </p>
        );
      })}
    </div>
  );
}
