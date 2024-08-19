import { Router } from 'express'
import { ChivasController } from '../controllers/chivas.js'

export const createChivasRouter = ( { chivasModel } ) => {
  const chivasRouter = Router()

  const controller = new ChivasController({ chivasModel })

  //chivasRouter.get('/viajes', controller.getAll)
  //chivasRouter.get('/viajes/:id', controller.getOne)
  //chivasRouter.post('/reserva', controller.create)

  chivasRouter.post('/login', controller.login)
  chivasRouter.post('/register', controller.register)
  //chivasRouter.post('/logout', controller.logout)
  //chivasRouter.get('/protected', controller.protected)

  return chivasRouter
}