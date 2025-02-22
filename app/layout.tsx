import React from "react";
import "@app/globals.css";
import styles from "@app/layout.module.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.content}>{children}</div>
          </div>
        </main>
        <footer className={styles.footer}>
          <p>© 2018-25 Oceanicsdotio LLC</p>
          <p>
            Oceanicsdotio LLC is a Rockland Maine business building tools for civilian marine
            operators. We love you, regardless of identity, ability, or belief.
            That said, we do track your user agent, actions, and
            location. These data are not transmitted, but may be stored on
            your device. Providing your email opts you into verification 
            and login features. We do not share your contact information.
          </p>
        </footer>
      </body>
    </html>
  );
}
