import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
dotenv.config()

export class ChivasController {
  constructor ({ chivasModel }) {
    this.chivasModel = chivasModel
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
    const { correo, documento, nombre, lastName, edad, contacto, eps, password } = req.body

    try {
      const user = await this.chivasModel.register({ correo, documento, nombre, lastName, edad, contacto, eps, password })
      res.status(200).send({ correo })
    } catch (error) {
      res.status(401).json({ error: error.message })
    }
  }


  logout = async (req, res) => {
    res.clearCookie('access_token')
    .send('Logged out')
  }

  protected = async (req, res) => {
    if (req.session.user) {
      res.send('Protected route')
    } else {
      res.status(401).send('Unauthorized')
    }
  }
}
