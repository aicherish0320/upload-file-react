import React, { ChangeEvent, useEffect, useState } from 'react'
import { Row, Col, Input, Image, Button, message } from 'antd'
import { request } from '../utils'

interface Part {
  chunk: Blob
  size: number
  chunkName?: string
  fileName?: string
}

const FILE_MAX_SIZE = 1024 * 500
const DEFAULT_SIZE = 1024 * 10

function Upload() {
  const [currentFile, setCurrentFile] = useState<File>()
  const [objectURL, setObjectURL] = useState<string>('')
  const [hashPercent, setHashPercent] = useState<number>(0)
  const [fileName, setFileName] = useState<string>('')
  const [partList, setPartList] = useState<Part[]>([])

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file: File = event.target.files![0]
    setCurrentFile(file)
  }

  useEffect(() => {
    let objectURL: string
    if (currentFile) {
      objectURL = window.URL.createObjectURL(currentFile)
      setObjectURL(objectURL)
    }

    return () => {
      window.URL.revokeObjectURL(objectURL)
    }
  }, [currentFile])

  async function handleFileUpload() {
    if (!currentFile) {
      message.error('请选择上传文件')
      return
    }
    // if (!allowUpload(currentFile)) {
    //   return
    // }

    // 分片上传
    let partList: Part[] = createChunks(currentFile)
    console.log('partList >>> ', partList)
    // 先计算这个对象哈希值 用来实现秒传功能
    // 通过 web worker 子进程来计算 哈希
    const fileHash = await calculateHash(partList)
    const lastDotIndex = currentFile.name.lastIndexOf('.')
    const extName = currentFile.name.slice(lastDotIndex)
    const fileName = `${fileHash}${extName}`
    setFileName(fileName)
    partList = partList.map(({ chunk, size }, index) => ({
      fileName,
      chunkName: `${fileName}-${index}`,
      chunk,
      size
    }))
    setPartList(partList)
    await uploadParts(partList, fileName)
  }

  async function uploadParts(partList: Part[], fileName: string) {
    let requests = createRequests(partList, fileName)
    await Promise.all(requests)
    await request({
      url: `/merge/${fileName}`,
      method: 'get'
    })
  }

  function createRequests(partList: Part[], fileName: string) {
    return partList.map((part: Part) =>
      request({
        url: `/upload/${fileName}/${part.chunkName}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        data: part.chunk
      })
    )
  }

  return (
    <Row>
      <Col span={12}>
        <Input type="file" style={{ width: 399 }} onChange={handleChange} />
        <Button type="primary" onClick={handleFileUpload}>
          上传
        </Button>
      </Col>
      <Col span={12}>
        <Image src={objectURL} />
      </Col>
    </Row>
  )
}

function calculateHash(partList: Part[]) {
  return new Promise((resolve) => {
    const worker = new Worker('/hash.js')
    worker.postMessage({ partList })
    worker.onmessage = (event) => {
      const { percent, hash } = event.data
      console.log('percent >>> ', percent)

      if (hash) {
        resolve(hash)
      }
    }
  })
}

function createChunks(file: File): Part[] {
  let current = 0
  let partList: Part[] = []
  while (current < file.size) {
    const chunk = file.slice(current, current + DEFAULT_SIZE)
    partList.push({ chunk, size: chunk.size })
    current += DEFAULT_SIZE
  }

  return partList
}

function isValidFileType(file: File) {
  const validFileTypes = ['image/jpg', 'image/jpeg', 'image/gif']
  return validFileTypes.includes(file.type)
}

function isValidFileSize(file: File) {
  return file.size < FILE_MAX_SIZE
}

function allowUpload(file: File) {
  if (!isValidFileType(file)) {
    message.error('请选择正确的文件格式')
    return false
  }
  if (!isValidFileSize(file)) {
    message.error('请选择大小合适的文件')
    return false
  }
  return true
}

export default Upload
