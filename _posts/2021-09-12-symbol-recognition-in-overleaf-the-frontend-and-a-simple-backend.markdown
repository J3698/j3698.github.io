---
layout: post
title: "Symbol Recognition in Overleaf: The Frontend and a Simple Backend"
date: 2021-08-31
categories: extexify
thumb: /pics/thumb30.png
---

Last spring, I felt typesetting proofs in LaTeX significantly slowed me down on homeworks, especially an hour before a deadline. There are solutions to convert from mouse drawings or handwriting to LaTeX (like detexify), but none integrate seamlesly with Overleaf, the dominant LaTeX editor.

Enter extexify, a symbol recognition extension that I will build specifically to work in Overleaf. In this first post I'll build out much of the front end and a simple backend.

Before we jump in, note that as I update the extension, I won't update the code shown below. Additionally, I'm testing in Firefox, so some parts won't work on other browsers for now.

## The Whole Plan

For the uninitiated, Overleaf lets us type out papers in LaTeX, a language commonly used to write scientific papers or college homeworks. This is what the Overleaf interface looks like:

{% include img.html src="../pics/vanilla_overleaf.png" %}

I plan to have an "extexify" button next to the top buttons that say "Source / Rich Text". It will open a pane over the editor where users can draw a symbol. After a symbol is drawn, the strokes will be sent to a server.

The server will convert the strokes into an image, and use a convolutional neural network (CNN) to classify the symbol. I hope to eventually be able to classify any symbol, even if it doesn't exist in the dataset I am using.

The server will eventually send the classification back to the user, who will be able to copy any of the top results to their clipboard.

After I have something that mostly of works, I plan to post this on a few subreddits, and perhaps elsewhere, too. I want feedback!

## Creating a Basic Extension

Please note that if you're planning to make a new extension, you should probably look up the latest documentation from Firefox or Chrome! Step one to a new extension is to create a new directory for the extension, and a manifest file in the directory:

<script src="https://gist.github.com/J3698/40e0669f0444e9a66107fb984e8a5981.js"></script>

This simple manifest file enables the extension on Overleaf, and ensures that <span class="code">content.js</span> (the main code) and <span class="code">style.css</span> (the styling code) will get loaded on top of Overleaf.

At this point we have a basic extension! We can also create a <span class="code">content.js</span>, and add a simple <span class="code">console.log("Hello!")</span> to it.

In order to load the extension in Firefox we can navigate to <span class="code">about:debugging#/runtime/this-firefox</span> and then click <span class="code">Load Temporary Add-on</span>.

In Chrome, we can click <span class="code">Load unpacked</span> at <span class="code">chrome://extensions/</span>.

After loading our directory, we can then navigate to a new overleaf project, right click anywhere, click inspect element, and then navigate to the console to see "Hello!"

## The Frontend Plan

Most of the front end is written in <span class="code">content.js</span>. Here's the top of that file, which serves as a good overview of this file:

<script src="https://gist.github.com/J3698/38ae8a8b10d6ff4e5eaffce0f55b3933.js"></script>

The first two lines add the UI: a button to toggle showing the user interface (<span class="code">addExtexifyButton()</span>), and then the drawing user interface itself (<span class="code">addExtexifyPane()</span>).

The next line adds functionality to the button so that it will hide and show the main UI (<span class="code">addToggleExtexifyCallbacks()</span>). Next we hide the UI to start with (<span class="code">hideExtexify()</span>).

The next two lines clear the drawing canvas and make the canvas react to mouse movements, respectively.

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

One thing I want to talk about in terms of styling is how many boxes get shown. Imagine my screen is very squished; I don't want to show all of the prediction boxes, as in the image below:

{% include img.html width="300px" src="../pics/overflow_bad.png" %}

The first step to avoiding this behavior was to make the container for the prediction boxes display in "flex" mode, with its "flex-flow" attribute set to "row wrap".

