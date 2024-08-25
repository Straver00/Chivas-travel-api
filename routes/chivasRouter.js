import { Router } from 'express'
import { ChivasController } from '../controllers/chivas.js'
import { isAuth } from '../tools/auth.js'

export const createChivasRouter = ( { chivasModel } ) => {
  const chivasRouter = Router()

  const controller = new ChivasController({ chivasModel })

  chivasRouter.get('/destinos', controller.getDestinos)
  chivasRouter.get('/viajes/:destino', controller.getViajes)
  //chivasRouter.post('/reserva', controller.create)

  chivasRouter.post('/login', controller.login)
  chivasRouter.post('/register', controller.register)
  chivasRouter.post('/logout', controller.logout)
  chivasRouter.get('/protected',  isAuth, controller.protected)


  //chivasRouter.post('/createAdmin', controller.createAdmin)
  chivasRouter.post('/loginAdmin', controller.loginAdmin)

  return chivasRouter
}