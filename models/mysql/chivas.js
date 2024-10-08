import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import { Validation } from '../../tools/validation.js'
import nodemailer from 'nodemailer'

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
      try {
        const [viajes] = await connection.query(`
          SELECT id_viaje, destino, fecha_viaje, hora_salida, hora_regreso, precio_boleto, comidas_incluidas, cupo, origen, cancelado
          FROM viaje 
          ORDER BY id_viaje DESC
        `);
        return viajes;
      } catch (error) {
        console.error('Error al obtener todos los viajes:', error);
        throw new Error('No se pudieron obtener los viajes');
      }
    }
  
    destino = destino.replace(/-/g, ' ');
  
    try {
      const [viajes] = await connection.query(`
        SELECT id_viaje, destino, fecha_viaje, hora_salida, precio_boleto, cupo, origen
        FROM viaje
        WHERE destino = ? AND cupo > 0 AND cancelado = 0`, 
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
        `SELECT * FROM usuario WHERE correo = ? AND subtipo = 'C'`,
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
      
      return { id_usuario:user.id_usuario, email: user.correo, fullName: user.nombre, contacto: user.contacto, documento: user.documento};
 
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }
 
  static async register ({ correo, documento, nombre, lastName, fechaNacimiento, contacto, password }) {
    try{
      const fullName = `${nombre} ${lastName}`
      Validation.correo(correo)
      Validation.documento(documento)
      Validation.fullName(fullName)
      Validation.phone(contacto)
      Validation.password(password)
      Validation.mayorDeEdad(fechaNacimiento)
      
      
      const [existingUsers] = await connection.query(
        `SELECT * FROM usuario WHERE correo = ? AND subtipo = 'C'`,
        [correo]
      );
      
      if (existingUsers.length > 0) {
        throw new Error('El usuario ya existe');
      }
  
      const hashedPassword = await bcrypt.hash(password, parseInt(process.env.SALT_ROUNDS))
      
      
      await connection.query(`BEGIN`);
      
      const [rows] = await connection.query(
        `INSERT INTO usuario (correo, documento, nombre, fecha_nacimiento, contacto, subtipo) VALUES (?, ?, ?, ?, ?, 'C')`,
        [correo, documento, fullName, fechaNacimiento, contacto]
      )
  
      const usuarioId = rows.insertId;

      const [rows2] = await connection.query(
        `INSERT INTO cliente (id_usuario, password) VALUES (?, ?)`,
        [usuarioId, hashedPassword]          
      )
      
      await connection.query(`COMMIT`);
      
      return { correo, fullName, contacto, documento}
    } catch (error){
      await connection.query(`ROLLBACK`);
      throw error;
    }
       
  }

  static async getViajesId({ id_viaje }) {
    try {
      const [viaje] = await connection.query(
        'SELECT * FROM viaje WHERE id_viaje = ?',
        [id_viaje]
      );

      return viaje;
    } catch {
      console.error('Error during getViajesId:', error);
      throw error;
    }
  }

  static async createViaje ({ doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, comidas_incluidas, hora_salida, hora_regreso }) {
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
       `INSERT INTO viaje (doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleto, comidas_incluidas, hora_salida, hora_regreso, cancelado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
       [doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, comidas_incluidas, hora_salida, hora_regreso]
      );
      await connection.query(`COMMIT`);
      const usuarioId = rows.insertId;

      return { usuarioId, doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, comidas_incluidas, hora_salida, hora_regreso, cancelado: 0 };

    } catch (error) {
      await connection.query(`ROLLBACK`);
      console.error('Error during createViaje:', error);
      throw error;
    }
  }
   
  static async editViaje ( {id_viaje, doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, comidas_incluidas, hora_salida, hora_regreso} ) {
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
        'UPDATE viaje SET doc_administrador = ?, destino = ?, cupo = ?, fecha_viaje = ?, origen = ?, precio_boleto = ?, comidas_incluidas = ?, hora_salida = ?, hora_regreso = ? WHERE id_viaje = ?',
        [doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, comidas_incluidas, hora_salida, hora_regreso, id_viaje]
      );

      await connection.query(`COMMIT`);
      console.log('editViaje', { id_viaje, doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, comidas_incluidas, hora_salida, hora_regreso });
      return { id_viaje, doc_administrador, destino, cupo, fecha_viaje, origen, precio_boleta, comidas_incluidas, hora_salida, hora_regreso };

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
          'SELECT * FROM reserva WHERE id_usuario = ? AND vigente = 1',
          [id_usuario]
        );
      }
       else {
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
  
  static async createReserva ({ id_usuario, id_viaje, invitados }) {
    try {
      const [existingReserva] = await connection.query(
        'SELECT * FROM reserva WHERE id_usuario = ? AND id_viaje = ?',
        [id_usuario, id_viaje]
      );
  
      if (existingReserva.length > 0) {
        throw new Error('Ya tienes una reserva creada para este viaje');
      }
      
      const [viaje] = await connection.query(
        'SELECT * FROM viaje WHERE id_viaje = ?',
        [id_viaje]
      );
  
      if (viaje.length === 0) {
        throw new Error('El viaje no existe');
      }
  
      const [cliente] = await connection.query(
        `SELECT * FROM usuario WHERE id_usuario = ? AND subtipo = 'C'`,
        [id_usuario]
      );
  
      if (cliente.length === 0) {
        throw new Error('El cliente no existe');
      }
  
      const n_boletas = invitados.length + 1;
      const cupo = viaje[0].cupo - n_boletas;
      const montoTotal = n_boletas * viaje[0].precio_boleto;
  
      const [rows] = await connection.query(
        'INSERT INTO reserva (id_usuario, id_viaje, n_boletas, monto_total) VALUES (?, ?, ?, ?)',
        [id_usuario, id_viaje, n_boletas, montoTotal]
      );
  
      const id_reserva = rows.insertId;
      await connection.query(
        'UPDATE viaje SET cupo = ? WHERE id_viaje = ?',
        [cupo, id_viaje]
      );
  
      await connection.query(`BEGIN`);
  
      for (const invitado of invitados) {
        try {
          console.log(invitado);
          Validation.correo(invitado.correo);
          Validation.fullName(invitado.nombre);
          Validation.documento(invitado.documento);
  
          let id_invitado;
          const [existingUsers] = await connection.query(
            `SELECT * FROM usuario WHERE correo = ? AND subtipo = 'I'`,
            [invitado.correo]
          );
  
          if (existingUsers.length > 0) {
            id_invitado = existingUsers[0].id_usuario;
          } else {
            const [insertResult] = await connection.query(
              `INSERT INTO usuario (correo, documento, nombre, subtipo) VALUES (?, ?, ?, 'I')`,
              [invitado.correo, invitado.documento, invitado.nombre]
            );
            id_invitado = insertResult.insertId;
          }
  
          await this.createBoleto({ id_usuario: id_invitado, id_reserva });
  
          try {
            await connection.query(
              'INSERT INTO invitado (id_usuario, invito) VALUES (?, ?)',
              [id_invitado, id_usuario]
            );
          } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
              console.warn(`El invitado con id_usuario ${id_invitado} ya ha sido invitado por este usuario.`);
            } else {
              throw error;
            }
          }
  
        } catch (error) {
          console.error('Error processing invitado:', invitado.correo, error);
          await connection.query('ROLLBACK');
          throw error;
        }
      }
  
      await this.createBoleto({ id_usuario, id_reserva });
      await connection.query(`COMMIT`);
  
      return { id_reserva, id_viaje, id_usuario, invitados };
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

      if (reserva[0].vigente === 0) {
        throw new Error('La reserva ya no es vigente');
      }

      if (reserva[0].pagado === 1) {
        throw new Error('La reserva ya ha sido pagada');
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
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error('Contraseña incorrecta');
    }

    return { documento: user.documento, nombre: user.nombre };
  }

  static async confirmPago ({ id_reserva }) {
    try {
      const [reserva] = await connection.query(
        'SELECT * FROM reserva WHERE id_reserva = ?',
        [id_reserva]
      );

      if (reserva.length === 0) {
        throw new Error('La reserva no existe.');
      }

      if (reserva[0].pagado === 1) {
        throw new Error('La reserva ya ha sido pagada.');
      }

      if (reserva[0].vigente === 0) {
        throw new Error('La reserva ya no es vigente.');
      }
      
      const id_usuario = reserva[0].id_usuario;

      const [usuario] = await connection.query(
        'SELECT * FROM usuario WHERE id_usuario = ?',
        [id_usuario]
      );

      const viaje = await connection.query(
        'SELECT * FROM viaje WHERE id_viaje = ?',
        [reserva[0].id_viaje]
      );

      const [updateboletos] = await connection.query(
        `UPDATE boleto SET vigente = 1 WHERE id_reserva = ?`,
        [id_reserva]
      );

      const [boletos] = await connection.query(
        `SELECT * FROM boleto WHERE id_reserva = ?`,
        [id_reserva]
      );
      const ids_boletos = boletos.map(boleto => boleto.id_boleta);

      const destino = viaje[0][0].destino
      const correo = usuario[0].correo;
      const dominio = correo.split('@')[1].split('.')[0];

      const transporter = nodemailer.createTransport({
        service: dominio,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: correo,
        subject: 'Pago confirmado',
        text: `
Hola,
Tu viaje en Chiva a ${destino} ha sido confirmado!
Revisa el estado de tu reserva en nuestra página web.
A continuación se muestran los códigos de tus boletos:
${ids_boletos.join('\n')}
Recuerda que estos códigos son necesarios para abordar el vehículo.
¡Gracias por viajar con nosotros!

Saludos,
El equipo de Chivas.
`
      };

      const [rows] = await connection.query(
        `UPDATE reserva SET pagado = 1, tipo_pago = 'Dinero' WHERE id_reserva = ?`,
        [id_reserva]
      );

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          throw new Error('Error al enviar el correo' + error);
        } else {
          return { id_reserva, pagado: 1 };
        }
      });

      return { id_reserva, pagado: 1 };
    } catch (error) {
      console.error('Error during confirmPago:', error);
      throw error;
    }
  }

  static async refundPago ({ id_reserva }) {
    try {
      const [reserva] = await connection.query(
        'SELECT * FROM reserva WHERE id_reserva = ?',
        [id_reserva]
      );

      if (reserva.length === 0) {
        throw new Error('La reserva no existe.');
      }

      if (reserva[0].pagado === 0) {
        throw new Error('La reserva no ha sido pagada.');
      }

      if (reserva[0].vigente === 0) {
        throw new Error('La reserva ya no es vigente.');
      }
      
      if (reserva[0].reembolso === 1) {
        throw new Error('La reserva ya ha sido reembolsada.');
      }

      const [boletos] = await connection.query(
        `UPDATE boleto SET vigente = 0 WHERE id_reserva = ?`,
        [id_reserva]
      );

      const viaje = await connection.query(
        'SELECT * FROM viaje WHERE id_viaje = ?',
        [reserva[0].id_viaje]
      );
      let type;
      const tiempo = new Date(viaje[0][0].fecha_viaje) - new Date();
      const dias = tiempo / 86400000;
      if (dias < 3) {
        type = 'parcial';
      } else {
        type = 'total';
      }
      if (type === 'total'){
        const monto_reembolso = reserva[0].monto_total;
        const [rows] = await connection.query(
          'UPDATE reserva SET pagado = 0, reembolso = ?, tipo_reembolso = ? WHERE id_reserva = ?',
          [monto_reembolso, type, id_reserva]
      );
    } else if (type === 'parcial') {
      const monto_reembolso = reserva[0].monto_total * 0.5;
      const [rows] = await connection.query(
        'UPDATE reserva SET pagado = 0, reembolso = ?, tipo_reembolso = ? WHERE id_reserva = ?',
        [monto_reembolso, type, id_reserva]
      );
      }
      return { id_reserva, reembolso: 1 };
    } catch (error) {
      console.error('Error during refundPago:', error);
      throw error;
    }
  }
}