What this does is mandate that the boxes will be in a row, and wrap around to the next row if there is not enough space. Like so:

{% include img.html width="300px" src="../pics/overflow_row.png" %}


Lastly, setting the "overflow" attriute to "hidden" removed the extra rows:

{% include img.html width="300px" src="../pics/overflow_fixed.png" %}

In general, I think I should probably use "flex" display more often, as it seems useful for grid-like layouts, which I use often. But I haven't yet taken the time to learn the ins and outs of flex.


## Interactivity

So far we have the user interface up, but it doesn't do anything. The function <span class="code">addToggleExtexifyCallbacks()</span> adds life to the extexify button, and <span class="code">hideExtexify()</span> initially hides the drawing user interface. Under the hood, they both rely on code from <span class="code">toggleExtexify()</span>:

<script src="https://gist.github.com/J3698/d3f1f015e3369954ef12990b11c56857.js"></script>

Here we just toggle the "fade-out" class which hides the main user interface, reset the canvas width if necessary, and reset our list of drawn points.

The next step of interactivity is drawing on the canvas. For this, I simply copy pasted from this [stack overflow answer](https://stackoverflow.com/a/30684711/4142985).

There was a bit more styling behind the seens, but after that, I had the entire user interface up and running. Here is the whole thing:

{% include img.html src="../pics/frontend_demo.gif" %}

It's ready to connect to a backend!

## A simple backend

I will try to have the backend be as simple as possible to start. For example, since I will create my models in Python, I will write the backend in Python, with Flask. Initially, the server will have one endpoint, "classify", and will always return the same predictions. Here it is:

<script src="https://gist.github.com/J3698/191d7d62c9241663ef280411ba93ac2d.js"></script>

This is pretty much copy pasted from the Flask documentation. I've decided that I want the server to send back the top 5 symbol predictions; for now they're just A B C D E F.

After naming this file <span class="code">app.py</span>, I could run it with the following:

<div class="code">sudo flask run -p 80</div>

This runs things on port 80, which for whatever reason, is the only port that a local server can use to communicate with an extension. Navigating to <span class="code">http://localhost/classify</span> in a browser, I could see the basic predictions of A, B, C, D E F.


## Bridging the Frontend and Backend

Now it was time to have the extension ping the web server. For this to work, I had to broaden the permissions in the extension's manifest file:

<div class="code">"permissions": [
    "*://localhost/*",
    "webRequest"
]</div>

Then, in <span class="code">content.js</span>, I added a function that pings the server every 150 milliseconds if there's an update to the canvas. Here it is:

<script src="https://gist.github.com/J3698/f1c79874dbcd01a0048b2312d1623005.js"></script>

First up, the canvas drawing code updates a variable <span class="code">shouldUpdate</span>, so if no canvas changes have happened, nothing gets requested. Otherwise, I request a classification from the server, and I call <span class="code">updatePredictionsHTML</span> to update the visible predictions.

This motivates the next two functions, <span class="code">updatePredictionsHTML</span> and <span class="code">addReTypesetHandler</span>. The first function updates the text for the predictions. It's not very interesting, so I won't explain it.

The latter however was more interesting. Basically, I want the predictions to be nicely typeset. This is easy enough using a library called MathJax, which Overleaf already has loaded.

However, the extension can't directly access MathJax. So on the extension side I toggle an invisible element in the page when I want to typeset predictions. Then a script injected inthe page checks this invisible element to see if it should typeset things. There is probably a better way of doing this, but I haven't found it yet. The following code is what checks whether the invisible element has changed:

<script src="https://gist.github.com/J3698/445ecaedd0535ef25b47f6e8f503e40c.js"></script>

## Final Result

With that, I had a backend and a frontend that could talk to each other. You can see this below; after I finish drawing, the predictions below blink as they get refreshed.

{% include img.html src="../pics/rerender.gif" %}

At this point, all I need to do is change the backend so that it actually returns predictions. I've already gotten a lot of progress on this end, so until next time!
