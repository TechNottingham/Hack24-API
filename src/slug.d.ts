declare module "slug" {
  function s(string: any, opts?: string): string
  function s(string: any, opts?: s.SlugOptions): string

  module s {
    export interface SlugOptions {
      mode?: string
      replacement?: string
      remove?: boolean
      lower?: boolean
      charmap?: { [key: string]: string }
      multicharmap?: { [key: string]: string }
      symbols?: boolean
    }
  }

  export = s
}
