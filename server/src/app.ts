import express, { Request, Response, NextFunction } from 'express'
import logger from 'morgan'
import { INTERNAL_SERVER_ERROR } from 'http-status-codes'
import createError from 'http-errors'
import cors from 'cors'
import path from 'path'
import fs from 'fs-extra'
import multiparty from 'multiparty'

const PUBLIC_DIR = path.resolve(__dirname, 'public')

const app = express()
app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use(express.static(path.resolve(__dirname, 'public')))

app.post('/upload', async (req: Request, res: Response, next: NextFunction) => {
  const form = new multiparty.Form()
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return next(err)
    }

    const fileName = fields.fileName[0]
    const chunk = files.chunk[0]
    await fs.move(chunk.path, path.resolve(PUBLIC_DIR, fileName), {
      overwrite: true
    })

    res.json({
      success: true
    })
  })
})

app.use(function (_req, _res, next) {
  next(createError(404))
})

app.use(function (
  error: any,
  _req: Request,
  res: Response,
  next: NextFunction
) {
  res.status(error.status || INTERNAL_SERVER_ERROR)
  res.json({
    success: false,
    error
  })
})

export default app
