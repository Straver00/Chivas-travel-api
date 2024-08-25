import jwt from 'jsonwebtoken'
export const isAuth = async (req, res, next) => {
  const token = req.cookies.access_token

  if (!token) {
    return res.status(401).send('Unauthorized')
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_JWT_KEY)
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json('Unauthorized')
  }
}