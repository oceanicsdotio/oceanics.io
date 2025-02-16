"use client";
import React, { useEffect, useState, useRef, Suspense } from "react";
import type { MiniMap } from "@oceanics/app";
import style from "@app/page.module.css";
import icons from "@app/oceanics.json";
import type { FormEventHandler, ReactNode } from "react";
import { useRouter } from "next/navigation";
import ReCAPTCHA from "react-google-recaptcha";

const FORM_NAME = "subscribe";

interface IVerify {
  recaptcha: string;
  email: string;
}

interface ISubscribe {
  children?: ReactNode;
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

export function Subscribe({ children, sitekey, verify }: ISubscribe) {
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
      router.push("/verify/email");
    } else {
      router.push("/verify/error");
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
        Login
      </button>
      <Suspense fallback={<p>Loading ReCAPTCHA...</p>}>
        {/*  @ts-expect-error */}
        <ReCAPTCHA ref={ref} sitekey={sitekey} onChange={setResponse}></ReCAPTCHA>
      </Suspense>
    </form>
  );
}

/**
 * Main page animation. This is extracted as a component
 * not for reuse purposes, but to provide a Suspense 
 * boundary so that the main page can be statically 
 * rendered.
 * 
 * The animation parameters are dimensionless.
 */
export function Oceanics({
  gridSize,
  backgroundColor,
  timeConstant,
  frameConstant,
  amplitude,
  phase
}: {
  /**
   * Integer height and width of grid. Because of
   * the diamond orientation of the cells, in the 
   * isometric view, this results in a field that
   * is about twice as wide as it is tall.
   */
  gridSize: number
  /**
   * Animation loop blending color. This must
   * be a valid rgba or hex color, and may
   * have an alpha channel defined.
   */
  backgroundColor: `#${string}`
  /**
   * Speed of tidal/wave animation. This is not
   * meant to be realistic.
   */
  timeConstant: number
  /**
   * Speed of the sprite keyframe animation. This
   * is applied to all sprites uniformly. Each sprite
   * can have different number of frames, based on the
   * width of the sprite sheet used for the animation.
   * Therefore the animation loop depends on the sprite
   * source and this constant.
   */
  frameConstant: number
  /**
   * Amplitude of vertical displacement in animation.
   * Increasing this too much causes discontinuities
   * in the surface.
   */
  amplitude: number
  /**
   * Phase multiplier to increase number of periods
   * in the animation.
   */
  phase: number
}) {
  /**
   * Ref for isometric view render target.
   */
  const board = useRef<HTMLCanvasElement | null>(null);
  /**
   * Interactive elements handled in Rust/Wasm.
   */
  const [interactive, setInteractive] = useState<{
    /**
     * Data and rendering container
     */
    map: MiniMap;
    /**
     * Canvas context to draw to
     */
    target: CanvasRenderingContext2D;
  } | null>(null);
  /**
   * Load wasm runtime asynchronously if we have a
   * valid rendering target.
   */
  useEffect(() => {
    if (!board.current) return;
    const target = board.current.getContext("2d");
    if (!target) return;
    (async function () {
      const { MiniMap } = await import("@oceanics/app");
      setInteractive({
        target,
        map: new MiniMap(gridSize, icons)
      });
    })();
  }, [gridSize, board]);
  /**
   * Draw the visible area to the board canvas using the
   * tile set object. This is the main animation loop
   */
  useEffect(() => {
    if (!board.current || !interactive) return;
    let requestId: number | null = null;
    let canvas = board.current;
    const spriteSize = 32.0;
    interactive.target.imageSmoothingEnabled = false;
    (function render() {
      [canvas.width, canvas.height] = ["width", "height"].map(
        (dim: string) =>
          parseInt(getComputedStyle(canvas).getPropertyValue(dim).slice(0, -2)) *
          window.devicePixelRatio
      );
      interactive.map.draw(
        interactive.target,
        performance.now(),
        board.current.width,
        board.current.height,
        backgroundColor,
        spriteSize,
        timeConstant,
        frameConstant,
        amplitude,
        phase
      );
      requestId = requestAnimationFrame(render);
    })();
    return () => {
      if (requestId) cancelAnimationFrame(requestId);
    };
  }, [
    interactive,
    backgroundColor,
    gridSize,
    board,
    frameConstant,
    timeConstant,
    amplitude,
    phase
  ]);
  return (
    <div className={style.oceanside}>
      <canvas ref={board} className={style.board} />
    </div>
  );
}
