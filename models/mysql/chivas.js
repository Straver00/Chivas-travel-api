import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import zod from 'zod'


dotenv.config()

const connection = await mysql.createConnection(process.env.DATABASE_URL)

export class ChivasModel {
  static async login({ correo, password }) { 
    try {
      Validation.correo(correo);
      Validation.password(password);

      const [existingUsers] = await connection.query(
        'SELECT * FROM usuario WHERE correo = ?',
        [correo]
      );
  
      if (existingUsers.length === 0) {
        throw new Error('Usuario no encontrado');
      }
  
      const user = existingUsers[0];
  
      const isValidPassword = await bcrypt.compare(password, user.password);
  
      if (!isValidPassword) {
        throw new Error('Contraseña incorrecta');
      }
  
      return { email: user.correo, fullName: user.nombre, contacto: user.contacto, documento: user.documento, eps: user.eps };
  
    } catch (error) {
      console.error('Error during login:', error);
      throw error; 
    }
  }
  
  static async register ({ correo, documento, nombre, lastName, edad, contacto, eps, password }) { 
    const fullName = `${nombre} ${lastName}`
    Validation.correo(correo)
    Validation.documento(documento)
    Validation.fullName(fullName)
    Validation.phone(contacto)
    Validation.eps(eps)
    Validation.password(password)

    const [existingUsers] = await connection.query(
      'SELECT * FROM usuario WHERE correo = ?',
      [correo]
    );

    if (existingUsers.length > 0) {
      throw new Error('El usuario ya existe');
    }

    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.SALT_ROUNDS))

    const [rows] = await connection.query(
      `INSERT INTO usuario (correo, documento, nombre, edad, contacto, eps, subtipo, password) VALUES (?, ?, ?, ?, ?, ?, 'C', ?)`,
      [correo, documento, fullName, edad, contacto, eps, hashedPassword]
    )
    return { correo, fullName, contacto, documento, eps}
  }
}

class Validation {
  static correo (email) {
    const schema = zod.string().email()
    const result = schema.safeParse(email)
    
    if (!result.success) {
      return result.error.errors
    }

    return result.success
  }

  static documento (document) {
    const schema = zod.number().int().min(8)
    const result = schema.safeParse(document)
    
    if (!result.success) {
      return result.error.errors
    }  
    return result.success
  }

  static fullName (name) {
    const schema = zod.string().min(2)
    const result = schema.safeParse(name)

    if (!result.success) {
      return result.error.errors
    }
    return result.success
  }

  static phone (phone) {
    const schema = zod.string().min(7)
    const result = schema.safeParse(phone)

    if (!result.success) {
      return result.error.errors
    }
    return result.success
  }

  static eps (eps) {
    const schema = zod.string().min(2)
    const result = schema.safeParse(eps)

    if (!result.success) {
      return result.error.errors
    }
    return result.success
  }

  static password (password) {
    const schema = zod.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(100, 'La contraseña no puede tener más de 100 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número')
    .regex(/[\W_]/, 'La contraseña debe contener al menos un carácter especial')

    const passwordValidationResult = schema.safeParse(password)

    if (!passwordValidationResult.success) {
      const errors = passwordValidationResult.error.errors.map(error => error.message)
      throw new Error(`Error de validación de password: ${errors.join(', ')}`)
    }

    return passwordValidationResult.success
  }
}