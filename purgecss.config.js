module.exports = {
	content: [
		'docs/*.html',
		'docs/js/*.js'
	],
	css: ['docs/css/styles.min.css'],
	output: 'docs/css/styles.min.css',
	safelist: {
		standard: [/^no-|^grid-|^token|^line-|^ml-/]
	},
	variables: true,
	fontFace: true,
	keyframes: true
}
