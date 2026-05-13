import tseslint from "typescript-eslint"
import globals from "globals"
import checkFile from "eslint-plugin-check-file"

export default tseslint.config(
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        languageOptions: {
            globals: {
                ...globals.es2021,
            },
            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            semi: "off",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-empty-object-type": "warn",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": [
                "error",
                { checksVoidReturn: { arguments: true, attributes: false } },
            ],
            "@typescript-eslint/require-await": "error",
            "@typescript-eslint/no-unsafe-assignment": "error",
            "prefer-promise-reject-errors": "off",
            "@typescript-eslint/prefer-promise-reject-errors": [
                "error",
                { allowThrowingAny: true, allowThrowingUnknown: false },
            ],
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    args: "all",
                    argsIgnorePattern: "^_",
                    caughtErrors: "all",
                    caughtErrorsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    ignoreRestSiblings: true,
                },
            ],
            "@typescript-eslint/no-inferrable-types": "warn",
            "@typescript-eslint/consistent-type-definitions": "off",
            "@typescript-eslint/naming-convention": [
                "error",
                // Default: camelCase for everything not specifically overridden
                { selector: "default", format: ["camelCase"] },
                // Destructured variables: no enforcement (source determines naming)
                {
                    selector: "variable",
                    modifiers: ["destructured"],
                    format: null,
                },
                // const: camelCase, UPPER_CASE (true constants), PascalCase (Typebox schemas)
                {
                    selector: "variable",
                    modifiers: ["const"],
                    format: ["camelCase", "UPPER_CASE", "PascalCase"],
                    leadingUnderscore: "allowSingleOrDouble",
                },
                // Non-const variables: camelCase only
                {
                    selector: "variable",
                    format: ["camelCase"],
                    leadingUnderscore: "allow",
                },
                // Functions: camelCase
                { selector: "function", format: ["camelCase"] },
                // Parameters: camelCase, allow leading underscore for unused
                {
                    selector: "parameter",
                    format: ["camelCase"],
                    leadingUnderscore: "allow",
                },
                // Override methods: no enforcement (can't control inherited names)
                {
                    selector: "classMethod",
                    modifiers: ["override"],
                    format: null,
                },
                // Classes: PascalCase
                { selector: "class", format: ["PascalCase"] },
                // Type aliases and interfaces: T-prefixed PascalCase
                {
                    selector: ["typeAlias", "interface"],
                    format: ["PascalCase"],
                    prefix: ["T"],
                },
                // Type parameters: PascalCase (no prefix — allows T, K, V, TArg, etc.)
                { selector: "typeParameter", format: ["PascalCase"] },
                // Enum names: PascalCase
                { selector: "enum", format: ["PascalCase"] },
                // Enum members: UPPER_CASE
                { selector: "enumMember", format: ["UPPER_CASE"] },
                // Object literal properties: no enforcement (JSON schemas, external APIs)
                { selector: "objectLiteralProperty", format: null },
                // Imports: no enforcement (external package naming)
                { selector: "import", format: null },
            ],
        },
    },
    // .mjs files (e.g. this config file) are not part of the TypeScript project,
    // so type-aware rules cannot be applied to them.
    {
        files: ["*.mjs"],
        extends: [tseslint.configs.disableTypeChecked],
    },
    {
        files: ["src/**/*.ts"],
        plugins: { "check-file": checkFile },
        rules: {
            "check-file/filename-naming-convention": [
                "error",
                { "**/*.ts": "KEBAB_CASE" },
                { ignoreMiddleExtensions: true },
            ],
        },
    },
    {
        ignores: ["dist/**", "node_modules/**", ".worktrees/**"],
    }
)
