"use client";
import React, { useEffect, useState } from "react";
/**
 * Display an index of all or some subset of the
 * available Features of Interest in the database.
 */
export default function FeaturesOfInterest({}) {
  /**
   * Array of node data.
   */
  let [features, setFeatures] = useState<any>(null);
  /**
   * Summary message displaying load state.
   */
  let [message, setMessage] = useState("Loading...");
  /**
   * If user is logged in, user their JWT to fetch features
   * of interest from the API.
   */
  useEffect(() => {
    let user: string = localStorage.getItem("gotrue.user") ?? "";
    let {
      token: { access_token },
    }: any = JSON.parse(user);
    (async function () {
      let response = await fetch(
        "/.netlify/functions/collection?left=FeaturesOfInterest",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );
      let result = await response.json();
      setFeatures(result.value);
      setMessage(`Found ${result["@iot.count"]} nodes:`);
    })();
  }, []);
  return (
    <div>
      <p>{message}</p>
      {(features ?? []).map((each: { uuid: string; name: string }) => (
        <p key={each.uuid}>{each.name}</p>
      ))}
    </div>
  );
}
