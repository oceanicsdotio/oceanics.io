import React from "react";

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
            <main>
                {children}
            </main>
            <footer>
                <hr/>
                We love you! Regardless of identity, ability, or belief. That being said, when you arrive we track your user agent, actions, and location. These data are never transmitted, but may be stored on your device. We manage risk with encryption and best security practices.
            </footer>
        </body>
      </html>
    )
  }