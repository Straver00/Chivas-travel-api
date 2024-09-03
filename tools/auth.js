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

export const isAdmin = (req, res, next) => {
  const token = req.cookies.admin_token

  if (!token) {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const verified = jwt.verify(token, process.env.SECRET_JWT_KEY)
    req.user = verified
    next()
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' })
  }
}