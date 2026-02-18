'use server'

import { auth } from '@/auth'
import { docker } from '@/lib/docker'

export interface ContainerInfo {
    Id: string
    Names: string[]
    Image: string
    State: string
    Status: string
}

export async function getContainers(): Promise<ContainerInfo[]> {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
        throw new Error('Unauthorized')
    }

    if (!docker) {
        throw new Error('Docker client not initialized')
    }

    try {
        const containers = await docker.listContainers({ all: true })
        return containers.map(c => ({
            Id: c.Id,
            Names: c.Names,
            Image: c.Image,
            State: c.State,
            Status: c.Status
        }))
    } catch (error: any) {
        console.error('Error fetching containers:', error)
        if (error.code === 'ENOENT') {
            throw new Error('Docker socket not found. Is Docker running and mounted?')
        }
        throw new Error(`Failed to fetch containers: ${error.message}`)
    }
}

export async function getContainerLogs(containerId: string, tail: number = 100): Promise<string> {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
        throw new Error('Unauthorized')
    }

    if (!docker) {
        throw new Error('Docker client not initialized')
    }

    try {
        const container = docker.getContainer(containerId)

        // Check if container exists
        try {
            await container.inspect()
        } catch (e) {
            throw new Error('Container not found')
        }

        const logsBuffer = await container.logs({
            follow: false,
            stdout: true,
            stderr: true,
            tail: tail,
            timestamps: true
        })

        // Docker logs format: 8 bytes header + payload
        // We need to parse this manually or use a proper parser if raw buffer
        // Actually dockerode .logs returns Buffer/Stream.
        // However, if TTY is false (default for logs), it returns multiplexed stream.
        // Let's assume simplest string conversion for now, noting that it might have binary headers.

        // A simple clean up heuristic for now: filtering non-printable chars might be safer
        // or using docker-modem's demux logic.
        // For simplicity in this iteration: return string and let UI handle basic ANSI.
        // To properly handle the 8-byte header:
        // Header: [STREAM_TYPE, 0, 0, 0, SIZE, SIZE, SIZE, SIZE]

        return parseDockerLogs(logsBuffer as Buffer)

    } catch (error: any) {
        console.error('Error fetching logs:', error)
        throw new Error(`Failed to fetch logs: ${error.message}`)
    }
}

function parseDockerLogs(buffer: Buffer): string {
    let logs = ''
    let offset = 0

    while (offset < buffer.length) {
        // Header is 8 bytes
        // const type = buffer[offset] // 1 = stdout, 2 = stderr
        // const size = buffer.readUInt32BE(offset + 4)

        // Checking if it looks like a header (0, 0, 0 at offset 1,2,3)
        if (buffer.length - offset >= 8 && buffer[offset + 1] === 0 && buffer[offset + 2] === 0 && buffer[offset + 3] === 0) {
            const size = buffer.readUInt32BE(offset + 4)
            if (offset + 8 + size <= buffer.length) {
                logs += buffer.toString('utf-8', offset + 8, offset + 8 + size)
                offset += 8 + size
                continue
            }
        }

        // Fallback if not multiplexed (e.g. TTY enabled containers)
        // Just return the rest
        logs += buffer.toString('utf-8', offset)
        break
    }
    return logs
}
