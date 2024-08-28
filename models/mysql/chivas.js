import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import { z } from 'zod';


dotenv.config()

const connection = await mysql.createConnection(process.env.DATABASE_URL)

export class ChivasModel {

  static async getDestinos() {
    const [destinos] = await connection.query(`
      SELECT destino.nombre AS nombre_destino
      FROM destino 
      INNER JOIN administrador
      ON destino.doc_administrador = administrador.documento`)
    return destinos
  }

  static async getViajes({ destino }) {
    if (!destino) {
      throw new Error('El parámetro destino es requerido');
      
    }
    destino = destino.replace(/-/g, ' ');
  
    try {
      // Realizar la consulta a la base de datos
      const [viajes] = await connection.query(`
        SELECT viaje.destino, viaje.hora_salida, viaje.precio_boleto, viaje.cupo, viaje.origen
        FROM
          viaje
        WHERE 
          viaje.destino = ?`, 
        [destino]
      );
  
      // Retornar los viajes encontrados
      return viajes;
    } catch (error) {
      // Manejar posibles errores
      console.error('Error al obtener los viajes:', error);
      throw new Error('No se pudieron obtener los viajes');
    }
  }

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
        'SELECT * FROM cliente WHERE id_usuario = ?',
        [user.id_usuario]
      );

      if (existingClients.length === 0) {
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
 
  static async register ({ correo, documento, nombre, lastName, fechaNacimiento, contacto, eps, password }) {
    try{
      const fullName = `${nombre} ${lastName}`
      Validation.correo(correo)
      Validation.documento(documento)
      Validation.fullName(fullName)
      Validation.phone(contacto)
      Validation.eps(eps)
      Validation.password(password)
      Validation.mayorDeEdad(fechaNacimiento)
      
      
      const [existingUsers] = await connection.query(
        'SELECT * FROM usuario WHERE correo = ?',
        [correo]
      );
  
      if (existingUsers.length > 0) {
        throw new Error('El usuario ya existe');
      }
  
      const hashedPassword = await bcrypt.hash(password, parseInt(process.env.SALT_ROUNDS))
      
      
      await connection.query(`BEGIN`);
      
      const [rows] = await connection.query(
        `INSERT INTO usuario (correo, documento, nombre, fecha_nacimiento, contacto, eps, subtipo) VALUES (?, ?, ?, ?, ?, ?, 'C')`,
        [correo, documento, fullName, fechaNacimiento, contacto, eps]
      )
  
      const usuarioId = rows.insertId;
      console.log(usuarioId)

      const [rows2] = await connection.query(
        `INSERT INTO cliente (id_usuario, password) VALUES (?, ?)`,
        [usuarioId, hashedPassword]          
      )
      
      await connection.query(`COMMIT`);
      
      return { correo, fullName, contacto, documento, eps}
    } catch (error){
      await connection.query(`ROLLBACK`);
      throw error;
    }
       
  }

  static async createViaje ({ doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, duracion_aprox, comidas_incluidas, hora_salida, hora_regreso }) {
    try {
      const [destinoexistente] = await connection.query(
        "SELECT * FROM destino WHERE nombre = ?",
        [destino]
      );

      console.log(destinoexistente);
      if (destinoexistente.length === 0) {
        const destinoCreado = await connection.query(
          `INSERT INTO destino (nombre, doc_administrador) VALUES (?, ?)`,
          [destino, doc_administrador]
        );
      }

      const [rows] = await connection.query(
       `INSERT INTO viaje (doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleto, duracion_aprox, comidas_incluidas, hora_salida, hora_regreso, cancelado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
       [doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, duracion_aprox, comidas_incluidas, hora_salida, hora_regreso]
      );
    } catch (error) {
      console.error('Error during createViaje:', error);
      throw error;
    }
  }
   
  static async registerAdministrador ({documento, nombre, apellido, password, edad}){
    const fullName = `${nombre} ${apellido}`
    Validation.documento(documento)
    Validation.fullName(fullName)
    Validation.password(password)
    Validation.mayorDeEdad(edad)
   
    const [existingUsers] = await connection.query(
      'SELECT * FROM usuario WHERE documento = ?',
      [correo]
    );

    if (existingUsers.length > 0) {
      throw new Error('El adinistrador ya existe');
    }

    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.SALT_ROUNDS))
   
    const [rows] = await connection.query(
      `INSERT INTO administrador (documento, nombre, password, edad) VALUES (?,?,?,?)`,
      [documento, fullName, hashedPassword, edad]
    )
   
    return {documento, fullName, hashedPassword, edad}
   
  }
 
  static async registrarNuevoDestino ({nombre, doc_administrador}){
    const [existingAdmins] = await connection.query(
      'SELECT * FROM administrador WHERE documento = ?',
      [doc_administrador]
    );

    if (existingAdmins.length === 0){
      throw new Error('El administrador no existe');
    }

    const [result] = await connection.query (
      `INSERT INTO destino (nombre, documento) VALUES (?,?)`,
      [nombre, doc_administrador]
    )

    return{nombre, doc_administrador}
  }



  static createAdmin = async ({ documento, nombre, password, edad}) => {
    Validation.documento(documento)
    Validation.fullName(nombre)
    Validation.password(password)

    const [existingUsers] = await connection.query(
      'SELECT * FROM administrador WHERE documento = ?',
      [documento]
    );

    if (existingUsers.length > 0) {
      throw new Error('El administrador ya está registrado.');
    }

    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.SALT_ROUNDS))

    const [rows] = await connection.query(
      `INSERT INTO administrador (documento, nombre, password, edad) VALUES (?, ?, ?, ?)`,
      [documento, nombre, hashedPassword, edad]
    )

    return { documento, nombre }
  }

  static loginAdmin = async ({ documento, password }) => {
    Validation.documento(documento)
    Validation.password(password)

    const [existingUsers] = await connection.query(
      'SELECT * FROM administrador WHERE documento = ?',
      [documento]
    );

    if (existingUsers.length === 0) {
      throw new Error('Administrador no encontrado');
    }

    const user = existingUsers[0];
    console.log(password)
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error('Contraseña incorrecta');
    }

    return { documento: user.documento, nombre: user.nombre };
  }
}

class Validation {
  static correo(email) {
    const schema = z.string('El correo tiene que ser un texto').email('El correo electrónico no es válido');
    const result = schema.safeParse(String(email));
   
    if (!result.success) {
      throw new Error(result.error.errors.map(e => e.message).join(', '));
    }
  }

  static documento(document) {
    const schema = z.string('El documento tiene que ser un texto').min(8, 'El documento debe tener al menos 8 caracteres').transform(Number);
    const result = schema.safeParse(String(document));
   
    if (!result.success) {
      throw new Error(result.error.errors.map(e => e.message).join(', '));
    }
  }

  static fullName(name) {
    const schema = z.string()
      .min(2, 'El nombre completo debe tener al menos 2 caracteres')
      .regex(/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+$/, 'El nombre solo debe contener letras y espacios');

    const result = schema.safeParse(String(name));

    if (!result.success) {
      throw new Error(result.error.errors.map(e => e.message).join(', '));
    }
  }

  static phone(phone) {
    const schema = z.string()
      .min(7, 'El número de teléfono debe tener al menos 7 caracteres')
      .regex(/^\d+$/, 'El número de teléfono debe contener solo dígitos');

    const result = schema.safeParse(String(phone));

    if (!result.success) {
      throw new Error(result.error.errors.map(e => e.message).join(', '));
    }
  }

  static eps(eps) {
    const schema = z.string()
      .min(2, 'La EPS debe tener al menos 2 caracteres')
      .regex(/^[A-Za-z\s]+$/, 'La EPS debe contener solo letras y espacios'); // Permitir solo letras y espacios

    const result = schema.safeParse(String(eps));

    if (!result.success) {
      throw new Error(result.error.errors.map(e => e.message).join(', '));
    }
  }
 
  static mayorDeEdad(fecha_nacimiento) {
    const schema = z.string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        'La fecha de nacimiento debe estar en el formato YYYY-MM-DD'
      )
      .refine(value => {
        const birthDate = new Date(value);
        const today = new Date();
        
        // Asegúrate de que la fecha de nacimiento sea válida
        if (isNaN(birthDate.getTime())) {
          return false;
        }

        // Calcular la edad
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDifference = today.getMonth() - birthDate.getMonth();
        
        // Ajustar si la fecha de nacimiento aún no ha ocurrido en el año actual
        if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
          return age - 1 >= 18;
        }
        
        return age >= 18;
      }, 'El usuario debe ser mayor de edad');
    
    const result = schema.safeParse(fecha_nacimiento);

    if (!result.success) {
      // Lanzar un error con el mensaje de la validación
      throw new Error(result.error.errors.map(e => e.message).join(', '));
    }
  }

  static password(password) {
    const schema = z.string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(100, 'La contraseña no puede tener más de 100 caracteres')
      .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
      .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
      .regex(/[0-9]/, 'La contraseña debe contener al menos un número')
      .regex(/[\W_]/, 'La contraseña debe contener al menos un carácter especial');

    const passwordValidationResult = schema.safeParse(String(password));

    if (!passwordValidationResult.success) {
      throw new Error(passwordValidationResult.error.errors.map(error => error.message).join(', '));
    }
  }
}
