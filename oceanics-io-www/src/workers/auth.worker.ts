const ctx: Worker = self as unknown as Worker;

type IRegister = {
  email: string;
  password: string;
  apiKey: string;
  server: string;
}

/**
 * Create a new account for our API and services.
 */
const register = async ({
  email,
  password,
  apiKey,
  server
}: IRegister): Promise<object> =>
  fetch(`${server}/api/auth`, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey
    },
    body: JSON.stringify({
      username: email,
      password
    })
  })
    .then(response => response.json());

type ILogin = {
  email: string;
  password: string;
  server: string;
}

/**
 * Login and get a JWT.
 */
const login = async ({
  email,
  password,
  server
}: ILogin): Promise<string> =>
  fetch(`${server}/api/auth`, {
    method: "GET",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `${email}:${password}`
    }
  })
    .then(response => response.json())
    .then(({ token = "" }) => token);

/**
 * Listener function
 */
const handleMessage = async ({ data }: MessageEvent) => {
  switch (data.type) {
    case "status":
      ctx.postMessage({
        type: "status",
        data: "ready",
      });
      return;
    case "register":
      ctx.postMessage({
        type: "register",
        data: await register(data.data)
      })
      return;
    case "login":
      ctx.postMessage({
        type: "login",
        data: await login(data.data)
      })
      return;
    default:
      ctx.postMessage({
        type: "error",
        message: "unknown message format",
        data
      });
      return;

  }
}

/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
ctx.addEventListener("message", handleMessage)

export { handleMessage }