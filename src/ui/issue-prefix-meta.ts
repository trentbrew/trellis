import { issuePrefixSet } from '../vcs/issue-prefix.js';

/**
 * Inject the configured issue-id prefix into served admin HTML as a
 * `<meta name="trellis:issue-prefix" content="...">` tag so the browser
 * bundles (admin-datatable) can validate/canonicalize custom-prefix issue
 * refs without reading `.trellis/config.json`.
 *
 * Idempotent — returns `html` untouched if the tag already exists.
 */
export function injectIssuePrefixMeta(html: string, rootPath: string): string {
  if (html.includes('name="trellis:issue-prefix"')) return html;

  const set = issuePrefixSet(rootPath);
  const prefix = set[set.length - 1] ?? 'TRL';
  const meta = `<meta name="trellis:issue-prefix" content="${prefix}">\n`;

  if (html.includes('</head>')) {
    return html.replace('</head>', `${meta}</head>`);
  }
  return `${meta}${html}`;
}
