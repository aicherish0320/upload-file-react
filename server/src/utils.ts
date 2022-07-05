import path from 'path'
import fse, { WriteStream } from 'fs-extra'

const DEFAULT_SIZE = 50 * 1024
export const TEMP_DIR = path.resolve(__dirname, 'temp')
export const PUBLIC_DIR = path.resolve(__dirname, 'public')

export const splitChunks = async (
  fileName: string,
  size: number = DEFAULT_SIZE
) => {
  // 要分割的文件路径
  const filePath = path.resolve(__dirname, fileName)
  // 存储分片的临时目录
  const chunksDir = path.resolve(TEMP_DIR, fileName)
  // 递归创建文件夹
  await fse.mkdirp(chunksDir)
  // content 是一个 Buffer 其实就是一个字节数组 1字节=8位bit
  let content = await fse.readFile(filePath)
  let i = 0,
    current = 0,
    contentLength = content.length

  while (current < contentLength) {
    await fse.writeFile(
      path.resolve(chunksDir, fileName + '-' + i),
      content.slice(current, current + size)
    )
    i++
    current += size
  }
}

const pipeStream = (filePath: string, ws: WriteStream) =>
  new Promise((resolve: Function, reject) => {
    const rs = fse.createReadStream(filePath)
    rs.on('end', async () => {
      rs.close()
      await fse.unlink(filePath)
      resolve()
    })
    rs.pipe(ws)
  })

export const mergeChunks = async (
  fileName: string,
  size: number = DEFAULT_SIZE
) => {
  const filePath = path.resolve(PUBLIC_DIR, fileName)
  const chunksDir = path.resolve(TEMP_DIR, fileName)
  const chunkFiles = await fse.readdir(chunksDir)
  // 按文件名升序排列
  chunkFiles.sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]))

  await Promise.all(
    chunkFiles.map((item, index) =>
      pipeStream(
        path.resolve(chunksDir, item),
        fse.createWriteStream(filePath, {
          start: index * size
        })
      )
    )
  )
  await fse.rmdir(chunksDir)
}
