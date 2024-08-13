import { Router } from 'express'
import { ChivasController } from '../controllers/chivas.js'

export const createChivasRouter = ( { chivasModel } ) => {
  const chivasRouter = Router()

  const controller = new ChivasController({ chivasModel })

  chivasRouter.get('/', movieController.getAll())
}