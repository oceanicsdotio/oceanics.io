import React, { useState } from "react";
import useWorker from "../../hooks/useWorker";

export interface IAccount {
  server: string
  email?: string
  password?: string
  salt?: string
}

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
  server,
  ...props
}: IAccount) => {

    const [email] = useState(props.email??"");
    const [password] = useState(props.password??"");
    const [salt] = useState(props.salt??"");

    const worker = useWorker("account", createWorker);

    const listener = ({ data }: { data: { data: unknown, type: string}}) => {
      console.log(data)
    }

    const onClick = () => {
      if (!worker.ref.current) return;
      worker.ref.current.addEventListener("message", listener, { passive: true });
      worker.ref.current.postMessage({
        type: "login",
        data: {
          email,
          password,
          salt,
          server
        },
      });
      return () => {
        worker.ref.current?.removeEventListener("message", listener);
        worker.ref.current?.terminate();
      };
    }

    return (
      <button onClick={onClick}>Login</button>
    )
}

Account.displayName = "Account";
export default Account