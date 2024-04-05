"use client"
import React, {useEffect, useState} from "react"

export default function Sensors ({}) {
    let [sensors, setSensors] = useState(null);
    useEffect(() => {
        let user: string = localStorage.getItem("gotrue.user") ?? "";
        let {
          token: { access_token },
        }: any = JSON.parse(user);
        (async function () {
          let response = await fetch("/.netlify/functions/collection?left=Sensors", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });
          let result = await response.json();
          setSensors(result);
          console.log("result", result);
        })();
      }, []);
    return (<></>)
}