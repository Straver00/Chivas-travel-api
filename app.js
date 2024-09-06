import express, { json } from 'express'
import { createChivasRouter } from './routes/chivasRouter.js'
import 'dotenv/config.js'
import cors from 'cors'
import cookieParser from 'cookie-parser'

export function createApp( { chivasModel } ) {
  const app = express()
  app.use(express.json())
  app.use(cors({
    origin: 'https://straver00.github.io', 
    credentials: true
  }))
  app.use(cookieParser())
  
  app.disable('x-powered-by')

  
  app.use( '/chivas', createChivasRouter({ chivasModel }))

  const PORT = process.env.PORT || 3000

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
  })
}
