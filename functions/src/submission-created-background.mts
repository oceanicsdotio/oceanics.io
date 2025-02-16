import {ServerClient} from "postmark"
import type { Context } from "@netlify/functions"
import * as jose from "jose";
/**
 * When we get a form submission, check that an email needs to 
 * be sent to verify the address.
 */
export default async function (req: Request, _context: Context) {
  const {payload: {email}} = await req.json();
  const url = new URL(req.url);
  const secret = new TextEncoder().encode(process.env.JWT_SIGNING_KEY);
  const alg = 'HS256'
  const jwt = await new jose.SignJWT()
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setSubject(email)
    .setIssuer(url.host)
    .setAudience(url.host)
    .setExpirationTime('1h')
    .sign(secret);
  const client = new ServerClient(process.env.POSTMARK_SERVER_API_TOKEN??"");
  const link = `https://${url.host}/verify/?token=${jwt}`;
  await client.sendEmail({
    "From": "no-reply@oceanics.io",
    "To": email,
    "Subject": "Verify your email",
    "TextBody": `Click here to login: ${link}`,
    "MessageStream": "verify-email"
  });
}
