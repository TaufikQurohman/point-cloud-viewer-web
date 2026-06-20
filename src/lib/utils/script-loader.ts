/**
 * Potree is distributed as a set of classic (non-ES-module) scripts that
 * register globals (`Potree`, `THREE`, `$`, etc.) on `window`. It is not
 * published in a form that bundles cleanly into a Next.js/webpack build,
 * so we load it the same way the official Potree examples do: via plain
 * <script>/<link> tags injected at runtime, sourced from /public/potree/.
 *
 * This module provides small promise-based helpers for that, plus a guard
 * so repeated mounts (e.g. React Strict Mode double-invoking effects)
 * don't inject duplicate tags.
 */

const loadedScripts = new Set<string>();
const loadedStyles = new Set<string>();

export function loadScript(src: string): Promise<void> {
  if (loadedScripts.has(src)) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      loadedScripts.add(src);
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false; // preserve load order for dependent globals
    script.onload = () => {
      loadedScripts.add(src);
      resolve();
    };
    script.onerror = () => {
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.body.appendChild(script);
  });
}

export function loadStylesheet(href: string): Promise<void> {
  if (loadedStyles.has(href)) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLLinkElement>(`link[href="${href}"]`);
    if (existing) {
      loadedStyles.add(href);
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => {
      loadedStyles.add(href);
      resolve();
    };
    link.onerror = () => {
      reject(new Error(`Failed to load stylesheet: ${href}`));
    };
    document.head.appendChild(link);
  });
}

/** Loads an array of scripts sequentially (order matters for globals). */
export async function loadScriptsInOrder(sources: string[]): Promise<void> {
  for (const src of sources) {
    await loadScript(src);
  }
}
