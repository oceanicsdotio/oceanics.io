const ctx: Worker = self as unknown as Worker;

interface Auth {
  email: string
  password: string
}
interface IRegister extends Auth {
  apiKey: string
}
interface ILogin extends Auth {
  salt: string
}

/**
 * Create a new account for our API and services.
 */
const register = async ({
  email,
  password,
  apiKey
}: IRegister): Promise<object> => {
  const response = await fetch(`/api/auth`, {
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
  });
  return response.json();
}

/**
 * Login and get a JWT.
 */
const login = async ({
  email,
  password,
  salt
}: ILogin): Promise<string> => {
  const url = `/api/auth`;
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `${btoa(email)}:${btoa(password)}:${btoa(salt)}`
    }
  })
  const {token} = await response.json()
  return token;
}

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

// Trick into being a module and for testing
export { handleMessage }