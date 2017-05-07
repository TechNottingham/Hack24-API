export function createEscapedRegex(str: string) {
  const escaped = str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  return new RegExp(escaped, 'i')
}
