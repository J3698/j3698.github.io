---
layout: post
title: "Read Me First: The State of the Longboard Project"
date: 2019-01-13
categories: longboard
thumb: /pics/thumb11.jpeg
---

Because this longboard project was one of the first that I posted here and I was eager to build, my posts haven't synchronized well with the work I've done. In this post, I explain what I've done so far, my current problems, and what my next moves are. I will break these things up in terms of the electronics, hardware, and programming. Understanding past and future posts should be much easer after reading this.

## Electronics
I've gotten to wire up all of the electronics except for the horn and solar components. The electronic speed controller (ESC) makes a lot of noise, so I might forego the horn, and the solar panel is going to take a lot of work, so I don't have any immediate plans to use it. I have been able to control both the motor and lights though - here is a GIF of the lights working:

{% include img.html src="../pics/blinking2.gif" %}

Unfortunately, after weeks of things going just fine, power would cut out if I went over a bump - I believe this is due to a bad solder joint on a buck converter I bought. Additionally, I killed one of my batteries, and one time I hooked up the lights backwards - I haven't tested them since then.

I bought two buck converters - if the second one works without problems, there won't be any more mention of the issue. If not, I will find a different brand or design my own buck converter. If the lights are permanently damaged, it may be some time untli I can buy another set. I should be fine with a damaged battery (I know, dangerous) for now.

## Hardware
As I have mentioned before, my friend [Shihao](https://shihaocao.com) did most of the work to get the motor mounted on my longboard. I did the work of mounting the lights underneath and creating an enclosure. The enclosure was ugly and bulky though - it also doesn't work with my newest system for attaching lights. So I scrapped it. I plan to create a CAD for a new one, make a mold with styrofoam, and then make the new enclosure with carbon fiber.

## Programming
I think the android app and arduino code are mostly done - they support control of the lights and motor just fine. I will however spend time cleaning up the code. I will also spend some time writing comments and a post or two for better documentation.

## The Order of Things
My first order of action is to fix the buck converter issue. I will tape everything down under the board to test that new converter works. Next, I'll get new lights, and then document the code that I've written so far. I need the board working to refactor code - otherwise I won't know if changes break things. The next step will be to create a new enclosure. After all of these steps, I should be in great shape to consider further upgrades to the board.

{% include news.html %}
