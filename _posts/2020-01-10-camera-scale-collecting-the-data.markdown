---
layout: post
title: "Camera Scale: Collecting the Data"
date: 2020-01-10
categories: carrots
thumb: /pics/thumb21.png
---


Whether you're an elite athlete, are on a diet, or are just curious about
how you eat, at some point you may find yourself trying to track your nutrients.

Using a nutrient tracking app will help - but entering things in is still a
pain. It's also hard to ensure you're eating as much as you think you are - how
much rice is that, really? Is it worth the effort to check? Usually not.

My fix would be an app to detect what and how much food is on a plate, and then
use this data to track a user's approximate nutrient intake.

The scope of this project is pretty huge - so as a proof of concept,
I'm restricting the project to carrots, and I'm only using one size of plate.

In this post I'll discuss how I automated some of the data collection process.
The goal was to be able to take a video of myself rearranging the carrots and
extract data from the video. Here's the video I started with:

<iframe class="video" width="560" height="315" src="https://www.youtube.com/embed/A8435zcrbRE" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>

The goal is to extract images like the one below and associated it automatically
with its weight (in this case 57 grams):

{% include img.html src="../pics/thumb21.png" %}

## Movement Detection

In order to select frames, the general workflow was to determine what segments
of the video had no motion, and select an image from each of those segments.

There are a couple of ways to detect motion - one is to use mixtures of gausians, or the MOG method. MOG uses n frames of a video to create a gaussian
distribution for each pixel. When presented with a new frame, MOG then
calculates the probability that a pixel is of the same object that it was
in the last frames. If the probability is low, we can assume motion has occured
at the pixel.

Another way to detect motion is to calculate the dense optical flow of a frame,
given the last frame. The optical flow of a pixel is an estimation of how much
the object under a pixel has moved, and in what direction.

I ended up using optical flow to detect motion - this is probably a lot slower
than the former method, but works for now.

The image below shows what optical flow might look like - the different colors
represent different directions that pixels are moving. The number in blue is
the average magnitude of the optical flow.

{% include img.html src="../pics/flow.png" %}

Here's the movement detector that I'm about to explain:

[code]

The detect method is used to determine if sustained motion has occured. The
method first detects whether motion has occured in the frame. If some motion has
occured, and has been sustained over the last few frames, the method returns
True. Thus, short accidental detections of movement are ignored.

The detect method uses calc_is_moving to check for motion. At first, I just used
average magnitude of optical flow to check for motion. However, I realized that
the mean absolute difference between a frame and the last frame could also help
detect motion. In other words, if the pixel values between frames are very
different, we can assume a lot of motion has occured.

So I graphed the average absolute pixel differences for frames that optical
flow determined where moving, and for those that were not moving, and this is
what I got:

{% include img.html src="../pics/histogram.png" %}

Almost no moving frames have an average absolute difference of more
than 40, so for those frames we can avoid calculating optical flow. Note that
this optimization would still work if I switched to using MOG instead of
optical flow for movement detection.

Another optimization I ran was to calculate optical flow in parallel. Here is
the parallel flow function that I wrote:



Here, cv2.calcOpticalFlowFarneback is the expensive function. So I split larger
images in four, calculate the flow in parallel, and then rejoin the images.
When I'm not using any other programs, this almost halves my running time.
Again, if I were to switch to using the likely faster MOGs, this
would still be an effective optimization.

## Finding the Scale Screen

For reading the digits off of the scale, the first step was to find the scale
screen in an image. For this I used histogram backprojection.

Here's what backprojection is. Imagine that an image that contains a car. Lets
say there are 6 dark blue pixels in the image, and 3 dark blue pixels in the
car. Then for a given dark blue pixel in the image, there is a 3/6ths chance
that it is part of the car.

{% include img.html src="../pics/backprop_ex.png" %}

If we do this calculation for every pixel and color in an image, we can make a
heatmap of what locations are most likely to contain the car.

The function backproject_screen is responsible for this calculation. Using a
snippet image I made of the screen, here is what backprojection looks like:

{% include img.html src="../pics/backproject.png" %}

This is pretty rough, so smooth_backprojection uses convolutions to smooth the
image - if the 5x5 circular neighborhood of a pixel isn't empty, the pixel
becomes white.

{% include img.html src="../pics/backproject_smooth.png" %}

Along with later testing, I realized that filling holes in the screen also
improves performance, so fill_screen_holes performs a flood fill outside of the
screen, and the holes remaining inside of the screen are turned to white:


{% include img.html src="../pics/backproject_holes.png" %}

Last but not least, remove_spots removes small white and black islands in the
image. This is achieved via multiple successive morphological openings and
closings.

To understand what opening and closing are, first understand erosions and
dilations. To perform an erosion we first need "structuring element" - a 3x3
grid for example

{% include img.html src="../pics/structure.png" %}

Next, we center this structuring element on each black pixel, and set the pixels
underneath the other grid spots to black. Here is a diagram of what that might
look like:

{% include img.html src="../pics/erosion.png" %}

Dilation is the same, except it operates on every white pixels, and sets
neighbors under the structuring element to white:

{% include img.html src="../pics/dilation.png" %}

Opening is when we perform erosion, and then dilation. It ends up removing
small islands of white pixels. Here's what that looks like:

{% include img.html src="../pics/opening.png" %}

Closing is when we dilate, and then erode. It removes small islands of black
pixels:

{% include img.html src="../pics/closing.png" %}

After this was completed, the screen was fairly well highlighted:

{% include img.html src="../pics/backproject_done.png" %}

The method get_digits_bounds then calculates the center of mass of this last
result, which serves as the official location estimate of the screen.

## Clarifying the Digits

After estimating the screen location, I had to then make the digits on the
screen pop out - this makes determing the digits on screen much easier. Function
calls from clarify_digits do all of this.

First, remove_glare calculates the z_score of the screen. In other words, pixels
are given a score of how likely they are to occur, assuming a Gaussian
distribution. All pixels with a z-score of 2.5 or higher (the
brightest ~0.6%) and their neighbors are then considered pixels with "glare".

To fix the glare, remove_glare then inpaints these pixels. Inpainting is a
process where a pixel's values are estimated from the neighboring pixels.

[explain how inpainting works]

Here's the difference that makes with the carrots:

[carrots glare inpainted]

It's a little bit hard to see the full powers of inpainting from the
carrot-glare example, so here's an example of inpainting from Wikipedia:

{% include img.html src="../pics/wiki_inpaint.jpg" %}

Following inpainting, increase_contrast is used to help stand the digits out
from the screen background. It does so using histogram equalization. What this
does is map the p

[image of cdf broke]

[image of uniform cdf]

Note that we need to change cdf to uniform - here's the movements:

[graph of moving cdf points]

in order to do this, we just move the pdf

[graph of moving pdf points]

Now we are approximating uniform distribution, and this causes the contrast and
details to really pop. (maybe we can yeet PDF to have either end yeeted up?)

Heres what it looks like:

[image of contrast eq]

Next, remove_gradient subtracts the lighting gradient on the screen. This is
necessary because otherwise, light spots in a dark area of the screen might look
like dark spots in light areas of the screen - which makes determining where the
segments are much harder.

To remove the gradient this, first a gaussian blur with huge radius is applied
- here's what that looks like:

[gaussian blur]

By subtracting the blue, global trends in lighting are nullified - here's the
result:

[no global trend]

Lastly, remove_specks uses morphological operations to remove specks from the
screen. After this, the digits are considered "clarified" - here's the result
from start to end:

[clarified digits]

## Thresholding the Digits

After the digits have been given more of a "pop"

## Finding the Digits

After the digits are clarified,
