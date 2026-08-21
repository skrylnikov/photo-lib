FROM node:24.13.0-bookworm-slim

WORKDIR /app
COPY . .
RUN npm install --global npm@11.19.0
RUN npm ci
RUN npm run generate

CMD ["npm", "run", "db:migrate:deploy", "--workspace", "database"]
