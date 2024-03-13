import React from "react";
import "./layout.css";
import styles from "@styles/layout.module.css"

export default function RootLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <html lang="en">
        <body>
            <nav>
                <a href={"/"}>Oceanics.io</a>  
            </nav>
            <main className={styles.main}>
              <div className={styles.container}>
                <div className={styles.content}>{children}</div>
              </div>
            </main>
            <footer className={styles.footer}>
                <p>© 2024 Oceanicsdotio LLC</p>
                <p>
                  We love you! Regardless of identity, ability, or belief. That being said, when you arrive we track your user agent, actions, and location. These data are never transmitted, but may be stored on your device. We manage risk with encryption and best security practices.
                </p>
            </footer>
        </body>
      </html>
    )
  }