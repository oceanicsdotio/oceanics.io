"use client";
import React, { useEffect, useState, useRef, Suspense } from "react";
import type { MiniMap } from "@oceanics/app";
import page from "@app/page.module.css";
import layout from "@app/layout.module.css";
import icons from "@app/oceanics.json";
import type { FormEventHandler, ReactNode } from "react";
import { useRouter } from "next/navigation";
import ReCAPTCHA from "react-google-recaptcha";

const FORM_NAME = "subscribe";
const SPRITE_SIZE = 32.0;

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
  const email = useRef<HTMLInputElement>(null);
  const botField = useRef<HTMLInputElement>(null);
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
      className={page.form}
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      name={FORM_NAME}
      onSubmit={onSubmit}
    >
      <p className={page.hidden}>
        <label>{"this should be hidden, don't fill it out"}</label>
        <input name="bot-field" ref={botField} />
      </p>
      <label htmlFor="email">
        <code>Email</code>
      </label>
      <input
        className={page.input}
        id="email"
        type="email"
        name="email"
        placeholder="..."
        required
        ref={email}
      />
      {children}
      <button className={layout.submit} type="submit" disabled={!verified}>
        Submit
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
  const board = useRef<HTMLCanvasElement>(null);
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
    const canvas = board.current;
    if (!canvas) return;
    const target = canvas.getContext("2d");
    if (!target) return;
    const [width, _] = ["width", "height"].map(
      (dim: string) =>
        parseInt(getComputedStyle(canvas).getPropertyValue(dim).slice(0, -2)) *
        window.devicePixelRatio
    );
    const trueGrid = Math.floor(width / SPRITE_SIZE);
    // const trueGrid = Math.min(computedGrid, gridSize);
    (async function () {
      const { MiniMap } = await import("@oceanics/app");
      setInteractive({
        target,
        map: new MiniMap(trueGrid, icons)
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
        SPRITE_SIZE,
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
    <div className={page.oceanside}>
      <canvas ref={board} className={page.board} />
    </div>
  );
}
