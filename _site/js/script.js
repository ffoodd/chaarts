(() => {
	"use strict";

	// Toggle switch component
	const switches = document.querySelectorAll('[role="switch"]');
	switches.forEach(el => {
		el.addEventListener('click', () => {
			const checked = el.getAttribute('aria-checked') === 'true' || false;
			el.setAttribute('aria-checked', !checked);

			if (el.classList.contains('disable-css')) {
				const chart = el.parentNode.nextElementSibling;
				chart.classList.toggle('chaarts');
			}
		});
	});

	// Scrollable tables
	const regions = document.querySelectorAll('.table-container');
	if (window.matchMedia('(min-width: 30em)').matches) {
		regions.forEach(el => {
			const width = el.offsetWidth;
			const table = el.querySelector('table');

			if (table.offsetWidth > width) {
				el.setAttribute('tabindex', '0');
			}
		});
	}

	// Toggles
	const toggles = document.querySelectorAll('.toggle');
	toggles.forEach(toggle => {
		const buttons = toggle.querySelectorAll('button');
		buttons.forEach(button => {
			button.addEventListener('click', () => {
				for (let button of buttons) {
					button.setAttribute('aria-pressed', 'false');
				}
				button.setAttribute('aria-pressed', 'true');
			});
		});
	});

	// Dark mode
	const switcher = document.getElementById('theme');
	const options = switcher.querySelectorAll('button');
	//// Start with user preference
	const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
	document.documentElement.dataset.theme = (prefersDarkScheme.matches) ? 'dark' : 'light';
	//// Then check for localStorage
	const currentTheme = localStorage.getItem('theme');
	document.documentElement.dataset.theme = (currentTheme === 'dark') ? 'dark' : 'light';
	//// Apply expected theme
	if (document.documentElement.dataset.theme === 'dark') {
		document.querySelector('[data-scheme="dark"]').setAttribute('aria-pressed', 'true');
	} else {
		document.querySelector('[data-scheme="light"]').setAttribute('aria-pressed', 'true');
	}
	//// Finally handle overriding through buttons
	options.forEach(option => {
		option.addEventListener('click', () => {
			document.documentElement.dataset.theme = option.dataset.scheme;
			localStorage.setItem('theme', option.dataset.scheme);
		});
	});
})(document);