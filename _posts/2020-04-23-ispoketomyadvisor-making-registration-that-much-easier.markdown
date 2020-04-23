---
layout: post
title: "ISpokeToMyAdvisor: Making Registration That Much Easier"
date: 2020-04-23
categories: ispoketomyadvisor
thumb: /pics/thumb23.png
---

It's registration time! As the clock strikes 4:00 pm, I reload SIO for the 5th
time, only to be greeted by this:

{% include img.html src="../pics/annoying.png" %}

I painstaking find the small "yes" with my pointer.

This would be fine, except that thrice more that day, after SIO
slowly loads, I find myself finding that small "yes" button. _Yes, I spoke to
my advisor_.

That's where this project comes into play. I've written a small chrome extension
to automatically remove that prompt. You can install it [here](https://chrome.google.com/webstore/detail/ispoketomyadvisor/knodacmfoanaakoabhbllefgngkmdfkk),
and read the source code here:

Manifest file:
<script src="https://gist.github.com/J3698/f084cdea87d57aa8c8e860dbfbcbe206.js"></script>

Javascript file:
<script src="https://gist.github.com/J3698/818556315c0c27de8aeb21ac615a7a6c.js"></script>
