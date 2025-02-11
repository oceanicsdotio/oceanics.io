import { Metadata } from 'next';
 
export const metadata: Metadata = {
  title: 'Oceanics.io | E-mail verification failed',
  description: 'Something about your request does not add up.',
}

export default function Page() {
  return (
    <>
      <h2>Your verification link is invalid or has expired!</h2>
      <p>
        Links only work for 1 hour. Please login again.
      </p>
    </>
  );
}