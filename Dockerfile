FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Railway injects service variables as Docker build args when declared here.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_PUBLIC_SITE_ORIGIN
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
ENV VITE_PUBLIC_SITE_ORIGIN=$VITE_PUBLIC_SITE_ORIGIN

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
