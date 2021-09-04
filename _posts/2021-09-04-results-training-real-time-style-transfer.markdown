---
layout: post
title: "Results! Training Real-time Style Transfer"
date: 2021-09-04
categories: adain
thumb: /pics/thumb29.png
---

About a week ago, I wrote the models and datasets for real-time style transfer with AdaIn. In this post, I'll get to training. By the end, I'll show some stylized images. If you're just here for the stylized images, feel free to skip to the end :).

## Recap

Here's how AdaIn works:

1. Encode the style and content images
2. Adjust the feature-map statistics of the content encoding to match those of the style encoding
3. Decode the adjusted content encoding into a stylized image
4. Compute a style loss and content loss for the stylied image (only during training)

{% include img.html src="../pics/stylecontentloss.png" %}

Last post I wrote the encoder, decoder, adain function, and a dataset class.


## Training for Reconstruction

To ensure the encoder / decoder worked nicely together, I first trained them to simply reconstruct an input. This is what that pipeline looks like:

{% include img.html src="../pics/reconstructpipeline.png" %}

Shoutout to [Jacob Lee](https://github.com/jacoblee628) for writing some of the initial training pipeline.

We simply encode and decode an image. The loss is the sum of the squared differences between the input and output.

If you would like to see the code for reconstruction, it is [here](https://github.com/J3698/AdaIN-reimplementation/tree/77f9c1f3a65bc0dcf9e93f9a94a2df6cf71deaed). However, it uses older versions of the encoder / decoder, and the code I'd written then is a lot less clean.

At first I trained on one image, on my CPU. This was the image I aimed to reconstruct:

{% include img.html src="../pics/0recon.png" %}

After 71 epochs however, I wasn't sure if things were progressing, and was growing concerned (very concerned; this part was not supposed to be hard):

{% include img.html src="../pics/71recon.png" %}

Interestingly however, the progress is much clearer if you are zoomed out (the image above is 71.png below); my guess is that this is because low frequency information might be learned first:

{% include img.html src="../pics/zoomoutrecon.png" %}

After this, I moved onto AWS to train a larger reconstruction demo using a GPU. I used a g4dn.xlarge AWS instance, though you could also use Google Collab (_much_ cheaper, less reliable). I won't get into the weeds here, instead I'll point you to a few valuable resources:

[CMU's Introduction to Deep Learning (Spring 21)](http://deeplearning.cs.cmu.edu/S21/index.html#recitations) - Recitation 0C and 0D are about deep learning with AWS and Collab.

[CMU's Introduction to Deep Learning (Fall 20)](http://deeplearning.cs.cmu.edu/F20/index.html#recitations) - Recitation 0D and 0E; different versions of the above.

Below are some of the reconstructions over time. For each pair, the target is on the left, and the reconstruction is on the right:

{% include img.html src="../pics/montage.jpg" %}

You can see the first and second reconstructions in the first row are pretty terrible, but the model quickly gets better at reconstructing the input image.
Another interesting thing I tried with reconstruction was using batch normalization in the encoder, and skipping initialization in the decoder. This saved time coding, but heavily impeded training, especially during initial experiments on only one image.

## The AdaIn Model

With all of the necessary components and reconstruction working, I packaged everything up in a class <span class="code">StyleTransferModel</span>. It creates an instance of an encoder and decoder for itself. Here are the important methods it has:

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Ftraining%2Fadain_model.py%23L15-L26&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

We encode the style and content images, and then use AdaIn on the encodings, and decode the stylized content encoding. Below I've labeled which lines of code do what on part of the training diagram.

{% include img.html src="../pics/stylecontentmodellabeled.png" %}

## The Training Pipeline

Now for the training pipeline. I'm going to completely skip over explaining <a href="https://github.com/J3698/AdaIN-reimplementation/blob/post-two/main.py"><span class="code">main.py</span></a>, <a href="https://github.com/J3698/AdaIN-reimplementation/blob/post-two/validate.py"><span class="code">validate.py</span></a>, and swaths of <a href="https://github.com/J3698/AdaIN-reimplementation/blob/post-two/train.py"><span class="code">train.py</span></a> as well. Most of main is dealing with argument parsing, and much of validate is already covered in what I'll cover in train. Also, a bunch of train is not specific to style transfer.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Ftraining%2Ftrain.py%23L43-L70&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

First I'll start with the main training loop. On lines 43-53 I'm looping through the images and putting them on the GPU. On lines 63-70, I'm logging things so I can track training; <span class="code">write_to_tensorboard</span> does everything like validation etc., and I won't go over it here.

Lines 55-61 are where things are more interesting. I clear the gradients (56), calculate the loss (57-59), calculate the new gradients (60), and then update the model weights (61). Next we can look at the function used on line 57 in depth.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Ftraining%2Ftrain.py%23L73-L79&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

Line 74 does much of the heavy lifting; after that we calculate the loss from our various features and return it. The following diagram shows which line does what when we are calculating the loss.

{% include img.html src="../pics/losslabeledcrop.png" %}

The last two functions are responsible for actually calculating the style and content losses. They are below for completeness, but I will not talk too much about them, as I talked about the math behind them in the [first post](./real-time-style-transfer-with-adain-explained).

There is one big deviation I had here between the original paper. For some of the loss terms, I average the style loss between feature maps, rather than sum over them. Because deeper layers have more feature maps, this means that the loss from deep features will not be as dominant over the loss from more shallow features.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Ftraining%2Ftrain.py%23L82-L98&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>


## Adventures in training...

As I mentioned, I probably spent weeks hunting bugs in my implementaiton. Hence why this post is months late. So before I say, "and now it works, ta-da!", I'd like to mention some experiments that I tried, and that failed, along with some ideas I had along the way.

First of all, I tried many many many experiments on just a few images. What I found was that generally, these gave quite good results. However, these experiments were still very sensitive to hyperparameters, such as the style-content tradeoff. Here is an examples (note this is before I added batchnorm to the encoder):

{% include img.html src="../pics/stranging.png" width="750px" %}

Bottom right is the original image. From left to right, top to bottom, the style loss weight is increasing. You can see that without enough style weight, the image ends up looking quite dark; content loss alone is not good enough to bring out the original image, at least not early on in training.

I also tried training with and without random cropping. Initially the cropping made convergence a lot slower, but this was solved once I fixed the rest of the issues that I will talk about below.

After getting some models to converge with small examples, I tried using a larger training dataset. What quickly happened is that the styles all converged to a muddy brown, with painting-like strokes. Basically, the styles were all the same. I also noticed the color of the final layer's biases was very close to the average color of the WikiArt dataset. Here's what things looked like:

{% include img.html src="../pics/bads.png" width="500px" %}

No amount of hyperparameter tuning, lowering of regularization, etc. would fix this problem at first. I burned a lot of AWS money. I also tried removing the bias in the last layer. This didn't really help.

Along the way I hypothesized that weighing the style loss layers differently (maybe further enweight earlier layers) might help the color come out, as earlier layers are closer to the raw RGB data. This didn't really help. So I also tried another experiment; I played around with the loss function. Some style transfer papers don't take a square root after calculating the L2 difference between between style vectors. I tried both, and had the feeling that the square root converged faster; I think this might be because the square root dampens the difference in effect of the various style losses, but I would have to do more pointed experimentation to find out.

This also lead me to discover that by default, the layer losses of the deeper layers are greater in magnitude.

All of the above problems were mostly fixed by adding batch normalization to the encoder. The time wasted sucked, but did get me to think about the problem in a deeper manner. Would taking a larger root (rather than L2 norm) further improve the balance of the style losses? Would it matter? Does the bias in the last layer hurt the model? If the encoder was trained as a normalization-free network, would the model work without the batch normalization? What if we enabled AdaIn at multiple points in the decoder?

While interesting, I probably won't pursue these questions, as there are other parts of the project I want to get to.


## Results

After finally adding those batchnorms, here is one of my my training curves (ignore the premature learning-rate scheduling):

{% include img.html src="../pics/loss_scheduled.png" %}

Furthermore, here are some stylizations throughout training; each triplet is shown in the order style image, content image, stylized image:

{% include img.html src="../pics/out1.png" width="750px" %}
{% include img.html src="../pics/out2.png" width="750px" %}
{% include img.html src="../pics/out3.png" width="750px" %}
{% include img.html src="../pics/out4.png" width="750px" %}


And that's it! I think I have room for improvement, but for now I'm very happy to have this figured out; I definitely expected this whole project to done by now. But then again, that's how most of these go XD.

Anyhow, the next post should take a lot less time (fingers crossed), in part because I've already done some tinkering with getting models on the OAK-1. See you then!
