import * as slug from 'slug'

export function createEscapedRegex(str: string) {
  const escaped = str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  return new RegExp(escaped, 'i')
}

export function slugify(name: string): string {
  return slug(name, { lower: true })
}
