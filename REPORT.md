# Project Audit Report

## Detected Issues

1. **Framework and Build Tool**: The project uses **Next.js** as indicated by the scripts in `package.json` (`next dev`, `next build`, `next start`, `next lint`).

2. **Package Manager**: The project uses **npm** as the package manager, as evidenced by the presence of `package-lock.json`.

3. **Linting and Type Checking**: 
   - The `next lint` command is deprecated and will be removed in Next.js 16. It is recommended to migrate to the ESLint CLI.
   - There is a conflict with the `@next/next` plugin in the ESLint configuration.

4. **Multiple Lockfiles**: There are multiple `package-lock.json` files detected, which may cause issues with dependency management.

## Planned Changes

1. Create a new branch `chore/repo-surgery`.
2. Clean up the repository by removing caches, OS files, duplicates, and unused assets/dependencies.
3. Update `.gitignore` to reflect these changes.
4. Fix the build process to ensure zero errors.
5. Update ESLint, Prettier, and EditorConfig configurations.
6. Ensure `package.json` scripts are complete and functional.
7. Create an `.env.example` file.
8. Update `README.md` with setup instructions, scripts, environment variables, and CI/CD details.
9. Add GitHub Actions workflows for CI and Cloudflare Pages deployment.
10. Commit changes and open a PR titled “Repo surgery + CI/CD”.
