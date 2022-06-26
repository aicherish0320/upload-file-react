import app from './app'
import http from 'http'

const port = process.env.PORT || 3001

const server = http.createServer(app)

app.listen(port, onListening)

server.on('error', onError)
// server.on('listening', onListening)

function onError(error: any) {
  console.log(error)
}
function onListening() {
  console.log('Listening on ' + port)
}
