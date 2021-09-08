---
layout: post
title: "Symbol Recognition: Writing an Overleaf Integrated Frontend"
date: 2021-08-31
categories: extexify
thumb: /pics/thumb31.png
---

Last spring, I felt typesetting proofs in LaTeX significantly slowed me down on homeworks. This was especially an issue very close to deadlines. While there are solutions to convert from mouse drawings or handwriting to LaTeX equations (such as detexify), none of them integrate seemlesly with Overleaf, the dominant LaTeX editor.

Enter extexify, a symbol recognition extension that I will build specifically to work in Overleaf. In this first post I'll be building out much of the front end.

Before we jump in: the code shown below may not represent the work I've done a few weeks from now; I wil likely open source everything at a later date. Additionally, I'm testing all of this in Firefox; some parts may have to be modified to work elsewhere.

## The Whole Plan

For the uninitiated, Overleaf lets us type out papers in LaTeX, a language commonly used to write scientific papers or college homeworks. This is what the Overleaf interface looks like:

{% include img.html src="../pics/vanilla_overleaf.png" %}

I plan to have a button next to the top buttons that say "Source / Rich Text", which will say "extexify". Upon clicking this, a pane should pop up over the editor where users can draw a symbol. After the user stops drawing, the points in the drawing will be sent to a server.

On the server side, I will convert the points from the drawing into an image, and use a convolutional neural network to classify the image (more on this decision later). I hope to eventually be able to classify any symbol, even if they don't exist in the dataset I am using.

The server will eventually send the classification back to the user, who will be able to copy any of the top results to clipboard.

After I have something that mostly of works, I plan to post this on a few subreddits, and perhaps elsewhere, too. I want feedback!

## Creating a Basic Extension

Please note that if you're planning to make a new extension, you should probably look up the latest documentation from Firefox or Chrome! In general, the first step to creating an extension to create a new directory for the extension, and a manifest file in it:

<script src="https://gist.github.com/J3698/40e0669f0444e9a66107fb984e8a5981.js"></script>

This simple manifest file enables the extension on Overleaf, and ensures that <span class="code">content.js</span> (main code) and <span class="code">style.css</span> (styling code) will get loaded on top of overleaf.

At this point we have a basic extension! We can also create a <span class="code">content.js</span>, and add a simple <span class="code">console.log("Hello!")</span> to it.

In order to load the extension in Firefox we can navigate to <span class="code">about:debugging#/runtime/this-firefox</span> and then click <span class="code">Load Temporary Add-on</span>. In Chrome, we can click <span class="code">Load unpacked</span> at <span class="code">chrome://extensions/</span>. After loading our directory, we can then navigate to a new overleaf project, right click anywhere, click inspect element, and then navigate to the console to see "Hello!"

## The Frontend Plan

Most of the front end is written in <span class="code">content.js</span>. Here's the top of that file, which serves as a good overview of this file:

<script src="https://gist.github.com/J3698/38ae8a8b10d6ff4e5eaffce0f55b3933.js"></script>

The first two lines add the UI: a button to toggle showing the user interface (<span class="code">addExtexifyButton()</span>), and then the drawing user interface itself (<span class="code">addExtexifyPane()</span>).

The next line adds functionality to the button so that it will hide and show the main UI (<span class="code">addToggleExtexifyCallbacks()</span>). Next we hide the UI to start with (<span class="code">hideExtexify()</span>).

The next two lines clear the drawing canvas and make the canvas react to mouse movements, respectively.

For the remaining of this post, I'll explain the rest of this file. I will skip over most of the styling code.

## Injecting the Extexify Button

One of the more "fun" bits about making extensions for a particular website is figuring out what the website developers were doing, in order to add things on top.

The first UI component I added was the extexify button. This is what that looks like:

{% include img.html src="../pics/extexify_button.png" %}

In order to get this look, I first had to find the location in the website code to place the button. Eventually I found it; Here you see me highlighting the code for that space, and Firefox highlights the corresponding part of the webpage for me:

{% include img.html src="../pics/find_button_space.png" %}

If you squint, you can see that the class name for this space is "formatting-buttons-wrapper". Additionally, there's no other parts of the webpage with this name, so I can access this element directly, and add the button. The below code shows me doing this, by setting the inner code (html) of that space:

<script src="https://gist.github.com/J3698/56db90bd0907c7c731c7cc9ce06d3138.js"></script>

You'll also notice that I add "toggle-switch" as one of the classes for the button. The neighboring buttons have this class, I added this so that the button would blend in.

## Injecting the Extexify Main User Interface

I performed a similar process as for the button to create the extexify user interface (UI). Below, lines 2-10 serve to add new elements to the webpage. The rest of the function defines the custom user interface I am after.

<script src="https://gist.github.com/J3698/e9b8a6e6c8ceaf4bce5d2b5cd7672245.js"></script>

Here is the result of that code:

{% include img.html src="../pics/extexify_pane.png" %}

The top box is for drawing, and the bottom five boxes will hold predictions.

One thing I want to talk about in terms of styling is how many boxes get shown. Imagine my screen is very squished; I don't want to show all of the prediction boxes. I got this behavior by making the container for the prediction boxes display in "flex" mode, with it's "flex-flow" attribute set to "row wrap", and "overflow" set to "hidden". This means that the boxes will be in a row, and wrap around to the next row if there is not space. However, the the hidden overflow setting will ensure that the boxes that wrap around are not actually shown.

In general, I think I should probably use flex display more often, as it seems useful for this kind of thing. However, I have not yet taken the time to learn the ins and outs of flex.

## Interactivity

So far we have the user interface up, but it doesn't do anything. The function <span class="code">addToggleExtexifyCallbacks()</span> add life to the extexify button, and <span class="code">hideExtexify()</span> initially hides the drawing user interface. Under the hood, they both rely on code from <span class="code">toggleExtexify()</span>:

<script src="https://gist.github.com/J3698/d3f1f015e3369954ef12990b11c56857.js"></script>

Here we just toggle the "fade-out" class which hides the main UI, reset the canvas width if necessary, and reset our list of drawn points.

The next step of interactivity is drawing on the canvas. For this, I simply copy pasted from this [stack overflow answer](https://stackoverflow.com/a/30684711/4142985).

## Final Result

There was a bit more styling behind the seens, but after that, I had the entire user interface up and running. Here is the whole thing:

{% include img.html src="../pics/frontend_demo.gif" %}

I suspect there are a few more things I'll need for the frontend, but for now, I have a super solid start. I've already gotten a lot of progress on the backend / machine learning side of things, so look out for that soon post in the next few weeks! Until next time.
