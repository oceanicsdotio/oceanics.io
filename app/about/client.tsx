"use client";
import React, { useRef, Suspense, useState, useEffect } from "react";
import type { FormEventHandler, ReactNode } from "react";
import style from "@about/page.module.css";
import { useRouter } from "next/navigation";
import ReCAPTCHA from "react-google-recaptcha";

const FORM_NAME = "subscribe";

interface IVerify {
  recaptcha: string;
  email: string;
}

interface ISubscribe {
  children: ReactNode;
  sitekey: string;
  verify: IVerify;
}

const encode = (data: any) => {
  return Object.keys(data)
    .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
    .join("&");
};

interface IVerification {
  success: boolean;
  challenge_ts: string;
  hostname: string;
}

export default function Subscribe({ children, sitekey, verify }: ISubscribe) {
  const email = useRef<HTMLInputElement | null>(null);
  const botField = useRef<HTMLInputElement | null>(null);
  const ref = useRef<ReCAPTCHA>(null);
  const router = useRouter();
  // Uses same nomenclature as the Google API
  const [response, setResponse] = useState<any>(null);
  const [verified, setVerified] = useState<boolean>(false);

  /**
   * Use response from Google API, and pass it through our
   * backend to verify that it is legitimate.
   */
  useEffect(() => {
    if (!ref.current || !response) return;
    (async () => {
      const result = await fetch(verify.recaptcha, {
        method: "POST",
        body: JSON.stringify({ response }),
        headers: {
          "content-type": "application/json",
        },
      });
      const data: IVerification = await result.json();
      setVerified(data.success);
    })();
  }, [response, verify.recaptcha]);

  /**
   * Netlify forms allows a POST TO ANY ROUTE, and will
   * be recognized based on the "form-name" property in
   * a URL encoded body.
   */
  const onSubmit: FormEventHandler = async (event) => {
    event.preventDefault();
    if (!email.current || !botField.current) return;
    const result = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode({
        email: email.current.value,
        "bot-field": botField.current.value,
        "form-name": FORM_NAME,
      }),
    });
    if (result.ok) {
      router.push("/subscribe/check-your-email");
    } else {
      router.push("/subscribe/verify/error");
    }
  };

  return (
    <form
      className={style.form}
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      name={FORM_NAME}
      onSubmit={onSubmit}
    >
      <p className={style.hidden}>
        <label>{"this should be hidden, don't fill it out"}</label>
        <input name="bot-field" ref={botField} />
      </p>
      <label htmlFor="email">
        <code>Email</code>
      </label>
      <input
        className={style.input}
        id="email"
        type="email"
        name="email"
        placeholder="..."
        required
        ref={email}
      />
      {children}
      <button className={style.submit} type="submit" disabled={!verified}>
        Subscribe
      </button>
      <Suspense fallback={<p>Loading ReCAPTCHA...</p>}>
        {/*  @ts-expect-error */}
        <ReCAPTCHA ref={ref} sitekey={sitekey} onChange={setResponse}></ReCAPTCHA>
      </Suspense>
    </form>
  );
}
