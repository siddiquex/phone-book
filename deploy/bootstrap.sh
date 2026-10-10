#!/bin/sh
# Sets a fresh host up to run the stack: installs Docker, lays the files down from the repo
# rather than by hand, writes a .env with a generated password and this instance's own
# address, then deploys.
#
# The repo is private, so the token must be able to read it as well as pull the images —
# a classic token with both `repo` and `read:packages`:
#
#   export GH_TOKEN=ghp_xxx
#   curl -fsSL -H "Authorization: Bearer $GH_TOKEN" \
#     https://raw.githubusercontent.com/siddiquex/phone-book/develop/deploy/bootstrap.sh \
#     | sudo -E sh
#
# The address is read from instance metadata, which is off on some instances. Pass it
# instead, and nothing is asked of IMDS:
#
#   SITE_ADDRESS=13.210.90.58.nip.io sudo -E sh bootstrap.sh
#
# Re-running is safe: Docker is only installed if missing, and an existing .env is kept.
set -eu

REPO=${REPO:-siddiquex/phone-book}
REF=${REF:-develop}
TARGET=${TARGET:-/opt/phone-book}
OWNER=${REPO%%/*}

[ "$(id -u)" = 0 ] || { echo "Run as root, so: sudo -E sh" >&2; exit 1; }
[ -n "${GH_TOKEN:-}" ] || { echo "Set GH_TOKEN to a token that can read $REPO." >&2; exit 1; }

if ! command -v docker >/dev/null 2>&1; then
	echo "Installing Docker..."
	curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# The files come straight out of the repo, so nothing has to be copied up by hand.
mkdir -p "$TARGET"
fetch() {
	curl -fsSL -H "Authorization: Bearer $GH_TOKEN" \
		"https://raw.githubusercontent.com/$REPO/$REF/$1" -o "$TARGET/$2"
	echo "  $2"
}
echo "Fetching the stack files into $TARGET:"
fetch docker-compose.prod.yml docker-compose.prod.yml
fetch deploy/Caddyfile Caddyfile
fetch deploy/deploy.sh deploy.sh
chmod +x "$TARGET/deploy.sh"

# This instance's own public address, so the nip.io name needs no typing. IMDSv2 first,
# since newer instances refuse the unauthenticated v1 call.
META=http://169.254.169.254/latest/meta-data
IMDS_TOKEN=$(curl -sX PUT http://169.254.169.254/latest/api/token \
	-H "X-aws-ec2-metadata-token-ttl-seconds: 300" || true)
IP=$(curl -s -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" "$META/public-ipv4" || true)

if [ -f "$TARGET/.env" ]; then
	echo "Keeping the existing $TARGET/.env."
elif [ -n "${SITE_ADDRESS:-}" ] || [ -n "$IP" ]; then
	# A hex password keeps the URL-safe promise DATABASE_URL needs; a stray / or + would
	# break the connection string.
	cat > "$TARGET/.env" <<EOF
SITE_ADDRESS=${SITE_ADDRESS:-$IP.nip.io}
POSTGRES_USER=phonebook
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=phonebook
IMAGE_TAG=$REF
GHCR_OWNER=$OWNER
COOKIE_SECURE=true
EOF
	chmod 600 "$TARGET/.env"
	echo "Wrote $TARGET/.env for ${SITE_ADDRESS:-$IP.nip.io} with a generated database password."
else
	echo "Could not determine a public address." >&2
	echo "Pass one in: SITE_ADDRESS=13.210.90.58.nip.io sudo -E sh bootstrap.sh" >&2
	exit 1
fi

# Read access for the private images. This stores the token in ~/.docker/config.json.
echo "$GH_TOKEN" | docker login ghcr.io -u "$OWNER" --password-stdin

cd "$TARGET"
exec ./deploy.sh
