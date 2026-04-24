import { extract, extractFromHtml as _extractFromHtml } from "@extractus/article-extractor";
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
	/** Include YAML frontmatter with metadata (default: true) */
	frontmatter?: boolean;
}

const DEFAULT_UA =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const td = new TurndownService({
	headingStyle: "atx",
	codeBlockStyle: "fenced",
	bulletListMarker: "-",
});

function formatFrontmatter(article: Article): string {
	const lines: string[] = ["---"];
	lines.push(`title: "${article.title.replace(/"/g, '\\"')}"`);
	if (article.author) lines.push(`author: "${article.author.replace(/"/g, '\\"')}"`);
	if (article.published) lines.push(`published: "${article.published}"`);
	if (article.excerpt) lines.push(`description: "${article.excerpt.replace(/"/g, '\\"')}"`);
	if (article.source) lines.push(`source: "${article.source}"`);
	lines.push(`url: "${article.url}"`);
	lines.push("---");
	return lines.join("\n");
}

/** Format article as markdown string, optionally with YAML frontmatter. */
export function formatArticle(article: Article, frontmatter = true): string {
	if (!frontmatter) return article.content;
	return `${formatFrontmatter(article)}\n\n${article.content}`;
}

function toArticle(raw: NonNullable<Awaited<ReturnType<typeof extract>>>, url: string): Article {
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
 * Try fetching markdown directly via Accept: text/markdown (Cloudflare Markdown for Agents).
 * Returns the markdown string if the server supports it, null otherwise.
 */
async function fetchMarkdown(
	url: string,
	options: ReadOptions = {},
): Promise<string | null> {
	const response = await fetch(url, {
		headers: {
			accept: "text/markdown",
			"user-agent": DEFAULT_UA,
			...options.headers,
		},
		signal: options.signal,
	});

	if (!response.ok) return null;

	const contentType = response.headers.get("content-type") ?? "";
	if (!contentType.includes("text/markdown")) return null;

	return response.text();
}

/**
 * Extract article content from a URL and return clean Markdown.
 *
 * Prefers server-side markdown (Accept: text/markdown) when available,
 * falls back to client-side extraction with @extractus/article-extractor.
 */
export async function read(
	url: string,
	options: ReadOptions = {},
): Promise<Article> {
	// Try Cloudflare Markdown for Agents first
	const markdown = await fetchMarkdown(url, options).catch(() => null);

	if (markdown) {
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

	// Fallback to article extraction
	const article = await extract(url, {}, {
		headers: {
			"user-agent": DEFAULT_UA,
			...options.headers,
		},
		signal: options.signal,
	});

	if (!article) {
		throw new Error(`Failed to extract article from ${url}`);
	}

	return toArticle(article, url);
}

/**
 * Extract article content from HTML string and return clean Markdown.
 */
export async function readFromHtml(html: string, url: string): Promise<Article> {
	const article = await _extractFromHtml(html, url);

	if (!article) {
		throw new Error(`Failed to extract article from ${url}`);
	}

	return toArticle(article, url);
}
