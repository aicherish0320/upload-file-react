interface RequestOptions {
  baseURL?: string
  method: string
  url: string
  headers?: any
  data?: any
}

export function request(options: RequestOptions): Promise<any> {
  const defaultOptions = {
    method: 'get',
    baseURL: 'http://localhost:3001',
    headers: {},
    data: {}
  }
  options = {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...options.headers }
  }

  return new Promise((resolve: Function, reject: Function) => {
    const xhr = new XMLHttpRequest()
    xhr.open(options.method, options.baseURL + options.url)

    for (const key in options.headers) {
      xhr.setRequestHeader(key, options.headers[key])
    }

    xhr.send(options.data)

    xhr.responseType = 'json'

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve(xhr.response)
        } else {
          reject(xhr.response)
        }
      }
    }
  })
}
