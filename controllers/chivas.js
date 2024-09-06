import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
dotenv.config()

export class ChivasController {
  constructor ({ chivasModel }) {
    this.chivasModel = chivasModel
  }
  
  getDestinos = async (req, res) => {
    try {
      const destinos = await this.chivasModel.getDestinos()
      res.status(200).send(destinos)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }

  getViajes = async (req, res) => {
    const { destino } = req.params

    try {
      const viajes = await this.chivasModel.getViajes({ destino })
      res.status(200).send(viajes)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }

  login = async (req, res) => {
    const { correo, password } = req.body

    try {
      const user = await this.chivasModel.login({ correo, password })
      const token = jwt.sign(user, 
        process.env.SECRET_JWT_KEY,
      {
        expiresIn: '1h'
      })

      res.cookie('access_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 1000 * 60 * 60
      }).send({ user, token })
      
    } catch (error) {
      res.status(401).json({ error: error.message })
    }
  }

  register = async (req, res) => {
    const { correo, documento, nombre, lastName, fechaNacimiento, contacto, password} = req.body

    try {
      const user = await this.chivasModel.register({ correo, documento, nombre, lastName, fechaNacimiento, contacto, password })
      res.status(200).send({ message: 'Usuario registrado.' })
    } catch (error) {
      console.log(error)
      res.status(401).json({ error: error.message })
    }
  }

  registerInvitado = async (req, res) => {
    const { correo, documento, nombre } = req.body

    try {
      const invitado = await this.chivasModel.registerInvitado({ correo, documento, nombre})
      res.status(200).send({ message: 'Invitado registrado.' })
    } catch (error) {
      console.log(error)
      res.status(401).json({ error: error.message })
    }
  }
  
  logout = async (req, res) => {
    console.log(req.cookies)
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    }).status(200).json({ message: 'Logged out' })
  }

  protected = async (req, res) => {
    res.send(req.user)
  }

  getViajesId = async (req, res) => {
    const { id_viaje } = req.params

    try {
      const viaje = await this.chivasModel.getViajesId({ id_viaje })
      res.status(200).send(viaje)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
  createViaje = async (req, res) => {
    const { doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, comidas_incluidas, hora_salida, hora_regreso } = req.body

    try {
      const viaje = await this.chivasModel.createViaje({ doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, comidas_incluidas, hora_salida, hora_regreso })
      res.status(200).send({ viaje })
    } catch (error) {
      res.status(401).json({ error: error.message })
    }
  }

  editViaje = async (req, res) => {
    const { id_viaje } = req.params
    const { doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, comidas_incluidas, hora_salida, hora_regreso } = req.body

    try {
      const viaje = await this.chivasModel.editViaje({ id_viaje, doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, comidas_incluidas, hora_salida, hora_regreso })
      res.status(200).send({ viaje })
    } catch (error) {
      res.status(401).json({ error: error.message })
    }
  }

  cancelViaje = async (req, res) => {
    const { id_viaje } = req.params

    try {
      const viaje = await this.chivasModel.cancelViaje({ id_viaje })
      console.log(viaje)
      res.status(200).send({ viaje })
    } catch (error) {
      res.status(401).json({ error: error.message })
    }
  }

  getReservas = async (req, res) => {
    const { id_usuario } = req.params

    try {
      const reservas = await this.chivasModel.getReservas({ id_usuario })
      res.status(200).send(reservas)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }

  createReserva = async (req, res) => {
    const { id_usuario, id_viaje, invitados} = req.body

    try {
      const reserva = await this.chivasModel.createReserva({ id_usuario, id_viaje, invitados})
      res.status(200).send({ reserva })
    } catch (error) {
      res.status(401).json({ error: error.message })
    }
  }

  editReserva = async (req, res) => {
    const { id_reserva } = req.params
    const { n_boletas} = req.body

    try {
      const reserva = await this.chivasModel.editReserva({ id_reserva, n_boletas})
      res.status(200).send({ reserva })
    } catch (error) {
      res.status(401).json({ error: error.message })
    }
  }

  cancelReserva = async (req, res) => {
    const { id_reserva } = req.params

    try {
      const reserva = await this.chivasModel.cancelReserva({ id_reserva })
      res.status(200).send({ reserva })
    } catch (error) {
      res.status(401).json({ error: error.message })
    }
  }
  
  getOpiniones = async (req, res) => {
    const { destino } = req.params
    
    try {
      console.log(destino)
      const opiniones = await this.chivasModel.getOpiniones({ destino })
      res.status(200).send(opiniones)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }

  createOpinion = async (req, res) => {
    const { id_usuario, id_destino, calificacion, comentario} = req.body

    try {
      const opinion = await this.chivasModel.createOpinion({ id_usuario, id_destino, calificacion, comentario})
      res.status(200).send(opinion)
    } catch (error) {
      res.status(401).json({ error: error.message })
    }
  }

  editOpinion = async (req, res) => {
    const { id_opinion } = req.params
    const { calificacion, comentario} = req.body

    try {
      const opinion = await this.chivasModel.editOpinion({ id_opinion, calificacion, comentario})
      res.status(200).send(opinion)
    } catch (error) {
      res.status(401).json({ error: error.message })
    }
  }

  createBoleto = async (req, res) => {
    const { id_usuario, id_reserva} = req.body

    try{
      const boleto = await this.chivasModel.createBoleto({ id_usuario, id_reserva})
      res.status(200).send(boleto)
    } catch (error) {
      res.status(401).json({ error: error.message })
    }
  }

  createAdmin = async (req, res) => {
    const { documento, nombre, password, edad} = req.body

    try {
      const user = await this.chivasModel.createAdmin({ documento, nombre, password, edad })
      res.status(200).send({ message: 'Usuario registrado.' })
    } catch (error) {
      console.log(error)
      res.status(401).json({ error: error.message })
    }
  }

  loginAdmin = async (req, res) => {
    const { documento, password } = req.body
    
    try {
      const admin = await this.chivasModel.loginAdmin({ documento, password })
      const adminToken = jwt.sign(admin, 
        process.env.SECRET_JWT_KEY,
      {
        expiresIn: '1h'
      })

      res.cookie('admin_token', adminToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 1000 * 60 * 60
      }).send({ admin, adminToken })
    } catch (error) {
      console.log(error)
      res.status(401).json({ error: error.message })
    } 
  }

  logoutAdmin = async (req, res) => {
    res.clearCookie('admin_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    })
    .status(200)
    .json({ message: 'Logout successful' })
  }

  protectedAdmin = async (req, res) => {
    res.send(req.user)
  }

  confirmPago = async (req, res) => {
    const { id_reserva } = req.params

    try {
      const reserva = await this.chivasModel.confirmPago({ id_reserva})
      res.status(200).send({ reserva })
    } catch (error) {
      res.status(401).json({ error: error.message })
    }
  }

  refundPago = async (req, res) => {
    const { id_reserva } = req.params
    try {
      const reserva = await this.chivasModel.refundPago({ id_reserva })
      res.status(200).send({ reserva })
    } catch (error) {
      res.status(401).json({ error: error.message })
    }
  }
}
