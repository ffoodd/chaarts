(function () {
	"use strict";

	// Toggle switch component
	var switches = document.querySelectorAll('[role="switch"]');

	switches.forEach(function (el) {
		el.addEventListener('click', function () {
			var checked = this.getAttribute('aria-checked') === 'true' || false;
			this.setAttribute('aria-checked', !checked);

			if (this.classList.contains('disable-css')) {
				var chart = this.parentNode.nextElementSibling;
				chart.classList.toggle('chaarts');
			}
		});
	});

	// Scrollable tables
	var regions = document.querySelectorAll('.table-container');

	if (window.matchMedia('(min-width: 30em)').matches) {
		regions.forEach(function (el) {
			var width = el.offsetWidth;
			var table = el.querySelector('table');

			if (table.offsetWidth > width) {
				el.setAttribute('tabindex', '0');
			}
		});
	}
})(document);
