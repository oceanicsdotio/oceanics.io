"use client"
import React, {useEffect, Suspense, useState} from "react"

export default function Things ({}) {
    let [streams, setStreams] = useState(null);
    useEffect(() => {
        let user: string = localStorage.getItem("gotrue.user") ?? "";
        let {
          token: { access_token },
        }: any = JSON.parse(user);
        (async function () {
          let response = await fetch("/.netlify/functions/collection?left=DataStreams", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });
          let result = await response.json();
          setStreams(result);
          console.log("result", result);
        })();
      }, []);
    return (<></>)
}