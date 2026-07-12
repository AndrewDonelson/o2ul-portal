/**
 * @file form-data-utils.ts
 * @description Utility helpers for URL encoding and FormData proxy/object transforms.
 */

function appendParam(returnStr: string, name: string, realValue: unknown): string {
  if (returnStr !== "") {
    returnStr += "&"
  }
  if (String(realValue) === "[object Object]") {
    realValue = JSON.stringify(realValue)
  }
  const s = encodeURIComponent(String(realValue))
  returnStr += encodeURIComponent(name) + "=" + s
  return returnStr
}

export function formDataFromObject(obj: Record<string, unknown> | FormData): FormData {
  if (obj instanceof FormData) return obj
  const formData = new FormData()
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as Record<string, unknown>)[key]
      if (value && typeof (value as { forEach?: unknown }).forEach === "function") {
        (value as unknown[]).forEach(function(v) { formData.append(key, v as string | Blob) })
      } else if (typeof value === "object" && value !== null && !(value instanceof Blob)) {
        formData.append(key, JSON.stringify(value))
      } else {
        formData.append(key, value as string | Blob)
      }
    }
  }
  return formData
}

export function urlEncode(values: FormData | Record<string, unknown>): string {
  const fd = formDataFromObject(values)
  let returnStr = ""
  fd.forEach(function(value, key) {
    returnStr = appendParam(returnStr, key, value)
  })
  return returnStr
}

function formDataArrayProxy(formData: FormData, name: string, array: unknown[]): unknown[] {
  return new Proxy(array, {
    get: function(target, key) {
      if (typeof key === "number") return target[key]
      if (key === "length") return target.length
      if (key === "push") {
        return function(value: unknown) {
          target.push(value)
          formData.append(name, value as string | Blob)
        }
      }
      if (typeof (target as unknown as Record<string, unknown>)[key as string] === "function") {
        const fn = (target as unknown as Record<string, (...a: unknown[]) => unknown>)[key as string]
        return function(...args: unknown[]) {
          fn?.apply(target, args)
          formData.delete(name)
          target.forEach(function(v) { formData.append(name, v as string | Blob) })
        }
      }

      const indexed = (target as unknown as Record<string, unknown[]>)[key as string]
      if (indexed && (indexed as unknown[]).length === 1) {
        return (indexed as unknown[])[0]
      } else {
        return indexed
      }
    },
    set: function(target, index, value) {
      (target as unknown as Record<string | symbol, unknown>)[index] = value
      formData.delete(name)
      target.forEach(function(v) { formData.append(name, v as string | Blob) })
      return true
    }
  }) as unknown[]
}

export function formDataProxy(formData: FormData): Record<string, unknown> {
  return new Proxy(formData, {
    get: function(target, name) {
      if (typeof name === "symbol") {
        const result = Reflect.get(target, name)
        if (typeof result === "function") {
          return function(...args: unknown[]) {
            return (result as (...a: unknown[]) => unknown).apply(formData, args)
          }
        } else {
          return result
        }
      }
      if (name === "toJSON") {
        return () => Object.fromEntries(formData)
      }
      if (name in target) {
        const member = (target as unknown as Record<string, unknown>)[name as string]
        if (typeof member === "function") {
          const memberFn = (formData as unknown as Record<string, (...a: unknown[]) => unknown>)[name as string]
          return function(...args: unknown[]) {
            return memberFn?.apply(formData, args)
          }
        }
      }
      const array = formData.getAll(name as string)
      if (array.length === 0) {
        return undefined
      } else if (array.length === 1) {
        return array[0]
      } else {
        return formDataArrayProxy(target, name as string, array)
      }
    },
    set: function(target, name, value) {
      if (typeof name !== "string") {
        return false
      }
      target.delete(name)
      if (value && typeof (value as { forEach?: unknown }).forEach === "function") {
        (value as unknown[]).forEach(function(v) { target.append(name, v as string | Blob) })
      } else if (typeof value === "object" && value !== null && !(value instanceof Blob)) {
        target.append(name, JSON.stringify(value))
      } else {
        target.append(name, value as string | Blob)
      }
      return true
    },
    deleteProperty: function(target, name) {
      if (typeof name === "string") {
        target.delete(name)
      }
      return true
    },
    ownKeys: function(target) {
      return Reflect.ownKeys(Object.fromEntries(target))
    },
    getOwnPropertyDescriptor: function(target, prop) {
      return Reflect.getOwnPropertyDescriptor(Object.fromEntries(target), prop)
    }
  }) as unknown as Record<string, unknown>
}
