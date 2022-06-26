self.importScripts(
  'https://cdn.bootcdn.net/ajax/libs/spark-md5/3.0.2/spark-md5.min.js'
)

self.onmessage = async (event) => {
  const { partList } = event.data
  const spark = new self.SparkMD5.ArrayBuffer()

  let percent = 0
  let perSize = 100 / partList.length

  const buffers = await Promise.all(
    partList.map(
      ({ chunk, size }) =>
        new Promise((resolve) => {
          {
            const reader = new FileReader()
            reader.readAsArrayBuffer(chunk)
            reader.onload = function (event) {
              percent += perSize
              self.postMessage({ percent: Number(percent.toFixed(2)) })
              resolve(event.target.result)
            }
          }
        })
    )
  )
  buffers.forEach((buffer) => spark.append(buffer))
  self.postMessage({ percent: 100, hash: spark.end() })
  self.close()
}
