#!/bin/sh
# Runs on the host, from the directory holding docker-compose.prod.yml, Caddyfile and .env.
# Every deploy is this one command.
set -eu

compose() {
	docker compose -f docker-compose.prod.yml --env-file .env --profile tools "$@"
}

if ! docker info >/dev/null 2>&1; then
	echo "Docker is not running, or this user cannot reach it." >&2
	exit 1
fi

if [ ! -f .env ]; then
	echo "No .env here. Copy deploy/.env.example to .env and fill it in." >&2
	exit 1
fi

# The migrate service is behind the tools profile, so pull has to ask for it explicitly.
compose pull

# Postgres first: the migration needs something to connect to, and the api cannot become
# healthy without a schema.
compose up -d postgres

# Creates the schema, or does nothing when it is already current. Safe to repeat, which is
# why it runs on every deploy rather than once by hand.
compose run --rm migrate

# Recreates anything whose image changed and leaves the rest alone.
compose up -d

echo "Deployed. Caddy may need a moment to obtain the certificate on first run:"
echo "  docker compose -f docker-compose.prod.yml logs -f caddy"
