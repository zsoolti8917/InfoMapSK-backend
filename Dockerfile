# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=20.11.0

FROM node:${NODE_VERSION}-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to use cached layers
COPY package*.json ./

# Install all dependencies, including 'devDependencies' for development
RUN npm install

RUN chown -R node:node /usr/src/app

# Copy the rest of the source files into the image
COPY . .

# Set the environment to 'development'
ENV NODE_ENV development

# Switch to user 'node' for security purposes
USER node

# The application's port number
EXPOSE 5500

# Run the application.
CMD node server.js
