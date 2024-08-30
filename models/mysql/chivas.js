import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import { Validation } from '../../tools/validation.js'


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
    // Si destino no se proporciona, realizar la consulta sin filtro
    if (!destino) {
      try {
        const [viajes] = await connection.query(`
          SELECT viaje.destino, viaje.hora_salida, viaje.precio_boleto, viaje.cupo, viaje.origen
          FROM viaje
        `);
        
        return viajes;
      } catch (error) {
        console.error('Error al obtener todos los viajes:', error);
        throw new Error('No se pudieron obtener los viajes');
      }
    }
  
    // Si destino se proporciona, reemplazar los guiones y realizar la consulta filtrada
    destino = destino.replace(/-/g, ' ');
  
    try {
      const [viajes] = await connection.query(`
        SELECT viaje.destino, viaje.hora_salida, viaje.precio_boleto, viaje.cupo, viaje.origen
        FROM viaje
        WHERE viaje.destino = ?`, 
        [destino]
      );
      
      return viajes;
    } catch (error) {
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

      await connection.query(`BEGIN`);

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
      await connection.query(`COMMIT`);
      const usuarioId = rows.insertId;

      return { usuarioId, doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, duracion_aprox, comidas_incluidas, hora_salida, hora_regreso, cancelado: 0 };

    } catch (error) {
      await connection.query(`ROLLBACK`);
      console.error('Error during createViaje:', error);
      throw error;
    }
  }
   
  static async editViaje ( {id_viaje, doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, duracion_aprox, comidas_incluidas, hora_salida, hora_regreso} ) {
    try {
      const [viaje] = await connection.query(
        'SELECT * FROM viaje WHERE id_viaje = ?',
        [id_viaje]
      );

      if (viaje.length === 0) {
        throw new Error('El viaje no existe');
      }

      const [destinoexistente] = await connection.query(
        "SELECT * FROM destino WHERE nombre = ?",
        [destino]
      );

      await connection.query(`BEGIN`);

      if (destinoexistente.length === 0) {
        const destinoCreado = await connection.query(
          `INSERT INTO destino (nombre, doc_administrador) VALUES (?, ?)`,
          [destino, doc_administrador]
        );
      }

      const [rows] = await connection.query(
        'UPDATE viaje SET doc_administrador = ?, destino = ?, cupo = ?, fecha_viaje = ?, origen = ?, precio_boleto = ?, duracion_aprox = ?, comidas_incluidas = ?, hora_salida = ?, hora_regreso = ? WHERE id_viaje = ?',
        [doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, duracion_aprox, comidas_incluidas, hora_salida, hora_regreso, id_viaje]
      );

      await connection.query(`COMMIT`);
      return { id_viaje, doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, duracion_aprox, comidas_incluidas, hora_salida, hora_regreso };

    } catch (error) {
      await connection.query(`ROLLBACK`);
      console.error('Error during editViaje:', error);
      throw error;
    }
  }

  static async cancelViaje ({ id_viaje }) {
    try {
      const [viaje] = await connection.query(
        'SELECT * FROM viaje WHERE id_viaje = ?',
        [id_viaje]
      );

      if (viaje.length === 0) {
        throw new Error('El viaje no existe');
      }

      const [rows] = await connection.query(
        'UPDATE viaje SET cancelado = 1 WHERE id_viaje = ?',
        [id_viaje]
      );

      return { id_viaje, cancelado: 1 };

    } catch (error) {
      console.error('Error during cancelViaje:', error);
      throw error;
    }
  }

  static async getReservas({ id_usuario }) {
    try {
      let reservas;

      if (id_usuario) {
        [reservas] = await connection.query(
          'SELECT * FROM reserva WHERE id_usuario = ?',
          [id_usuario]
        );
      } else {
        [reservas] = await connection.query(
          'SELECT * FROM reserva'
        );
      }

      return reservas;
    } catch (error) {
      console.error('Error during getReservas:', error);
      throw error;
    }
  }
  static async createReserva ({ id_usuario, id_viaje, n_boletas }) {
    try {
      const [viaje] = await connection.query(
        'SELECT * FROM viaje WHERE id_viaje = ?',
        [id_viaje]
      );

      if (viaje.length === 0) {
        throw new Error('El viaje no existe');
      }

      const [cliente] = await connection.query(
        'SELECT * FROM usuario WHERE id_usuario = ?',
        [id_usuario]
      );

      if (cliente.length === 0) {
        throw new Error('El cliente no existe');
      }

      const cupo = viaje[0].cupo - n_boletas;
      const montoTotal = n_boletas * viaje[0].precio_boleto;

      await connection.query(`BEGIN`);

      const [rows] = await connection.query(
        'INSERT INTO reserva (id_usuario, id_viaje, n_boletas, monto_total) VALUES (?, ?, ?, ?)',
        [id_usuario, id_viaje, n_boletas, montoTotal]
      );

      const id_reserva = rows.insertId;
      const [rows2] = await connection.query(
        'UPDATE viaje SET cupo = ? WHERE id_viaje = ?',
        [cupo, id_viaje]
      );
      
      await connection.query(`COMMIT`);
      return { id_reserva, id_viaje, id_usuario, n_boletas };
    } catch (error) {
      console.error('Error during createReserva:', error);
      throw error;
    }
  }

  static async editReserva ({ id_reserva, n_boletas }) {
    try {
      const [reserva] = await connection.query(
        'SELECT * FROM reserva WHERE id_reserva = ?',
        [id_reserva]
      );

      if (reserva.length === 0) {
        throw new Error('La reserva no existe');
      }

      const [viaje] = await connection.query(
        'SELECT * FROM viaje WHERE id_viaje = ?',
        [reserva[0].id_viaje]
      );

      if (viaje.length === 0) {
        throw new Error('El viaje no existe');
      }

      let cupo;
      let montoTotal
      if (n_boletas > reserva[0].n_boletas) {
        cupo = viaje[0].cupo - n_boletas;
        montoTotal = n_boletas * viaje[0].precio_boleto;
      } else {
        cupo = viaje[0].cupo + n_boletas;
        montoTotal = n_boletas * viaje[0].precio_boleto;
      }

      await connection.query(`BEGIN`);

      const [rows] = await connection.query(
        'UPDATE reserva SET n_boletas = ?, monto_total = ? WHERE id_reserva = ?',
        [n_boletas, montoTotal, id_reserva]
      );

      const [rows2] = await connection.query(
        'UPDATE viaje SET cupo = ? WHERE id_viaje = ?',
        [cupo, reserva[0].id_viaje]
      );

      await connection.query(`COMMIT`);
      return { id_reserva, n_boletas };
    } catch (error) {
      await connection.query(`ROLLBACK`);
      console.error('Error during editReserva:', error);
      throw error;
    }
  }

  static async cancelReserva ({ id_reserva }) {
    try {
      const [reserva] = await connection.query(
        'SELECT * FROM reserva WHERE id_reserva = ?',
        [id_reserva]
      );

      if (reserva.length === 0) {
        throw new Error('La reserva no existe');
      }

      const [viaje] = await connection.query(
        'SELECT * FROM viaje WHERE id_viaje = ?',
        [reserva[0].id_viaje]
      );

      if (viaje.length === 0) {
        throw new Error('El viaje no existe');
      }

      const cupo = viaje[0].cupo + reserva[0].n_boletas;

      await connection.query(`BEGIN`);

      const [rows] = await connection.query(
        'UPDATE reserva SET vigente = 0 WHERE id_reserva = ?',
        [id_reserva]
      );

      const [rows2] = await connection.query(
        'UPDATE viaje SET cupo = ? WHERE id_viaje = ?',
        [cupo, reserva[0].id_viaje]
      );

      const [rows3] = await connection.query(
        'UPDATE boleto SET vigente = 0 WHERE id_reserva = ?',
        [id_reserva]
      );
      
      await connection.query(`COMMIT`);
      return { id_reserva };
    } catch (error) {
      console.error('Error during cancelReserva:', error);
      throw error;
    }
  }
  static async getOpiniones({ destino }) {
    try {
      let opiniones;
  
      if (destino) {
        [opiniones] = await connection.query(
          'SELECT * FROM opinion WHERE destino = ?',
          [destino]
        );
      } else {
        [opiniones] = await connection.query(
          'SELECT * FROM opinion'
        );
      }
  
      return opiniones;
    } catch (error) {
      console.error('Error during getOpiniones:', error);
      throw error;
    }
  }

  static async createOpinion ({ id_usuario, id_destino, calificacion, comentario }) {
    try {
      const [destino] = await connection.query(
        'SELECT * FROM destino WHERE nombre = ?',
        [id_destino]
      );

      if (destino.length === 0) {
        throw new Error('El destino no existe');
      }

      await connection.query(`BEGIN`);

      const [rows] = await connection.query(
        'INSERT INTO opinion (id_usuario, destino, calificacion, comentario) VALUES (?, ?, ?, ?)',
        [id_usuario, id_destino, calificacion, comentario]
      );

      await connection.query(`COMMIT`);
      return { id_usuario, id_destino, calificacion, comentario };
    } catch (error) {
      await connection.query(`ROLLBACK`);
      console.error('Error during createOpinion:', error);
      throw error;
    }
  }

  static async editOpinion ({ id_opinion, calificacion, comentario }) {
    try {
      const [opinion] = await connection.query(
        'SELECT * FROM opinion WHERE id_opinion = ?',
        [id_opinion]
      );

      if (opinion.length === 0) {
        throw new Error('La opinión no existe');
      }

      await connection.query(`BEGIN`);

      const [rows] = await connection.query(
        'UPDATE opinion SET calificacion = ?, comentario = ? WHERE id_opinion = ?',
        [calificacion, comentario, id_opinion]
      );

      await connection.query(`COMMIT`);
      return { id_opinion, calificacion, comentario };
    } catch (error) {
      await connection.query(`ROLLBACK`);
      console.error('Error during editOpinion:', error);
      throw error;
    }
  }

  static async createBoleto ({ id_usuario, id_reserva}) {
    try {
      const [reserva] = await connection.query(
        'SELECT * FROM reserva WHERE id_reserva = ?',
        [id_reserva]
      );

      if (reserva.length === 0) {
        throw new Error('La reserva no existe');
      }

      const id_viaje = reserva[0].id_viaje;

      const [viaje] = await connection.query(
        'SELECT * FROM viaje WHERE id_viaje = ?',
        [id_viaje]
      );

      const fechaViaje = viaje[0].fecha_viaje
      const horaSalida = viaje[0].hora_salida

      console.log(id_usuario, id_reserva, fechaViaje, horaSalida);
      await connection.query(`BEGIN`);

      const [boleto] = await connection.query(
        'INSERT INTO boleto (id_usuario, id_reserva, fecha_viaje, hora_salida) VALUES (?, ?, ?, ?)',
        [id_usuario, id_reserva, fechaViaje, horaSalida]
      );

      await connection.query(`COMMIT`);
      return { id_usuario, id_reserva, fechaViaje, horaSalida };
    } catch (error) {
      await connection.query(`ROLLBACK`);
      console.error('Error during createBoleto:', error);
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
