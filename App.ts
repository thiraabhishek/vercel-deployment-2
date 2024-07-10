import express from 'express'
import cors from 'cors'
import logger from './api/middlewares/Logger'
import core from './api/routes/CoreRoutes'
import admin from './api/routes/AdminRoutes'
import post from './api/routes/PostCoreRoute'
import user from './api/routes/ProjectRoutes'

const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static('build'))
app.use((req, res, next) => {
logger.info(`API hit: ${req.method} ${req.originalUrl}`)
next()
})
app.use('/privacypolicy', express.static('./src/public/index.html'))
app.use(cors()),
app.use('/api', core)
app.use('/api', admin)
app.use('/api', post)
app.use('/api', user)  
app.use('/', (req, res) => {
  res.send('welcome')
})

export default app
