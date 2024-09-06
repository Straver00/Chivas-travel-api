import { Router } from 'express'
import { ChivasController } from '../controllers/chivas.js'
import { isAuth } from '../tools/auth.js'
import { isAdmin } from '../tools/auth.js'

export const createChivasRouter = ( { chivasModel } ) => {
  const chivasRouter = Router()

  const controller = new ChivasController({ chivasModel })

  chivasRouter.get('/destinos', controller.getDestinos)
  chivasRouter.get('/viajes/:destino?', controller.getViajes)


  chivasRouter.post('/login', controller.login)
  chivasRouter.post('/register', controller.register)
  chivasRouter.post('/logout', controller.logout)
  chivasRouter.get('/protected',  isAuth, controller.protected)

  chivasRouter.get('/viajesId/:id_viaje?', controller.getViajesId)
  chivasRouter.post('/createViaje', controller.createViaje)
  chivasRouter.post('/editViaje/:id_viaje', controller.editViaje)
  chivasRouter.post('/cancelViaje/:id_viaje', controller.cancelViaje)
  
  chivasRouter.get('/reservas/:id_usuario?', controller.getReservas)
  chivasRouter.post('/createReserva', controller.createReserva)	
  chivasRouter.post('/editReserva/:id_reserva', controller.editReserva)
  chivasRouter.post('/cancelReserva/:id_reserva', controller.cancelReserva)

  
  chivasRouter.get('/opiniones/:destino?', controller.getOpiniones)
  chivasRouter.post('/createOpinion', controller.createOpinion)
  chivasRouter.post('/editOpinion/:id_opinion', controller.editOpinion)
  chivasRouter.post('/createBoleto', controller.createBoleto)

  //chivasRouter.post('/createAdmin', controller.createAdmin)
  chivasRouter.post('/loginAdmin', controller.loginAdmin)
  chivasRouter.post('/logoutAdmin', controller.logoutAdmin)
  chivasRouter.get('/protectedAdmin', isAdmin, controller.protectedAdmin)
  

  chivasRouter.post('/confirmPago/:id_reserva', isAdmin, controller.confirmPago)
  chivasRouter.post('/refundPago/:id_reserva', isAdmin, controller.refundPago)

  return chivasRouter
}