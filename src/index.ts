import { extractFromHtml as _extractFromHtml } from "@extractus/article-extractor";
import TurndownService from "turndown";

export interface Article {
	title: string;
	author: string | null;
	content: string;
	excerpt: string | null;
	published: string | null;
	source: string | null;
	url: string;
}

export interface ReadOptions {
	headers?: Record<string, string>;
	signal?: AbortSignal;
	/** Skip Accept: text/markdown content negotiation (default: false) */
	noContentNegotiation?: boolean;
	/** Request timeout in milliseconds (default: 30000) */
	timeout?: number;
}

const DEFAULT_UA =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const DEFAULT_TIMEOUT = 30_000;

const td = new TurndownService({
	headingStyle: "atx",
	codeBlockStyle: "fenced",
	bulletListMarker: "-",
});

/** Escape a string for safe use as a YAML double-quoted value. */
function yamlEscape(value: string): string {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "\\r")
		.replace(/\t/g, "\\t");
}

function formatFrontmatter(article: Article): string {
	const lines: string[] = ["---"];
	lines.push(`title: "${yamlEscape(article.title)}"`);
	if (article.author) lines.push(`author: "${yamlEscape(article.author)}"`);
	if (article.published) lines.push(`published: "${article.published}"`);
	if (article.excerpt)
		lines.push(`description: "${yamlEscape(article.excerpt)}"`);
	if (article.source) lines.push(`source: "${yamlEscape(article.source)}"`);
	lines.push(`url: "${yamlEscape(article.url)}"`);
	lines.push("---");
	return lines.join("\n");
}

/** Format article as markdown string, optionally with YAML frontmatter. */
export function formatArticle(article: Article, frontmatter = true): string {
	if (!frontmatter) return article.content;
	return `${formatFrontmatter(article)}\n\n${article.content}`;
}

function toArticle(
	raw: NonNullable<Awaited<ReturnType<typeof _extractFromHtml>>>,
	url: string,
): Article {
	return {
		title: raw.title ?? "",
		author: raw.author ?? null,
		content: raw.content ? td.turndown(raw.content) : "",
		excerpt: raw.description ?? null,
		published: raw.published ?? null,
		source: raw.source ?? null,
		url: raw.url ?? url,
	};
}

/**
 * Extract article content from a URL and return clean Markdown.
 *
 * Sends a single request. When content negotiation is enabled (default),
 * requests text/markdown with text/html fallback. If the server returns
 * markdown, it's used directly. Otherwise the HTML body is extracted client-side.
 */
export async function read(
	url: string,
	options: ReadOptions = {},
): Promise<Article> {
	// Validate URL
	try {
		new URL(url);
	} catch {
		throw new Error(`Invalid URL: ${url}`);
	}

	const timeout = options.timeout ?? DEFAULT_TIMEOUT;
	const signal = options.signal ?? AbortSignal.timeout(timeout);

	const accept = options.noContentNegotiation
		? "text/html, */*;q=0.1"
		: "text/markdown, text/html;q=0.9, */*;q=0.1";

	const response = await fetch(url, {
		headers: {
			accept,
			"user-agent": DEFAULT_UA,
			...options.headers,
		},
		signal,
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status} fetching ${url}`);
	}

	const contentType = response.headers.get("content-type") ?? "";

	// Server supports markdown — use directly
	if (!options.noContentNegotiation && contentType.includes("text/markdown")) {
		const markdown = await response.text();
		const titleMatch = markdown.match(/^#\s+(.+)$/m);
		return {
			title: titleMatch?.[1] ?? "",
			author: null,
			content: markdown,
			excerpt: null,
			published: null,
			source: null,
			url,
		};
	}

	// Extract from HTML response (single fetch — no second request)
	const html = await response.text();
	const article = await _extractFromHtml(html, url);

	if (!article) {
		throw new Error(`Failed to extract article from ${url}`);
	}

	return toArticle(article, url);
}

/**
 * Extract article content from HTML string and return clean Markdown.
 */
export async function readFromHtml(
	html: string,
	url: string,
): Promise<Article> {
	const article = await _extractFromHtml(html, url);

	if (!article) {
		throw new Error(`Failed to extract article from ${url}`);
	}

	return toArticle(article, url);
}
