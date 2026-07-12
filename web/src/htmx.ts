/**
 * @file htmx.ts
 * @description Main HTMX runtime implementation with TypeScript 7 typing and
 * modular composition boundaries.
 *
 * This file remains the authoritative runtime for behavior compatibility while
 * delegating domain API wiring to module boundaries under src/htmx/.
 */

// htmx core — converted to TypeScript 7
// Original: htmx.org v2.0.10 core (JS + JSDoc) → native TS types/interfaces.
// Behavior is preserved 1:1; JSDoc type comments were promoted to real
// TypeScript syntax (interfaces, type aliases, generics, function signatures).
// Areas that rely on highly dynamic runtime shapes (Proxy-based FormData
// wrappers, extension hook points) use pragmatic `any`/`unknown` casts —
// fully modeling those with static types would change runtime behavior.

import { registerAjaxModule } from './htmx/ajax.js'
import { registerSwapModule } from './htmx/swap.js'
import { registerTriggerModule } from './htmx/trigger.js'
import { registerHistoryModule } from './htmx/history.js'
import { registerExtensionsModule } from './htmx/extensions.js'
import { createFetchTransportBackend } from './htmx/fetch-transport.js'
import { startIncrementalProcessing } from './htmx/mutation-observer.js'
import { createExtensionsRuntime } from './htmx/extensions-runtime.js'
import { createHistoryRuntime } from './htmx/history-runtime.js'
import { createTriggerParserRuntime } from './htmx/trigger-parser-runtime.js'
import { createSwapRuntime } from './htmx/swap-runtime.js'
import { formDataFromObject, formDataProxy, urlEncode } from './htmx/form-data-utils.js'

export type HttpVerb = 'get' | 'head' | 'post' | 'put' | 'delete' | 'connect' | 'options' | 'trace' | 'patch'

export type HtmxSwapStyle =
  | 'innerHTML' | 'outerHTML' | 'beforebegin' | 'afterbegin'
  | 'beforeend' | 'afterend' | 'delete' | 'none' | 'textContent' | string

export interface HtmxSwapSpecification {
  swapStyle: HtmxSwapStyle
  swapDelay: number
  settleDelay: number
  transition?: boolean
  ignoreTitle?: boolean
  head?: string
  scroll?: 'top' | 'bottom' | number
  scrollTarget?: string | null
  show?: string
  showTarget?: string | null
  focusScroll?: boolean
}

export type ConditionalFunction = ((this: Node, evt: Event) => boolean) & { source: string }

export interface HtmxTriggerSpecification {
  trigger: string
  pollInterval?: number
  eventFilter?: ConditionalFunction
  changed?: boolean
  once?: boolean
  consume?: boolean
  delay?: number
  from?: string
  target?: string
  throttle?: number
  queue?: string
  root?: string
  threshold?: string
}

export interface HtmxElementValidationError {
  elt: Element
  message: string
  validity: ValidityState
}

export interface HtmxHeaderSpecification {
  'HX-Request': 'true'
  'HX-Trigger': string | null
  'HX-Trigger-Name': string | null
  'HX-Target': string | null
  'HX-Current-URL': string
  'HX-Prompt'?: string
  'HX-Boosted'?: 'true'
  'Content-Type'?: string
  'HX-History-Restore-Request'?: 'true'
  [key: string]: string | null | undefined
}

export interface HtmxAjaxHandler {
  (elt: Element, responseInfo: HtmxResponseInfo): void
}

export interface HtmxAjaxHelperContext {
  source?: Element | string
  event?: Event
  handler?: HtmxAjaxHandler
  target?: Element | string
  swap?: HtmxSwapStyle
  values?: Record<string, unknown> | FormData
  headers?: Record<string, string>
  select?: string
  push?: string
  replace?: string
  selectOOB?: string
}

export interface HtmxRequestConfig {
  boosted: boolean
  useUrlParams: boolean
  formData: FormData
  parameters: Record<string, unknown>
  unfilteredFormData: FormData
  unfilteredParameters: Record<string, unknown>
  headers: HtmxHeaderSpecification
  elt: Element
  target: Element
  verb: HttpVerb
  errors: HtmxElementValidationError[]
  withCredentials: boolean
  timeout: number
  path: string
  triggeringEvent: Event | null
}

export interface HtmxPathInfo {
  requestPath: string
  finalRequestPath: string
  responsePath: string | null
  anchor?: string
}

export interface HtmxAjaxEtc {
  returnPromise?: boolean
  handler?: HtmxAjaxHandler
  select?: string | null
  targetOverride?: Element
  swapOverride?: HtmxSwapStyle
  headers?: Record<string, string>
  values?: Record<string, unknown> | FormData
  credentials?: boolean
  timeout?: number
  push?: string
  replace?: string
  selectOOB?: string
}

export interface HtmxResponseInfo {
  xhr: XMLHttpRequest
  target: Element
  requestConfig: HtmxRequestConfig
  etc: HtmxAjaxEtc
  boosted: boolean
  select: string | null
  pathInfo: HtmxPathInfo
  failed?: boolean
  successful?: boolean
  keepIndicators?: boolean
}

export type HtmxBeforeSwapDetails = HtmxResponseInfo & {
  shouldSwap: boolean
  serverResponse: unknown
  isError: boolean
  ignoreTitle: boolean
  selectOverride: string | null
  swapOverride: HtmxSwapStyle | undefined
}

export interface HtmxResponseHandlingConfig {
  code?: string
  swap: boolean
  error?: boolean
  ignoreTitle?: boolean
  select?: string
  target?: string
  swapOverride?: string
  event?: string
}

export interface HtmxEventDetailMap {
  'htmx:load': { elt: Node }
  'htmx:beforeRequest': HtmxResponseInfo
  'htmx:afterRequest': HtmxResponseInfo
  'htmx:beforeSwap': HtmxBeforeSwapDetails
  'htmx:afterSwap': HtmxResponseInfo
  'htmx:afterSettle': HtmxResponseInfo
  'htmx:responseError': HtmxResponseInfo & { error: string }
  'htmx:validation:failed': { message: string, validity: ValidityState }
  'htmx:validation:halted': HtmxRequestConfig
}

export type HtmxSwapStyleHandler = (target: Element, fragment: ParentNode, settleInfo: HtmxSettleInfo, contextElement?: Element) => boolean

export interface HtmxTriggerModifierContext {
  elt: Element
  token: string
  tokens: string[]
  triggerSpec: HtmxTriggerSpecification
}

export type HtmxTriggerModifierParser = (context: HtmxTriggerModifierContext) => boolean

export interface HtmxTransportBackend {
  createRequest: () => XMLHttpRequest
}

export interface HtmxTrustedTypesPolicyLike {
  createHTML: (input: string) => string | unknown
}

export type HtmxSettleTask = () => void

export interface HtmxSettleInfo {
  tasks: HtmxSettleTask[]
  elts: Element[]
  title?: string
}

export interface HtmxInternalApi {
  addTriggerHandler: (elt: Element, triggerSpec: HtmxTriggerSpecification, nodeData: HtmxNodeInternalData, handler: (elt: Element, evt?: Event) => void) => void
  bodyContains: (elt: Node) => boolean
  canAccessLocalStorage: () => boolean
  findThisElement: (elt: Element, attribute: string) => Element | null
  filterValues: (inputValues: FormData, elt: Element) => FormData
  swap: (target: string | Element, content: string, swapSpec: HtmxSwapSpecification, swapOptions?: SwapOptions) => void
  hasAttribute: (elt: Element, qualifiedName: string) => boolean
  getAttributeValue: (elt: Node, qualifiedName: string) => string | null
  getClosestAttributeValue: (elt: Element, attributeName: string) => string | null | undefined
  getClosestMatch: (elt: Node | null, condition: (e: Node) => boolean) => Node | null
  getExpressionVars: (elt: Element, event?: Event) => Record<string, unknown>
  getHeaders: (elt: Element, target: Element, prompt?: string) => HtmxHeaderSpecification
  getInputValues: (elt: Element, verb: HttpVerb) => { errors: HtmxElementValidationError[], formData: FormData, values: Record<string, unknown> }
  getInternalData: (elt: EventTarget | Event) => HtmxNodeInternalData
  getSwapSpecification: (elt: Element, swapInfoOverride?: HtmxSwapStyle) => HtmxSwapSpecification
  getTriggerSpecs: (elt: Element) => HtmxTriggerSpecification[]
  getTarget: (elt: Element) => Node | Window | null
  makeFragment: (response: string) => DocumentFragmentWithTitle
  mergeObjects: <T1 extends object, T2 extends object>(obj1: T1, obj2: T2) => T1 & T2
  makeSettleInfo: (target: Element) => HtmxSettleInfo
  oobSwap: (oobValue: string, oobElement: Element, settleInfo: HtmxSettleInfo, rootNode?: Node | Document) => string
  querySelectorExt: (eltOrSelector: Node | string, selector?: string) => Node | Window
  settleImmediately: (tasks: HtmxSettleTask[]) => void
  shouldCancel: (evt: Event, elt: Element) => boolean
  triggerEvent: (elt: EventTarget | string, eventName: string, detail?: unknown) => boolean
  triggerErrorEvent: (elt: EventTarget | string, eventName: string, detail?: Record<string, unknown>) => void
  withExtensions: (elt: Element | undefined, toDo: (extension: HtmxExtension) => void, extensionsToIgnore?: string[]) => void
}

export interface HtmxExtension {
  init(api: HtmxInternalApi): void
  getSelectors(): string[] | null
  onEvent(name: string, evt: CustomEvent): boolean
  transformResponse(text: unknown, xhr: XMLHttpRequest, elt: Element): unknown
  isInlineSwap(swapStyle: HtmxSwapStyle): boolean
  handleSwap(swapStyle: HtmxSwapStyle, target: Node, fragment: Node, settleInfo: HtmxSettleInfo): boolean | Node[]
  encodeParameters(xhr: XMLHttpRequest, parameters: FormData, elt: Node): unknown
}

export interface HtmxHistoryItem {
  url: string
  content: string
  title: string
  scroll: number
}

export interface HtmxHistoryUpdate {
  type?: 'push' | 'replace' | string | null
  path?: string | null
}

export type DocumentFragmentWithTitle = DocumentFragment & { title?: string }

export interface OnHandler {
  event: string
  listener: EventListener
}

export interface ListenerInfo {
  trigger: string
  listener: EventListener
  on: EventTarget
}

export interface HtmxNodeInternalData {
  initHash?: number
  boosted?: boolean
  onHandlers?: OnHandler[]
  timeout?: number
  listenerInfos?: ListenerInfo[]
  cancelled?: boolean
  triggeredOnce?: boolean
  delayed?: number
  throttle?: number | null
  lastValue?: WeakMap<HtmxTriggerSpecification, WeakMap<EventTarget, unknown>>
  loaded?: boolean
  path?: string
  verb?: HttpVerb
  polling?: boolean
  lastButtonClicked?: (HTMLButtonElement | HTMLInputElement) | null
  requestCount?: number
  xhr?: XMLHttpRequest | null
  queuedRequests?: (() => void)[]
  abortable?: boolean
  firstInitCompleted?: boolean
  triggerSpec?: HtmxTriggerSpecification
  handledFor?: EventTarget[]
  [key: string]: unknown
}

export interface HtmxConfig {
  historyEnabled: boolean
  historyCacheSize: number
  refreshOnHistoryMiss: boolean
  defaultSwapStyle: HtmxSwapStyle
  defaultSwapDelay: number
  defaultSettleDelay: number
  includeIndicatorStyles: boolean
  indicatorClass: string
  requestClass: string
  addedClass: string
  settlingClass: string
  swappingClass: string
  allowEval: boolean
  allowScriptTags: boolean
  inlineScriptNonce: string
  inlineStyleNonce: string
  attributesToSettle: string[]
  withCredentials: boolean
  timeout: number
  wsReconnectDelay: 'full-jitter' | ((retryCount: number) => number)
  wsBinaryType: BinaryType
  disableSelector: string
  scrollBehavior: 'auto' | 'instant' | 'smooth'
  defaultFocusScroll: boolean
  getCacheBusterParam: boolean
  globalViewTransitions: boolean
  methodsThatUseUrlParams: HttpVerb[]
  selfRequestsOnly: boolean
  ignoreTitle: boolean
  scrollIntoViewOnBoost: boolean
  triggerSpecsCache: Record<string, HtmxTriggerSpecification[]> | null
  disableInheritance: boolean
  responseHandling: HtmxResponseHandlingConfig[]
  allowNestedOobSwaps: boolean
  historyRestoreAsHxRequest: boolean
  reportValidityOfForms: boolean
  sanitizeResponse: (response: string, context: { target: Element, contextElement?: Element }) => string
  sanitizeResponseFailOpen: boolean
  trustedTypesPolicy: HtmxTrustedTypesPolicyLike | null
  transport: HtmxTransportBackend | null
  useMutationObserverProcessing: boolean
}

export interface HtmxApi {
  init: () => void
  onLoad: (callback: (elt: Node) => void) => EventListener
  process: (elt: Element | string) => void
  on<K extends keyof HtmxEventDetailMap>(arg1: EventTarget | string, arg2: K, arg3: (evt: CustomEvent<HtmxEventDetailMap[K]>) => void, arg4?: AddEventListenerOptions | boolean): EventListener
  on(
    arg1: EventTarget | string,
    arg2: string | EventListener,
    arg3?: EventListener | AddEventListenerOptions | boolean,
    arg4?: AddEventListenerOptions | boolean
  ): EventListener
  off: (
    arg1: EventTarget | string,
    arg2: string | EventListener,
    arg3?: EventListener
  ) => EventListener
  trigger<K extends keyof HtmxEventDetailMap>(elt: EventTarget | string, eventName: K, detail?: HtmxEventDetailMap[K]): boolean
  trigger(elt: EventTarget | string, eventName: string, detail?: unknown): boolean
  ajax: (verb: HttpVerb, path: string, context?: Element | string | HtmxAjaxHelperContext) => Promise<void> | undefined
  find: (eltOrSelector: ParentNode | string, selector?: string) => Element | null
  findAll: (eltOrSelector: ParentNode | string, selector?: string) => NodeListOf<Element>
  closest: (elt: Element | string, selector: string) => Element | null
  values: (elt: Element, type?: HttpVerb) => Record<string, unknown>
  remove: (elt: Node, delay?: number) => void
  addClass: (elt: Element | string, clazz: string, delay?: number) => void
  removeClass: (node: Node | string, clazz: string, delay?: number) => void
  toggleClass: (elt: Element | string, clazz: string) => void
  takeClass: (elt: Node | string, clazz: string) => void
  swap: (target: string | Element, content: string, swapSpec: HtmxSwapSpecification, swapOptions?: SwapOptions) => void
  defineExtension: (name: string, extension: Partial<HtmxExtension>) => void
  removeExtension: (name: string) => void
  defineSwapStyle: (name: string, handler: HtmxSwapStyleHandler) => void
  removeSwapStyle: (name: string) => void
  defineTriggerModifier: (name: string, parser: HtmxTriggerModifierParser) => void
  removeTriggerModifier: (name: string) => void
  logAll: () => void
  logNone: () => void
  logger: ((elt: EventTarget, event: string, data: unknown) => void) | null
  config: HtmxConfig
  parseInterval: (str: string | undefined) => number | undefined
  location: Location
  _: (str: string) => unknown
  version: string
}

export interface SwapOptions {
  select?: string | null
  selectOOB?: string
  eventInfo?: unknown
  anchor?: string
  contextElement?: Element
  afterSwapCallback?: () => void
  afterSettleCallback?: () => void
  beforeSwapCallback?: () => void
  title?: string
  historyRequest?: boolean
  select_?: never
}

// ==========================================================================
// Module state / IIFE-equivalent factory
// ==========================================================================

