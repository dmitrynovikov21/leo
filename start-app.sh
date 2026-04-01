#!/bin/bash
docker stop leo-app 2>/dev/null; docker rm leo-app 2>/dev/null
docker run -d --name leo-app --restart unless-stopped --env-file /root/leo/.env.prod --network leo_default -v /var/run/docker.sock:/var/run/docker.sock -l "traefik.enable=true" -l "traefik.http.routers.app.rule=Host(\`app.leoagent.ru\`)" -l "traefik.http.routers.app.entrypoints=websecure" -l "traefik.http.routers.app.tls.certresolver=le" -l "traefik.http.services.app.loadbalancer.server.port=3000" leo-app:local
docker exec leo-app npx prisma migrate deploy
