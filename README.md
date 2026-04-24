# mreader

Extract clean Markdown from any URL. Prefers server-side Markdown via content negotiation (`Accept: text/markdown`, e.g. [Cloudflare Docs as Markdown](https://developers.cloudflare.com/docs-as-markdown/)), falls back to client-side extraction with [@extractus/article-extractor](https://github.com/nicktomlin/article-extractor) and [Turndown](https://github.com/mixmark-io/turndown).

## Install

```bash
npm install -g mreader
```

## CLI

```bash
# Print article as Markdown (with YAML frontmatter)
mreader https://example.com/article

# Save to file
mreader https://example.com/article -o article.md

# Output as JSON (title, author, content, excerpt, …)
mreader https://example.com/article -j

# Skip YAML frontmatter
mreader https://example.com/article --no-frontmatter

# Skip content negotiation, always extract from HTML
mreader https://example.com/article --no-content-negotiation

# Read HTML from stdin
curl -s https://example.com/article | mreader - --url https://example.com/article
```

### Options

| Flag | Description |
|------|-------------|
| `-o, --output <file>` | Write output to file instead of stdout |
| `-j, --json` | Output as JSON |
| `--no-frontmatter` | Omit YAML frontmatter from output |
| `--no-content-negotiation` | Skip `Accept: text/markdown`, always extract from HTML |
| `--url <url>` | Base URL for stdin mode |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

## Content negotiation

By default mreader sends `Accept: text/markdown` first. If the server responds with `Content-Type: text/markdown`, that response is used directly — no extraction or conversion needed. Otherwise mreader falls back to fetching the HTML and extracting the article client-side.

Use `--no-content-negotiation` (CLI) or `noContentNegotiation: true` (API) to skip this step.

## API

```ts
import { read, readFromHtml, formatArticle } from "mreader";

// From URL
const article = await read("https://example.com/article");
console.log(article.title);
console.log(article.content); // clean Markdown

// From HTML string
const article2 = await readFromHtml(html, "https://example.com/article");

// Format with YAML frontmatter
console.log(formatArticle(article));

// Format without frontmatter
console.log(formatArticle(article, false));
```

### `read(url, options?)`

Fetches the URL and returns an `Article` object.

Options:

```ts
interface ReadOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  noContentNegotiation?: boolean; // skip Accept: text/markdown
}
```

### `readFromHtml(html, url)`

Parses an HTML string and returns an `Article` object.

### `formatArticle(article, frontmatter?)`

Returns the article as a Markdown string, optionally prefixed with YAML frontmatter (default: `true`).

### `Article`

```ts
interface Article {
  title: string;
  author: string | null;
  content: string; // Markdown
  excerpt: string | null;
  published: string | null;
  source: string | null;
  url: string;
}
```

## License

MIT

Made with ❤️ by the [Roman Ožana](https://ozana.cz)
