"use client";
import React, { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const TOKEN_PARAM = "token";

interface IValidateToken {
  verify: {
    token: string;
  };
}

/**
 * Component validates JWT using a backend service and displays
 * a message to help user understand next steps.
 *
 * The searchParams are only available in the browser (use client),
 * so this must be wrapped in a <Suspense/> in the parent component.
 */
export default function ValidateToken({ verify }: IValidateToken) {
  /**
   * Email links result in GET with query string
   */
  const searchParams = useSearchParams();
  const router = useRouter();

  /**
   * If we get a token query string parameter, try to use the API
   * to verify that it is both a valid JWT and has not expired.
   */
  useEffect(() => {
    if (!searchParams.has(TOKEN_PARAM)) return;
    async function verifyToken() {
      const result = await fetch(verify.token, {
        method: "POST",
        body: JSON.stringify({ token: searchParams.get(TOKEN_PARAM) }),
        headers: {
          "content-type": "application/json",
        },
      });
      try {
        const data = await result.json();
        if (data.success) {
          router.push("/catalog")
        } else {
          router.push("/verify/failure")
        }
      } catch (error) {
        router.push("/verify/error");
      }
      
    }
    verifyToken();
  }, [searchParams]);

  return (
    <>
      <h1>Verifying your email and redirecting...</h1>
      <p>Do not close this page just yet. </p>
    </>
  );
}
