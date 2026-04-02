# Antwerp Eagles Website - GEMINI.md

## Project Overview
The Antwerp Eagles Website is an Angular-based web application. It serves as the main portal for the Antwerp Eagles organization, featuring public-facing pages (Home, Teams, Contact, News) and a protected, authenticated Admin dashboard for content management. 

### Key Technologies:
- **Framework:** Angular 20.3.0 (utilizing standalone components)
- **Language:** TypeScript 5.8
- **Backend/BaaS:** Firebase 12.11.0 (Authentication, Firestore, Storage) via `@angular/fire`
- **Testing:** Vitest 3.1.1 for unit testing
- **Styling:** SCSS & CSS

### Architecture & Features:
- **Routing:** Configured in `app.routes.ts` with public routes and a protected `/admin` area (using `authGuard`). Admin sub-routes include news, teams, and sponsor management.
- **Firebase Integration:** Configured in `app.config.ts`, directly injecting Firebase providers for App, Firestore, Auth, and Storage.
- **Component Structure:** The application is organized by feature within `src/app/` (e.g., `admin`, `home`, `teams`, `contact`, `nieuws-artikel`).

## Building and Running

This project uses standard Angular CLI and npm scripts.

*   **Install Dependencies:**
    ```bash
    npm install
    ```
*   **Development Server:**
    ```bash
    npm start
    # or
    ng serve
    ```
    Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.
*   **Production Build:**
    ```bash
    npm run build
    # or
    ng build
    ```
    Artifacts will be stored in the `dist/` directory.
*   **Running Unit Tests (Vitest):**
    ```bash
    npm test
    # or
    ng test
    ```

## Development Conventions

*   **Standalone Components:** The project leverages modern Angular Standalone Components (evident by the absence of `app.module.ts` and the use of `provide*` functions in `app.config.ts`).
*   **Testing:** Instead of standard Karma/Jasmine, the project uses **Vitest** for unit testing (`npm test`).
*   **Auth Guarding:** The application uses functional router guards (`authGuard` in `src/app/diensten/auth.guard.ts`) to protect the admin area.
*   **Styling:** Both `.scss` and `.css` files are present. Prefer `.scss` for new styling requirements, as indicated by `styles.scss` and `app.scss`.
*   **Language:** Commits, variable naming, and comments appear to mix English and Dutch (e.g., `diensten`, `nieuws-artikel`, `NieuwsArtikel` class name). Ensure alignment with existing naming conventions when creating new components or services.
