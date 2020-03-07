import React from "react"

import { useIdentityContext } from "react-netlify-identity-widget"

function Main() {
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(false)  // TODO: want two loading for long polling?
  const [imageLoading, setImageLoading] = React.useState(false)  // TODO: want two loading for long polling?
  const [msg, setMsg] = React.useState(null)
  const [dog, setDog] = React.useState(0)
  const { user } = useIdentityContext()
  const [err, setErr] = React.useState("")


  const handleImageClick = e => {
    e.preventDefault()

    setImageLoading(true);
    fetch("/.netlify/functions/token-hider")
      .then(response => response.json())
      .then(json => {
        setImageLoading(false);
        setMsg(json.message);
        setDog(Math.floor(Math.random() * 10));
      })
  }

  const handleClick = e => {
    e.preventDefault()
    setLoading(true)
    fetch("/.netlify/functions/auth-hello", {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer " + user.token.access_token,
      },
    })
      .then(response => response.json())
      .then(json => {
        setLoading(false)
        setData(json)
      });
  }

  return (
    <>
      <h1>Console</h1>
      <ul>
        <li>API: {user.api && user.api.apiURL}</li>
        <li>ID: {user.id}</li>
      </ul>
      <hr />

      <button onClick={handleClick}>
        {loading ? "Loading..." : "Call Auth Lambda Function"}
      </button>
      {err && <pre>{JSON.stringify(err, null, 2)}</pre>}
      <pre>{JSON.stringify(data, null, 2)}</pre>

      <hr />
      <p>
        Function is available at{" "}
        <a href="/.netlify/functions/token-hider">
          <code>/.netlify/functions/token-hider</code>
        </a>{" "}
        and it uses an API_SECRET environment variable.
      </p>
      <button onClick={handleImageClick}>
        {loading ? "Loading..." : "Call Image Lambda Function"}
      </button>
      <br />

      {msg ? (
        <img src={msg[dog]} alt="dog"></img>
      ) : (
        <pre>"Click the button and watch this!"</pre>
      )}
    </>
  )
}

export default Main
