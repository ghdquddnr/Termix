# Contributing

## Prerequisites

- [Node.js](https://nodejs.org/en/download/) (built with v24)
- [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [Git](https://git-scm.com/downloads)

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/LukeGus/SolTerm
    ```
2. Install the dependencies:
    ```sh
    npm install
    ```

## Running the development server

Run the following commands:

```sh
npm run dev
npx tsc -p tsconfig.node.json
node ./dist/backend/starter.js
```

This will start the backend and the frontend Vite server. You can access SolTerm by going to `http://localhost:5174/`.

## Contributing

1. **Fork the repository**: Click the "Fork" button at the top right of
   the [repository page](https://github.com/LukeGus/SolTerm).
2. **Create a new branch**:
    ```sh
    git checkout -b feature/my-new-feature
    ```
3. **Make your changes**: Implement your feature, fix, or improvement.
4. **Commit your changes**:
    ```sh
    git commit -m "Add feature: my new feature"
    ```
5. **Push to your fork**:
    ```sh
    git push origin feature/my-new-feature
    ```
6. **Open a pull request**: Go to the original repository and create a PR with a clear description.

## 📝 Guidelines

- Follow the existing code style. Use Tailwind CSS with shadcn components.
- Place all API routes in the `main-axios.ts` file. Updating the `openapi.json` is unneeded.
- Include meaningful commit messages.
- Link related issues when applicable.