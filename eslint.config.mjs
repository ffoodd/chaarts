import { defineConfig } from "eslint/config"
import js from "@eslint/js"
import globals from "globals"

export default defineConfig([
	js.configs.recommended,
	{
		ignores: ['_site/js/prism.js'],
		languageOptions: {
			ecmaVersion: 2022,
			globals: {
				...globals.browser,
			},
		},
	}
])
