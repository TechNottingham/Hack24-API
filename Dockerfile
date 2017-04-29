FROM node:6

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app

# Build and prune for production
RUN npm install  && \
    npm run build && \
    npm prune --production

# Set environment
# ENV PORT=5000 \
#     HACKBOT_PASSWORD=password \
#     ADMIN_USERNAME=admin \
#     ADMIN_PASSWORD=password \
#     PUSHER_URL=https://key:secret@api-eu.pusher.com/apps/123456 \
#     SLACK_API_TOKEN=xoxo-slack-token

# Expose the API port
EXPOSE 5000

# Run the package
CMD [ "node", "." ]
