"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";

export default function Things({}) {
  /**
   * Node data from API
   */
  let [things, setThings] = useState(null);
  /**
   * Status message
   */
  let [message, setMessage] = useState("Loading...");
  /**
   * Fetch node data
   */
  useEffect(() => {
    let user: string = localStorage.getItem("gotrue.user") ?? "";
    let {
      token: { access_token },
    }: any = JSON.parse(user);
    (async function () {
      let response = await fetch("/.netlify/functions/collection?left=Things", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      let result = await response.json();
      setThings(result.value);
      setMessage(`Found ${result["@iot.count"]} nodes.`)
      console.log("result", result);
    })();
  }, []);
  return (<div><p>{message}</p>{(things??[]).map((each: any)=>{
    let href = `/catalog/things/${each.uuid}`;
    return (<p key={each.uuid}><Link href={href}>{each.name}</Link></p>)
  })}</div>);
}
