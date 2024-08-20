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
      
      const [existingClients] = await connection.query(
        'SELECT * FROM clientes WHERE id_usuario = ?',
        [user.id_usuario]
      );

      if (existingUsers.length === 0) {
        throw new Error('Usuario no es cliente');
      }

      const cliente = existingClients[0];

      const isValidPassword = await bcrypt.compare(password, cliente.password);
  
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
      `INSERT INTO usuario (correo, documento, nombre, edad, contacto, eps, subtipo) VALUES (?, ?, ?, ?, ?, ?, 'C')`,
      [correo, documento, fullName, edad, contacto, eps]
    )

    const usuarioId = rows.insertId;

    const [rows2] = await connection.query(
      `INSERT INTO cliente (id_usuario, password) VALUES (?, ?)`,
      [usuarioId, hashedPassword]           
    )

    return { correo, fullName, contacto, documento, eps}
  }
}

import { z } from 'zod';

class Validation {
  static correo(email) {
    const schema = z.string().email('El correo electrónico no es válido');
    const result = schema.safeParse(email);
    
    if (!result.success) {
      return { success: false, errors: result.error.errors.map(e => e.message) };
    }

    return { success: true };
  }

  static documento(document) {
    const schema = z.string().min(8, 'El documento debe tener al menos 8 caracteres').transform(Number);
    const result = schema.safeParse(document);
    
    if (!result.success) {
      return { success: false, errors: result.error.errors.map(e => e.message) };
    }

    return { success: true };
  }

  static fullName(name) {
    const schema = z.string().min(2, 'El nombre completo debe tener al menos 2 caracteres');
    const result = schema.safeParse(name);

    if (!result.success) {
      return { success: false, errors: result.error.errors.map(e => e.message) };
    }

    return { success: true };
  }

  static phone(phone) {
    const schema = z.string().min(7, 'El número de teléfono debe tener al menos 7 caracteres');
    const result = schema.safeParse(phone);

    if (!result.success) {
      return { success: false, errors: result.error.errors.map(e => e.message) };
    }

    return { success: true };
  }

  static eps(eps) {
    const schema = z.string().min(2, 'La EPS debe tener al menos 2 caracteres');
    const result = schema.safeParse(eps);

    if (!result.success) {
      return { success: false, errors: result.error.errors.map(e => e.message) };
    }

    return { success: true };
  }

  static password(password) {
    const schema = z.string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(100, 'La contraseña no puede tener más de 100 caracteres')
      .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
      .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
      .regex(/[0-9]/, 'La contraseña debe contener al menos un número')
      .regex(/[\W_]/, 'La contraseña debe contener al menos un carácter especial');

    const passwordValidationResult = schema.safeParse(password);

    if (!passwordValidationResult.success) {
      const errors = passwordValidationResult.error.errors.map(error => error.message);
      return { success: false, errors };
    }

    return { success: true };
  }
}
