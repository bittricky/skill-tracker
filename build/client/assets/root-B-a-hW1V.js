import{A as e,C as t,a as n,c as r,d as i,f as a,j as o,o as s,t as c}from"./jsx-runtime-BfXYA3f6.js";var l=c(),u=()=>[{rel:`preconnect`,href:`https://fonts.googleapis.com`},{rel:`preconnect`,href:`https://fonts.gstatic.com`,crossOrigin:`anonymous`},{rel:`stylesheet`,href:`https://fonts.googleapis.com/css2?family=VT323&family=JetBrains+Mono:wght@400;500;600;700&display=swap`},{rel:`stylesheet`,href:`https://pixelarticons.com/free/icons.css`},{rel:`manifest`,href:`/manifest.webmanifest`},{rel:`icon`,href:`/icon.svg`,type:`image/svg+xml`},{rel:`apple-touch-icon`,href:`/icon.svg`}],d=`
  (function() {
    const key = "skill-tracker-theme";
    let theme = localStorage.getItem(key);
    if (!theme) {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", theme);
  })();
`,f=`
  (function() {
    if (!("serviceWorker" in navigator)) return;
    if (location.hostname === "localhost" && location.port && location.port !== "") {
      // Dev server: skip registration, and unregister any existing SW so
      // HMR isn't served from a stale cache.
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        regs.forEach(function(r) { r.unregister(); });
      });
      return;
    }
    window.addEventListener("load", function() {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function() {});
    });
  })();
`;function p({children:e}){return(0,l.jsxs)(`html`,{lang:`en`,"data-theme":`dark`,suppressHydrationWarning:!0,children:[(0,l.jsxs)(`head`,{children:[(0,l.jsx)(`meta`,{charSet:`utf-8`}),(0,l.jsx)(`meta`,{name:`viewport`,content:`width=device-width, initial-scale=1`}),(0,l.jsx)(`meta`,{name:`theme-color`,content:`#1c2030`,media:`(prefers-color-scheme: dark)`}),(0,l.jsx)(`meta`,{name:`theme-color`,content:`#f3efe6`,media:`(prefers-color-scheme: light)`}),(0,l.jsx)(`meta`,{name:`apple-mobile-web-app-capable`,content:`yes`}),(0,l.jsx)(`meta`,{name:`apple-mobile-web-app-status-bar-style`,content:`black-translucent`}),(0,l.jsx)(`meta`,{name:`apple-mobile-web-app-title`,content:`Skill Tracker`}),(0,l.jsx)(`script`,{dangerouslySetInnerHTML:{__html:d}}),(0,l.jsx)(s,{}),(0,l.jsx)(n,{})]}),(0,l.jsxs)(`body`,{children:[e,(0,l.jsx)(a,{}),(0,l.jsx)(i,{}),(0,l.jsx)(`script`,{dangerouslySetInnerHTML:{__html:f}})]})]})}var m=e(function(){return(0,l.jsx)(r,{})}),h=o(function({error:e}){let n=`Oops!`,r=`An unexpected error occurred.`;return t(e)&&(n=e.status===404?`404`:`Error`,r=e.status===404?`The requested page could not be found.`:e.statusText||r),(0,l.jsx)(`main`,{className:`min-h-screen flex items-center justify-center p-6`,style:{background:`var(--color-surface-bg)`},children:(0,l.jsxs)(`div`,{className:`w-full max-w-xl rounded-xl p-6`,style:{background:`var(--color-surface-panel)`,border:`1px solid var(--color-surface-border)`,boxShadow:`var(--shadow-raised)`},children:[(0,l.jsx)(`div`,{className:`font-display text-[40px] font-bold leading-none tracking-[0.04em]`,style:{color:`var(--color-accent-coral)`},children:n}),(0,l.jsx)(`p`,{className:`mt-2 text-sm`,style:{color:`var(--color-ink-muted)`},children:r}),(0,l.jsx)(`a`,{href:`/`,className:`inline-block mt-4 text-xs font-display uppercase tracking-[0.08em] hover:underline`,style:{color:`var(--color-accent-mustard)`},children:`← Back to dashboard`}),void 0]})})});export{h as ErrorBoundary,p as Layout,m as default,u as links};