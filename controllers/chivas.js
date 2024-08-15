export class ChivasController {
  constructor ({ chivasModel }) {
    this.chivasModel = chivasModel
  }
  
  getAll = async (req, res) => {
    const { genre } = req.query
    const movies = await this.movieModel.getAll({ genre })
    res.json(movies)
  }
}