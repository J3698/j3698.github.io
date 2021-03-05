---
layout: post
title: "Explaining Real-time Style Transfer with AdaIN"
date: 2021-01-24
categories: adain
thumb: /pics/thumb26.png
---


Recently I got an [OAK-1](https://opencv.org/introducing-oak-spatial-ai-powered-by-opencv/) (a camera with an AI chip on board), and had no idea what to do with it. I also recently read [the 2017 paper introducing adaptive instance normalization (AdaIN)](https://arxiv.org/pdf/1703.06868.pdf), and really enjoyed it.

That's where this project comes in. Given an input image (say a painting), I want to convert the video feed from the OAK to the style of that image. I'm not doing anything new per-se, but I think it will be fun either way.

This first post will cover some basics along with the technique I'll be using; if you're already a deep-learning practitioner, I'd just [read the original paper](https://arxiv.org/pdf/1703.06868.pdf). In the second post I'll discuss re-implementing the model and training, and for the last post I'll move things to the OAK-1.


## More on the OAK-1

There's not much to say... here it is on a tripod:

{% include img.html height="300px" src="../pics/oak1.jpg" %}

It cost about $99, and features 4K video and an onboard neural network chip.


## CNN Basics

I won't exhaustively cover convolutional neural networks (CNNs) here, but I'll go over enough of the basics for the rest of this project to make sense.

Most images are made up of 3 channels; red, green and blue.

{% include img.html src="../pics/ergboak.png" %}

A convolutional layer is a function that takes in a stack of 2D arrays (for example, an RGB image), and transforms it into another stack of 2D arrays. So a layer might take in a 64x64 RGB image (64x64x3), and spit out four 32x32 outputs (32x32x4). Each of the four outputs is called a feature map.

{% include img.html src="../pics/convlayer.png" %}

If we stack a bunch of convolutional layers together, we get a convolutional neural network (CNN). The first layers do simple things like detect lines, while later layers detect more complex patterns, like different kinds of blobs.

{% include img.html src="../pics/convnet.png" %}

The cool thing about CNNs is that if we have enough feature maps per layer, enough layers, and lots of labeled data, we can model pretty much any function we want. For example, whether a photo is of a dog or of a cat.

## Encoders and Decoders

Most CNNs add more and more feature maps, until they output some answer to a question we have. Here's an example:

{% include img.html src="../pics/catordog.png" %}

It just so happens that if we cut off the last few layers of a CNN, often the resulting feature maps still tell us lots of information.

{% include img.html src="../pics/encoder.png" %}

They tell us so much information that if we design a CNN that takes in these feature maps, we can train it to output the original image. We then call the first CNN an _encoder_, and the second CNN a _decoder_.

{% include img.html src="../pics/encoderdecoder.png" %}

## Feature Map Statistics

We're almost there...

Each feature map after a convolutional layer will have an average and variance. The powerful insight made by the authors of the AdaIn paper is that these statistics tell us tons about the _style_ of an image.

The statistics of one feature map might tell us about the smoothness of an image, while the statistics of a another might tell us about the width of blue lines (this is just an example).

{% include img.html src="../pics/feature_stats.png" %}


Let's say we have a photograph, and after encoding it, we calculate the average and variance of each feature map. Now say we do the same with a painting.

{% include img.html src="../pics/decoding_both.png" %}

Note that the statistics of the photograph's feature maps don't match the statistics of the painting's feature maps. This tells us that the images have different styles.

Now we can normalize each feature map of the photograph's encoding, so that each feature map has mean 0 and variance 1.

{% include img.html src="../pics/normalized.png" %}

Now we can multiply by the standard deviation of the correponding feature map in the photograph's encoding, and add the mean of the corresponding feature map in the photograph's encoding.

{% include img.html src="../pics/scalenormalized.png" %}


In essence, we've modified the photograph's encoding so that each feature map has the same statistics as the corresponding feature map in the painting's encoding. This step is called adaptive instance normaliziation, or AdaIn. It's adaptive because we can do it for any painting, and it's instance normalization because we we can do it with just one input image and style image.


{% include img.html src="../pics/adain.png" %}


Because feature map statistics dictate the style of the image, once we decode the photograph's normalized and scaled encoding, we will get the photograph, but in the style of the painting.

{% include img.html src="../pics/fullinference.png" %}

## Teaching the Network

The next question is, how exactly do we do all of this? For the encoder, we can just use a model that someone else has trained for image classification (as the AdaIn authors do), and not change what it does (its weights). But the decoder needs to be trained to reconstruct an image in a different style.

There are two things we want the decoder to do. First, the decoder should output an image that matches the target style. For this we compare feature map statistics:

{% include img.html src="../pics/styleloss.png" %}

We can measure how badly the decoder is doing this numerically with the following function:

$$L_{style}(Style, Out)=||stats(encoder(Style))- stats(encoder(Out))||_2^2$$

Out is the output image, Style is the style image, and computes the mean and variance for each feature map. Intuitively, this calculates how far away the output style is from the style image style; if the target style is very smooth, the output image should be too.

Second, the decoder should output an image that matches the content of the input feature maps it was given. For this we compare the feature map values (_not the statistics_):

{% include img.html src="../pics/contentloss.png" %}

Numerically, this is:

$$L_{content}(Input, Out)=||encoder(Input)- encoder(Out)||_2^2$$

Input is the image we are trying to stylize. Intuitively, this calculates how far away the output feature maps are from the feature maps of the input; i.e., a car should still look like a car.

In practice, we don't just compute these loss functions with the output of the encoder; we use intermediate layers of the encoder too. Also, we want to balance the content loss and style loss, and which layers are more important, so we introduce some scaling factors $$\lambda$$.

This leads us the to the following loss function:

$$\begin{aligned} L_{content}(Input, Out)=&\sum_i \lambda_{style, i} ||encoder_i(Input)- encoder_i(Out)||_2^2 + \\  &  \sum_i \lambda_{content,i} ||stats(encoder_i(Style))- stats(encoder_i(Out))||_2^2\end{aligned}$$

We can minimize this loss function with gradient descent. That is out of the scope of this post, but I hope the idea behind what we're trying to do makes sense.

The whole system looks as follows during training:

{% include img.html src="../pics/stylecontentloss.png" %}

And as a recap, this is how things look when we are actually using the system:

{% include img.html src="../pics/fullinference.png" %}

And that's it for now! I've already made quite a bit of headway on writing the models, so look out for the next update.


_Example style image stolen from [here](https://www.amazon.com/iCoostor-Numbers-Acrylic-Painting-Beginner/dp/B07N2V38XZ)_
