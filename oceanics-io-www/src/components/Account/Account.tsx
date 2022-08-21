import React, { useState, useEffect } from "react";
import useWorker from "../../hooks/useWorker";



// This has to be defined in global scope to force Webpack to bundle the script. 
const createWorker = () => 
  new Worker(new URL("../../workers/account.worker.ts", import.meta.url), { type: 'module' })

/**
 * Account is a page-level component. 
 * 
 * If we have information that indicates the user has 
 * registered previously, we want to render
 * a login interface. 
 * 
 * If the user is logged in already, we can try to get 
 * account data and render that. 
 * 
 * Otherwise, assume that they need to create an account.
 * 
 */
const Account = ({
  server
}: {
  server: string
}) => {
    const [registered, setRegistered] = useState(false);
    const [loggedIn, setLoggedIn] = useState(false);

    const worker = useWorker("account", createWorker);

    const listener = ({ data }: any) => {
      console.log(data)
    }

    const onClick = () => {
      if (!worker.ref.current) return;
      worker.ref.current.addEventListener("message", listener, { passive: true });
      worker.ref.current.postMessage({
        type: "login",
        data: {
          email: "",
          password: "",
          server
        },
      });
      return () => {
        worker.ref.current?.removeEventListener("message", listener);
        worker.ref.current?.terminate();
      };
    }

    return <button onClick={onClick}>Login</button>
}

export default Account