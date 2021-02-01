---
layout: post
title: "Reimplementing Real-time Style Transfer with AdaIN"
date: 2021-01-24
categories: adain
thumb: /pics/thumb26.png
---

Recently I got an [OAK-1](https://opencv.org/introducing-oak-spatial-ai-powered-by-opencv/), a camera with an AI chip on board, and had no idea what to do with it. I also recently read [the 2017 paper introducing adaptive instance normalization (AdaIN)](https://arxiv.org/pdf/1703.06868.pdf), and really enjoyed it.

That's where this post comes in. Given an input image (say a painting), I want to convert the video feed from the OAK to be in the style of that image. I'm not doing anything new per-se, but I think this will be fun either way.

## More on OAK-1

There's not much to say... here it is:

{% include img.html height="300px" src="../pics/oak1.jpg" %}

It cost about $99, and features 4K video and an onboard neural network chip.


## Convolutional Neural Network (CNN) Basics

If you're already familiar with convolutional neural networks (CNNs), you can probably skip this section; instead I recommend you read [the AdaIN paper](https://arxiv.org/pdf/1703.06868.pdf). Otherwise, I'll go over just enough of the basics for the rest of this post to make sense.

Recall that most images are made up of 3 channels, red, green and blue.

## More on AdaIN

I recommend reading ; either way, I'll recap their methodology before I get started. Note that this isn't meant to be a complete primer on convolutional neural networks (CNNs) etc.

Before putting an image through a CNN, it'll have 3 channels; RGB. Each of these channels will have some lower order statistics; i.e. mean and variance.

{% include img.html height="300px" src="../pics/rgb.png" %}

Most layers in a CNN will either decrease the size of the input, increase the number of channels, or do both.

{% include img.html height="300px" src="../pics/cnn.png" %}

It just so happens that if we don't include a technique called normalization, the mean and variance of channels at later layers tell us important information about the style of an image. This is a simplified example, but perhaps in layer 5, channels 1, 2 and 3 tell us about the graininess, stroke width, and roundness of things in our image.

{% include img.html height="300px" src="../pics/features.png" %}

Thus if we put both an input image and a style image through a CNN, and then shift the mean and standard deviation of the input iamage to match those of the style image, we can then invert the features back into an image, and then we will get the original image, but in the style of the target style image (example stylization from the paper):

{% include img.html height="300px" src="../pics/style_eg.png" %}

For more context, here is a diagram of the whole process, from the AdaIN paper:

{% include img.html height="300px" src="../pics/adainstructure.png" %}

## Loading the Datasets

First up was to download the datasets. They train on the Microsoft Common Objects in Context (MS COCO) dataset, which required [this API](https://github.com/cocodataset/cocoapi). There were a few issues with installing the API; most of which had answers [here](https://github.com/cocodataset/cocoapi/issues/172). I also had to run <span class="code">make install</span>, instead of <span class="code">make</span>.

The COCO website has recommendations for downloading the dataset with gsync but they don't work, luckily I could still download both the COCO and WikiArt dataset using wget:

<div class="code">wget http://images.cocodataset.org/zips/train2017.zip
wget http://images.cocodataset.org/zips/val2017.zip
wget http://web.fsktm.um.edu.my/~cschan/source/ICIP2017/wikiart.zip
wget http://images.cocodataset.org/annotations/annotations_trainval2017.zip
</div>

Using aria2 instead can [significantly increase download speeds](https://askubuntu.com/a/507890/673865); here's an example:
<div class="code">aria2c --file-allocation=none -c -x 10 -s 10 -d "./" http://web.fsktm.um.edu.my/~cschan/source/ICIP2017/wikiart.zip
</div>


Next up, I wrote the Dataset class. Given an index, it simply loads a content image to stylize from COCO, and a style image from WikiArt. For preprocessing I follow the paper; the shorter side is resized to 512px, then a 256x256 crop is taken at random.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fmain%2Fdata.py&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on"></script>

Since we have ~100k images in both the styles dataset and source dataset, this makes for a dataset of size on the order of 10 billion. So I don't plan to loop through the entire Dataset.


## The Encoder

For the models, I first wrote the encoder. This is a pretrained [VGG19 model](https://arxiv.org/pdf/1409.1556.pdf), with everything after the first ReLU of dimension 512 deleted.

In addition to outputting the image features, the paper authors take a subset of the encoder layers to compute a style loss at; so in extracting the relevant features from the vgg, I organize them into blocks, where the output of each block is one of the layers they need. In the forward method of the CNN, I also output each of these required layer outputs.

Here's the model, <span class="code">VGG19Encoder</span>:

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fmain%2Fencoder.py&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on"></script>


## The AdaIn Layer

Next up was the AdaIN layer. For a feature to stylize (source feature) and a feature containing the desired feature (style feature), AdaIN first normalizes each channel in the source feature by subtracting the channels mean and dividing by the channels standard deviation. In addition to writing the AdaIN lyer, I also wrote a test case to ensure things were as expected:

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fmain%2Fadain.py&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on"></script>

## The Decoder

The last step was to write the decoder. As described by the paper, this is the mirror of the encoder, except with nearest up-sampling, instad of pooling layers. One thing to note is that something like transpose convolution along with leaky ReLUs are probably more state of the art for image decoders; but I just stuck to the paper.

In terms of implementation, I simply load up the PyTorch VGG19, reverse the layers, and also the channels; e.g. if a layer had 3 channels input and 64 channels output, I changed the layer to have 64 channels input, and 3 channels output.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fmain%2Fdecoder.py&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on"></script>

## The Training Pipeline

The next step was to write the training pipeline. Here I'll repeat what the system looks like:

{% include img.html height="300px" src="../pics/adainstructure.png" %}



First I wrote the outline of the system, <span class="code">get_batch_style_transfer_loss</span>:

<script src="https://gist.github.com/J3698/da140be0d552eb6a616234474a962a15.js"></script>


Next I wrote the <span class="code">stylize_image</span> function, which given the style and content encodings, applies AdaIN to the content encodings to stylize them, and then decodes the stylized features into an image. Note that since the encoder output multiple features at different layers, I had to extract the last of these features:

<script src="https://gist.github.com/J3698/ddd5398e9a5500c3f2b8a054ba375e0b.js"></script>

Next was to calculate the content loss; this is just defined as the content loss.
Here's what that looks like in code:




<div class="code"># style transfer
for each epoch:
    for each batch (source, style):
        # encode
        encoded_source = encoder(source)
        encoded_style = encoder(style)

        # AdaIN
        stylized_source_features = AdaIN(encoded_source, encoded_style)

        # decode
        stylized = decoder(stylized_source_features)

        # compute and optimize loss
        style_loss = compute_style_loss(stylized, style)
        content_loss = compute_content_loss(stylized, stylized_source_features)
        loss = style_loss + content_loss
        optimize_loss(loss)
</div>



