FROM oven/bun:1

WORKDIR /app

COPY package.json .
RUN bun install

COPY . .

# Railway/Render/Fly all inject PORT at runtime; index.ts reads process.env.PORT
EXPOSE 3003

CMD ["bun", "index.ts"]
