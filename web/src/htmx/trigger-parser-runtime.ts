/**
 * @file trigger-parser-runtime.ts
 * @description Trigger specification parser runtime extracted from htmx.ts.
 */

import type {
  ConditionalFunction,
  HtmxTriggerSpecification,
  HtmxTriggerModifierContext,
  HtmxTriggerModifierParser
} from "../htmx.js"

export interface TriggerParserRuntimeDeps {
  getAttributeValue: (elt: Node, qualifiedName: string) => string | null
  matches: (elt: Node, selector: string) => boolean
  parseInterval: (str: string | undefined) => number | undefined
  maybeEval: <T>(elt: EventTarget | string, toEval: () => T, defaultVal?: T) => T | undefined
  triggerErrorEvent: (elt: EventTarget | string, eventName: string, detail?: Record<string, unknown>) => void
  getDocument: () => Document
  triggerSpecsCache: () => Record<string, HtmxTriggerSpecification[]> | null
  getCustomParser: (token: string) => HtmxTriggerModifierParser | undefined
}

export interface TriggerParserRuntime {
  getTriggerSpecs: (elt: Element) => HtmxTriggerSpecification[]
}

const WHITESPACE_OR_COMMA = /[\s,]/
const SYMBOL_START = /[_$a-zA-Z]/
const SYMBOL_CONT = /[_$a-zA-Z0-9]/
const STRINGISH_START = ['"', "'", '/']
const NOT_WHITESPACE = /[^\s]/
const COMBINED_SELECTOR_START = /[{(]/
const COMBINED_SELECTOR_END = /[})]/

function tokenizeString(str: string): string[] {
  const tokens: string[] = []
  let position = 0
  while (position < str.length) {
    if (SYMBOL_START.exec(str.charAt(position))) {
      const startPosition = position
      while (SYMBOL_CONT.exec(str.charAt(position + 1))) {
        position++
      }
      tokens.push(str.substring(startPosition, position + 1))
    } else if (STRINGISH_START.indexOf(str.charAt(position)) !== -1) {
      const startChar = str.charAt(position)
      const startPosition = position
      position++
      while (position < str.length && str.charAt(position) !== startChar) {
        if (str.charAt(position) === "\\") {
          position++
        }
        position++
      }
      tokens.push(str.substring(startPosition, position + 1))
    } else {
      tokens.push(str.charAt(position))
    }
    position++
  }
  return tokens
}

function isPossibleRelativeReference(token: string, last: string | null, paramName: string): boolean {
  return !!SYMBOL_START.exec(token.charAt(0)) &&
    token !== "true" &&
    token !== "false" &&
    token !== "this" &&
    token !== paramName &&
    last !== "."
}

function peekToken(tokens: string[]): string | undefined {
  return tokens[0]
}

function consumeUntil(tokens: string[], match: RegExp): string {
  let result = ""
  while (tokens.length > 0) {
    const nextToken = tokens[0]
    if (nextToken === undefined || match.test(nextToken)) {
      break
    }
    result += tokens.shift()
  }
  return result
}

function consumeCSSSelector(tokens: string[]): string {
  let result: string
  const firstToken = tokens[0]
  if (firstToken !== undefined && COMBINED_SELECTOR_START.test(firstToken)) {
    tokens.shift()
    result = consumeUntil(tokens, COMBINED_SELECTOR_END).trim()
    tokens.shift()
  } else {
    result = consumeUntil(tokens, WHITESPACE_OR_COMMA)
  }
  return result
}

