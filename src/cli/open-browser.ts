/**
 * Open a URL in the system browser, reusing an existing tab on the same
 * local origin when possible (macOS Chrome-family + Safari).
 *
 * Plain `open` / `xdg-open` always spawn a new tab — painful when `trellis
 * admin` / `lane watch` restart during a pipeline.
 */

import { exec, execFile } from 'child_process';

/** Chromium-family apps that expose tab URL via AppleScript. */
const CHROMIUM_APPS = [
  'Google Chrome',
  'Chromium',
  'Brave Browser',
  'Arc',
  'Microsoft Edge',
  'Dia',
  'Vivaldi',
] as const;

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function localOriginKeys(url: string): { port: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]' && host !== '::1') {
    return null;
  }
  const port =
    parsed.port ||
    (parsed.protocol === 'https:' ? '443' : parsed.protocol === 'http:' ? '80' : '');
  if (!port) return null;
  // Match either loopback spelling so admin (127.0.0.1) and lane watch (localhost) share a tab.
  return { port };
}

/**
 * Single AppleScript: among running Chromium apps + Safari, find a loopback
 * tab on `port` and navigate it to `url`. Never launches a browser (process
 * must already exist).
 */
function reuseTabScript(chromiumApps: readonly string[]): string {
  const appList = chromiumApps.map((a) => `"${a}"`).join(', ');
  return `
on run argv
  set targetURL to item 1 of argv
  set portStr to item 2 of argv
  set chromiumApps to {${appList}}

  tell application "System Events"
    set procs to name of every process
  end tell

  repeat with appName in chromiumApps
    if procs contains (appName as text) then
      try
        tell application appName
          if not (exists window 1) then
            -- skip
          else
            repeat with w in windows
              set i to 0
              repeat with t in tabs of w
                set i to i + 1
                set tabURL to URL of t
                if tabURL contains (":" & portStr) then
                  if tabURL contains "localhost" or tabURL contains "127.0.0.1" then
                    set URL of t to targetURL
                    set active tab index of w to i
                    set index of w to 1
                    activate
                    return "hit"
                  end if
                end if
              end repeat
            end repeat
          end if
        end tell
      end try
    end if
  end repeat

  if procs contains "Safari" then
    try
      tell application "Safari"
        if (exists window 1) then
          repeat with w in windows
            repeat with t in tabs of w
              set tabURL to URL of t
              if tabURL contains (":" & portStr) then
                if tabURL contains "localhost" or tabURL contains "127.0.0.1" then
                  set URL of t to targetURL
                  set current tab of w to t
                  set index of w to 1
                  activate
                  return "hit"
                end if
              end if
            end repeat
          end repeat
        end if
      end tell
    end try
  end if

  return "miss"
end run
`;
}

function tryReuseTab(url: string, port: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(
      'osascript',
      ['-e', reuseTabScript(CHROMIUM_APPS), url, port],
      { timeout: 5000 },
      (err, stdout) => {
        if (err) {
          resolve(false);
          return;
        }
        resolve(String(stdout).trim() === 'hit');
      },
    );
  });
}

function fallbackOpen(url: string): void {
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open';
  // win32 `start` needs an empty title arg when the URL is quoted
  if (process.platform === 'win32') {
    exec(`start "" ${shellQuote(url)}`);
    return;
  }
  exec(`${cmd} ${shellQuote(url)}`);
}

/**
 * Open `url` in the default browser. On macOS, if a Chromium or Safari tab is
 * already on the same loopback host:port, navigate/reload that tab instead of
 * spawning another.
 */
export function openBrowser(url: string): void {
  const keys = process.platform === 'darwin' ? localOriginKeys(url) : null;
  if (!keys) {
    fallbackOpen(url);
    return;
  }

  void tryReuseTab(url, keys.port).then((hit) => {
    if (!hit) fallbackOpen(url);
  });
}