/**
 * Creates a fully initialized HTMX runtime instance.
 *
 * @returns Configured HTMX API object.
 */
function createHtmx(): HtmxApi {
  const htmx = {
    init: null as unknown as HtmxApi['init'],
    onLoad: null as unknown as HtmxApi['onLoad'],
    process: null as unknown as HtmxApi['process'],
    on: null as unknown as HtmxApi['on'],
    off: null as unknown as HtmxApi['off'],
    trigger: null as unknown as HtmxApi['trigger'],
    ajax: null as unknown as HtmxApi['ajax'],
    find: null as unknown as HtmxApi['find'],
    findAll: null as unknown as HtmxApi['findAll'],
    closest: null as unknown as HtmxApi['closest'],
    values: function(elt: Element, type?: HttpVerb): Record<string, unknown> {
      const inputValues = getInputValues(elt, type || 'post')
      return inputValues.values
    },
    remove: null as unknown as HtmxApi['remove'],
    addClass: null as unknown as HtmxApi['addClass'],
    removeClass: null as unknown as HtmxApi['removeClass'],
    toggleClass: null as unknown as HtmxApi['toggleClass'],
    takeClass: null as unknown as HtmxApi['takeClass'],
    swap: null as unknown as HtmxApi['swap'],
    defineExtension: null as unknown as HtmxApi['defineExtension'],
    removeExtension: null as unknown as HtmxApi['removeExtension'],
    defineSwapStyle: null as unknown as HtmxApi['defineSwapStyle'],
    removeSwapStyle: null as unknown as HtmxApi['removeSwapStyle'],
    defineTriggerModifier: null as unknown as HtmxApi['defineTriggerModifier'],
    removeTriggerModifier: null as unknown as HtmxApi['removeTriggerModifier'],
    logAll: null as unknown as HtmxApi['logAll'],
    logNone: null as unknown as HtmxApi['logNone'],
    logger: null as HtmxApi['logger'],
    config: {
      historyEnabled: true,
      historyCacheSize: 10,
      refreshOnHistoryMiss: false,
      defaultSwapStyle: 'innerHTML',
      defaultSwapDelay: 0,
      defaultSettleDelay: 20,
      includeIndicatorStyles: true,
      indicatorClass: 'htmx-indicator',
      requestClass: 'htmx-request',
      addedClass: 'htmx-added',
      settlingClass: 'htmx-settling',
      swappingClass: 'htmx-swapping',
      allowEval: false,
      allowScriptTags: true,
      inlineScriptNonce: '',
      inlineStyleNonce: '',
      attributesToSettle: ['class', 'style', 'width', 'height'],
      withCredentials: false,
      timeout: 0,
      wsReconnectDelay: 'full-jitter',
      wsBinaryType: 'blob',
      disableSelector: '[hx-disable], [data-hx-disable]',
      scrollBehavior: 'instant',
      defaultFocusScroll: false,
      getCacheBusterParam: false,
      globalViewTransitions: false,
      methodsThatUseUrlParams: ['get', 'delete'],
      selfRequestsOnly: true,
      ignoreTitle: false,
      scrollIntoViewOnBoost: true,
      triggerSpecsCache: null,
      disableInheritance: false,
      responseHandling: [
        { code: '204', swap: false },
        { code: '[23]..', swap: true },
        { code: '[45]..', swap: false, error: true }
      ],
      allowNestedOobSwaps: true,
      historyRestoreAsHxRequest: true,
      reportValidityOfForms: false,
      sanitizeResponse: (response: string) => response,
      sanitizeResponseFailOpen: false,
      trustedTypesPolicy: null,
      transport: createFetchTransportBackend(),
      useMutationObserverProcessing: true
    } as HtmxConfig,
    parseInterval: null as unknown as HtmxApi['parseInterval'],
    location: window.location,
    _: null as unknown as HtmxApi['_'],
    version: '2.0.10'
  }

  htmx.init = init
  htmx.onLoad = onLoadHelper
  htmx.process = processNode
  htmx.find = find
  htmx.findAll = findAll
  htmx.closest = closest
  htmx.remove = removeElement
  htmx.addClass = addClassToElement
  htmx.removeClass = removeClassFromElement
  htmx.toggleClass = toggleClassOnElement
  htmx.takeClass = takeClassForElement
  htmx.logAll = logAll
  htmx.logNone = logNone
  htmx.parseInterval = parseInterval
  htmx._ = internalEval

  registerTriggerModule({
    htmx: htmx as HtmxApi,
    on: addEventListenerImpl as HtmxApi['on'],
    off: removeEventListenerImpl,
    trigger: triggerEvent as HtmxApi['trigger'],
    defineTriggerModifier,
    removeTriggerModifier
  })

  registerAjaxModule({
    htmx: htmx as HtmxApi,
    ajaxHelper
  })

  registerSwapModule({
    htmx: htmx as HtmxApi,
    swap,
    defineSwapStyle,
    removeSwapStyle
  })

  registerExtensionsModule({
    htmx: htmx as HtmxApi,
    defineExtension,
    removeExtension
  })

  registerHistoryModule({
    htmx: htmx as HtmxApi,
    location: window.location
  })

  const internalAPI = {
    addTriggerHandler,
    bodyContains,
    canAccessLocalStorage,
    findThisElement,
    filterValues,
    swap,
    hasAttribute,
    getAttributeValue,
    getClosestAttributeValue,
    getClosestMatch,
    getExpressionVars,
    getHeaders,
    getInputValues,
    getInternalData,
    getSwapSpecification,
    getTriggerSpecs,
    getTarget,
    makeFragment,
    mergeObjects,
    makeSettleInfo,
    oobSwap,
    querySelectorExt,
    settleImmediately,
    shouldCancel,
    triggerEvent,
    triggerErrorEvent,
    withExtensions
  }

  const VERBS: HttpVerb[] = ['get', 'post', 'put', 'delete', 'patch']
  const VERB_SELECTOR = VERBS.map(function(verb) {
    return '[hx-' + verb + '], [data-hx-' + verb + ']'
  }).join(', ')

  const internalDataMap = new WeakMap<object, HtmxNodeInternalData>()
  const triggerModifierRegistry = new Map<string, HtmxTriggerModifierParser>()
  const swapStyleRegistry = new Map<string, HtmxSwapStyleHandler>()

  function defineSwapStyle(name: string, handler: HtmxSwapStyleHandler): void {
    swapStyleRegistry.set(name, handler)
  }

  function removeSwapStyle(name: string): void {
    swapStyleRegistry.delete(name)
  }

  function defineTriggerModifier(name: string, parser: HtmxTriggerModifierParser): void {
    triggerModifierRegistry.set(name, parser)
  }

  function removeTriggerModifier(name: string): void {
    triggerModifierRegistry.delete(name)
  }

  function createTransportRequest(): XMLHttpRequest {
    const transport = htmx.config.transport
    if (transport && typeof transport.createRequest === 'function') {
      return transport.createRequest()
    }
    return new XMLHttpRequest()
  }

  function toTrustedHTML(html: string): string {
    const policy = htmx.config.trustedTypesPolicy
    if (policy && typeof policy.createHTML === 'function') {
      const value = policy.createHTML(html)
      return String(value)
    }
    return html
  }

  function sanitizeResponse(response: string, context: { target: Element, contextElement?: Element }): string {
    try {
      return htmx.config.sanitizeResponse(response, context)
    } catch (e) {
      logError(e)
      triggerErrorEvent(context.target, 'htmx:sanitizeError', {
        error: e,
        context: context as unknown as Record<string, unknown>
      })
      return htmx.config.sanitizeResponseFailOpen ? response : ''
    }
  }

  // ========================================================================
  // Utilities
  // ========================================================================

  function parseInterval(str: string | undefined): number | undefined {
    if (str == undefined) {
      return undefined
    }
    let interval: number = NaN
    if (str.slice(-2) == 'ms') {
      interval = parseFloat(str.slice(0, -2))
    } else if (str.slice(-1) == 's') {
      interval = parseFloat(str.slice(0, -1)) * 1000
    } else if (str.slice(-1) == 'm') {
      interval = parseFloat(str.slice(0, -1)) * 1000 * 60
    } else {
      interval = parseFloat(str)
    }
    return isNaN(interval) ? undefined : interval
  }

  function getRawAttribute(elt: Node, name: string): string | null | false {
    return elt instanceof Element && elt.getAttribute(name)
  }

  function hasAttribute(elt: Element, qualifiedName: string): boolean {
    return !!elt.hasAttribute && (elt.hasAttribute(qualifiedName) ||
      elt.hasAttribute('data-' + qualifiedName))
  }

  function getAttributeValue(elt: Node, qualifiedName: string): string | null {
    return (getRawAttribute(elt, qualifiedName) || getRawAttribute(elt, 'data-' + qualifiedName)) || null
  }

  function parentElt(elt: Node): Node | null {
    const parent = (elt as Element).parentElement
    if (!parent && elt.parentNode instanceof ShadowRoot) return elt.parentNode
    return parent
  }

  function getDocument(): Document {
    return document
  }

  function getRootNode(elt: Node, global: boolean): Node | Document {
    return elt.getRootNode ? elt.getRootNode({ composed: global }) : getDocument()
  }

  function getClosestMatch(elt: Node | null, condition: (e: Node) => boolean): Node | null {
    while (elt && !condition(elt)) {
      elt = parentElt(elt)
    }
    return elt || null
  }

  function getAttributeValueWithDisinheritance(initialElement: Element, ancestor: Element, attributeName: string): string | null {
    const attributeValue = getAttributeValue(ancestor, attributeName)
    const disinherit = getAttributeValue(ancestor, 'hx-disinherit')
    const inherit = getAttributeValue(ancestor, 'hx-inherit')
    if (initialElement !== ancestor) {
      if (htmx.config.disableInheritance) {
        if (inherit && (inherit === '*' || inherit.split(' ').indexOf(attributeName) >= 0)) {
          return attributeValue
        } else {
          return null
        }
      }
      if (disinherit && (disinherit === '*' || disinherit.split(' ').indexOf(attributeName) >= 0)) {
        return 'unset'
      }
    }
    return attributeValue
  }

  function getClosestAttributeValue(elt: Element, attributeName: string): string | null | undefined {
    let closestAttr: string | null = null
    getClosestMatch(elt, function(e: Node) {
      return !!(closestAttr = getAttributeValueWithDisinheritance(elt, asElement(e)!, attributeName))
    })
    if (closestAttr !== 'unset') {
      return closestAttr
    }
    return undefined
  }

  function matches(elt: Node, selector: string): boolean {
    return elt instanceof Element && elt.matches(selector)
  }

  function getStartTag(str: string): string {
    const tagMatcher = /<([a-z][^\/\0>\x20\t\r\n\f]*)/i
    const match = tagMatcher.exec(str)
    if (match && match[1]) {
      return match[1].toLowerCase()
    } else {
      return ''
    }
  }

  function parseHTML(resp: string): Document {
    if ('parseHTMLUnsafe' in Document) {
      return (Document as unknown as { parseHTMLUnsafe(s: string): Document }).parseHTMLUnsafe(resp)
    }
    const parser = new DOMParser()
    return parser.parseFromString(resp, 'text/html')
  }

  function takeChildrenFor(fragment: DocumentFragment, elt: Element): void {
    while (elt.childNodes.length > 0) {
      const child = elt.childNodes[0]
      if (!child) {
        break
      }
      fragment.append(child)
    }
  }

  function duplicateScript(script: HTMLScriptElement): HTMLScriptElement {
    const newScript = getDocument().createElement('script') as HTMLScriptElement
    forEach(Array.from(script.attributes), function(attr: Attr) {
      newScript.setAttribute(attr.name, attr.value)
    })
    newScript.textContent = script.textContent
    newScript.async = false
    if (htmx.config.inlineScriptNonce) {
      newScript.nonce = htmx.config.inlineScriptNonce
    }
    return newScript
  }

  function isJavaScriptScriptNode(script: HTMLScriptElement): boolean {
    return script.matches('script') && (script.type === 'text/javascript' || script.type === 'module' || script.type === '')
  }

  function normalizeScriptTags(fragment: DocumentFragment): void {
    Array.from(fragment.querySelectorAll('script')).forEach(function(script) {
      const s = script as HTMLScriptElement
      if (isJavaScriptScriptNode(s)) {
        const newScript = duplicateScript(s)
        const parent = s.parentNode
        try {
          parent!.insertBefore(newScript, s)
        } catch (e) {
          logError(e)
        } finally {
          s.remove()
        }
      }
    })
  }

  function makeFragment(response: string): DocumentFragmentWithTitle {
    const responseWithNoHead = response.replace(/<head(\s[^>]*)?>[\s\S]*?<\/head>/i, '')
    const startTag = getStartTag(responseWithNoHead)
    let fragment: DocumentFragmentWithTitle
    if (startTag === 'html') {
      fragment = new DocumentFragment() as DocumentFragmentWithTitle
      const doc = parseHTML(response)
      takeChildrenFor(fragment, doc.body)
      fragment.title = doc.title
    } else if (startTag === 'body') {
      fragment = new DocumentFragment() as DocumentFragmentWithTitle
      const doc = parseHTML(responseWithNoHead)
      takeChildrenFor(fragment, doc.body)
      fragment.title = doc.title
    } else {
      const doc = parseHTML('<body><template class="internal-htmx-wrapper">' + responseWithNoHead + '</template></body>')
      fragment = (doc.querySelector('template') as HTMLTemplateElement).content as DocumentFragmentWithTitle
      fragment.title = doc.title
      const titleElement = fragment.querySelector('title')
      if (titleElement && titleElement.parentNode === fragment) {
        titleElement.remove()
        fragment.title = (titleElement as HTMLElement).innerText
      }
    }
    if (fragment) {
      if (htmx.config.allowScriptTags) {
        normalizeScriptTags(fragment)
      } else {
        fragment.querySelectorAll('script').forEach((script) => script.remove())
      }
    }
    return fragment
  }

  function maybeCall(func: (() => void) | null | undefined): void {
    if (func) {
      func()
    }
  }

  function isType(o: unknown, type: string): boolean {
    return Object.prototype.toString.call(o) === '[object ' + type + ']'
  }

  function isFunction(o: unknown): o is (...args: unknown[]) => unknown {
    return typeof o === 'function'
  }

  function isRawObject(o: unknown): o is Record<string, unknown> {
    return isType(o, 'Object')
  }

  function getInternalData(elt: EventTarget | Event): HtmxNodeInternalData {
    const target = elt as unknown as object
    let data = internalDataMap.get(target)
    if (!data) {
      data = {}
      internalDataMap.set(target, data)
    }
    return data
  }

  function toArray<T>(arr: ArrayLike<T> | null | undefined): T[] {
    const returnArr: T[] = []
    if (arr) {
      for (let i = 0; i < arr.length; i++) {
        returnArr.push(arr[i]!)
      }
    }
    return returnArr
  }

  function forEach<T>(arr: ArrayLike<T> | null | undefined, func: (item: T) => void): void {
    if (arr) {
      for (let i = 0; i < arr.length; i++) {
        func(arr[i]!)
      }
    }
  }

  function isScrolledIntoView(el: Element): boolean {
    const rect = el.getBoundingClientRect()
    const elemTop = rect.top
    const elemBottom = rect.bottom
    return elemTop < window.innerHeight && elemBottom >= 0
  }

  function bodyContains(elt: Node): boolean {
    return elt.getRootNode({ composed: true }) === document
  }

  function splitOnWhitespace(trigger: string): string[] {
    return trigger.trim().split(/\s+/)
  }

  function mergeObjects<T1 extends object, T2 extends object>(obj1: T1, obj2: T2): T1 & T2 {
    for (const key in obj2) {
      if (Object.prototype.hasOwnProperty.call(obj2, key)) {
        if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
          continue
        }
        (obj1 as Record<string, unknown>)[key] = (obj2 as Record<string, unknown>)[key]
      }
    }
    return obj1 as T1 & T2
  }

  function parseJSON<T = unknown>(jString: string | null): T | null {
    try {
      return jString == null ? null : JSON.parse(jString)
    } catch (error) {
      logError(error)
      return null
    }
  }

  function canAccessLocalStorage(): boolean {
    const test = 'htmx:sessionStorageTest'
    try {
      sessionStorage.setItem(test, test)
      sessionStorage.removeItem(test)
      return true
    } catch (e) {
      return false
    }
  }

  function normalizePath(path: string): string {
    try {
      const url = new URL(path, window.location.href)
      path = url.pathname + url.search
    } catch (e) {
      // fallback for malformed URLs
    }
    if (path != '/') {
      path = path.replace(/\/+$/, '')
    }
    return path
  }

  // ========================================================================
  // public API
  // ========================================================================

  function internalEval(str: string): unknown {
    return maybeEval(getDocument().body, function() {
      // eslint-disable-next-line no-eval
      return eval(str)
    })
  }

  function onLoadHelper(callback: (elt: Node) => void): EventListener {
    const value = htmx.on('htmx:load', function(evt: Event) {
      callback((evt as CustomEvent).detail.elt)
    })
    return value
  }

  function logAll(): void {
    htmx.logger = function(elt, event, data) {
      if (console) {
        console.log(event, elt, data)
      }
    }
  }

  function logNone(): void {
    htmx.logger = null
  }

  function find(eltOrSelector: ParentNode | string, selector?: string): Element | null {
    if (typeof eltOrSelector !== 'string') {
      return eltOrSelector.querySelector(selector!)
    } else {
      return find(getDocument(), eltOrSelector)
    }
  }

  function findAll(eltOrSelector: ParentNode | string, selector?: string): NodeListOf<Element> {
    if (typeof eltOrSelector !== 'string') {
      return eltOrSelector.querySelectorAll(selector!)
    } else {
      return findAll(getDocument(), eltOrSelector)
    }
  }

  function getWindow(): Window {
    return window
  }

  function removeElement(elt: Node, delay?: number): void {
    const target = resolveTarget(elt as unknown as EventTarget) as Node
    if (delay) {
      getWindow().setTimeout(function() {
        removeElement(target)
      }, delay)
    } else {
      parentElt(target)!.removeChild(target)
    }
  }

  function asElement(elt: unknown): Element | null {
    return elt instanceof Element ? elt : null
  }

  function asHtmlElement(elt: unknown): HTMLElement | null {
    return elt instanceof HTMLElement ? elt : null
  }

  function asString(value: unknown): string | null {
    return typeof value === 'string' ? value : null
  }

  function asParentNode(elt: unknown): ParentNode | null {
    return elt instanceof Element || elt instanceof Document || elt instanceof DocumentFragment ? elt : null
  }

  function addClassToElement(elt: Element | string, clazz: string, delay?: number): void {
    const target = asElement(resolveTarget(elt as unknown as EventTarget))
    if (!target) {
      return
    }
    if (delay) {
      getWindow().setTimeout(function() {
        addClassToElement(target, clazz)
      }, delay)
    } else {
      target.classList && target.classList.add(clazz)
    }
  }

  function removeClassFromElement(node: Node | string, clazz: string, delay?: number): void {
    const elt = asElement(resolveTarget(node as unknown as EventTarget))
    if (!elt) {
      return
    }
    if (delay) {
      getWindow().setTimeout(function() {
        removeClassFromElement(elt, clazz)
      }, delay)
    } else {
      if (elt.classList) {
        elt.classList.remove(clazz)
        if (elt.classList.length === 0) {
          elt.removeAttribute('class')
        }
      }
    }
  }

  function toggleClassOnElement(elt: Element | string, clazz: string): void {
    const target = resolveTarget(elt as unknown as EventTarget) as Element
    target.classList.toggle(clazz)
  }

  function takeClassForElement(elt: Node | string, clazz: string): void {
    const target = resolveTarget(elt as unknown as EventTarget) as Element
    forEach(target.parentElement!.children, function(child) {
      removeClassFromElement(child, clazz)
    })
    addClassToElement(asElement(target)!, clazz)
  }

  function closest(elt: Element | string, selector: string): Element | null {
    const target = asElement(resolveTarget(elt as unknown as EventTarget))
    if (target) {
      return target.closest(selector)
    }
    return null
  }

  function startsWith(str: string, prefix: string): boolean {
    return str.substring(0, prefix.length) === prefix
  }

  function endsWith(str: string, suffix: string): boolean {
    return str.substring(str.length - suffix.length) === suffix
  }

  function normalizeSelector(selector: string): string {
    const trimmedSelector = selector.trim()
    if (startsWith(trimmedSelector, '<') && endsWith(trimmedSelector, '/>')) {
      return trimmedSelector.substring(1, trimmedSelector.length - 2)
    } else {
      return trimmedSelector
    }
  }

  function querySelectorAllExt(elt: Node | Element | Document | string, selector: string, global?: boolean): (Node | Window)[] {
    if (selector.indexOf('global ') === 0) {
      return querySelectorAllExt(elt, selector.slice(7), true)
    }

    const resolved = resolveTarget(elt as unknown as EventTarget, undefined) as Node

    const parts: string[] = []
    {
      let chevronsCount = 0
      let offset = 0
      for (let i = 0; i < selector.length; i++) {
        const char = selector[i]
        if (char === ',' && chevronsCount === 0) {
          parts.push(selector.substring(offset, i))
          offset = i + 1
          continue
        }
        if (char === '<') {
          chevronsCount++
        } else if (char === '/' && i < selector.length - 1 && selector[i + 1] === '>') {
          chevronsCount--
        }
      }
      if (offset < selector.length) {
        parts.push(selector.substring(offset))
      }
    }

    const result: (Node | Window)[] = []
    const unprocessedParts: string[] = []
    while (parts.length > 0) {
      const sel = normalizeSelector(parts.shift()!)
      let item: Node | Window | null | undefined
      if (sel.indexOf('closest ') === 0) {
        item = closest(asElement(resolved)!, normalizeSelector(sel.slice(8)))
      } else if (sel.indexOf('find ') === 0) {
        item = find(asParentNode(resolved)!, normalizeSelector(sel.slice(5)))
      } else if (sel === 'next' || sel === 'nextElementSibling') {
        item = asElement(resolved)!.nextElementSibling
      } else if (sel.indexOf('next ') === 0) {
        item = scanForwardQuery(resolved, normalizeSelector(sel.slice(5)), !!global)
      } else if (sel === 'previous' || sel === 'previousElementSibling') {
        item = asElement(resolved)!.previousElementSibling
      } else if (sel.indexOf('previous ') === 0) {
        item = scanBackwardsQuery(resolved, normalizeSelector(sel.slice(9)), !!global)
      } else if (sel === 'document') {
        item = document
      } else if (sel === 'window') {
        item = window
      } else if (sel === 'body') {
        item = document.body
      } else if (sel === 'root') {
        item = getRootNode(resolved, !!global)
      } else if (sel === 'host') {
        item = (resolved.getRootNode() as ShadowRoot).host
      } else {
        unprocessedParts.push(sel)
      }

      if (item) {
        result.push(item)
      }
    }

    if (unprocessedParts.length > 0) {
      const standardSelector = unprocessedParts.join(',')
      const rootNode = asParentNode(getRootNode(resolved, !!global))
      result.push(...toArray(rootNode!.querySelectorAll(standardSelector)))
    }

    return result
  }

  function scanForwardQuery(start: Node, match: string, global: boolean): Element | undefined {
    const results = asParentNode(getRootNode(start, global))!.querySelectorAll(match)
    for (let i = 0; i < results.length; i++) {
      const elt = results[i]
      if (elt && elt.compareDocumentPosition(start) === Node.DOCUMENT_POSITION_PRECEDING) {
        return elt
      }
    }
    return undefined
  }

  function scanBackwardsQuery(start: Node, match: string, global: boolean): Element | undefined {
    const results = asParentNode(getRootNode(start, global))!.querySelectorAll(match)
    for (let i = results.length - 1; i >= 0; i--) {
      const elt = results[i]
      if (elt && elt.compareDocumentPosition(start) === Node.DOCUMENT_POSITION_FOLLOWING) {
        return elt
      }
    }
    return undefined
  }

  function querySelectorExt(eltOrSelector: Node | string, selector?: string): Node | Window {
    if (typeof eltOrSelector !== 'string') {
      return querySelectorAllExt(eltOrSelector, selector!)[0]!
    } else {
      return querySelectorAllExt(getDocument().body, eltOrSelector)[0]!
    }
  }

  function resolveTarget<T extends EventTarget>(eltOrSelector: T | string, context?: T): Element | T | null {
    if (typeof eltOrSelector === 'string') {
      return find(asParentNode(context) || document, eltOrSelector)
    } else {
      return eltOrSelector
    }
  }

  interface EventArgs {
    target: EventTarget
    event: string | null
    listener: EventListener
    options: AddEventListenerOptions | boolean | undefined
  }

  function processEventArgs(
    arg1: EventTarget | string,
    arg2: string | EventListener,
    arg3?: EventListener | AddEventListenerOptions | boolean,
    arg4?: AddEventListenerOptions | boolean
  ): EventArgs {
    if (isFunction(arg2)) {
      return {
        target: getDocument().body,
        event: asString(arg1),
        listener: arg2 as EventListener,
        options: arg3 as AddEventListenerOptions | boolean
      }
    } else {
      return {
        target: resolveTarget(arg1 as EventTarget)!,
        event: asString(arg2),
        listener: arg3 as EventListener,
        options: arg4
      }
    }
  }

  function addEventListenerImpl(
    arg1: EventTarget | string,
    arg2: string | EventListener,
    arg3?: EventListener | AddEventListenerOptions | boolean,
    arg4?: AddEventListenerOptions | boolean
  ): EventListener {
    ready(function() {
      const eventArgs = processEventArgs(arg1, arg2, arg3, arg4)
      eventArgs.target.addEventListener(eventArgs.event!, eventArgs.listener, eventArgs.options)
    })
    const b = isFunction(arg2)
    return (b ? arg2 : arg3) as EventListener
  }

  function removeEventListenerImpl(
    arg1: EventTarget | string,
    arg2: string | EventListener,
    arg3?: EventListener
  ): EventListener {
    ready(function() {
      const eventArgs = processEventArgs(arg1, arg2, arg3)
      eventArgs.target.removeEventListener(eventArgs.event!, eventArgs.listener)
    })
    return (isFunction(arg2) ? arg2 : arg3) as EventListener
  }

  // ========================================================================
  // Node processing
  // ========================================================================

  const DUMMY_ELT: Element = getDocument().createElement('output')

  function findAttributeTargets(elt: Element, attrName: string): (Node | Window)[] | undefined {
    const attrTarget = getClosestAttributeValue(elt, attrName)
    if (attrTarget) {
      if (attrTarget === 'this') {
        return [findThisElement(elt, attrName)!]
      } else {
        const result = querySelectorAllExt(elt, attrTarget)
        const shouldInherit = /(^|,)(\s*)inherit(\s*)($|,)/.test(attrTarget)
        if (shouldInherit) {
          const eltToInheritFrom = asElement(getClosestMatch(elt, function(parent) {
            return parent !== elt && hasAttribute(asElement(parent)!, attrName)
          }))
          if (eltToInheritFrom) {
            result.push(...(findAttributeTargets(eltToInheritFrom, attrName) || []))
          }
        }
        if (result.length === 0) {
          logError('The selector "' + attrTarget + '" on ' + attrName + ' returned no matches!')
          return [DUMMY_ELT]
        } else {
          return result
        }
      }
    }
    return undefined
  }

  function findThisElement(elt: Element, attribute: string): Element | null {
    return asElement(getClosestMatch(elt, function(e) {
      return getAttributeValue(asElement(e)!, attribute) != null
    }))
  }

  function getTarget(elt: Element): Node | Window | null {
    const targetStr = getClosestAttributeValue(elt, 'hx-target')
    if (targetStr) {
      if (targetStr === 'this') {
        return findThisElement(elt, 'hx-target')
      } else {
        return querySelectorExt(elt, targetStr)
      }
    } else {
      const data = getInternalData(elt)
      if (data.boosted) {
        return getDocument().body
      } else {
        return elt
      }
    }
  }

  function shouldSettleAttribute(name: string): boolean {
    return htmx.config.attributesToSettle.includes(name)
  }

  function cloneAttributes(mergeTo: Element, mergeFrom: Element): void {
    forEach(Array.from(mergeTo.attributes), function(attr: Attr) {
      if (!mergeFrom.hasAttribute(attr.name) && shouldSettleAttribute(attr.name)) {
        mergeTo.removeAttribute(attr.name)
      }
    })
    forEach(mergeFrom.attributes, function(attr: Attr) {
      if (shouldSettleAttribute(attr.name)) {
        mergeTo.setAttribute(attr.name, attr.value)
      }
    })
  }

  function isInlineSwap(swapStyle: HtmxSwapStyle, target: Element): boolean {
    const extensionsForTarget = getExtensions(target)
    for (let i = 0; i < extensionsForTarget.length; i++) {
      const extension = extensionsForTarget[i]
      if (!extension) {
        continue
      }
      try {
        if (extension.isInlineSwap(swapStyle)) {
          return true
        }
      } catch (e) {
        logError(e)
      }
    }
    return swapStyle === 'outerHTML'
  }

  function oobSwap(oobValue: string, oobElement: Element, settleInfo: HtmxSettleInfo, rootNode?: Node | Document): string {
    rootNode = rootNode || getDocument()
    let selector = '#' + CSS.escape(getRawAttribute(oobElement, 'id') as string)
    let swapStyle: HtmxSwapStyle = 'outerHTML'
    if (oobValue === 'true') {
      // do nothing
    } else if (oobValue.indexOf(':') > 0) {
      swapStyle = oobValue.substring(0, oobValue.indexOf(':'))
      selector = oobValue.substring(oobValue.indexOf(':') + 1)
    } else {
      swapStyle = oobValue
    }
    oobElement.removeAttribute('hx-swap-oob')
    oobElement.removeAttribute('data-hx-swap-oob')

    const targets = querySelectorAllExt(rootNode, selector, false)
    if (targets.length) {
      forEach(targets, function(targetNode) {
        let target = targetNode as Element
        let fragment: ParentNode
        const oobElementClone = oobElement.cloneNode(true) as Element
        fragment = getDocument().createDocumentFragment()
        fragment.appendChild(oobElementClone)
        if (!isInlineSwap(swapStyle, target)) {
          fragment = asParentNode(oobElementClone)!
        }

        const beforeSwapDetails = { shouldSwap: true, target, fragment }
        if (!triggerEvent(target, 'htmx:oobBeforeSwap', beforeSwapDetails)) return

        target = beforeSwapDetails.target
        if (beforeSwapDetails.shouldSwap) {
          handlePreservedElements(fragment)
          swapWithStyle(swapStyle, undefined, target, fragment, settleInfo)
          restorePreservedElements()
        }
        forEach(settleInfo.elts, function(elt) {
          triggerEvent(elt, 'htmx:oobAfterSwap', beforeSwapDetails)
        })
      })
      oobElement.parentNode!.removeChild(oobElement)
    } else {
      oobElement.parentNode!.removeChild(oobElement)
      triggerErrorEvent(getDocument().body, 'htmx:oobErrorNoTarget', { content: oobElement, target: selector })
    }
    return oobValue
  }

  function restorePreservedElements(): void {
    const pantry = find('#--htmx-preserve-pantry--')
    if (pantry) {
      for (const preservedElt of [...pantry.children]) {
        const existingElement = find('#' + preservedElt.id)!
        ;(existingElement.parentNode as unknown as { moveBefore(a: Node, b: Node | null): void }).moveBefore(preservedElt, existingElement)
        existingElement.remove()
      }
      pantry.remove()
    }
  }

  function handlePreservedElements(fragment: ParentNode): void {
    forEach(findAll(fragment, '[hx-preserve], [data-hx-preserve]'), function(preservedElt) {
      const id = getAttributeValue(preservedElt, 'id')!
      const existingElement = getDocument().getElementById(id)
      if (existingElement != null) {
        if ((preservedElt as unknown as { moveBefore?: unknown }).moveBefore) {
          let pantry = find('#--htmx-preserve-pantry--')
          if (pantry == null) {
            getDocument().body.insertAdjacentHTML('afterend', "<div id='--htmx-preserve-pantry--'></div>")
            pantry = find('#--htmx-preserve-pantry--')
          }
          ;(pantry as unknown as { moveBefore(a: Node, b: Node | null): void }).moveBefore(existingElement, null)
        } else {
          preservedElt.parentNode!.replaceChild(existingElement, preservedElt)
        }
      }
    })
  }

  function handleAttributes(parentNode: Node, fragment: ParentNode, settleInfo: HtmxSettleInfo): void {
    forEach(fragment.querySelectorAll('[id]'), function(newNode) {
      const id = getRawAttribute(newNode, 'id')
      if (id && id.length > 0) {
        const parentElement = asParentNode(parentNode)
        const oldNode = parentElement && parentElement.querySelector(CSS.escape(newNode.tagName) + '#' + CSS.escape(id))
        if (oldNode && oldNode !== parentElement) {
          const newAttributes = newNode.cloneNode() as Element
          cloneAttributes(newNode, oldNode)
          settleInfo.tasks.push(function() {
            cloneAttributes(newNode, newAttributes)
          })
        }
      }
    })
  }

  function makeAjaxLoadTask(child: Node): HtmxSettleTask {
    return function() {
      removeClassFromElement(child, htmx.config.addedClass)
      processNode(asElement(child)!)
      processFocus(asParentNode(child)!)
      triggerEvent(child, 'htmx:load')
    }
  }

  function processFocus(child: ParentNode): void {
    const autofocus = '[autofocus]'
    const autoFocusedElt = asHtmlElement(matches(child as Node, autofocus) ? child : child.querySelector(autofocus))
    if (autoFocusedElt != null) {
      autoFocusedElt.focus()
    }
  }

  function insertNodesBefore(parentNode: Node, insertBefore: Node | null, fragment: ParentNode, settleInfo: HtmxSettleInfo): void {
    handleAttributes(parentNode, fragment, settleInfo)
    while (fragment.childNodes.length > 0) {
      const child = fragment.firstChild!
      addClassToElement(asElement(child)!, htmx.config.addedClass)
      parentNode.insertBefore(child, insertBefore)
      if (child.nodeType !== Node.TEXT_NODE && child.nodeType !== Node.COMMENT_NODE) {
        settleInfo.tasks.push(makeAjaxLoadTask(child))
      }
    }
  }

  function stringHash(str: string, hash: number): number {
    let char = 0
    while (char < str.length) {
      hash = (hash << 5) - hash + str.charCodeAt(char++) | 0
    }
    return hash
  }

  function attributeHash(elt: Element): number {
    let hash = 0
    for (let i = 0; i < elt.attributes.length; i++) {
      const attribute = elt.attributes[i]
      if (!attribute) {
        continue
      }
      if (attribute.value) {
        hash = stringHash(attribute.name, hash)
        hash = stringHash(attribute.value, hash)
      }
    }
    return hash
  }

  function deInitOnHandlers(elt: EventTarget): void {
    const internalData = getInternalData(elt)
    if (internalData.onHandlers) {
      for (let i = 0; i < internalData.onHandlers.length; i++) {
        const handlerInfo = internalData.onHandlers[i]
        if (!handlerInfo) {
          continue
        }
        removeEventListenerImpl(elt, handlerInfo.event, handlerInfo.listener)
      }
      delete internalData.onHandlers
    }
  }

  function deInitNode(element: Node): void {
    const internalData = getInternalData(element)
    if (internalData.timeout) {
      clearTimeout(internalData.timeout)
    }
    if (internalData.listenerInfos) {
      forEach(internalData.listenerInfos, function(info) {
        if (info.on) {
          removeEventListenerImpl(info.on, info.trigger, info.listener)
        }
      })
    }
    deInitOnHandlers(element)
    forEach(Object.keys(internalData), function(key) { if (key !== 'firstInitCompleted') delete internalData[key] })
  }

  function cleanUpElement(element: Node): void {
    triggerEvent(element, 'htmx:beforeCleanupElement')
    deInitNode(element)
    forEach((element as Element).children, function(child) { cleanUpElement(child) })
  }

  const swapRuntime = createSwapRuntime({
    getDocument,
    getWindow,
    htmxConfig: function() {
      return htmx.config
    },
    findAll,
    forEach,
    getAttributeValue,
    removeClassFromElement,
    addClassToElement,
    triggerEvent,
    triggerErrorEvent,
    resolveTarget,
    getRootNode,
    makeSettleInfo,
    sanitizeResponse,
    makeFragment,
    oobSwap,
    handlePreservedElements,
    restorePreservedElements,
    bodyContains,
    getRawAttribute,
    asElement,
    maybeCall,
    handleTitle,
    updateScrollState,
    parentElt,
    cleanUpElement,
    insertNodesBefore,
    makeAjaxLoadTask,
    getExtensions,
    swapStyleRegistryGet: function(style: HtmxSwapStyle) {
      return swapStyleRegistry.get(style)
    },
    logError
  })

  function swapWithStyle(swapStyle: HtmxSwapStyle, elt: Element | undefined, target: Element, fragment: ParentNode, settleInfo: HtmxSettleInfo): void {
    swapRuntime.swapWithStyle(swapStyle, elt, target, fragment, settleInfo)
  }

  function findAndSwapOobElements(fragment: ParentNode, settleInfo: HtmxSettleInfo, rootNode?: Node | Document): boolean {
    return swapRuntime.findAndSwapOobElements(fragment, settleInfo, rootNode)
  }

  function swap(target: string | Element, content: string, swapSpec: HtmxSwapSpecification, swapOptions?: SwapOptions): void {
    swapRuntime.swap(target, content, swapSpec, swapOptions)
  }

  function handleTriggerHeader(xhr: XMLHttpRequest, header: string, elt: EventTarget): void {
    const triggerBody = xhr.getResponseHeader(header)!
    if (triggerBody.indexOf('{') === 0) {
      const triggers = parseJSON<Record<string, unknown>>(triggerBody)!
      for (const eventName in triggers) {
        if (Object.prototype.hasOwnProperty.call(triggers, eventName)) {
          let detail: unknown = triggers[eventName]
          let target: EventTarget = elt
          if (isRawObject(detail)) {
            target = (detail as { target?: EventTarget }).target !== undefined ? (detail as { target: EventTarget }).target : elt
          } else {
            detail = { value: detail }
          }
          triggerEvent(target, eventName, detail)
        }
      }
    } else {
      const eventNames = triggerBody.split(',')
      for (let i = 0; i < eventNames.length; i++) {
        const eventName = eventNames[i]
        if (!eventName) {
          continue
        }
        triggerEvent(elt, eventName.trim(), [])
      }
    }
  }

  const INPUT_SELECTOR = 'input, textarea, select'

  const triggerParserRuntime = createTriggerParserRuntime({
    getAttributeValue,
    matches,
    parseInterval,
    maybeEval,
    triggerErrorEvent,
    getDocument,
    triggerSpecsCache: function() {
      return htmx.config.triggerSpecsCache
    },
    getCustomParser: function(token: string) {
      return triggerModifierRegistry.get(token)
    }
  })

  function getTriggerSpecs(elt: Element): HtmxTriggerSpecification[] {
    return triggerParserRuntime.getTriggerSpecs(elt)
  }

  function cancelPolling(elt: Element): void {
    getInternalData(elt).cancelled = true
  }

  function processPolling(elt: Element, handler: TriggerHandler, spec: HtmxTriggerSpecification): void {
    const nodeData = getInternalData(elt)
    nodeData.timeout = getWindow().setTimeout(function() {
      if (bodyContains(elt) && nodeData.cancelled !== true) {
        if (!maybeFilterEvent(spec, elt, makeEvent('hx:poll:trigger', {
          triggerSpec: spec,
          target: elt
        }))) {
          handler(elt)
        }
        processPolling(elt, handler, spec)
      }
    }, spec.pollInterval)
  }

  function isLocalLink(elt: HTMLAnchorElement): boolean {
    return location.hostname === elt.hostname &&
      !!getRawAttribute(elt, 'href') &&
      (getRawAttribute(elt, 'href') as string).indexOf('#') !== 0
  }

  function eltIsDisabled(elt: Element): Element | null {
    return closest(elt, htmx.config.disableSelector)
  }

  function boostElement(elt: Element, nodeData: HtmxNodeInternalData, triggerSpecs: HtmxTriggerSpecification[]): void {
    if ((elt instanceof HTMLAnchorElement && isLocalLink(elt) && (elt.target === '' || elt.target === '_self')) ||
      (elt.tagName === 'FORM' && String(getRawAttribute(elt, 'method')).toLowerCase() !== 'dialog')) {
      nodeData.boosted = true
      let verb: HttpVerb
      let path: string
      if (elt.tagName === 'A') {
        verb = 'get'
        path = getRawAttribute(elt, 'href') as string
      } else {
        const rawAttribute = getRawAttribute(elt, 'method')
        verb = (rawAttribute ? rawAttribute.toLowerCase() : 'get') as HttpVerb
        path = getRawAttribute(elt, 'action') as string
        if (path == null || path === '') {
          path = location.href
        }
        if (verb === 'get' && path.includes('?')) {
          path = path.replace(/\?[^#]+/, '')
        }
      }
      triggerSpecs.forEach(function(triggerSpec) {
        addEventListener(elt, function(node, evt) {
          const target = asElement(node)!
          if (eltIsDisabled(target)) {
            cleanUpElement(target)
            return
          }
          issueAjaxRequest(verb, path, target, evt)
        }, nodeData, triggerSpec, true)
      })
    }
  }

  function shouldCancel(evt: Event, elt: Element): boolean {
    if (evt.type === 'submit' && elt.tagName === 'FORM') {
      return true
    } else if (evt.type === 'click') {
      const btn = elt.closest('input[type="submit"], button') as (HTMLButtonElement | HTMLInputElement | null)
      if (btn && (btn as HTMLButtonElement).form && btn.type === 'submit') {
        return true
      }

      const link = elt.closest('a')
      const samePageAnchor = /^#.+/
      if (link && link.href && !samePageAnchor.test(link.getAttribute('href')!)) {
        return true
      }
    }
    return false
  }

  function ignoreBoostedAnchorCtrlClick(elt: Node, evt: Event | MouseEvent | KeyboardEvent | TouchEvent): boolean {
    return !!getInternalData(elt).boosted && elt instanceof HTMLAnchorElement && evt.type === 'click' &&
      !!((evt as MouseEvent).ctrlKey || (evt as MouseEvent).metaKey)
  }

  function maybeFilterEvent(triggerSpec: HtmxTriggerSpecification, elt: Node, evt: Event): boolean {
    const eventFilter = triggerSpec.eventFilter
    if (eventFilter) {
      try {
        return eventFilter.call(elt, evt) !== true
      } catch (e) {
        const source = eventFilter.source
        triggerErrorEvent(getDocument().body, 'htmx:eventFilter:error', { error: e, source })
        return true
      }
    }
    return false
  }

  function addEventListener(elt: Element, handler: TriggerHandler, nodeData: HtmxNodeInternalData, triggerSpec: HtmxTriggerSpecification, explicitCancel?: boolean): void {
    const elementData = getInternalData(elt)
    let eltsToListenOn: (Node | Window)[]
    if (triggerSpec.from) {
      eltsToListenOn = querySelectorAllExt(elt, triggerSpec.from)
    } else {
      eltsToListenOn = [elt]
    }
    if (triggerSpec.changed) {
      if (!('lastValue' in elementData)) {
        elementData.lastValue = new WeakMap()
      }
      eltsToListenOn.forEach(function(eltToListenOn) {
        if (!elementData.lastValue!.has(triggerSpec)) {
          elementData.lastValue!.set(triggerSpec, new WeakMap())
        }
        elementData.lastValue!.get(triggerSpec)!.set(eltToListenOn, (eltToListenOn as HTMLInputElement).value)
      })
    }
    forEach(eltsToListenOn, function(eltToListenOn) {
      const eventListener: EventListener = function(evt: Event) {
        if (!bodyContains(elt)) {
          eltToListenOn.removeEventListener(triggerSpec.trigger, eventListener)
          return
        }
        if (ignoreBoostedAnchorCtrlClick(elt, evt)) {
          return
        }
        if (explicitCancel || shouldCancel(evt, eltToListenOn as Element)) {
          evt.preventDefault()
        }
        if (maybeFilterEvent(triggerSpec, elt, evt)) {
          return
        }
        const eventData = getInternalData(evt)
        eventData.triggerSpec = triggerSpec
        if (eventData.handledFor == null) {
          eventData.handledFor = []
        }
        if (eventData.handledFor.indexOf(elt) < 0) {
          eventData.handledFor.push(elt)
          if (triggerSpec.consume) {
            evt.stopPropagation()
          }
          if (triggerSpec.target && evt.target) {
            if (!matches(asElement(evt.target)!, triggerSpec.target)) {
              return
            }
          }
          if (triggerSpec.once) {
            if (elementData.triggeredOnce) {
              return
            } else {
              elementData.triggeredOnce = true
            }
          }
          if (triggerSpec.changed) {
            const node = evt.target as HTMLInputElement
            const value = node.value
            const lastValue = elementData.lastValue!.get(triggerSpec)!
            if (lastValue.has(node) && lastValue.get(node) === value) {
              return
            }
            lastValue.set(node, value)
          }
          if (elementData.delayed) {
            clearTimeout(elementData.delayed)
          }
          if (elementData.throttle) {
            return
          }

          if (triggerSpec.throttle! > 0) {
            if (!elementData.throttle) {
              triggerEvent(elt, 'htmx:trigger')
              handler(elt, evt)
              elementData.throttle = getWindow().setTimeout(function() {
                elementData.throttle = null
              }, triggerSpec.throttle)
            }
          } else if (triggerSpec.delay! > 0) {
            elementData.delayed = getWindow().setTimeout(function() {
              triggerEvent(elt, 'htmx:trigger')
              handler(elt, evt)
            }, triggerSpec.delay)
          } else {
            triggerEvent(elt, 'htmx:trigger')
            handler(elt, evt)
          }
        }
      }
      if (nodeData.listenerInfos == null) {
        nodeData.listenerInfos = []
      }
      nodeData.listenerInfos.push({
        trigger: triggerSpec.trigger,
        listener: eventListener,
        on: eltToListenOn
      })
      eltToListenOn.addEventListener(triggerSpec.trigger, eventListener)
    })
  }

  let windowIsScrolling = false
  let scrollHandler: (() => void) | null = null
  function initScrollHandler(): void {
    if (!scrollHandler) {
      scrollHandler = function() {
        windowIsScrolling = true
      }
      window.addEventListener('scroll', scrollHandler)
      window.addEventListener('resize', scrollHandler)
      setInterval(function() {
        if (windowIsScrolling) {
          windowIsScrolling = false
          forEach(getDocument().querySelectorAll("[hx-trigger*='revealed'],[data-hx-trigger*='revealed']"), function(elt) {
            maybeReveal(elt)
          })
        }
      }, 200)
    }
  }

  function maybeReveal(elt: Element): void {
    if (!hasAttribute(elt, 'data-hx-revealed') && isScrolledIntoView(elt)) {
      elt.setAttribute('data-hx-revealed', 'true')
      const nodeData = getInternalData(elt)
      if (nodeData.initHash) {
        triggerEvent(elt, 'revealed')
      } else {
        elt.addEventListener('htmx:afterProcessNode', function() { triggerEvent(elt, 'revealed') }, { once: true })
      }
    }
  }

  // ========================================================================

  function loadImmediately(elt: Element, handler: TriggerHandler, nodeData: HtmxNodeInternalData, delay: number | undefined): void {
    const load = function() {
      if (!nodeData.loaded) {
        nodeData.loaded = true
        triggerEvent(elt, 'htmx:trigger')
        handler(elt)
      }
    }
    if (delay && delay > 0) {
      getWindow().setTimeout(load, delay)
    } else {
      load()
    }
  }

  function processVerbs(elt: Element, nodeData: HtmxNodeInternalData, triggerSpecs: HtmxTriggerSpecification[]): boolean {
    let explicitAction = false
    forEach(VERBS, function(verb) {
      if (hasAttribute(elt, 'hx-' + verb)) {
        const path = getAttributeValue(elt, 'hx-' + verb) as string
        explicitAction = true
        nodeData.path = path
        nodeData.verb = verb
        triggerSpecs.forEach(function(triggerSpec) {
          addTriggerHandler(elt, triggerSpec, nodeData, function(node, evt) {
            const target = asElement(node)!
            if (eltIsDisabled(target)) {
              cleanUpElement(target)
              return
            }
            issueAjaxRequest(verb, path, target, evt)
          })
        })
      }
    })
    return explicitAction
  }

  type TriggerHandler = (elt: Element, evt?: Event) => void

  function addTriggerHandler(elt: Element, triggerSpec: HtmxTriggerSpecification, nodeData: HtmxNodeInternalData, handler: TriggerHandler): void {
    if (triggerSpec.trigger === 'revealed') {
      if (typeof IntersectionObserver !== 'undefined') {
        const revealedObserver = new IntersectionObserver(function(entries, observer) {
          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]
            if (entry && entry.isIntersecting && entry.target instanceof Element) {
              maybeReveal(entry.target)
              observer.unobserve(entry.target)
            }
          }
        })
        revealedObserver.observe(elt)
      } else {
        initScrollHandler()
      }
      addEventListener(elt, handler, nodeData, triggerSpec)
      maybeReveal(asElement(elt)!)
    } else if (triggerSpec.trigger === 'intersect') {
      const observerOptions: IntersectionObserverInit = {}
      if (triggerSpec.root) {
        observerOptions.root = querySelectorExt(elt, triggerSpec.root) as Element
      }
      if (triggerSpec.threshold) {
        observerOptions.threshold = parseFloat(triggerSpec.threshold)
      }
      const observer = new IntersectionObserver(function(entries) {
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i]
            if (entry && entry.isIntersecting) {
            triggerEvent(elt, 'intersect')
            break
          }
        }
      }, observerOptions)
      observer.observe(asElement(elt)!)
      addEventListener(asElement(elt)!, handler, nodeData, triggerSpec)
    } else if (!nodeData.firstInitCompleted && triggerSpec.trigger === 'load') {
      if (!maybeFilterEvent(triggerSpec, elt, makeEvent('load', { elt }))) {
        loadImmediately(asElement(elt)!, handler, nodeData, triggerSpec.delay)
      }
    } else if (triggerSpec.pollInterval! > 0) {
      nodeData.polling = true
      processPolling(asElement(elt)!, handler, triggerSpec)
    } else {
      addEventListener(elt, handler, nodeData, triggerSpec)
    }
  }

  function shouldProcessHxOn(node: Node): boolean {
    const elt = asElement(node)
    if (!elt) {
      return false
    }
    const attributes = elt.attributes
    for (let j = 0; j < attributes.length; j++) {
      const attr = attributes[j]
      if (!attr) {
        continue
      }
      const attrName = attr.name
      if (startsWith(attrName, 'hx-on:') || startsWith(attrName, 'data-hx-on:') ||
        startsWith(attrName, 'hx-on-') || startsWith(attrName, 'data-hx-on-')) {
        return true
      }
    }
    return false
  }

  const HX_ON_QUERY = (typeof XPathEvaluator !== 'undefined')
    ? new XPathEvaluator()
      .createExpression('.//*[@*[ starts-with(name(), "hx-on:") or starts-with(name(), "data-hx-on:") or' +
        ' starts-with(name(), "hx-on-") or starts-with(name(), "data-hx-on-") ]]')
    : null

  function processHXOnDescendants(root: Node, elements: Element[]): void {
    const parent = asParentNode(root)
    if (!parent || !(parent as ParentNode).querySelectorAll) {
      return
    }
    const descendants = (parent as ParentNode).querySelectorAll('*')
    forEach(descendants, function(node) {
      if (shouldProcessHxOn(node as Node)) {
        elements.push(asElement(node)!)
      }
    })
  }

  function processHXOnRoot(elt: Node, elements: Element[]): void {
    if (shouldProcessHxOn(elt)) {
      elements.push(asElement(elt)!)
    }
    if (!HX_ON_QUERY) {
      processHXOnDescendants(elt, elements)
      return
    }

    try {
      const iter = HX_ON_QUERY.evaluate(
        elt,
        typeof XPathResult !== 'undefined' ? XPathResult.ORDERED_NODE_ITERATOR_TYPE : 0,
        null
      )
      let node: Node | null = null
      while ((node = iter.iterateNext())) {
        elements.push(asElement(node)!)
      }
    } catch (_e) {
      processHXOnDescendants(elt, elements)
    }
  }

  function findHxOnWildcardElements(elt: Node): Element[] {
    const elements: Element[] = []
    if (elt instanceof DocumentFragment) {
      for (const child of Array.from(elt.childNodes)) {
        processHXOnRoot(child, elements)
      }
    } else {
      processHXOnRoot(elt, elements)
    }
    return elements
  }

  function findElementsToProcess(elt: Element): NodeListOf<Element> | [] {
    if (elt.querySelectorAll) {
      const boostedSelector = ', [hx-boost] a, [data-hx-boost] a, a[hx-boost], a[data-hx-boost]'

      const extensionSelectors: string[][] = []
      for (const extension of extensionsRuntime.listExtensions()) {
        if (!extension) {
          continue
        }
        if (extension.getSelectors) {
          const selectors = extension.getSelectors()
          if (selectors) {
            extensionSelectors.push(selectors)
          }
        }
      }

      const results = elt.querySelectorAll(VERB_SELECTOR + boostedSelector + ", form, [type='submit']," +
        ' [hx-ext], [data-hx-ext], [hx-trigger], [data-hx-trigger]' + extensionSelectors.flat().map(s => ', ' + s).join(''))

      return results
    } else {
      return []
    }
  }

  function maybeSetLastButtonClicked(evt: Event): void {
    const elt = getTargetButton(evt.target)
    const internalData = getRelatedFormData(evt)
    if (internalData) {
      internalData.lastButtonClicked = elt
    }
  }

  function maybeUnsetLastButtonClicked(evt: Event): void {
    const internalData = getRelatedFormData(evt)
    if (internalData) {
      internalData.lastButtonClicked = null
    }
  }

  function getTargetButton(target: EventTarget | null): HTMLButtonElement | HTMLInputElement | null {
    return closest(asElement(target)!, "button, input[type='submit']") as (HTMLButtonElement | HTMLInputElement | null)
  }

  function getRelatedForm(elt: Element): HTMLFormElement | null {
    return (elt as HTMLInputElement).form || closest(elt, 'form') as HTMLFormElement | null
  }

  function getRelatedFormData(evt: Event): HtmxNodeInternalData | undefined {
    const elt = getTargetButton(evt.target)
    if (!elt) {
      return undefined
    }
    const form = getRelatedForm(elt)
    if (!form) {
      return undefined
    }
    return getInternalData(form)
  }

  function initButtonTracking(elt: EventTarget): void {
    elt.addEventListener('click', maybeSetLastButtonClicked)
    elt.addEventListener('focusin', maybeSetLastButtonClicked)
    elt.addEventListener('focusout', maybeUnsetLastButtonClicked)
  }

  function addHxOnEventHandler(elt: Element, eventName: string, code: string): void {
    const nodeData = getInternalData(elt)
    if (!Array.isArray(nodeData.onHandlers)) {
      nodeData.onHandlers = []
    }
    let func: ((this: Element, e: Event) => void) | undefined
    const listener: EventListener = function(e: Event) {
      maybeEval(elt, function() {
        if (eltIsDisabled(elt)) {
          return
        }
        if (!func) {
          func = new Function('event', code) as (this: Element, e: Event) => void
        }
        func.call(elt, e)
      })
    }
    elt.addEventListener(eventName, listener)
    nodeData.onHandlers.push({ event: eventName, listener })
  }

  function processHxOnWildcard(elt: Element): void {
    deInitOnHandlers(elt)

    for (let i = 0; i < elt.attributes.length; i++) {
      const attr = elt.attributes[i]
      if (!attr) {
        continue
      }
      const name = attr.name
      const value = attr.value
      if (startsWith(name, 'hx-on') || startsWith(name, 'data-hx-on')) {
        const afterOnPosition = name.indexOf('-on') + 3
        const nextChar = name.slice(afterOnPosition, afterOnPosition + 1)
        if (nextChar === '-' || nextChar === ':') {
          let eventName = name.slice(afterOnPosition + 1)
          if (startsWith(eventName, ':')) {
            eventName = 'htmx' + eventName
          } else if (startsWith(eventName, '-')) {
            eventName = 'htmx:' + eventName.slice(1)
          } else if (startsWith(eventName, 'htmx-')) {
            eventName = 'htmx:' + eventName.slice(5)
          }

          addHxOnEventHandler(elt, eventName, value)
        }
      }
    }
  }

  function initNode(elt: Element): void {
    triggerEvent(elt, 'htmx:beforeProcessNode')

    const nodeData = getInternalData(elt)
    const triggerSpecs = getTriggerSpecs(elt)
    const hasExplicitHttpAction = processVerbs(elt, nodeData, triggerSpecs)

    if (!hasExplicitHttpAction) {
      if (getClosestAttributeValue(elt, 'hx-boost') === 'true') {
        boostElement(elt, nodeData, triggerSpecs)
      } else if (hasAttribute(elt, 'hx-trigger')) {
        triggerSpecs.forEach(function(triggerSpec) {
          addTriggerHandler(elt, triggerSpec, nodeData, function() {})
        })
      }
    }

    if (elt.tagName === 'FORM' || (getRawAttribute(elt, 'type') === 'submit' && hasAttribute(elt, 'form'))) {
      initButtonTracking(elt)
    }

    nodeData.firstInitCompleted = true
    triggerEvent(elt, 'htmx:afterProcessNode')
  }

  function maybeDeInitAndHash(elt: Node): boolean {
    if (!(elt instanceof Element)) {
      return false
    }

    const nodeData = getInternalData(elt)
    const hash = attributeHash(elt)
    if (nodeData.initHash !== hash) {
      deInitNode(elt)
      nodeData.initHash = hash
      return true
    }
    return false
  }

  function processNode(elt: Element | string): void {
    const resolved = resolveTarget(elt as unknown as EventTarget) as Element
    if (eltIsDisabled(resolved)) {
      cleanUpElement(resolved)
      return
    }

    const elementsToInit: Element[] = []
    if (maybeDeInitAndHash(resolved)) {
      elementsToInit.push(resolved)
    }
    forEach(findElementsToProcess(resolved), function(child) {
      if (eltIsDisabled(child)) {
        cleanUpElement(child)
        return
      }
      if (maybeDeInitAndHash(child)) {
        elementsToInit.push(child)
      }
    })

    forEach(findHxOnWildcardElements(resolved), processHxOnWildcard)
    forEach(elementsToInit, initNode)
  }

  // ========================================================================
  // Event/Log Support
  // ========================================================================

  function kebabEventName(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
  }

  function makeEvent(eventName: string, detail: unknown): CustomEvent {
    return new CustomEvent(eventName, { bubbles: true, cancelable: true, composed: true, detail })
  }

  function triggerErrorEvent(elt: EventTarget | string, eventName: string, detail?: Record<string, unknown>): void {
    triggerEvent(elt, eventName, mergeObjects({ error: eventName }, detail || {}))
  }

  function ignoreEventForLogging(eventName: string): boolean {
    return eventName === 'htmx:afterProcessNode'
  }

  function withExtensions(elt: Element | undefined, toDo: (extension: HtmxExtension) => void, extensionsToIgnore?: string[]): void {
    forEach(getExtensions(elt, [], extensionsToIgnore), function(extension) {
      try {
        toDo(extension)
      } catch (e) {
        logError(e)
      }
    })
  }

  function logError(msg: unknown): void {
    console.error(msg)
  }

  function triggerEvent<K extends keyof HtmxEventDetailMap>(elt: EventTarget | string, eventName: K, detail?: HtmxEventDetailMap[K]): boolean
  function triggerEvent(elt: EventTarget | string, eventName: string, detail?: unknown): boolean
  function triggerEvent(elt: EventTarget | string, eventName: string, detail?: unknown): boolean {
    const resolved = resolveTarget(elt as unknown as EventTarget)!
    const d: Record<string, unknown> = (detail == null ? {} : detail) as Record<string, unknown>
    d.elt = resolved
    const event = makeEvent(eventName, d)
    if (htmx.logger && !ignoreEventForLogging(eventName)) {
      htmx.logger(resolved, eventName, d)
    }
    if (d.error) {
      logError(d.error + (d.target ? ', ' + d.target : ''))
      triggerEvent(resolved, 'htmx:error', { errorInfo: d })
    }
    let eventResult = resolved.dispatchEvent(event)
    const kebabName = kebabEventName(eventName)
    if (eventResult && kebabName !== eventName) {
      const kebabedEvent = makeEvent(kebabName, event.detail)
      eventResult = eventResult && resolved.dispatchEvent(kebabedEvent)
    }
    withExtensions(asElement(resolved) || undefined, function(extension) {
      eventResult = eventResult && (extension.onEvent(eventName, event) !== false && !event.defaultPrevented)
    })
    return eventResult
  }

  // ========================================================================
  // History Support
  // ========================================================================
  const historyRuntime = createHistoryRuntime({
    getDocument,
    canAccessLocalStorage,
    parseJSON,
    normalizePath,
    triggerEvent,
    triggerErrorEvent,
    swap,
    createTransportRequest,
    htmxConfig: function() {
      return htmx.config
    },
    htmxLocation: function() {
      return htmx.location
    },
    findAll,
    removeClassFromElement,
    forEach,
    endsWith
  })

  function setCurrentPathForHistory(path: string): void {
    historyRuntime.setCurrentPathForHistory(path)
  }

  setCurrentPathForHistory(location.pathname + location.search)

  function getHistoryElement(): Element {
    return historyRuntime.getHistoryElement()
  }

  function saveToHistoryCache(url: string, rootElt: Element): void {
    historyRuntime.saveToHistoryCache(url, rootElt)
  }

  function getCachedHistory(url: string): HtmxHistoryItem | null {
    return historyRuntime.getCachedHistory(url)
  }

  function saveCurrentPageToHistory(): void {
    historyRuntime.saveCurrentPageToHistory()
  }

  function pushUrlIntoHistory(path: string): void {
    historyRuntime.pushUrlIntoHistory(path)
  }

  function replaceUrlInHistory(path: string): void {
    historyRuntime.replaceUrlInHistory(path)
  }

  function settleImmediately(tasks: HtmxSettleTask[]): void {
    historyRuntime.settleImmediately(tasks)
  }

  function loadHistoryFromServer(path: string): void {
    historyRuntime.loadHistoryFromServer(path)
  }

  function restoreHistory(path?: string): void {
    historyRuntime.restoreHistory(path)
  }

  function addRequestIndicatorClasses(elt: Element): Element[] {
    let indicators = findAttributeTargets(elt, 'hx-indicator') as Element[]
    if (indicators == null) {
      indicators = [elt]
    }
    forEach(indicators, function(ic) {
      const internalData = getInternalData(ic)
      internalData.requestCount = (internalData.requestCount || 0) + 1
      addClassToElement(ic, htmx.config.requestClass)
    })
    return indicators
  }

  function disableElements(elt: Element): Element[] {
    let disabledElts = findAttributeTargets(elt, 'hx-disabled-elt') as Element[]
    if (disabledElts == null) {
      disabledElts = []
    }
    forEach(disabledElts, function(disabledElement) {
      const internalData = getInternalData(disabledElement)
      internalData.requestCount = (internalData.requestCount || 0) + 1
      if (!disabledElement.hasAttribute('disabled')) {
        disabledElement.setAttribute('disabled', '')
        disabledElement.setAttribute('data-disabled-by-htmx', '')
      }
    })
    return disabledElts
  }

  function removeRequestIndicators(indicators: Element[], disabled: Element[]): void {
    forEach(indicators.concat(disabled), function(ele) {
      const internalData = getInternalData(ele)
      internalData.requestCount = (internalData.requestCount || 1) - 1
    })
    forEach(indicators, function(ic) {
      const internalData = getInternalData(ic)
      if (internalData.requestCount === 0) {
        removeClassFromElement(ic, htmx.config.requestClass)
      }
    })
    forEach(disabled, function(disabledElement) {
      const internalData = getInternalData(disabledElement)
      if (internalData.requestCount === 0 && disabledElement.hasAttribute('data-disabled-by-htmx')) {
        disabledElement.removeAttribute('disabled')
        disabledElement.removeAttribute('data-disabled-by-htmx')
      }
    })
  }

  // ========================================================================
  // Input Value Processing
  // ========================================================================

  function haveSeenNode(processed: Element[], elt: Element): boolean {
    for (let i = 0; i < processed.length; i++) {
      const node = processed[i]
      if (node && node.isSameNode(elt)) {
        return true
      }
    }
    return false
  }

  function shouldInclude(element: Element): boolean {
    const elt = element as HTMLInputElement
    if (elt.name === '' || elt.name == null || elt.disabled || closest(elt, 'fieldset[disabled]')) {
      return false
    }
    if ((elt.type as string) === 'button' || (elt.type as string) === 'submit' || elt.tagName === 'image' as unknown as string || elt.tagName === 'reset' as unknown as string || elt.tagName === 'file' as unknown as string) {
      return false
    }
    if (elt.type === 'checkbox' || elt.type === 'radio') {
      return elt.checked
    }
    return true
  }

  function addValueToFormData(name: string | null, value: string | string[] | FormDataEntryValue | File[] | null, formData: FormData): void {
    if (name != null && value != null) {
      if (Array.isArray(value)) {
        value.forEach(function(v) { formData.append(name, v as string | Blob) })
      } else {
        formData.append(name, value as string | Blob)
      }
    }
  }

  function removeValueFromFormData(name: string | null, value: string | string[] | null, formData: FormData): void {
    if (name != null && value != null) {
      let values = formData.getAll(name)
      if (Array.isArray(value)) {
        values = values.filter(v => value.indexOf(v as string) < 0)
      } else {
        values = values.filter(v => v !== value)
      }
      formData.delete(name)
      forEach(values, v => formData.append(name, v as string | Blob))
    }
  }

  function getValueFromInput(elt: Element): string | string[] | File[] {
    if (elt instanceof HTMLSelectElement && elt.multiple) {
      return toArray(elt.querySelectorAll('option:checked')).map(function(e) { return (e as HTMLOptionElement).value })
    }
    if (elt instanceof HTMLInputElement && elt.files) {
      return toArray(elt.files)
    }
    return (elt as HTMLInputElement).value
  }

  function processInputValue(processed: Element[], formData: FormData, errors: HtmxElementValidationError[], elt: Element | HTMLInputElement | HTMLSelectElement | HTMLFormElement | null, validate: boolean): void {
    if (elt == null || haveSeenNode(processed, elt)) {
      return
    } else {
      processed.push(elt)
    }
    if (shouldInclude(elt)) {
      const name = getRawAttribute(elt, 'name') as string | null
      addValueToFormData(name, getValueFromInput(elt), formData)
      if (validate) {
        validateElement(elt, errors)
      }
    }
    if (elt instanceof HTMLFormElement) {
      forEach(Array.from(elt.elements), function(input) {
        const el = input as HTMLInputElement
        if (processed.indexOf(el) >= 0) {
          removeValueFromFormData(el.name, getValueFromInput(el) as string | string[], formData)
        } else {
          processed.push(el)
        }
        if (validate) {
          validateElement(el, errors)
        }
      })
      new FormData(elt).forEach(function(value, name) {
        if (value instanceof File && value.name === '') {
          return
        }
        addValueToFormData(name, value, formData)
      })
    }
  }

  function validateElement(elt: Element, errors: HtmxElementValidationError[]): void {
    const element = elt as HTMLElement & ElementInternals
    if (element.willValidate) {
      triggerEvent(element, 'htmx:validation:validate')
      if (!element.checkValidity()) {
        if (
          triggerEvent(element, 'htmx:validation:failed', {
            message: element.validationMessage,
            validity: element.validity
          }) &&
          !errors.length &&
          htmx.config.reportValidityOfForms
        ) {
          element.reportValidity()
        }
        errors.push({ elt: element, message: element.validationMessage, validity: element.validity })
      }
    }
  }

  function overrideFormData(receiver: FormData, donor: FormData): FormData {
    for (const key of donor.keys()) {
      receiver.delete(key)
    }
    donor.forEach(function(value, key) {
      receiver.append(key, value)
    })
    return receiver
  }

  function getInputValues(elt: Element | HTMLFormElement, verb: HttpVerb): { errors: HtmxElementValidationError[], formData: FormData, values: Record<string, unknown> } {
    const processed: Element[] = []
    const formData = new FormData()
    const priorityFormData = new FormData()
    const errors: HtmxElementValidationError[] = []
    const internalData = getInternalData(elt)
    if (internalData.lastButtonClicked && !bodyContains(internalData.lastButtonClicked)) {
      internalData.lastButtonClicked = null
    }

    let validate = (elt instanceof HTMLFormElement && elt.noValidate !== true) || getAttributeValue(elt, 'hx-validate') === 'true'
    if (internalData.lastButtonClicked) {
      validate = validate && (internalData.lastButtonClicked as HTMLButtonElement).formNoValidate !== true
    }

    if (verb !== 'get') {
      processInputValue(processed, priorityFormData, errors, getRelatedForm(elt as Element), validate)
    }

    processInputValue(processed, formData, errors, elt, validate)

    if (internalData.lastButtonClicked || elt.tagName === 'BUTTON' ||
      (elt.tagName === 'INPUT' && getRawAttribute(elt, 'type') === 'submit')) {
      const button = internalData.lastButtonClicked || (elt as HTMLInputElement | HTMLButtonElement)
      const name = getRawAttribute(button, 'name') as string | null
      addValueToFormData(name, (button as HTMLButtonElement).value, priorityFormData)
    }

    const includes = findAttributeTargets(elt as Element, 'hx-include')
    forEach(includes, function(node) {
      processInputValue(processed, formData, errors, asElement(node), validate)
      if (!matches(node as Node, 'form')) {
        forEach(asParentNode(node)!.querySelectorAll(INPUT_SELECTOR), function(descendant) {
          processInputValue(processed, formData, errors, descendant, validate)
        })
      }
    })

    overrideFormData(formData, priorityFormData)

    return { errors, formData, values: formDataProxy(formData) }
  }

  // ========================================================================
  // Ajax
  // ========================================================================

  function getHeaders(elt: Element, target: Element, prompt?: string): HtmxHeaderSpecification {
    const headers: HtmxHeaderSpecification = {
      'HX-Request': 'true',
      'HX-Trigger': getRawAttribute(elt, 'id') as string | null,
      'HX-Trigger-Name': getRawAttribute(elt, 'name') as string | null,
      'HX-Target': getAttributeValue(target, 'id'),
      'HX-Current-URL': location.href
    }
    getValuesForElement(elt, 'hx-headers', false, headers as unknown as Record<string, unknown>)
    if (prompt !== undefined) {
      headers['HX-Prompt'] = prompt
    }
    if (getInternalData(elt).boosted) {
      headers['HX-Boosted'] = 'true'
    }
    return headers
  }

  function filterValues(inputValues: FormData, elt: Element): FormData {
    const paramsValue = getClosestAttributeValue(elt, 'hx-params')
    if (paramsValue) {
      if (paramsValue === 'none') {
        return new FormData()
      } else if (paramsValue === '*') {
        return inputValues
      } else if (paramsValue.indexOf('not ') === 0) {
        forEach(paramsValue.slice(4).split(','), function(name) {
          name = name.trim()
          inputValues.delete(name)
        })
        return inputValues
      } else {
        const newValues = new FormData()
        forEach(paramsValue.split(','), function(name) {
          name = name.trim()
          if (inputValues.has(name)) {
            inputValues.getAll(name).forEach(function(value) { newValues.append(name, value as string | Blob) })
          }
        })
        return newValues
      }
    } else {
      return inputValues
    }
  }

  function isAnchorLink(elt: Element): boolean {
    return !!getRawAttribute(elt, 'href') && (getRawAttribute(elt, 'href') as string).indexOf('#') >= 0
  }

  function getSwapSpecification(elt: Element, swapInfoOverride?: HtmxSwapStyle): HtmxSwapSpecification {
    const swapInfo = swapInfoOverride || getClosestAttributeValue(elt, 'hx-swap')
    const swapSpec: HtmxSwapSpecification = {
      swapStyle: getInternalData(elt).boosted ? 'innerHTML' : htmx.config.defaultSwapStyle,
      swapDelay: htmx.config.defaultSwapDelay,
      settleDelay: htmx.config.defaultSettleDelay
    }
    if (htmx.config.scrollIntoViewOnBoost && getInternalData(elt).boosted && !isAnchorLink(elt)) {
      swapSpec.show = 'top'
    }
    if (swapInfo) {
      const split = splitOnWhitespace(swapInfo)
      if (split.length > 0) {
        for (let i = 0; i < split.length; i++) {
          const value = split[i]
          if (value === undefined) {
            continue
          }
          if (value.indexOf('swap:') === 0) {
            swapSpec.swapDelay = parseInterval(value.slice(5))!
          } else if (value.indexOf('settle:') === 0) {
            swapSpec.settleDelay = parseInterval(value.slice(7))!
          } else if (value.indexOf('transition:') === 0) {
            swapSpec.transition = value.slice(11) === 'true'
          } else if (value.indexOf('ignoreTitle:') === 0) {
            swapSpec.ignoreTitle = value.slice(12) === 'true'
          } else if (value.indexOf('scroll:') === 0) {
            const scrollSpec = value.slice(7)
            const splitSpec = scrollSpec.split(':')
            const scrollVal = splitSpec.pop()!
            const selectorVal = splitSpec.length > 0 ? splitSpec.join(':') : null
            swapSpec.scroll = scrollVal as 'top' | 'bottom'
            swapSpec.scrollTarget = selectorVal
          } else if (value.indexOf('show:') === 0) {
            const showSpec = value.slice(5)
            const splitSpec = showSpec.split(':')
            const showVal = splitSpec.pop()!
            const selectorVal = splitSpec.length > 0 ? splitSpec.join(':') : null
            swapSpec.show = showVal
            swapSpec.showTarget = selectorVal
          } else if (value.indexOf('focus-scroll:') === 0) {
            const focusScrollVal = value.slice('focus-scroll:'.length)
            swapSpec.focusScroll = focusScrollVal == 'true'
          } else if (i == 0) {
            swapSpec.swapStyle = value
          } else {
            logError('Unknown modifier in hx-swap: ' + value)
          }
        }
      }
    }
    return swapSpec
  }

  function usesFormData(elt: Element): boolean {
    return getClosestAttributeValue(elt, 'hx-encoding') === 'multipart/form-data' ||
      (matches(elt, 'form') && getRawAttribute(elt, 'enctype') === 'multipart/form-data')
  }

  function encodeParamsForBody(xhr: XMLHttpRequest, elt: Element, filteredParameters: FormData): FormData | string {
    let encodedParameters: unknown = null
    withExtensions(elt, function(extension) {
      if (encodedParameters == null) {
        encodedParameters = extension.encodeParameters(xhr, filteredParameters, elt)
      }
    })
    if (encodedParameters != null) {
      return encodedParameters as FormData | string
    } else {
      if (usesFormData(elt)) {
        return overrideFormData(new FormData(), formDataFromObject(filteredParameters))
      } else {
        return urlEncode(filteredParameters)
      }
    }
  }

  function makeSettleInfo(target: Element): HtmxSettleInfo {
    return { tasks: [], elts: [target] }
  }

  function updateScrollState(content: Element[], swapSpec: HtmxSwapSpecification): void {
    const first = content[0]
    const last = content[content.length - 1]
    const reference = first || last || getDocument().body
    if (swapSpec.scroll) {
      let target: Element | null = null
      if (swapSpec.scrollTarget) {
        target = asElement(querySelectorExt(reference, swapSpec.scrollTarget))
      }
      if (swapSpec.scroll === 'top') {
        const scrollTarget = target || first
        if (scrollTarget) {
          scrollTarget.scrollTop = 0
        }
      }
      if (swapSpec.scroll === 'bottom') {
        const scrollTarget = target || last
        if (scrollTarget) {
          scrollTarget.scrollTop = scrollTarget.scrollHeight
        }
      }
      if (typeof swapSpec.scroll === 'number') {
        getWindow().setTimeout(function() {
          window.scrollTo(0, swapSpec.scroll as number)
        }, 0)
      }
    }
    if (swapSpec.show) {
      let target: Element | null = null
      if (swapSpec.showTarget) {
        let targetStr = swapSpec.showTarget
        if (swapSpec.showTarget === 'window') {
          targetStr = 'body'
        }
        target = asElement(querySelectorExt(reference, targetStr))
      }
      if (swapSpec.show === 'top') {
        const showTarget = target || first
        if (showTarget) {
          showTarget.scrollIntoView({ block: 'start', behavior: htmx.config.scrollBehavior as ScrollBehavior })
        }
      }
      if (swapSpec.show === 'bottom') {
        const showTarget = target || last
        if (showTarget) {
          showTarget.scrollIntoView({ block: 'end', behavior: htmx.config.scrollBehavior as ScrollBehavior })
        }
      }
    }
  }

  function getValuesForElement(elt: Element | null, attr: string, evalAsDefault?: boolean, values?: Record<string, unknown>, event?: Event): Record<string, unknown> | null {
    if (values == null) {
      values = {}
    }
    if (elt == null) {
      return values
    }
    const attributeValue = getAttributeValue(elt, attr)
    if (attributeValue) {
      let str = attributeValue.trim()
      let evaluateValue = evalAsDefault
      if (str === 'unset') {
        return null
      }
      if (str.indexOf('javascript:') === 0) {
        str = str.slice(11)
        evaluateValue = true
      } else if (str.indexOf('js:') === 0) {
        str = str.slice(3)
        evaluateValue = true
      }
      if (str.indexOf('{') !== 0) {
        str = '{' + str + '}'
      }
      let varsValues: Record<string, unknown> | null
      if (evaluateValue) {
        varsValues = maybeEval(elt, function() {
          if (event) {
            return Function('event', 'return (' + str + ')').call(elt, event)
          } else {
            return Function('return (' + str + ')').call(elt)
          }
        }, {}) as Record<string, unknown>
      } else {
        varsValues = parseJSON(str)
      }
      for (const key in varsValues) {
        if (Object.prototype.hasOwnProperty.call(varsValues, key)) {
          if (values[key] == null) {
            values[key] = varsValues[key]
          }
        }
      }
    }
    return getValuesForElement(asElement(parentElt(elt)), attr, evalAsDefault, values, event)
  }

  function maybeEval<T>(elt: EventTarget | string, toEval: () => T, defaultVal?: T): T | undefined {
    if (htmx.config.allowEval) {
      return toEval()
    } else {
      triggerErrorEvent(elt, 'htmx:evalDisallowedError')
      return defaultVal
    }
  }

  function getHXVarsForElement(elt: Element, event?: Event, expressionVars?: Record<string, unknown>): Record<string, unknown> | null {
    return getValuesForElement(elt, 'hx-vars', true, expressionVars, event)
  }

  function getHXValsForElement(elt: Element, event?: Event, expressionVars?: Record<string, unknown>): Record<string, unknown> | null {
    return getValuesForElement(elt, 'hx-vals', false, expressionVars, event)
  }

  function getExpressionVars(elt: Element, event?: Event): Record<string, unknown> {
    return mergeObjects(getHXVarsForElement(elt, event) || {}, getHXValsForElement(elt, event) || {})
  }

  function safelySetHeaderValue(xhr: XMLHttpRequest, header: string, headerValue: string | null): void {
    if (headerValue !== null) {
      try {
        xhr.setRequestHeader(header, headerValue)
      } catch (e) {
        xhr.setRequestHeader(header, encodeURIComponent(headerValue))
        xhr.setRequestHeader(header + '-URI-AutoEncoded', 'true')
      }
    }
  }

  function getPathFromResponse(xhr: XMLHttpRequest): string | undefined {
    if (xhr.responseURL) {
      try {
        const url = new URL(xhr.responseURL)
        return url.pathname + url.search
      } catch (e) {
        triggerErrorEvent(getDocument().body, 'htmx:badResponseUrl', { url: xhr.responseURL })
      }
    }
    return undefined
  }

  function hasHeader(xhr: XMLHttpRequest, regexp: RegExp): boolean {
    return regexp.test(xhr.getAllResponseHeaders())
  }

  function ajaxHelper(verb: HttpVerb, path: string, context?: Element | string | HtmxAjaxHelperContext): Promise<void> | undefined {
    verb = verb.toLowerCase() as HttpVerb
    if (context) {
      if (context instanceof Element || typeof context === 'string') {
        return issueAjaxRequest(verb, path, null, undefined, {
          targetOverride: (resolveTarget(context as unknown as EventTarget) as Element) || DUMMY_ELT,
          returnPromise: true
        })
      } else {
        let resolvedTarget = resolveTarget(context.target as unknown as EventTarget) as Element | null
        if ((context.target && !resolvedTarget) || (context.source && !resolvedTarget && !resolveTarget(context.source as unknown as EventTarget))) {
          resolvedTarget = DUMMY_ELT
        }
        return issueAjaxRequest(verb, path, resolveTarget(context.source as unknown as EventTarget) as Element | null, context.event,
          {
            handler: context.handler,
            headers: context.headers,
            values: context.values,
            targetOverride: resolvedTarget!,
            swapOverride: context.swap,
            select: context.select,
            returnPromise: true,
            push: context.push,
            replace: context.replace,
            selectOOB: context.selectOOB
          })
      }
    } else {
      return issueAjaxRequest(verb, path, null, undefined, {
        returnPromise: true
      })
    }
  }

  function hierarchyForElt(elt: Element | null): Element[] {
    const arr: Element[] = []
    while (elt) {
      arr.push(elt)
      elt = elt.parentElement
    }
    return arr
  }

  function verifyPath(elt: Element, path: string, requestConfig: HtmxRequestConfig): boolean {
    try {
      const url = new URL(path, location.protocol !== 'about:' ? location.href : window.origin)
      const origin = location.protocol !== 'about:' ? location.origin : window.origin
      const sameHost = origin === url.origin

      if (htmx.config.selfRequestsOnly && !sameHost) {
        triggerErrorEvent(elt, 'htmx:invalidPath', mergeObjects({ url, sameHost }, requestConfig as unknown as Record<string, unknown>))
        return false
      }

      return triggerEvent(elt, 'htmx:validateUrl', mergeObjects({ url, sameHost }, requestConfig as unknown as Record<string, unknown>))
    } catch (e) {
      triggerErrorEvent(elt, 'htmx:invalidPath', mergeObjects({ path, error: e }, requestConfig as unknown as Record<string, unknown>))
      return false
    }
  }

  function issueAjaxRequest(
    verb: HttpVerb,
    path: string,
    elt: Element | null,
    event?: Event,
    etc?: HtmxAjaxEtc,
    confirmed?: boolean
  ): Promise<void> | undefined {
    let resolve: (() => void) | null = null
    let reject: (() => void) | null = null
    etc = etc != null ? etc : {}
    let promise: Promise<void> | undefined
    if (etc.returnPromise && typeof Promise !== 'undefined') {
      promise = new Promise<void>(function(_resolve, _reject) {
        resolve = _resolve
        reject = _reject
      })
    }
    if (elt == null) {
      elt = getDocument().body
    }
    const responseHandler = etc.handler || handleAjaxResponse
    const select = etc.select || null

    if (!bodyContains(elt)) {
      maybeCall(resolve)
      return promise
    }
    const target = etc.targetOverride || (asElement(getTarget(elt)) as Element)
    if (target == null || target == DUMMY_ELT) {
      triggerErrorEvent(elt, 'htmx:targetError', { target: getClosestAttributeValue(elt, 'hx-target') })
      maybeCall(reject)
      return promise
    }

    let eltData = getInternalData(elt)
    const submitter = eltData.lastButtonClicked

    if (submitter) {
      const buttonPath = getRawAttribute(submitter, 'formaction')
      if (typeof buttonPath === 'string') {
        path = buttonPath
      }

      const buttonVerb = getRawAttribute(submitter, 'formmethod')
      if (typeof buttonVerb === 'string') {
        if (VERBS.includes(buttonVerb.toLowerCase() as HttpVerb)) {
          verb = buttonVerb as HttpVerb
        } else {
          maybeCall(resolve)
          return promise
        }
      }
    }

    const confirmQuestion = getClosestAttributeValue(elt, 'hx-confirm')
    if (confirmed === undefined) {
      const issueRequest = function(skipConfirmation?: boolean) {
        return issueAjaxRequest(verb, path, elt, event, etc, !!skipConfirmation)
      }
      const confirmDetails = { target, elt, path, verb, triggeringEvent: event, etc, issueRequest, question: confirmQuestion }
      if (triggerEvent(elt, 'htmx:confirm', confirmDetails) === false) {
        maybeCall(resolve)
        return promise
      }
    }

    let syncElt: Element = elt
    let syncStrategy = getClosestAttributeValue(elt, 'hx-sync')
    let queueStrategy: string | null = null
    let abortable = false
    if (syncStrategy) {
      const syncStrings = syncStrategy.split(':')
      const selector = (syncStrings[0] || '').trim()
      if (selector === 'this') {
        syncElt = findThisElement(elt, 'hx-sync')!
      } else {
        syncElt = asElement(querySelectorExt(elt, selector))!
      }
      syncStrategy = (syncStrings[1] || 'drop').trim()
      eltData = getInternalData(syncElt)
      if (syncStrategy === 'drop' && eltData.xhr && eltData.abortable !== true) {
        maybeCall(resolve)
        return promise
      } else if (syncStrategy === 'abort') {
        if (eltData.xhr) {
          maybeCall(resolve)
          return promise
        } else {
          abortable = true
        }
      } else if (syncStrategy === 'replace') {
        triggerEvent(syncElt, 'htmx:abort')
      } else if (syncStrategy.indexOf('queue') === 0) {
        const queueStrArray = syncStrategy.split(' ')
        queueStrategy = (queueStrArray[1] || 'last').trim()
      }
    }

    if (eltData.xhr) {
      if (eltData.abortable) {
        triggerEvent(syncElt, 'htmx:abort')
      } else {
        if (queueStrategy == null) {
          if (event) {
            const eventData = getInternalData(event)
            if (eventData && eventData.triggerSpec && eventData.triggerSpec.queue) {
              queueStrategy = eventData.triggerSpec.queue
            }
          }
          if (queueStrategy == null) {
            queueStrategy = 'last'
          }
        }
        if (eltData.queuedRequests == null) {
          eltData.queuedRequests = []
        }
        if (queueStrategy === 'first' && eltData.queuedRequests.length === 0) {
          eltData.queuedRequests.push(function() {
            issueAjaxRequest(verb, path, elt, event, etc)
          })
        } else if (queueStrategy === 'all') {
          eltData.queuedRequests.push(function() {
            issueAjaxRequest(verb, path, elt, event, etc)
          })
        } else if (queueStrategy === 'last') {
          eltData.queuedRequests = []
          eltData.queuedRequests.push(function() {
            issueAjaxRequest(verb, path, elt, event, etc)
          })
        }
        maybeCall(resolve)
        return promise
      }
    }

    const xhr = createTransportRequest()
    eltData.xhr = xhr
    eltData.abortable = abortable
    const endRequestLock = function() {
      eltData.xhr = null
      eltData.abortable = false
      if (eltData.queuedRequests != null && eltData.queuedRequests.length > 0) {
        const queuedRequest = eltData.queuedRequests.shift()!
        queuedRequest()
      }
    }
    const promptQuestion = getClosestAttributeValue(elt, 'hx-prompt')
    let promptResponse: string | null | undefined
    if (promptQuestion) {
      promptResponse = prompt(promptQuestion)
      if (promptResponse === null ||
        !triggerEvent(elt, 'htmx:prompt', { prompt: promptResponse, target })) {
        maybeCall(resolve)
        endRequestLock()
        return promise
      }
    }

    if (confirmQuestion && !confirmed) {
      if (!confirm(confirmQuestion)) {
        maybeCall(resolve)
        endRequestLock()
        return promise
      }
    }

    let headers = getHeaders(elt, target, promptResponse ?? undefined)

    if (verb !== 'get' && !usesFormData(elt)) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }

    if (etc.headers) {
      headers = mergeObjects(headers, etc.headers)
    }
    const results = getInputValues(elt, verb)
    let errors = results.errors
    const rawFormData = results.formData
    if (etc.values) {
      overrideFormData(rawFormData, formDataFromObject(etc.values))
    }
    const expressionVars = formDataFromObject(getExpressionVars(elt, event))
    const allFormData = overrideFormData(rawFormData, expressionVars)
    let filteredFormData = filterValues(allFormData, elt)

    if (htmx.config.getCacheBusterParam && verb === 'get') {
      filteredFormData.set('org.htmx.cache-buster', getRawAttribute(target, 'id') || 'true')
    }

    if (path == null || path === '') {
      path = location.href
    }

    const requestAttrValues = (getValuesForElement(elt, 'hx-request') || {}) as { credentials?: boolean, timeout?: number, noHeaders?: boolean }

    const eltIsBoosted = getInternalData(elt).boosted

    let useUrlParams = htmx.config.methodsThatUseUrlParams.indexOf(verb) >= 0

    const requestConfig: HtmxRequestConfig = {
      boosted: !!eltIsBoosted,
      useUrlParams,
      formData: filteredFormData,
      parameters: formDataProxy(filteredFormData),
      unfilteredFormData: allFormData,
      unfilteredParameters: formDataProxy(allFormData),
      headers,
      elt,
      target,
      verb,
      errors,
      withCredentials: !!(etc.credentials ?? requestAttrValues.credentials ?? htmx.config.withCredentials),
      timeout: etc.timeout ?? requestAttrValues.timeout ?? htmx.config.timeout,
      path,
      triggeringEvent: event || null
    }

    if (!triggerEvent(elt, 'htmx:configRequest', requestConfig as unknown as Record<string, unknown>)) {
      maybeCall(resolve)
      endRequestLock()
      return promise
    }

    path = requestConfig.path
    verb = requestConfig.verb
    headers = requestConfig.headers
    filteredFormData = formDataFromObject(requestConfig.parameters)
    errors = requestConfig.errors
    useUrlParams = requestConfig.useUrlParams

    if (errors && errors.length > 0) {
      triggerEvent(elt, 'htmx:validation:halted', requestConfig as unknown as Record<string, unknown>)
      maybeCall(resolve)
      endRequestLock()
      return promise
    }

    const splitPath = path.split('#')
  const pathNoAnchor = splitPath[0] || path
    const anchor = splitPath[1]

    let finalPath = path
    if (useUrlParams) {
      finalPath = pathNoAnchor
      const hasValues = !filteredFormData.keys().next().done
      if (hasValues) {
        if (finalPath.indexOf('?') < 0) {
          finalPath += '?'
        } else {
          finalPath += '&'
        }
        finalPath += urlEncode(filteredFormData)
        if (anchor) {
          finalPath += '#' + anchor
        }
      }
    }

    if (!verifyPath(elt, finalPath, requestConfig)) {
      maybeCall(reject)
      endRequestLock()
      return promise
    }

    xhr.open(verb.toUpperCase(), finalPath, true)
    xhr.overrideMimeType('text/html')
    xhr.withCredentials = requestConfig.withCredentials
    xhr.timeout = requestConfig.timeout

    if (requestAttrValues.noHeaders) {
      // ignore all headers
    } else {
      for (const header in headers) {
        if (Object.prototype.hasOwnProperty.call(headers, header)) {
          const headerValue = headers[header] as string | null
          safelySetHeaderValue(xhr, header, headerValue)
        }
      }
    }

    const responseInfo: HtmxResponseInfo = {
      xhr,
      target,
      requestConfig,
      etc,
      boosted: !!eltIsBoosted,
      select,
      pathInfo: {
        requestPath: path,
        finalRequestPath: finalPath,
        responsePath: null,
        anchor
      }
    }

    xhr.onload = function() {
      try {
        const hierarchy = hierarchyForElt(elt)
        responseInfo.pathInfo.responsePath = getPathFromResponse(xhr) ?? null
        responseHandler(elt!, responseInfo)
        if (responseInfo.keepIndicators !== true) {
          removeRequestIndicators(indicators, disableElts)
        }
        triggerEvent(elt!, 'htmx:afterRequest', responseInfo)
        triggerEvent(elt!, 'htmx:afterOnLoad', responseInfo)
        if (!bodyContains(elt!)) {
          let secondaryTriggerElt: Element | null = null
          while (hierarchy.length > 0 && secondaryTriggerElt == null) {
            const parentEltInHierarchy = hierarchy.shift()!
            if (bodyContains(parentEltInHierarchy)) {
              secondaryTriggerElt = parentEltInHierarchy
            }
          }
          if (secondaryTriggerElt) {
            triggerEvent(secondaryTriggerElt, 'htmx:afterRequest', responseInfo)
            triggerEvent(secondaryTriggerElt, 'htmx:afterOnLoad', responseInfo)
          }
        }
        maybeCall(resolve)
      } catch (e) {
        triggerErrorEvent(elt!, 'htmx:onLoadError', mergeObjects({ error: e }, responseInfo as unknown as Record<string, unknown>))
        throw e
      } finally {
        endRequestLock()
      }
    }
    xhr.onerror = function() {
      removeRequestIndicators(indicators, disableElts)
      triggerErrorEvent(elt!, 'htmx:afterRequest', responseInfo as unknown as Record<string, unknown>)
      triggerErrorEvent(elt!, 'htmx:sendError', responseInfo as unknown as Record<string, unknown>)
      maybeCall(reject)
      endRequestLock()
    }
    xhr.onabort = function() {
      removeRequestIndicators(indicators, disableElts)
      triggerErrorEvent(elt!, 'htmx:afterRequest', responseInfo as unknown as Record<string, unknown>)
      triggerErrorEvent(elt!, 'htmx:sendAbort', responseInfo as unknown as Record<string, unknown>)
      maybeCall(reject)
      endRequestLock()
    }
    xhr.ontimeout = function() {
      removeRequestIndicators(indicators, disableElts)
      triggerErrorEvent(elt!, 'htmx:afterRequest', responseInfo as unknown as Record<string, unknown>)
      triggerErrorEvent(elt!, 'htmx:timeout', responseInfo as unknown as Record<string, unknown>)
      maybeCall(reject)
      endRequestLock()
    }
    if (!triggerEvent(elt, 'htmx:beforeRequest', responseInfo as unknown as Record<string, unknown>)) {
      maybeCall(resolve)
      endRequestLock()
      return promise
    }
    const indicators = addRequestIndicatorClasses(elt)
    const disableElts = disableElements(elt)

    forEach(['loadstart', 'loadend', 'progress', 'abort'], function(eventName) {
      forEach([xhr as unknown as EventTarget, xhr.upload as unknown as EventTarget], function(t) {
        t.addEventListener(eventName, function(evt: Event) {
          const progressEvt = evt as ProgressEvent
          triggerEvent(elt!, 'htmx:xhr:' + eventName, {
            lengthComputable: progressEvt.lengthComputable,
            loaded: progressEvt.loaded,
            total: progressEvt.total
          })
        })
      })
    })
    triggerEvent(elt, 'htmx:beforeSend', responseInfo as unknown as Record<string, unknown>)
    const params = useUrlParams ? null : encodeParamsForBody(xhr, elt, filteredFormData)
    xhr.send(params as XMLHttpRequestBodyInit | null)
    return promise
  }

  function determineHistoryUpdates(elt: Element, responseInfo: HtmxResponseInfo): HtmxHistoryUpdate {
    const xhr = responseInfo.xhr

    let pathFromHeaders: string | null = null
    let typeFromHeaders: string | null = null
    if (hasHeader(xhr, /HX-Push:/i)) {
      pathFromHeaders = xhr.getResponseHeader('HX-Push')
      typeFromHeaders = 'push'
    } else if (hasHeader(xhr, /HX-Push-Url:/i)) {
      pathFromHeaders = xhr.getResponseHeader('HX-Push-Url')
      typeFromHeaders = 'push'
    } else if (hasHeader(xhr, /HX-Replace-Url:/i)) {
      pathFromHeaders = xhr.getResponseHeader('HX-Replace-Url')
      typeFromHeaders = 'replace'
    }

    if (pathFromHeaders) {
      if (pathFromHeaders === 'false') {
        return {}
      } else {
        return {
          type: typeFromHeaders,
          path: pathFromHeaders
        }
      }
    }

    const requestPath = responseInfo.pathInfo.finalRequestPath
    const responsePath = responseInfo.pathInfo.responsePath

    let pushUrl = responseInfo.etc.push || getClosestAttributeValue(elt, 'hx-push-url')
    let replaceUrl = responseInfo.etc.replace || getClosestAttributeValue(elt, 'hx-replace-url')
    if (pushUrl === 'false') pushUrl = null as unknown as string
    if (replaceUrl === 'false') replaceUrl = null as unknown as string
    const elementIsBoosted = getInternalData(elt).boosted

    let saveType: string | null = null
    let path: string | null = null

    if (pushUrl) {
      saveType = 'push'
      path = pushUrl
    } else if (replaceUrl) {
      saveType = 'replace'
      path = replaceUrl
    } else if (elementIsBoosted) {
      saveType = 'push'
      path = responsePath || requestPath
    }

    if (path) {
      if (path === 'true') {
        path = responsePath || requestPath
      }

      if (responseInfo.pathInfo.anchor && path.indexOf('#') === -1) {
        path = path + '#' + responseInfo.pathInfo.anchor
      }

      return {
        type: saveType,
        path
      }
    } else {
      return {}
    }
  }

  function codeMatches(responseHandlingConfig: HtmxResponseHandlingConfig, status: number): boolean {
    const regExp = new RegExp(responseHandlingConfig.code!)
    return regExp.test(status.toString(10))
  }

  function resolveResponseHandling(xhr: XMLHttpRequest): HtmxResponseHandlingConfig {
    for (let i = 0; i < htmx.config.responseHandling.length; i++) {
      const responseHandlingElement = htmx.config.responseHandling[i]
      if (!responseHandlingElement) {
        continue
      }
      if (codeMatches(responseHandlingElement, xhr.status)) {
        return responseHandlingElement
      }
    }
    return {
      swap: false
    }
  }

  function handleTitle(title: string): void {
    if (title) {
      const titleElt = find('title')
      if (titleElt) {
        titleElt.textContent = title
      } else {
        window.document.title = title
      }
    }
  }

  function resolveRetarget(elt: Element, target: string): Element {
    if (target === 'this') {
      return elt
    }
    const resolvedTarget = asElement(querySelectorExt(elt, target))
    if (resolvedTarget == null) {
      triggerErrorEvent(elt, 'htmx:targetError', { target })
      throw new Error(`Invalid re-target ${target}`)
    }
    return resolvedTarget
  }

  function handleAjaxResponse(elt: Element, responseInfo: HtmxResponseInfo): void {
    const xhr = responseInfo.xhr
    let target = responseInfo.target
    const etc = responseInfo.etc
    const responseInfoSelect = responseInfo.select

    if (!triggerEvent(elt, 'htmx:beforeOnLoad', responseInfo as unknown as Record<string, unknown>)) return

    if (hasHeader(xhr, /HX-Trigger:/i)) {
      handleTriggerHeader(xhr, 'HX-Trigger', elt)
    }

    if (hasHeader(xhr, /HX-Location:/i)) {
      let redirectPath = xhr.getResponseHeader('HX-Location')!
      let redirectSwapSpec: HtmxAjaxHelperContext & { path?: string } = {}
      if (redirectPath.indexOf('{') === 0) {
        redirectSwapSpec = parseJSON(redirectPath) || {}
        redirectPath = redirectSwapSpec.path!
        delete redirectSwapSpec.path
      }
      redirectSwapSpec.push = redirectSwapSpec.push ?? 'true'
      ajaxHelper('get', redirectPath, redirectSwapSpec)
      return
    }

    const shouldRefresh = hasHeader(xhr, /HX-Refresh:/i) && xhr.getResponseHeader('HX-Refresh') === 'true'

    if (hasHeader(xhr, /HX-Redirect:/i)) {
      responseInfo.keepIndicators = true
      htmx.location.href = xhr.getResponseHeader('HX-Redirect')!
      shouldRefresh && htmx.location.reload()
      return
    }

    if (shouldRefresh) {
      responseInfo.keepIndicators = true
      htmx.location.reload()
      return
    }

    const historyUpdate = determineHistoryUpdates(elt, responseInfo)

    const responseHandling = resolveResponseHandling(xhr)
    const shouldSwap = responseHandling.swap
    let isError = !!responseHandling.error
    let ignoreTitle = htmx.config.ignoreTitle || responseHandling.ignoreTitle
    let selectOverride = responseHandling.select
    if (responseHandling.target) {
      responseInfo.target = resolveRetarget(elt, responseHandling.target)
    }
    let swapOverride = etc.swapOverride
    if (swapOverride == null && responseHandling.swapOverride) {
      swapOverride = responseHandling.swapOverride
    }

    if (hasHeader(xhr, /HX-Retarget:/i)) {
      responseInfo.target = resolveRetarget(elt, xhr.getResponseHeader('HX-Retarget')!)
    }

    if (hasHeader(xhr, /HX-Reswap:/i)) {
      swapOverride = xhr.getResponseHeader('HX-Reswap')!
    }

    let serverResponse: unknown = xhr.response
    const beforeSwapDetails: HtmxBeforeSwapDetails = mergeObjects({
      shouldSwap,
      serverResponse,
      isError,
      ignoreTitle,
      selectOverride,
      swapOverride
    }, responseInfo as unknown as Record<string, unknown>) as unknown as HtmxBeforeSwapDetails

    if (responseHandling.event && !triggerEvent(target, responseHandling.event, beforeSwapDetails as unknown as Record<string, unknown>)) return

    if (!triggerEvent(target, 'htmx:beforeSwap', beforeSwapDetails as unknown as Record<string, unknown>)) return

    target = beforeSwapDetails.target
    serverResponse = beforeSwapDetails.serverResponse
    isError = beforeSwapDetails.isError
    ignoreTitle = beforeSwapDetails.ignoreTitle
    selectOverride = beforeSwapDetails.selectOverride ?? undefined
    swapOverride = beforeSwapDetails.swapOverride

    responseInfo.target = target
    responseInfo.failed = isError
    responseInfo.successful = !isError

    if (beforeSwapDetails.shouldSwap) {
      if (xhr.status === 286) {
        cancelPolling(elt)
      }

      withExtensions(elt, function(extension) {
        serverResponse = extension.transformResponse(serverResponse, xhr, elt)
      })

      if (historyUpdate.type) {
        saveCurrentPageToHistory()
      }

      const swapSpec = getSwapSpecification(elt, swapOverride)

      if (!Object.prototype.hasOwnProperty.call(swapSpec, 'ignoreTitle')) {
        swapSpec.ignoreTitle = ignoreTitle
      }

      addClassToElement(target, htmx.config.swappingClass)

      if (responseInfoSelect) {
        selectOverride = responseInfoSelect
      }

      if (hasHeader(xhr, /HX-Reselect:/i)) {
        selectOverride = xhr.getResponseHeader('HX-Reselect')!
      }

      const selectOOB = etc.selectOOB || getClosestAttributeValue(elt, 'hx-select-oob')
      const select = getClosestAttributeValue(elt, 'hx-select')

      swap(target, serverResponse as string, swapSpec, {
        select: selectOverride === 'unset' ? null : selectOverride || select,
        selectOOB: selectOOB ?? undefined,
        eventInfo: responseInfo,
        anchor: responseInfo.pathInfo.anchor,
        contextElement: elt,
        afterSwapCallback: function() {
          if (hasHeader(xhr, /HX-Trigger-After-Swap:/i)) {
            let finalElt: EventTarget = elt
            if (!bodyContains(elt)) {
              finalElt = getDocument().body
            }
            handleTriggerHeader(xhr, 'HX-Trigger-After-Swap', finalElt)
          }
        },
        afterSettleCallback: function() {
          if (hasHeader(xhr, /HX-Trigger-After-Settle:/i)) {
            let finalElt: EventTarget = elt
            if (!bodyContains(elt)) {
              finalElt = getDocument().body
            }
            handleTriggerHeader(xhr, 'HX-Trigger-After-Settle', finalElt)
          }
        },
        beforeSwapCallback: function() {
          if (historyUpdate.type) {
            triggerEvent(getDocument().body, 'htmx:beforeHistoryUpdate', mergeObjects({ history: historyUpdate }, responseInfo as unknown as Record<string, unknown>))
            if (historyUpdate.type === 'push') {
              pushUrlIntoHistory(historyUpdate.path!)
              triggerEvent(getDocument().body, 'htmx:pushedIntoHistory', { path: historyUpdate.path })
            } else {
              replaceUrlInHistory(historyUpdate.path!)
              triggerEvent(getDocument().body, 'htmx:replacedInHistory', { path: historyUpdate.path })
            }
          }
        }
      })
    }
    if (isError) {
      triggerErrorEvent(elt, 'htmx:responseError', mergeObjects({ error: 'Response Status Error Code ' + xhr.status + ' from ' + responseInfo.pathInfo.requestPath }, responseInfo as unknown as Record<string, unknown>))
    }
  }

  // ========================================================================
  // Extensions API
  // ========================================================================

  const extensionsRuntime = createExtensionsRuntime({
    mergeObjects,
    getAttributeValue,
    asElement,
    parentElt,
    forEach,
    getInternalApi: function() {
      return internalAPI
    }
  })

  function defineExtension(name: string, extension: Partial<HtmxExtension>): void {
    extensionsRuntime.defineExtension(name, extension)
  }

  function removeExtension(name: string): void {
    extensionsRuntime.removeExtension(name)
  }

  function getExtensions(elt?: Element, extensionsToReturn?: HtmxExtension[], extensionsToIgnore?: string[]): HtmxExtension[] {
    return extensionsRuntime.getExtensions(elt, extensionsToReturn, extensionsToIgnore)
  }

  // ========================================================================
  // Initialization
  // ========================================================================
  let isReady = false
  let isInitialized = false
  let mutationObserver: MutationObserver | null = null
  getDocument().addEventListener('DOMContentLoaded', function() {
    isReady = true
  })

  function ready(fn: () => void): void {
    if (isReady || getDocument().readyState === 'complete') {
      fn()
    } else {
      getDocument().addEventListener('DOMContentLoaded', fn)
    }
  }

  function insertIndicatorStyles(): void {
    if (htmx.config.includeIndicatorStyles !== false) {
      const nonceAttribute = htmx.config.inlineStyleNonce ? ` nonce="${htmx.config.inlineStyleNonce}"` : ''
      const indicator = htmx.config.indicatorClass
      const request = htmx.config.requestClass
      getDocument().head.insertAdjacentHTML('beforeend',
        toTrustedHTML(
          `<style${nonceAttribute}>` +
          `.${indicator}{opacity:0;visibility: hidden} ` +
          `.${request} .${indicator}, .${request}.${indicator}{opacity:1;visibility: visible;transition: opacity 200ms ease-in}` +
          '</style>'
        )
      )
    }
  }

  function getMetaConfig(): Partial<HtmxConfig> | null {
    const element = getDocument().querySelector('meta[name="htmx-config"]') as HTMLMetaElement | null
    if (element) {
      return parseJSON(element.content)
    } else {
      return null
    }
  }

  function mergeMetaConfig(): void {
    const metaConfig = getMetaConfig()
    if (metaConfig) {
      htmx.config = mergeObjects(htmx.config, metaConfig)
    }
  }

  function init(): void {
    if (isInitialized) {
      return
    }

    ready(function() {
      if (isInitialized) {
        return
      }
      isInitialized = true

      mergeMetaConfig()
      insertIndicatorStyles()
      let body: Element | null = getDocument().body
      processNode(body)

      if (body && htmx.config.useMutationObserverProcessing) {
        mutationObserver = startIncrementalProcessing({
          root: body,
          processNode: function(node) {
            processNode(node)
          }
        })
      }

      const restoredElts = getDocument().querySelectorAll(
        "[hx-trigger='restored'],[data-hx-trigger='restored']"
      )
      body.addEventListener('htmx:abort', function(evt: Event) {
        const target = (evt as CustomEvent).detail?.elt || evt.target
        const internalData = getInternalData(target as EventTarget)
        if (internalData && internalData.xhr) {
          internalData.xhr.abort()
        }
      })
      window.addEventListener('popstate', function(event: PopStateEvent) {
        if (event.state && event.state.htmx) {
          restoreHistory()
          forEach(restoredElts, function(elt) {
            triggerEvent(elt, 'htmx:restored', {
              document: getDocument(),
              triggerEvent
            })
          })
        }
      })
      getWindow().setTimeout(function() {
        triggerEvent(body!, 'htmx:load', {})
        body = null
      }, 0)
    })
  }

  return htmx as HtmxApi
}

/**
 * Singleton HTMX runtime instance.
 */
export const htmx: HtmxApi = createHtmx()
window.htmx = htmx
export default htmx

declare global {
  interface Window {
    htmx: HtmxApi
  }
}
