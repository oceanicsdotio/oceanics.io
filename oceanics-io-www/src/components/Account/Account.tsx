import React, { useEffect } from "react";
import useWorker from "../../hooks/useWorker";
import Form from "../Form/Form";
import type { FieldType } from "../Form/Form";

export interface IAccount {
  exists: boolean
  name: string
}

// Defined in global scope to force Webpack to bundle the script. 
const createWorker = () => 
  new Worker(
    new URL("./Account.worker.ts", import.meta.url), 
    { type: 'module' }
  );

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
const Account = ({exists, name}: IAccount) => {
  // Web worker makes requests in background
  const worker = useWorker(createWorker);

  // Toggle between views
  const view = exists ? "login" : "register";

  // Form fields for rendering and validation
  const fields: FieldType[] = [{
    id: "email",
    type: "email",
    placeholder: "your email address",
    required: true
  }, {
    id: "password",
    type: "password",
    placeholder: "****************",
    minLength: 16,
    maxLength: 64,
    required: true
  }, exists ? {
    id: "secret",
    type: "text",
    placeholder: "additional encryption key",
    minLength: 8,
    maxLength: 16,
    required: true
  } : {
    id: "apiKey",
    type: "text",
    placeholder: "your provider API key",
    minLength: 16,
    maxLength: 64,
    required: true
  }, {
    id: "type",
    type: "submit",
    value: view
  }];

  // Start listening to worker messages
  useEffect(() => {
    return worker.listen(({ data }) => {
      switch (data.type) {
        case view:
          console.log(data.type, data.data);
          return;
        case "error":
          console.error(data.type, data.data);
          return
        default:
          return;
      }
    });
  }, []);

  // Post to worker on form submit
  const action = (data: FormData) => {
    const {type, ...props} = Object.fromEntries(data.entries());
    worker.post({
      type: type.toString(),
      data: props
    });
  }
  return <Form id={view} name={name} fields={fields} action={action}/>
}

Account.displayName = "Account";
export default Account