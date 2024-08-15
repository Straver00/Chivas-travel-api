import mysql from 'mysql2/promise'

const connection = await mysql.createConnection(process.env.DATABASE_URL)
export class MovieModel {
  static async getAllviajes ({ genre }) { 

    const [viajes] = await connection.query(
      // query
    )

    return viajes
  }
}