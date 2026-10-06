FROM node:20-alpine

WORKDIR /app

# Copy project files
COPY . .

# Default port
ENV PORT=3000
EXPOSE 3000

# Run server
CMD ["npm", "start"]
