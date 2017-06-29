
/**
 * Install a `/` route that returns server status
 */
export default function root(server) {
  const { loopback } = server

  const router = loopback.Router()
  router.get('/', loopback.status())
  server.use(router)
}
