# Garden Bros Backend

## Overview

The Garden Bros Backend is a robust backend solution for managing a gardening company's website. It is built with Strapi CMS, hosted on a VPS with Dokku, and utilizes PostgreSQL for database management. The setup includes SSL certification and reverse proxy configurations to ensure secure and efficient operations.

## Features

*   **Strapi CMS:** Provides a user-friendly interface for content management.
*   **VPS Hosting:** Deployed on a VPS from Forpsi.
*   **Dokku Environment:** Containerized deployment using Dokku.
*   **PostgreSQL Database:** Managed on the same VPS, shared with other projects.
*   **SSL Certificate:** Ensures secure connections.
*   **Reverse Proxy:** Configured for optimized routing and load balancing.

## Getting Started

### Prerequisites

*   **Node.js:** Ensure Node.js is installed on your local machine.
*   **Docker:** Required for containerization (optional, if using Dokku).
*   **VPS Access:** SSH access to the VPS where Dokku is set up.
*   **Strapi CMS:** Familiarity with Strapi CMS for content management.

### Installation

1.  **Clone the Repository**

    ```bash
    git clone [https://github.com/your-repository/garden-bros-backend.git](https://github.com/your-repository/garden-bros-backend.git)
    cd garden-bros-backend
    ```

2.  **Install Dependencies**

    ```bash
    npm install
    ```

3.  **Configure Environment Variables**

    Create a `.env` file in the root directory and add the following environment variables:

    ```
    DATABASE_CLIENT=postgres
    DATABASE_NAME=garden_bros
    DATABASE_HOST=localhost
    DATABASE_PORT=5432
    DATABASE_USERNAME=your_username
    DATABASE_PASSWORD=your_password
    ```

4.  **Run Strapi**

    *   For local development:

        ```bash
        npm run develop
        ```

    *   For production:

        ```bash
        npm run build
        npm start
        ```

## Deployment

1.  **Set Up Dokku**

    Ensure Dokku is installed and configured on your VPS. Refer to the [Dokku documentation](https://dokku.com/docs/) for installation and setup instructions.

2.  **Deploy to VPS**

    On your local machine:

    ```bash
    git remote add dokku dokku@your-vps-ip:your-app-name
    git push dokku main
    ```

3.  **Configure SSL and Reverse Proxy**

    Dokku supports SSL and reverse proxy configurations out-of-the-box. You can use the following commands to set them up:

    ```bash
    dokku domains:add your-app-name your-domain.com
    dokku letsencrypt:enable your-app-name
    dokku letsencrypt:cron-job --add
    ```

## Database Management

The PostgreSQL database is hosted on the same VPS. Ensure that your database configuration in the `.env` file matches the credentials used on the VPS. You can manage the database using tools like `psql` or PgAdmin.

## Strapi CMS Configuration

*   **Admin Panel:** Access the Strapi admin panel at `http://your-domain.com/admin` to manage content.
*   **Content Types:** Configure content types and relations via the admin panel.
*   **Roles & Permissions:** Set up roles and permissions according to your project requirements.
