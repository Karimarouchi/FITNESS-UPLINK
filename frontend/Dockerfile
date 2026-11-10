# syntax=docker/dockerfile:1

# ---- Build stage: compile the SPA inside Docker (no Node needed on the host) ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Public reCAPTCHA v3 site key, baked into the bundle at build time. Empty = reCAPTCHA disabled.
ARG VITE_RECAPTCHA_SITE_KEY=""
ENV VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY
RUN npm run build

# ---- Runtime stage: static files + /api reverse proxy to the backend ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
