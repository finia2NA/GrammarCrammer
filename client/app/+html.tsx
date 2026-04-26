import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          #gc-loader {
            position: fixed; inset: 0; z-index: 9999;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 28px;
            background: #FDF0E0;
            opacity: 0;
            animation: gc-loader-in 0.2s ease-in 0.5s forwards;
          }
          @keyframes gc-loader-in { to { opacity: 1; } }
          #gc-loader-wordmark {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 22px; font-weight: 700; letter-spacing: 0.3px;
            color: rgba(28, 20, 16, 0.9);
          }
          #gc-spinner {
            width: 48px; height: 48px; border-radius: 50%;
            border: 3px solid rgba(232, 114, 12, 0.2);
            border-top-color: #E8720C;
            animation: gc-spin 0.9s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          @keyframes gc-spin { to { transform: rotate(360deg); } }
          @media (prefers-color-scheme: dark) {
            #gc-loader { background: #141517; }
            #gc-loader-wordmark { color: rgba(243, 235, 221, 0.9); }
            #gc-spinner { border-color: rgba(240, 120, 24, 0.2); border-top-color: #F07818; }
          }
        ` }} />
      </head>
      <body>
        <div id="gc-loader">
          <div id="gc-loader-wordmark">GrammarCrammer</div>
          <div id="gc-spinner" />
        </div>
        {children}
      </body>
    </html>
  );
}
