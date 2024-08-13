import express, { json } from 'express'
import { createChivasRouter } from './routes/chivas.js'
import 'dotenv/config.js'

const corsOptions = {
  origin: 'https://example.com', 
  optionsSuccessStatus: 200 
};

export function createApp( { chivasModel } ) {
  const app = express()
  app.use(json())
  app.use(cors(corsOptions));
  app.disable('x-powered-by')

  app.use( '/chivas', createChivasRouter( { chivasModel } ) )

  const PORT = process.env.PORT || 3000

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
  })
}
