"use client"
import React, {useEffect, useState} from "react";
import Link from "next/link";

export default function ObservedProperties ({}) {
    let [properties, setProperties] = useState(null);
    let [message, setMessage] = useState("Loading...");
    useEffect(() => {
        let user: string = localStorage.getItem("gotrue.user") ?? "";
        let {
          token: { access_token },
        }: any = JSON.parse(user);
        (async function () {
          let response = await fetch("/.netlify/functions/collection?left=ObservedProperties", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });
          let result = await response.json();
          setProperties(result.value);
          setMessage(`Found ${result["@iot.count"]} nodes.`)
          console.log("result", result.value);
        })();
      }, []);
    return (<div>{
      (properties||[]).map((each: any)=>{
        let href = `/catalog/observed_properties/${each.uuid}`;
        return (<p key={each.uuid}><Link href={href}>{each.name}</Link></p>)
      })
      }</div>)
}