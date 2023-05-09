/**
 * 防抖工具函数
 */
export const debounce = function<T extends (...args: any) => any>(fn: T, delay = 300) {
  let timer = 0

  return (...rest: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...rest as any)
    }, delay)
  }
} 