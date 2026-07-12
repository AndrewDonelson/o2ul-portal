/**
 * @file htmx-jsx.d.ts
 * @description JSX typing support for hx-* and data-hx-* attributes.
 */

declare module "react" {
  interface HTMLAttributes<T> {
    [key: `hx-${string}`]: string | number | boolean | null | undefined
    [key: `data-hx-${string}`]: string | number | boolean | null | undefined
  }
}

declare namespace JSX {
  interface IntrinsicAttributes {
    [key: `hx-${string}`]: string | number | boolean | null | undefined
    [key: `data-hx-${string}`]: string | number | boolean | null | undefined
  }
}

export {}
