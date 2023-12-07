import React, { useState, useEffect } from "react";
import useWorker from "../../hooks/useWorker";
import type {Listener} from "../../hooks/useWorker";
import Button from "../Form/Button";

export interface IAccount {
  server: string
  email?: string
  password?: string
  salt?: string
  apiKey?: string
}


// Defined in global scope to force Webpack to bundle the script. 
const createWorker = () => 
  new Worker(new URL("./account.worker.ts", import.meta.url), { type: 'module' })

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
 */
const Account = ({
  server,
  ...props
}: IAccount) => {
    // Web worker makes requests in background
    const worker = useWorker(createWorker);

    const [email] = useState(props.email??"");
    const [password] = useState(props.password??"");
    const [salt] = useState(props.salt??"");
    const [apiKey] = useState(props.apiKey??"");

    const listener: Listener = ({ data }) => {
      switch (data.type) {
        case "login":
          console.log(data.type, data.data);
          return;
        case "register":
          console.log(data.type, data.data);
          return;
        default:
          console.log(data.type, data.data);
          return;
      }
    }

    useEffect(() => {
      worker.listen(listener);
    }, []);



    const onLogin = worker.post({
      type: "login",
      data: {
        email,
        password,
        salt,
        server
      },
    });
  
    const onRegister = worker.post({
      type: "register",
      data: {
        email,
        password,
        apiKey,
        server
      },
    });
    
    return (
      <>
        <</>
        <button onClick={onLogin}>Login</button>
        <button onClick={onRegister}>Register</button>
      </>
    )
}

Account.displayName = "Account";
export default Account