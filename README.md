# mreader

Extract clean Markdown from any URL. Uses [@extractus/article-extractor](https://github.com/nicktomlin/article-extractor) to strip clutter and [Turndown](https://github.com/mixmark-io/turndown) to convert to Markdown.

## Install

```bash
npm install -g mreader
```

## CLI

```bash
# Print article as Markdown
mreader https://example.com/article

# Save to file
mreader https://example.com/article -o article.md

# Output as JSON (title, author, content, excerpt, …)
mreader https://example.com/article -j

# Read HTML from stdin
curl -s https://example.com/article | mreader - --url https://example.com/article
```

## API

```ts
import { read, readFromHtml } from "mreader";

// From URL
const article = await read("https://example.com/article");
console.log(article.title);
console.log(article.content); // clean Markdown

// From HTML string
const article2 = await readFromHtml(html, "https://example.com/article");
```

### `read(url, options?)`

Fetches the URL and returns an `Article` object.

### `readFromHtml(html, url)`

Parses an HTML string and returns an `Article` object.

### `Article`

```ts
interface Article {
  title: string;
  author: string | null;
  content: string; // Markdown
  excerpt: string | null;
  url: string;
}
```

## License

MIT
