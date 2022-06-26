import React, { ChangeEvent, useEffect, useState } from 'react'
import { Row, Col, Input, Image, Button, message } from 'antd'
import './App.css'
import { request } from './utils'

const FILE_MAX_SIZE = 1024 * 50

function App() {
  const [currentFile, setCurrentFile] = useState<File>()
  const [objectURL, setObjectURL] = useState<string>('')

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
    if (!allowUpload(currentFile)) {
      return
    }

    const formData = new FormData()
    formData.append('chunk', currentFile)
    formData.append('fileName', currentFile.name)

    try {
      const ret = await request({
        method: 'post',
        url: '/upload',
        data: formData
      })
      console.log(ret)
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <Row>
      <Col span={12}>
        <Input type='file' style={{ width: 399 }} onChange={handleChange} />
        <Button type='primary' onClick={handleFileUpload}>
          上传
        </Button>
      </Col>
      <Col span={12}>
        <Image src={objectURL} />
      </Col>
    </Row>
  )
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

export default App
