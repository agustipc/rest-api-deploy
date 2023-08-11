const express = require('express') // require -> commonJS
const crypto = require('node:crypto')
const cors = require('cors')

const movies = require('./movies.json')
const { validateMovie, validatePartialMovie } = require('./schemas/movies')

const app = express()
app.use(express.json()) // middleware que parsea el body de las peticiones a JSON
app.use(cors({
  origin: (origin, callback) => {
    const ACCEPTED_ORIGINS = [
      'http://localhost:8080',
      'http://localhost:3000',
      'https://movies.com'
    ]

    if (ACCEPTED_ORIGINS.includes(origin) || !origin) {
      return callback(null, true)
    }

    return callback(new Error('Not allowed by CORS'))
  }
})) // middleware que habilita CORS
app.disable('x-powered-by') // deshabilita el header X-Powered-By por seguridad

// const ACCEPTED_ORIGINS = [
//   'http://localhost:8080',
//   'http://localhost:3000',
//   'https://movies.com'
// ]

// All resources related to movies are under /movies
app.get('/movies', (req, res) => {
  // const origin = req.headers.origin
  // if (ACCEPTED_ORIGINS.includes(origin) || !origin) {
  //   res.header('Access-Control-Allow-Origin', origin)
  // }

  const { genre } = req.query

  if (genre) {
    const filteredMovies = movies.filter(movie => movie.genre.some(g => g.toLowerCase() === genre.toLowerCase()))
    return res.json(filteredMovies)
  }
  res.json(movies)
})

app.get('/movies/:id', (req, res) => { // path-to-regexp
  const id = req.params.id
  const movie = movies.find(movie => movie.id === id)
  if (movie) {
    return res.json(movie)
  }
  res.status(404).json({ error: 'Movie not found' })
})

app.post('/movies', (req, res) => {
  const result = validateMovie(req.body)

  if (result.error) {
    return res.status(400).json({ error: JSON.parse(result.error.message) })
  }

  // muy costoso y usamos ZOD para validar (hay muchas otras herramientas), no lo arregla Typescript, necesitamos una erramienta que funcione en runtime

  // if (!title || !genre || !year || !director || !duration || !poster) {
  //   return res.status(400).json({ error: 'Missing required fields' })
  // }

  const newMovie = {
    id: crypto.randomUUID(),
    ...result.data
  }
  // this is not REST
  movies.push(newMovie)
  res.status(201).json(newMovie)
})

app.delete('/movies/:id', (req, res) => {
  // this mehod has CORS PRE-FLIGHT

  // const origin = req.headers.origin
  // if (ACCEPTED_ORIGINS.includes(origin) || !origin) {
  //   res.header('Access-Control-Allow-Origin', origin)
  // }

  const { id } = req.params
  const movieIndex = movies.findIndex(movie => movie.id === id)

  if (movieIndex === -1) { return res.status(404).json({ error: 'Movie not found' }) }

  movies.splice(movieIndex, 1)

  return res.json({ message: 'Movie deleted' })
})

app.patch('/movies/:id', (req, res) => {
  const result = validatePartialMovie(req.body)

  if (!result.success) {
    return res.status(400).json({ error: JSON.parse(result.error.message) })
  }

  const { id } = req.params
  const movieIndex = movies.findIndex(movie => movie.id === id)

  if (movieIndex === -1) {
    return res.status(404).json({ error: 'Movie not found' })
  }

  const updatedMovie = { ...movies[movieIndex], ...result.data }
  movies[movieIndex] = updatedMovie

  return res.json(updatedMovie)
})

app.options('/movies/:id', (req, res) => {
  // const origin = req.headers.origin
  // if (ACCEPTED_ORIGINS.includes(origin) || !origin) {
  //   res.header('Access-Control-Allow-Origin', origin)
  // }

  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PATCH')

  res.send(200)
})

// Revisar antes de deploy que el puerto coja el de la variable de entorno
// (el servicio donde lo desplegamos lo enviará en esa variable)
const PORT = process.env.PORT ?? 3000

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`)
})
