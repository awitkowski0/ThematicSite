import blogData from '../data/blog.generated.json'

export interface BlogPost {
  version: string
  date: string
  content: string
}

export const blogPosts = blogData as BlogPost[] // already newest-first from export-blog.ts

export function getBlogPost(version: string): BlogPost | undefined {
  return blogPosts.find((p) => p.version === version)
}

// The changelog's own convention uses bracketed section labels ("[CONTENT]", "[FIXES]") —
// promote those to real markdown headers so they render as more than a plain paragraph.
export function formatChangelogMarkdown(content: string): string {
  return content.replace(/^\[([A-Z0-9 /]+)\]$/gm, '### $1')
}
