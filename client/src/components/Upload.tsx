import React, { ChangeEvent, useEffect, useState } from 'react'
import { Row, Col, Input, Image, Button, message, Table } from 'antd'
import { request } from '../utils'

interface Part {
  chunk: Blob
  size: number
  chunkName?: string
  fileName?: string
  loaded?: number
  percent?: number
  xhr?: any
}

interface Uploaded {
  fileName: string
  size: number
}

const FILE_MAX_SIZE = 1024 * 500
const DEFAULT_SIZE = 1024 * 50

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
    // setPartList(partList)
    await uploadParts(partList, fileName)
  }

  async function verify(fileName: string) {
    return await request({
      method: 'get',
      url: `/verify/${fileName}`
    })
  }

  async function uploadParts(partList: Part[], fileName: string) {
    const { needUpload, uploadList } = await verify(fileName)
    if (!needUpload) {
      message.success('秒传成功')
    }

    let requests = createRequests(partList, uploadList, fileName)
    await Promise.all(requests)
    await request({
      url: `/merge/${fileName}`,
      method: 'get'
    })
  }

  function createRequests(
    partList: Part[],
    uploadList: Uploaded[],
    fileName: string
  ) {
    return partList
      .filter((part: Part) => {
        const uploadFile = uploadList.find(
          (item) => item.fileName === part.chunkName
        )

        if (!uploadFile) {
          part.loaded = 0
          part.percent = 0
          return true
        }
        if (uploadFile.size < part.chunk.size) {
          part.loaded = uploadFile.size
          part.percent = Number(
            ((part.loaded / part.chunk.size) * 100).toFixed(2)
          )
          return true
        }
        return false
      })
      .map((part: Part) =>
        request({
          url: `/upload/${fileName}/${part.chunkName}`,
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          setXHR: (xhr: XMLHttpRequest) => (part.xhr = xhr),
          onProgress: (event: ProgressEvent) => {
            part.percent = Number(
              (((part.loaded! + event.loaded) / part.chunk.size) * 100).toFixed(
                2
              )
            )
            setPartList(partList)
            console.log('partList >>> ', JSON.stringify(partList))
          },
          data: part.chunk
        })
      )
  }
  function handlePause() {
    partList.forEach((part: Part) => part.xhr && part.xhr.abort())
  }
  async function handleResume() {
    await uploadParts(partList, fileName)
  }

  const columns = [
    {
      title: '切片名称',
      dataIndex: 'fileName',
      key: 'fileName',
      width: '20%'
    },
    {
      title: '切片名称',
      dataIndex: 'percent',
      key: 'percent',
      width: '80%'
    }
  ]

  const uploadProgress = (
    <>{/* <Table columns={columns} dataSource={partList}></Table> */}</>
  )

  return (
    <>
      {partList.map((item, index) => (
        <li key={index}>{JSON.stringify(item)}</li>
      ))}
      <Row>
        <Col span={12}>
          <Input type='file' style={{ width: 399 }} onChange={handleChange} />
          <Button
            type='primary'
            style={{ marginRight: 20 }}
            onClick={handleFileUpload}
          >
            上传
          </Button>
          <Button
            type='primary'
            style={{ marginRight: 20 }}
            onClick={handlePause}
          >
            暂停
          </Button>
          <Button type='primary' onClick={handleResume}>
            恢复
          </Button>
        </Col>
        <Col span={12}>{/* <Image src={objectURL} /> */}</Col>
      </Row>
      {uploadProgress}
    </>
  )
}

function calculateHash(partList: Part[]) {
  return new Promise((resolve) => {
    const worker = new Worker('/hash.js')
    worker.postMessage({ partList })
    worker.onmessage = (event) => {
      const { percent, hash } = event.data

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
// 验证文件的合法性
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
