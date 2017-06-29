import loopback from 'loopback'
import boot from 'loopback-boot'

const app = loopback()

// start the web server
app.start = function start() {
  return app.listen(function listen() {
    app.emit('started')

    const baseUrl = app.get('url').replace(/\/$/, '')

    console.log('Web server listening at: %s', baseUrl)

    const explorer = app.get('loopback-component-explorer')

    if (explorer) {
      console.log('Browse your REST API at %s%s', baseUrl, explorer.mountPath)
    }
  })
}

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, (err) => {
  if (err) {
    throw err
  }

  // start the server if `$ node server.js`
  if (require.main === module) {
    app.start()
  }
})
