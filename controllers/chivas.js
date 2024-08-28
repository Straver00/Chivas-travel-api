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
    const { correo, documento, nombre, lastName, fechaNacimiento, contacto, eps, password} = req.body

    try {
      const user = await this.chivasModel.register({ correo, documento, nombre, lastName, fechaNacimiento, contacto, eps, password })
      res.status(200).send({ message: 'Usuario registrado.' })
    } catch (error) {
      console.log(error)
      res.status(401).json({ error: error.message })
    }
  }

  createViaje = async (req, res) => {
    const { doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, duracion_aprox, comidas_incluidas, hora_salida, hora_regreso } = req.body

    try {
      const viaje = await this.chivasModel.createViaje({ doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, duracion_aprox, comidas_incluidas, hora_salida, hora_regreso })
      res.status(200).send({ message: 'Viaje registrado.' })
    } catch (error) {
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
    console.log(req.user)
    res.send(req.user)
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
      const user = await this.chivasModel.loginAdmin({ documento, password })
      res.status(200).send({ message: 'Usuario logueado.' })
    } catch (error) {
      console.log(error)
      res.status(401).json({ error: error.message })
    } 
  }
}
