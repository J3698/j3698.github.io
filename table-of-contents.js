var minContentSections = 2
var scrollDuration_ms = 400;
var scrollAnimType = "swing";

$(document).ready(function() {
	var headers = getHeaders();
	createContents(headers);
	showContentsIfPresent(headers);
	$(document).on("scroll", updateTocOnScroll(headers));
});

function getHeaders() {
	var headers = $("#column").find("H2").toArray();
	headers.unshift($(".column-title")[0]);
	return headers;
}

function createContents(headers) {
	addContentsSection("Introduction", headers[0], headers)
	for (var i = 1; i < headers.length; i++) {
		addContentsSection(headers[i].innerHTML, headers[i], headers);
	}
}

function showContentsIfPresent(headers) {
	if (!window.matchMedia("(max-width: 1400px)").matches &&
	    headers.length > minContentSections) {
		$("#table-of-contents").show();
	}
}

function updateTocOnScroll(headers) {
	return () => {
		var active = getActiveSection(headers);
		setActiveSection(active);
	}
}

function getActiveSection(headers) {
	var scroll = $(document).scrollTop();
	for (var i = headers.length - 1; i >= 0; i--) {
		if (headers[i].offsetTop < scroll) {
			return i;
		}
	}
	return -1
}

function setActiveSection(active) {
	if (active == -1) { return } 

	headers = $("#table-of-contents").children();
	headers.toggleClass("active-section", false);
	$(".content-section:eq(" + active + ")").addClass("active-section");
}

function addContentsSection(sectionTitle, section, headers) {
	var newSection = $('<div/>',{
		text: sectionTitle,
		class: 'content-section'
	});
	newSection.appendTo('#table-of-contents');
	newSection.click(scrollToSection(section, headers));
}

function scrollToSection(section, headers) {
	return () => {
		$(document).off("scroll");
		var animEnd = () => {
			$(document).on("scroll", updateTocOnScroll(headers));
			updateTocOnScroll(headers)();
		};
		$('html,body').animate({scrollTop: getSectionY(section)},
					scrollDuration_ms, scrollAnimType,
								  animEnd);
	}
}

function getSectionY(section) {
	return scrollTo = $(section).offset().top
			   - $(section).height() - $("#header").height();
}
