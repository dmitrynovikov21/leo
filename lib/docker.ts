import Docker from 'dockerode'

// Singleton pattern for Docker client
// In production (inside container), it connects to /var/run/docker.sock by default unless DOCKER_HOST is set.
// Make sure to mount: -v /var/run/docker.sock:/var/run/docker.sock

let docker: Docker | null = null

try {
    docker = new Docker()
} catch (error) {
    console.warn('Failed to initialize Docker client:', error)
}

export { docker }
