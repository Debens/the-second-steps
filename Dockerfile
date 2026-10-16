# Zayto proof-of-concept container.
#
# It runs the app in Next.js DEVELOPMENT mode on purpose: the sandbox quick
# sign-in only exists outside production (production has no email delivery
# yet), so a production build could not be signed in to. Secrets are never
# baked into the image; supply them at run time (see docs/DOCKER.md).
FROM node:22-slim

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=development

WORKDIR /app

# Dependencies first, so rebuilds reuse the cache when only code changes.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# The rest of the project, then the generated database client (needs no
# database connection).
COPY . .
RUN npx prisma generate

EXPOSE 3000

# 0.0.0.0 so the app is reachable from outside the container.
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