export function createTriggerParserRuntime(deps: TriggerParserRuntimeDeps): TriggerParserRuntime {
  function maybeGenerateConditional(elt: EventTarget, tokens: string[], paramName: string): ConditionalFunction | null {
    if (peekToken(tokens) === "[") {
      tokens.shift()
      let bracketCount = 1
      let conditionalSource = " return (function(" + paramName + "){ return ("
      let last: string | undefined | null = null
      while (tokens.length > 0) {
        const token: string = peekToken(tokens)!
        if (token === "]") {
          bracketCount--
          if (bracketCount === 0) {
            if (last === null) {
              conditionalSource = conditionalSource + "true"
            }
            tokens.shift()
            conditionalSource += ")})"
            try {
              const fallback = function() { return true } as unknown as ConditionalFunction
              const conditionFunction = deps.maybeEval<ConditionalFunction>(elt, function() {
                return (Function(conditionalSource) as unknown as () => ConditionalFunction)()
              }, fallback)!
              conditionFunction.source = conditionalSource
              return conditionFunction
            } catch (e) {
              deps.triggerErrorEvent(deps.getDocument().body, "htmx:syntax:error", { error: e, source: conditionalSource })
              return null
            }
          }
        } else if (token === "[") {
          bracketCount++
        }

        if (isPossibleRelativeReference(token, last ?? null, paramName)) {
          conditionalSource += "((" + paramName + "." + token + ") ? (" + paramName + "." + token + ") : (window." + token + "))"
        } else {
          conditionalSource = conditionalSource + token
        }
        last = tokens.shift()
      }
    }
    return null
  }

  function parseAndCacheTrigger(elt: Element, explicitTrigger: string, cache: Record<string, HtmxTriggerSpecification[]> | null): HtmxTriggerSpecification[] {
    const triggerSpecs: HtmxTriggerSpecification[] = []
    const tokens = tokenizeString(explicitTrigger)
    do {
      consumeUntil(tokens, NOT_WHITESPACE)
      const initialLength = tokens.length
      const trigger = consumeUntil(tokens, /[,\[\s]/)
      if (trigger !== "") {
        if (trigger === "every") {
          const every: HtmxTriggerSpecification = { trigger: "every" }
          consumeUntil(tokens, NOT_WHITESPACE)
          every.pollInterval = deps.parseInterval(consumeUntil(tokens, /[,\[\s]/))
          consumeUntil(tokens, NOT_WHITESPACE)
          const eventFilter = maybeGenerateConditional(elt, tokens, "event")
          if (eventFilter) {
            every.eventFilter = eventFilter
          }
          triggerSpecs.push(every)
        } else {
          const triggerSpec: HtmxTriggerSpecification = { trigger }
          const eventFilter = maybeGenerateConditional(elt, tokens, "event")
          if (eventFilter) {
            triggerSpec.eventFilter = eventFilter
          }

          consumeUntil(tokens, NOT_WHITESPACE)
          while (tokens.length > 0 && tokens[0] !== ",") {
            const token = tokens.shift()!
            if (token === "changed") {
              triggerSpec.changed = true
            } else if (token === "once") {
              triggerSpec.once = true
            } else if (token === "consume") {
              triggerSpec.consume = true
            } else if (token === "delay" && tokens[0] === ":") {
              tokens.shift()
              triggerSpec.delay = deps.parseInterval(consumeUntil(tokens, WHITESPACE_OR_COMMA))
            } else if (token === "from" && tokens[0] === ":") {
              tokens.shift()
              let fromArg: string
              if (COMBINED_SELECTOR_START.test(tokens[0] || "")) {
                fromArg = consumeCSSSelector(tokens)
              } else {
                fromArg = consumeUntil(tokens, WHITESPACE_OR_COMMA)
                if (fromArg === "closest" || fromArg === "find" || fromArg === "next" || fromArg === "previous") {
                  tokens.shift()
                  const selector = consumeCSSSelector(tokens)
                  if (selector.length > 0) {
                    fromArg += " " + selector
                  }
                }
              }
              triggerSpec.from = fromArg
            } else if (token === "target" && tokens[0] === ":") {
              tokens.shift()
              triggerSpec.target = consumeCSSSelector(tokens)
            } else if (token === "throttle" && tokens[0] === ":") {
              tokens.shift()
              triggerSpec.throttle = deps.parseInterval(consumeUntil(tokens, WHITESPACE_OR_COMMA))
            } else if (token === "queue" && tokens[0] === ":") {
              tokens.shift()
              triggerSpec.queue = consumeUntil(tokens, WHITESPACE_OR_COMMA)
            } else if (token === "root" && tokens[0] === ":") {
              tokens.shift()
              triggerSpec.root = consumeCSSSelector(tokens)
            } else if (token === "threshold" && tokens[0] === ":") {
              tokens.shift()
              triggerSpec.threshold = consumeUntil(tokens, WHITESPACE_OR_COMMA)
            } else {
              const parser = deps.getCustomParser(token)
              if (parser && parser({ token, tokens, triggerSpec, elt } as HtmxTriggerModifierContext)) {
                // custom modifier consumed
              } else {
                deps.triggerErrorEvent(elt, "htmx:syntax:error", { token: tokens.shift() })
              }
            }
            consumeUntil(tokens, NOT_WHITESPACE)
          }
          triggerSpecs.push(triggerSpec)
        }
      }
      if (tokens.length === initialLength) {
        deps.triggerErrorEvent(elt, "htmx:syntax:error", { token: tokens.shift() })
      }
      consumeUntil(tokens, NOT_WHITESPACE)
    } while (tokens[0] === "," && tokens.shift())

    if (cache) {
      cache[explicitTrigger] = triggerSpecs
    }
    return triggerSpecs
  }

  function getTriggerSpecs(elt: Element): HtmxTriggerSpecification[] {
    const explicitTrigger = deps.getAttributeValue(elt, "hx-trigger")
    let triggerSpecs: HtmxTriggerSpecification[] = []
    if (explicitTrigger) {
      const cache = deps.triggerSpecsCache()
      triggerSpecs = (cache && cache[explicitTrigger]) || parseAndCacheTrigger(elt, explicitTrigger, cache)
    }

    if (triggerSpecs.length > 0) {
      return triggerSpecs
    } else if (deps.matches(elt, "form")) {
      return [{ trigger: "submit" }]
    } else if (deps.matches(elt, "input[type=\"button\"], input[type=\"submit\"]")) {
      return [{ trigger: "click" }]
    } else if (deps.matches(elt, "input, textarea, select")) {
      return [{ trigger: "change" }]
    } else {
      return [{ trigger: "click" }]
    }
  }

  return { getTriggerSpecs }
}
