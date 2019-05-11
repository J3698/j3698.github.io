$(document).ready(function() {
	var childs = $("#column").find("H2");
	createContents(childs);
	hideContentsIfEmpty(childs);
	$(document).on("scroll", updateTocOnScroll(childs));
});

function createContents(childs) {
	for (var i = 0; i < childs.length; i++) {
		addContentsSection(childs[i], childs);
	}
}

function hideContentsIfEmpty(childs) {
	if (childs.length < 2) {
		$("#table-of-contents").hide();
		console.log("hiding");
	}
}

function updateTocOnScroll(childs) {
	return () => {
		var active = getActiveSection(childs);
		setActiveSection(childs, active);
	}
}

function getActiveSection(childs) {
		var scroll = $(document).scrollTop();
		for (var i = childs.length - 1; i >= 0; i--) {
			if (childs[i].offsetTop < scroll) {
				return i;
			}
		}
		return -1
}

function setActiveSection(childs, active) {
	if (active == -1) { return } 

	childs = $("#table-of-contents").children();
	childs.toggleClass("active-section", false);
	$(".content-section:eq(" + active + ")").addClass("active-section");
	console.log($(".content-section:eq(" + active + ")"));
}

function addContentsSection(section, childs) {
	var newSection = $('<div/>',{
		text: section.innerHTML,
		class: 'content-section'
	});
	newSection.appendTo('#table-of-contents');
	newSection.click(scrollToSection(section, childs));
}

function scrollToSection(section, childs) {
	return () => {
		$(document).off("scroll");

		var scrollTo = $(section).offset().top - $(section).height() 
						       - $("#header").height();
		var animEnd = () => {
			$(document).on("scroll", updateTocOnScroll(childs));
			updateTocOnScroll(childs)();
		};
		$('html,body').animate({scrollTop: scrollTo}, 400,
						 "swing", animEnd);
	}
}
