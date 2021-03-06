---
layout: post
title: "Reimplementing Real-time Style Transfer with AdaIN"
date: 2021-01-24
categories: adaindraft
thumb: /pics/thumb26.png
---

[you are not supposed to see this post :) turn back]

Recently I got an [OAK-1](https://opencv.org/introducing-oak-spatial-ai-powered-by-opencv/) (a camera with an AI chip on board), and had no idea what to do with it. I also recently read [the 2017 paper introducing adaptive instance normalization (AdaIN)](https://arxiv.org/pdf/1703.06868.pdf), and really enjoyed it.

That's where this post comes in. Given an input image (say a painting), I want to convert the video feed from the OAK to be in the style of that image. I'm not doing anything new per-se, but I think this will be fun either way.

## More on OAK-1

There's not much to say... here it is:

{% include img.html height="300px" src="../pics/oak1.jpg" %}

It cost about $99, and features 4K video and an onboard neural network chip.


## CNN Basics

If you're already familiar with convolutional neural networks (CNNs), I recommend you read [the AdaIN paper](https://arxiv.org/pdf/1703.06868.pdf), and skip to the [implementation section](#loading-the-datasets). Otherwise, I'll go over just enough of the basics for the rest of this post to make sense.

Most images are made up of 3 channels; red, green and blue.

{% include img.html src="../pics/ergboak.png" %}

A convolutional layer is a function that takes in a stack of 2D arrays (for example, an RGB image), and transforms it into another stack of 2D arrays. So a layer might take in a 64x64 RGB image (64x64x3), and spit out four 32x32 outputs (32x32x4). Each of the four outputs is called a feature map.

{% include img.html src="../pics/convlayer.png" %}

If we stack a bunch of convolutional layers together, we get a convolutional neural network (CNN). The first layers do simple things like detect lines, while later layers detect more complex patterns, like different kinds of blobs.

{% include img.html src="../pics/convnet.png" %}

The cool thing about CNNs is that if we have enough feature maps per layer, enough layers, and lots of data, we can model pretty much any function we want. For example, whether a photo is of a dog or of a cat.

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

Note that the statistics of the photograph's feature maps don't match the statistics of the painting's feature maps, which tells us that the images have different styles.

Now we can normalize each feature map of the photograph's encoding, so that each feature map has mean 0 and variance 1.

{% include img.html src="../pics/normalized.png" %}

Now we can multiply by the standard deviation of the correponding feature map in the photograph's encoding, and add mean of the corresponding feature map in the photograph's encoding.

{% include img.html src="../pics/scalenormalized.png" %}


In essence, we've modified the photograph's encoding so that each feature map has the same statistics as the corresponding feature map in the painting's encoding. This step is called adaptive instance normaliziation, or AdaIn.


{% include img.html src="../pics/adain.png" %}


Because feature map statistics dictate the style of the image, once we decode the photograph's modified encoding, we will get the photograph, but in the style of the painting.

{% include img.html src="../pics/fullinference.png" %}
[style, but transferred]




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

## Training and Results

I trained the model on a g4dn.xlarge AWS instance; though you could also use Google Collab. I won't get into the weeds here, instead I'll point you to a few valuable resources:

[CMU's Introduction to Deep Learning (S21)](http://deeplearning.cs.cmu.edu/S21/index.html#recitations) - Recitation 0C and 0D are about deep learning with AWS and Collab.

[CMU's Introduction to Deep Learning (F20)](http://deeplearning.cs.cmu.edu/F20/index.html#recitations) - Recitation 0D and 0E; different versions of the above.

I personally use AWS, but Collab is cheaper (free for small projects). After training the models, I ran export.py, and copied the files back to my own computer:

[scp]
## Converting for the OAK

Next, I wrote the following code to convert the models to ONNX. I recommend this tutorial for converting models to ONNX:

The next step is to run things through Intel's model optimizer, and then their model compiler. To do so, I first installed their distribution of [OpenVINO](). There's a couple of pitfalls for installation:

- The web installer included the optimizer but not the compiler
- The APT installer included the compiler but not the optimizer

_(Yes, I got mad for a moment)_

I'm not sure what was up with the web installer, but it turns out I'd skipped over some reading for the APT installer; after the "Get the list of available packages" step [here](https://docs.openvinotoolkit.org/latest/openvino_docs_install_guides_installing_openvino_apt.html), you'll see the model optimizer is a separate install.

https://www.amazon.com/iCoostor-Numbers-Acrylic-Painting-Beginner/dp/B07N2V38XZ
